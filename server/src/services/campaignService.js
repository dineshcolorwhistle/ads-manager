const campaignRepository = require('../repositories/campaignRepository');
const adGroupRepository = require('../repositories/adGroupRepository');
const adCreativeRepository = require('../repositories/adCreativeRepository');
const clientRepository = require('../repositories/clientRepository');
const credentialRepository = require('../repositories/credentialRepository');
const googleAdapter = require('../platforms/googleAdapter');
const metaAdapter = require('../platforms/metaAdapter');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const CAMPAIGN_IMAGES_DIR = path.join(__dirname, '../../uploads/campaign-images');

const safeUnlinkCampaignImage = async (filename) => {
    try {
        const name = String(filename || '').trim();
        if (!name) return false;
        // Prevent path traversal; only allow deleting files within the uploads folder.
        if (path.basename(name) !== name) return false;

        const filePath = path.join(CAMPAIGN_IMAGES_DIR, name);
        await fs.promises.unlink(filePath);
        return true;
    } catch (err) {
        // Ignore missing files; log other errors for visibility
        if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return false;
        logger.warn('CAMPAIGN_SERVICE', `Failed to delete campaign image file "${filename}"`, { error: err.message });
        return false;
    }
};

/**
 * Campaign Service
 * Handles business logic for campaigns, ad groups, and creatives
 * Implements Tiered Validation as per Phase 3 requirements
 */

/**
 * Tier 1 - Unified Validation
 * Validates common fields across all platforms
 * @param {Object} data - Campaign/AdGroup/Creative data
 * @returns {Array} List of validation errors
 */
const validateUnified = (data) => {
    const errors = [];
    if (!data.name) errors.push('Name is required');
    if (!data.platform) errors.push('Platform is required');
    if (!data.objective) errors.push('Objective is required');
    if (!data.budget || !data.budget.amount) errors.push('Budget amount is required');
    if (!data.start_date) errors.push('Start date is required');
    if (!data.platform_account_id) errors.push('Platform account is required');
    return errors;
};

/**
 * Tier 2 - Platform-Specific Validation (Hooks)
 * Enforces platform-specific requirements (structure only for Phase 3)
 * @param {string} platform - 'google' or 'meta'
 * @param {Object} data - Campaign/AdGroup/Creative data
 * @returns {Array} List of validation errors
 */
const validatePlatformSpecific = async (platform, campaignId, clientId) => {
    const errors = [];

    const campaign = await campaignRepository.findById(campaignId, clientId);
    if (!campaign) {
        errors.push('Campaign not found for validation');
        return errors;
    }

    const effectiveClientId = clientId || campaign.client_id;

    if (platform === 'meta') {
        if (!campaign.facebook_page_id || String(campaign.facebook_page_id).trim() === '') {
            errors.push('Facebook Page ID is required for Meta campaigns');
        }
    }

    // Fetch full structure for validation
    const adGroups = await adGroupRepository.findAllByCampaign(campaignId, effectiveClientId);

    if (adGroups.length === 0) {
        errors.push('At least one Ad Group is required for READY status');
        return errors;
    }

    for (const ag of adGroups) {
        if (!ag.name) errors.push(`Ad Group ${ag._id} is missing a name`);

        const creatives = await adCreativeRepository.findAllByAdGroup(ag._id, effectiveClientId);
        if (creatives.length === 0) {
            errors.push(`Ad Group "${ag.name}" requires at least one creative`);
            continue;
        }

        for (const creative of creatives) {
            if (!creative.headlines || creative.headlines.length === 0) {
                errors.push(`Creative "${creative.name}" in "${ag.name}" requires at least one headline`);
            }
            if (!creative.descriptions || creative.descriptions.length === 0) {
                errors.push(`Creative "${creative.name}" in "${ag.name}" requires at least one description`);
            }
            if (platform === 'meta') {
                const urls = creative.final_urls && Array.isArray(creative.final_urls)
                    ? creative.final_urls.filter(u => u && String(u).trim() !== '')
                    : [];
                if (urls.length === 0) {
                    errors.push(`Creative "${creative.name}" in "${ag.name}" requires at least one destination URL for Meta`);
                }
            }
        }
    }

    if (platform === 'google') {
        // Future: Add Google specific character count limits here
    }

    return errors;
};

/**
 * Resolve and validate client_id for campaign create/save.
 * - CLIENT: must use their own client_id (from user).
 * - ADMIN: may pass body.client_id to create campaigns for a client; otherwise uses user's client_id if set.
 * @returns {Promise<string>} Resolved MongoDB client ObjectId string
 */
