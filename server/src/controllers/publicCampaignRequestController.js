const campaignRequestService = require('../services/campaignRequestService');
const logger = require('../utils/logger');

/**
 * Public Campaign Request Controller
 * Public ingest endpoint for campaign automation requests (stores to DB only).
 */

const create = async (req, res) => {
    try {
        const record = await campaignRequestService.createCampaignRequest(req.body);
        res.status(201).json({
            success: true,
            data: {
                id: record._id,
                status: record.status,
                platform: record.platform,
                campaign_name: record.campaign_name,
                created_at: record.created_at
            },
            message: 'Campaign request queued successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PUBLIC_CAMPAIGN_REQUEST_CONTROLLER', 'Failed to queue campaign request', error);
        res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

const getById = async (req, res) => {
    try {
        const record = await campaignRequestService.getCampaignRequest(req.params.id);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Campaign request not found' },
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            success: true,
            data: record,
            message: 'Campaign request retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PUBLIC_CAMPAIGN_REQUEST_CONTROLLER', 'Failed to get campaign request', error);
        res.status(500).json({
            success: false,
            error: { code: 'GET_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    create,
    getById
};

