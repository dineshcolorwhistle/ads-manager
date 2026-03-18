const campaignService = require('../services/campaignService');
const publishService = require('../services/publishService');
const credentialRepository = require('../repositories/credentialRepository');
const metaInsightsService = require('../services/metaInsightsService');
const logger = require('../utils/logger');

/**
 * Campaign Controller
 * Handles campaign CRUD endpoints (request/response ONLY)
 * Per rules.md section 7.1 - No business logic in controllers
 */

/**
 * Create a new campaign draft.
 * Admin may pass body.client_id to create a campaign for a specific client.
 */
const create = async (req, res) => {
    try {
        const clientId = await campaignService.resolveCampaignClientId(
            req.user.role,
            req.user.client_id,
            req.body.client_id
        );
        const result = await campaignService.createCampaign(clientId, req.user.user_id, req.body);

        res.status(201).json({
            success: true,
            data: result,
            message: 'Campaign draft created successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to create campaign', error);
        res.status(400).json({
            success: false,
            error: { code: 'CREATE_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * List campaigns. CLIENT sees only their client; ADMIN sees all, or filter by ?client_id= when provided.
 */
const list = async (req, res) => {
    try {
        const { client_id: userClientId, role } = req.user;

        // Security check: CLIENT role MUST have a client_id
        if (role === 'CLIENT' && !userClientId) {
            logger.warn('CAMPAIGN_CONTROLLER', `Client role missing client_id for user: ${req.user.user_id}`);
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Unauthorized: Client ID missing' },
                timestamp: new Date().toISOString()
            });
        }

        // ADMIN may filter by query.client_id to "switch" to a client view
        const filterClientId = role === 'ADMIN' && req.query.client_id ? req.query.client_id : userClientId;
        const result = await campaignService.listCampaigns(filterClientId);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaigns retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to list campaigns', error);
        res.status(500).json({
            success: false,
            error: { code: 'LIST_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get full campaign details (incl. ad groups and creatives)
 */
const getFull = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId } = req.user;
        const result = await campaignService.getCampaignFull(id, clientId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Campaign not found' },
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaign retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to get campaign', error);
        res.status(500).json({
            success: false,
            error: { code: 'GET_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Update campaign status or metadata
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId } = req.user;
        const result = await campaignService.updateCampaign(id, clientId, req.body);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaign updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to update campaign', error);
        res.status(400).json({
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Stop/cancel a published campaign
 */
const stop = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId, role } = req.user;

        if (role !== 'ADMIN' && role !== 'CLIENT') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to stop campaigns' },
                timestamp: new Date().toISOString()
            });
        }

        const result = await publishService.stopCampaign(id, clientId);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaign stop requested',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to stop campaign', error);
        res.status(400).json({
            success: false,
            error: { code: 'STOP_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get performance insights for a campaign (currently Meta only).
 */
const getInsights = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId } = req.user;

        const campaign = await campaignService.getCampaignFull(id, clientId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Campaign not found' },
                timestamp: new Date().toISOString()
            });
        }

        if (!campaign.external_id || campaign.platform !== 'meta') {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID', message: 'Insights are currently supported only for published Meta campaigns.' },
                timestamp: new Date().toISOString()
            });
        }

        const credential = await credentialRepository.findCredentialByClientAndPlatform(
            campaign.client_id,
            'meta',
            campaign.platform_account_id
        );

        if (!credential) {
            return res.status(400).json({
                success: false,
                error: { code: 'CREDENTIALS_MISSING', message: 'Meta credentials not found for this campaign.' },
                timestamp: new Date().toISOString()
            });
        }

        const credentials = {
            access_token: credential.access_token
        };

        const insights = await metaInsightsService.getCampaignInsights(credentials, campaign.external_id);

        res.status(200).json({
            success: true,
            data: insights,
            message: 'Campaign insights retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to fetch campaign insights', error);
        res.status(500).json({
            success: false,
            error: { code: 'INSIGHTS_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Trigger campaign publishing to platform
 */
const publish = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId, role } = req.user;

        // RBAC Enforcement: ADMIN and CLIENT can publish
        if (role !== 'ADMIN' && role !== 'CLIENT') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to publish campaigns' },
                timestamp: new Date().toISOString()
            });
        }

        const result = await publishService.publishCampaign(id, clientId);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaign publishing initiated',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to publish campaign', error);
        res.status(400).json({
            success: false,
            error: { code: 'PUBLISH_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Save full campaign (Draft/Ready) with nested ad groups and creatives.
 * Admin may pass body.client_id when creating; when updating (body._id set), campaign's client is used.
 */
const saveFull = async (req, res) => {
    try {
        let clientId;
        if (req.body._id) {
            // Update: use existing campaign's client (admin can edit any campaign)
            const existing = await campaignService.getCampaignFull(req.body._id, req.user.client_id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Campaign not found' },
                    timestamp: new Date().toISOString()
                });
            }
            clientId = existing.client_id;
        } else {
            clientId = await campaignService.resolveCampaignClientId(
                req.user.role,
                req.user.client_id,
                req.body.client_id
            );
        }
        const result = await campaignService.saveFullCampaign(clientId, req.user.user_id, req.body);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Campaign structure saved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to save full campaign', error);
        res.status(400).json({
            success: false,
            error: { code: 'SAVE_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Delete a campaign and its structure (Admin or Client; Client can only delete own client's campaigns)
 */
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id: clientId, role } = req.user;

        await campaignService.deleteCampaignFull(id, clientId, role);

        res.status(200).json({
            success: true,
            message: 'Campaign and all associated data deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to delete campaign', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Handle image upload for a campaign creative.
 * Returns the filename and a URL that the client can use for preview.
 */
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_FILE', message: 'No image file provided' },
                timestamp: new Date().toISOString()
            });
        }

        const { filename, originalname, size } = req.file;

        res.status(200).json({
            success: true,
            data: { filename, originalname, size, image_url: `/uploads/campaign-images/${filename}` },
            message: 'Image uploaded successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CAMPAIGN_CONTROLLER', 'Failed to upload image', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    create,
    list,
    getFull,
    update,
    publish,
    stop,
    getInsights,
    saveFull,
    remove,
    uploadImage
};