const resolveCampaignClientId = async (role, userClientId, bodyClientId) => {
    let clientId = userClientId;
    if (role === 'ADMIN' && bodyClientId) {
        clientId = bodyClientId;
    }
    if (!clientId) {
        throw new Error(
            role === 'ADMIN'
                ? 'client_id is required. Specify which client this campaign belongs to (e.g. in request body).'
                : 'Client ID missing'
        );
    }
    const client = await clientRepository.findClientById(clientId);
    if (!client) {
        throw new Error('Invalid client_id: client not found');
    }
    return clientId;
};

/**
 * Create a campaign draft
 */
const createCampaign = async (clientId, userId, data) => {
    // 1. Unified Validation
    const unifiedErrors = validateUnified(data);
    if (unifiedErrors.length > 0) {
        throw new Error(`Validation failed: ${unifiedErrors.join(', ')}`);
    }

    // Prepare status
    const requestedStatus = data.status || 'DRAFT';

    // 2. Prepare data with isolation
    const campaignData = {
        ...data,
        client_id: clientId,
        created_by: userId,
        status: requestedStatus
    };

    const campaign = await campaignRepository.create(campaignData);
    logger.success('CAMPAIGN_SERVICE', `Campaign created: ${campaign._id} for client ${clientId} with status ${requestedStatus}`);

    // Note: Tier 2 validation for READY status on new campaigns is handled in saveFullCampaign 
    // because ad groups must be saved first before platform structure validation can run.

    return campaign;
};

/**
 * List all campaigns for a client
 */
const listCampaigns = async (clientId, filters = {}) => {
    return await campaignRepository.findAllByClient(clientId, filters);
};

/**
 * Get campaign with its ad groups and creatives
 * For ADMIN users, clientId may be null — in that case we resolve the
 * effective client from the campaign itself so that child records are loaded.
 */
const getCampaignFull = async (id, clientId) => {
    const campaign = await campaignRepository.findById(id, clientId);
    if (!campaign) return null;

    const effectiveClientId = clientId || campaign.client_id;

    const adGroups = await adGroupRepository.findAllByCampaign(id, effectiveClientId);

    // For each ad group, fetch its creatives
    const adGroupsWithCreatives = await Promise.all(adGroups.map(async (ag) => {
        const creatives = await adCreativeRepository.findAllByAdGroup(ag._id, effectiveClientId);
        return {
            ...ag.toObject(),
            creatives
        };
    }));

    return {
        ...campaign.toObject(),
        ad_groups: adGroupsWithCreatives
    };
};

/**
 * Update campaign and its full structure
 * Supports partial updates and tiered validation
 */
const updateCampaign = async (id, clientId, data, options = {}) => {
    const { status, ...updateData } = data;

    // If setting to READY, run Tier 2 validation
    // (skip when called from saveFullCampaign, which validates AFTER children are saved)
    if (status === 'READY' && !options.skipValidation) {
        const platformErrors = await validatePlatformSpecific(data.platform || 'google', id, clientId);
        if (platformErrors.length > 0) {
            throw new Error(`Platform validation failed: ${platformErrors.join('. ')}`);
        }
    }

    const updatedCampaign = await campaignRepository.update(id, clientId, { ...updateData, status });
    logger.success('CAMPAIGN_SERVICE', `Campaign updated: ${id} status: ${status}`);
    return updatedCampaign;
};

/**
 * Save full campaign structure (Campaign + AdGroups + Creatives)
 * This handles the complexity of syncing child records
 */
