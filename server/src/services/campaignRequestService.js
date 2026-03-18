const mongoose = require('mongoose');
const clientRepository = require('../repositories/clientRepository');
const campaignRequestRepository = require('../repositories/campaignRequestRepository');
const userRepository = require('../repositories/userRepository');
const campaignService = require('./campaignService');
const publishService = require('./publishService');
const logger = require('../utils/logger');

/**
 * Campaign Request Service (Ingest-only)
 * Validates incoming automation payloads and stores them for async processing.
 */

const requireString = (value, field, errors) => {
    if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${field} is required`);
    }
};

const validateMetaPayload = (payload, errors) => {
    requireString(payload.metaAdAccount, 'metaAdAccount', errors);
    requireString(payload.facebookPageId, 'facebookPageId', errors);

    if (!['daily', 'lifetime'].includes(String(payload.budgetType || '').toLowerCase())) {
        errors.push('budgetType must be "daily" or "lifetime"');
    }
    if (typeof payload.budgetAmount !== 'number' || Number.isNaN(payload.budgetAmount) || payload.budgetAmount <= 0) {
        errors.push('budgetAmount must be a number > 0');
    }
    requireString(payload.currency, 'currency', errors);
    requireString(payload.startDate, 'startDate', errors);

    if (!Array.isArray(payload.adGroups) || payload.adGroups.length === 0) {
        errors.push('adGroups must be a non-empty array');
        return;
    }

    for (let i = 0; i < payload.adGroups.length; i++) {
        const ag = payload.adGroups[i] || {};
        requireString(ag.adGroupName, `adGroups[${i}].adGroupName`, errors);

        if (!Array.isArray(ag.countries) || ag.countries.length === 0) {
            errors.push(`adGroups[${i}].countries must be a non-empty array`);
        }
        if (typeof ag.ageMin !== 'number' || typeof ag.ageMax !== 'number' || ag.ageMin > ag.ageMax) {
            errors.push(`adGroups[${i}].ageMin/ageMax must be numbers and ageMin <= ageMax`);
        }
        requireString(ag.gender, `adGroups[${i}].gender`, errors);

        if (!Array.isArray(ag.headlines) || ag.headlines.length === 0) {
            errors.push(`adGroups[${i}].headlines must be a non-empty array`);
        }
        if (!Array.isArray(ag.descriptions) || ag.descriptions.length === 0) {
            errors.push(`adGroups[${i}].descriptions must be a non-empty array`);
        }

        requireString(ag.destinationUrl, `adGroups[${i}].destinationUrl`, errors);
        requireString(ag.callToAction, `adGroups[${i}].callToAction`, errors);
        requireString(ag.imageUrl, `adGroups[${i}].imageUrl`, errors);
    }
};

const normalizeObjective = (objectiveRaw) => {
    const v = String(objectiveRaw || '').trim().toUpperCase();
    if (!v) return 'AWARENESS';

    const map = {
        TRAFFIC: 'TRAFFIC',
        LEADS: 'LEADS',
        SALES: 'SALES',
        AWARENESS: 'AWARENESS',
        OUTCOME_TRAFFIC: 'TRAFFIC',
        OUTCOME_LEADS: 'LEADS',
        OUTCOME_SALES: 'SALES',
        OUTCOME_AWARENESS: 'AWARENESS'
    };
    return map[v] || 'AWARENESS';
};

const normalizeBudgetType = (budgetTypeRaw) => {
    const v = String(budgetTypeRaw || '').trim().toUpperCase();
    if (v === 'DAILY') return 'DAILY';
    if (v === 'LIFETIME') return 'LIFETIME';
    const v2 = String(budgetTypeRaw || '').trim().toLowerCase();
    return v2 === 'lifetime' ? 'LIFETIME' : 'DAILY';
};

const normalizeGenderToMetaGenders = (genderRaw) => {
    const v = String(genderRaw || '').trim().toLowerCase();
    if (!v || v === 'all' || v === 'any') return [];
    if (v === 'male' || v === 'm') return [1];
    if (v === 'female' || v === 'f') return [2];
    return [];
};

const resolveAutomationUserId = async (clientId) => {
    // Prefer a user that actually belongs to this client workspace.
    if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
        const clientUser = await userRepository.findFirstActiveClientUserByClientId(String(clientId));
        if (clientUser && clientUser._id) return String(clientUser._id);
    }

    const fromEnv = String(process.env.AUTOMATION_USER_ID || '').trim();
    if (fromEnv && mongoose.Types.ObjectId.isValid(fromEnv)) return fromEnv;

    const admin = await userRepository.findFirstAdmin();
    if (admin && admin._id) return String(admin._id);

    throw new Error(
        'No automation user available. Create a CLIENT user for this client_id, or set AUTOMATION_USER_ID to a valid User ObjectId, or create at least one ADMIN user.'
    );
};

const buildFullCampaignFromRequest = (record) => {
    const payload = record.payload || {};
    const platform = String(record.platform || payload.platform || '').toLowerCase();

    const budgetAmount = payload.budgetAmount;
    const budgetType = normalizeBudgetType(payload.budgetType);
    const startDate = new Date(payload.startDate);

    const platformAccountId =
        platform === 'meta'
            ? payload.metaAdAccount
            : (payload.googleAdAccount || payload.googleCustomerId || payload.platformAccountId);

    const facebookPageId = platform === 'meta' ? payload.facebookPageId : null;

    const adGroups = Array.isArray(payload.adGroups) ? payload.adGroups : [];

    return {
        name: String(payload.campaignName || record.campaign_name || '').trim(),
        platform,
        objective: normalizeObjective(payload.objective),
        status: 'READY',
        budget: { amount: budgetAmount, type: budgetType },
        currency: String(payload.currency || 'USD').trim().toUpperCase(),
        start_date: startDate,
        end_date: payload.endDate ? new Date(payload.endDate) : null,
        platform_account_id: String(platformAccountId || '').trim(),
        facebook_page_id: facebookPageId ? String(facebookPageId).trim() : null,
        ad_groups: adGroups.map((ag, idx) => ({
            name: String(ag.adGroupName || `Ad Group ${idx + 1}`).trim(),
            status: 'READY',
            targeting: {
                countries: Array.isArray(ag.countries) ? ag.countries : [],
                age_min: typeof ag.ageMin === 'number' ? ag.ageMin : undefined,
                age_max: typeof ag.ageMax === 'number' ? ag.ageMax : undefined,
                genders: normalizeGenderToMetaGenders(ag.gender)
            },
            creatives: [{
                name: `${String(ag.adGroupName || `Ad Group ${idx + 1}`).trim()} - Creative 1`,
                headlines: (Array.isArray(ag.headlines) ? ag.headlines : []).map(h => ({ text: String(h).trim() })).filter(h => h.text),
                descriptions: (Array.isArray(ag.descriptions) ? ag.descriptions : []).map(d => ({ text: String(d).trim() })).filter(d => d.text),
                final_urls: [String(ag.destinationUrl || '').trim()].filter(Boolean),
                call_to_action_type: String(ag.callToAction || '').trim() || null,
                image_url: String(ag.imageUrl || '').trim() || null
            }]
        }))
    };
};

const processCampaignRequest = async (requestId) => {
    const record = await campaignRequestRepository.findById(requestId);
    if (!record) return;

    // Idempotency: skip if already tied to a campaign or already published
    if (record.platform_result && record.platform_result.campaign_id) return;
    if (record.status && record.status !== 'QUEUED' && record.status !== 'FAILED') return;

    try {
        await campaignRequestRepository.updateById(requestId, {
            $set: {
                status: 'PROCESSING',
                updated_at: new Date(),
                error: { code: null, message: null, details: null }
            }
        });

        const userId = await resolveAutomationUserId(String(record.client_id));

        const fullCampaignData = buildFullCampaignFromRequest(record);
        if (!fullCampaignData.platform_account_id) {
            throw new Error('platform account id is missing in request payload (metaAdAccount/googleAdAccount)');
        }

        if (fullCampaignData.platform === 'meta' && !fullCampaignData.facebook_page_id) {
            throw new Error('facebookPageId is required for Meta publishing');
        }

        const saved = await campaignService.saveFullCampaign(String(record.client_id), userId, fullCampaignData);

        // Trigger publish (async publish pipeline)
        await publishService.publishCampaign(saved._id, String(record.client_id));

        await campaignRequestRepository.updateById(requestId, {
            $set: {
                status: 'PUBLISHED',
                platform_result: {
                    campaign_id: saved._id,
                    message: 'Campaign created and publishing initiated'
                },
                updated_at: new Date()
            }
        });

        logger.success('CAMPAIGN_REQUEST_SERVICE', `Processed campaign request ${requestId} -> campaign ${saved._id}`);
    } catch (err) {
        await campaignRequestRepository.updateById(requestId, {
            $set: {
                status: 'FAILED',
                error: {
                    code: 'PROCESS_FAILED',
                    message: err.message,
                    details: null
                },
                updated_at: new Date()
            }
        });
        logger.error('CAMPAIGN_REQUEST_SERVICE', `Failed processing campaign request ${requestId}`, err);
    }
};

/**
 * Create a campaign request record (QUEUED).
 * Expected body:
 * {
 *   client_id: "...",
 *   ...platform payload...
 * }
 */
const createCampaignRequest = async (body) => {
    const errors = [];

    // Client context (needed for future publishing)
    const clientId = body.client_id || body.clientId;
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
        errors.push('client_id is required and must be a valid ObjectId');
    }

    // Basic shared fields
    requireString(body.campaignName, 'campaignName', errors);
    requireString(body.platform, 'platform', errors);
    requireString(body.objective, 'objective', errors);

    const platform = String(body.platform || '').toLowerCase();
    if (platform && !['meta', 'google'].includes(platform)) {
        errors.push('platform must be "meta" or "google"');
    }

    // Platform-specific validation
    if (platform === 'meta') {
        validateMetaPayload(body, errors);
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const client = await clientRepository.findClientById(clientId);
    if (!client) {
        throw new Error('Invalid client_id: client not found');
    }

    const record = await campaignRequestRepository.create({
        client_id: clientId,
        platform,
        campaign_name: String(body.campaignName).trim(),
        status: 'QUEUED',
        payload: body
    });

    // Fire-and-forget next step: create + publish campaign automatically
    setImmediate(() => {
        processCampaignRequest(record._id).catch((err) => {
            logger.error('CAMPAIGN_REQUEST_SERVICE', `Background processing crashed for ${record._id}`, err);
        });
    });

    return record;
};

const getCampaignRequest = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return await campaignRequestRepository.findById(id);
};

module.exports = {
    createCampaignRequest,
    getCampaignRequest,
    processCampaignRequest
};

