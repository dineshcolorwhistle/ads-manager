const campaignService = require('../services/campaignService');
const publishService = require('../services/publishService');
const logger = require('../utils/logger');

/**
 * Campaign Controller
 * Handles campaign CRUD endpoints (request/response ONLY)
 * Per rules.md section 7.1 - No business logic in controllers
 */

/**
 * Create a new campaign draft
 */
const create = async (req, res) => {
    try {
        const { client_id: clientId, user_id: userId } = req.user;
        const result = await campaignService.createCampaign(clientId, userId, req.body);

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
 * List all campaigns for the authenticated client
 */
const list = async (req, res) => {
    try {
        const { client_id: clientId, role } = req.user;

        // Security check: CLIENT role MUST have a client_id
        if (role === 'CLIENT' && !clientId) {
            logger.warn('CAMPAIGN_CONTROLLER', `Client role missing client_id for user: ${req.user.user_id}`);
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Unauthorized: Client ID missing' },
                timestamp: new Date().toISOString()
            });
        }

        // Admin with no clientId sees all, otherwise filter by clientId
        const result = await campaignService.listCampaigns(clientId);

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
 * Save full campaign (Draft/Ready) with nested ad groups and creatives
 */
const saveFull = async (req, res) => {
    try {
        const { client_id: clientId, user_id: userId } = req.user;
        const result = await campaignService.saveFullCampaign(clientId, userId, req.body);

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
 * Delete a campaign and its structure (Admin only)
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

module.exports = {
    create,
    list,
    getFull,
    update,
    publish,
    saveFull,
    remove
};