const saveFullCampaign = async (clientId, userId, fullData) => {
    const { _id, ad_groups, ...campaignData } = fullData;
    let campaign;

    if (_id) {
        // Update existing campaign — skip validation here, run AFTER children are saved
        campaign = await updateCampaign(_id, clientId, campaignData, { skipValidation: true });
    } else {
        // Create new campaign
        campaign = await createCampaign(clientId, userId, campaignData);
    }

    if (ad_groups && ad_groups.length > 0) {
        // For simplicity in Phase 3, we'll replace ad groups and creatives
        // In a real prod app, we'd do a delta sync
        await adGroupRepository.deleteByCampaign(campaign._id, clientId);

        for (const agData of ad_groups) {
            const { creatives, _id: oldAgId, ...adGroupData } = agData;
            const adGroup = await adGroupRepository.create({
                ...adGroupData,
                campaign_id: campaign._id,
                client_id: clientId,
                status: campaign.status
            });

            if (creatives && creatives.length > 0) {
                for (const creativeData of creatives) {
                    const { _id: oldCid, ...cleanCreativeData } = creativeData;
                    await adCreativeRepository.create({
                        ...cleanCreativeData,
                        ad_group_id: adGroup._id,
                        client_id: clientId
                    });
                }
            }
        }
    }

    // Run Tier 2 validation AFTER children are saved (for both new and existing campaigns)
    if (campaign.status === 'READY') {
        const platformErrors = await validatePlatformSpecific(campaign.platform, campaign._id, clientId);
        if (platformErrors.length > 0) {
            // Revert status to DRAFT if validation fails
            await campaignRepository.update(campaign._id, clientId, { status: 'DRAFT' });
            throw new Error(`Platform validation failed: ${platformErrors.join('. ')}`);
        }
    }

    return await getCampaignFull(campaign._id, clientId);
};

/**
 * Delete campaign and its full structure with platform sync
 * @param {string} id - Campaign ID
 * @param {string} clientId - Client ID
 * @param {string} role - User role
 */
const deleteCampaignFull = async (id, clientId, role) => {
    // 1. RBAC: ADMIN and CLIENT allowed; CLIENT must have client_id (enforced by auth)
    if (role !== 'ADMIN' && role !== 'CLIENT') {
        throw new Error('Only administrators or client users can delete campaigns');
    }
    if (role === 'CLIENT' && !clientId) {
        throw new Error('Client context required to delete campaign');
    }

    // 2. Fetch full structure for platform sync (admin may pass null clientId)
    const campaign = await campaignRepository.findById(id, clientId);
    if (!campaign) throw new Error('Campaign not found');
    const effectiveClientId = clientId || campaign.client_id;

    // 3. Platform synchronization if published — must succeed before local deletion
    if ((campaign.status === 'ACTIVE' || campaign.status === 'PUBLISHING') && campaign.external_id) {
        logger.info('CAMPAIGN_SERVICE', `Syncing deletion with platform ${campaign.platform} for ${id}`);

        const credential = await credentialRepository.findCredentialByClientAndPlatform(
            effectiveClientId,
            campaign.platform,
            campaign.platform_account_id
        );

        if (!credential) {
            logger.error('CAMPAIGN_SERVICE', `No credentials to delete campaign on platform; aborting delete`);
            throw new Error('Cannot delete published campaign: platform credentials not found. Remove or update credentials and try again.');
        }

        const credentials = {
            access_token: credential.getDecryptedAccessToken(),
            refresh_token: credential.getDecryptedRefreshToken(),
            client_id: campaign.platform === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.META_APP_ID,
            client_secret: campaign.platform === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.META_APP_SECRET,
            developer_token: process.env.GOOGLE_DEVELOPER_TOKEN, // Required for Google Ads
            platform_account_id: campaign.platform_account_id
        };

        const adapter = campaign.platform === 'google' ? googleAdapter : metaAdapter;
        await adapter.deleteCampaign(credentials, campaign.external_id);
        logger.success('CAMPAIGN_SERVICE', `Platform deletion successful for ${campaign.external_id}`);
    }

    // 4. Local Deletion (Cascading) — only runs after platform delete succeeds (or campaign was not published)
    const adGroups = await adGroupRepository.findAllByCampaign(id, effectiveClientId);
    for (const ag of adGroups) {
        // Delete any uploaded creative images associated to this ad group.
        const creatives = await adCreativeRepository.findAllByAdGroup(ag._id, effectiveClientId);
        for (const c of creatives) {
            if (c && c.image_filename) {
                await safeUnlinkCampaignImage(c.image_filename);
            }
        }

        await adCreativeRepository.deleteByAdGroup(ag._id, effectiveClientId);
    }
    await adGroupRepository.deleteByCampaign(id, effectiveClientId);
    await campaignRepository.deleteCampaign(id, effectiveClientId);

    logger.success('CAMPAIGN_SERVICE', `Campaign ${id} and all children deleted locally.`);
    return true;
};

module.exports = {
    resolveCampaignClientId,
    createCampaign,
    getCampaignFull,
    listCampaigns,
    updateCampaign,
    saveFullCampaign,
    deleteCampaignFull,
    validateUnified,
    validatePlatformSpecific
};
