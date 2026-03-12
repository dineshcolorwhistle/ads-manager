const platformService = require('../services/platformService');
const platformAccountRepository = require('../repositories/platformAccountRepository');
const credentialRepository = require('../repositories/credentialRepository');
const logger = require('../utils/logger');

/**
 * Platform Controller
 * Handles platform connection endpoints
 * Per rules.md section 7.1 - No business logic in controllers
 */

const getConnectUrl = async (req, res) => {
    try {
        const { platform } = req.params;
        const clientId = req.user.client_id;
        const url = await platformService.generateConnectUrl(clientId, platform);

        res.status(200).json({
            success: true,
            data: { url },
            message: `Connection URL generated for ${platform}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Failed to generate connect URL', error);
        res.status(400).json({
            success: false,
            error: { code: 'CONNECT_URL_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

const handleCallback = async (req, res) => {
    try {
        const { platform } = req.params;
        const { code, state: clientId } = req.query; // clientId is passed via state parameter

        if (!code) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_CODE', message: 'OAuth code is required' },
                timestamp: new Date().toISOString()
            });
        }

        const result = await platformService.handleCallback(clientId, platform, code);

        // Redirect back to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/platforms?connected=${platform}`);
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'OAuth callback failed', error);

        // Redirect back to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const errorMessage = encodeURIComponent(error.message);
        res.redirect(`${frontendUrl}/platforms?error=${errorMessage}`);
    }
};

const getAccounts = async (req, res) => {
    try {
        const clientId = req.user.client_id;
        const accounts = await platformAccountRepository.findAccountsByClient(clientId);

        res.status(200).json({
            success: true,
            data: accounts,
            message: 'Accessible accounts retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Failed to get accounts', error);
        res.status(500).json({
            success: false,
            error: { code: 'GET_ACCOUNTS_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

const disconnect = async (req, res) => {
    try {
        const { platform } = req.params;
        const clientId = req.user.client_id;

        const result = await platformService.disconnect(clientId, platform);

        res.status(200).json({
            success: true,
            data: result,
            message: `${platform} disconnected successfully`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Failed to disconnect platform', error);
        res.status(500).json({
            success: false,
            error: { code: 'DISCONNECT_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

const handleDataDeletion = async (req, res) => {
    try {
        // Meta sends a signed_request. For now, we'll provide a placeholder response.
        // In a production app, you would verify the signature and delete user data.
        logger.info('PLATFORM_CONTROLLER', 'Meta Data Deletion request received');

        const confirmationCode = 'deletion_confirmed_' + Date.now();
        const statusUrl = `${process.env.FRONTEND_URL}/deletion-status?code=${confirmationCode}`;

        res.status(200).json({
            url: statusUrl,
            confirmation_code: confirmationCode
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Data deletion callback failed', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const rediscoverAccounts = async (req, res) => {
    try {
        const { platform } = req.params;
        const clientId = req.user.client_id;

        const result = await platformService.rediscoverAccounts(clientId, platform);

        res.status(200).json({
            success: true,
            data: result,
            message: `Account re-discovery completed for ${platform}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Account re-discovery failed', error);
        res.status(500).json({
            success: false,
            error: { code: 'REDISCOVER_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

const PLATFORM_LABELS = { google: 'Google Ads', meta: 'Meta Ads' };

const getConnectedPlatforms = async (req, res) => {
    try {
        const clientId = req.user.client_id;
        const connected = await credentialRepository.findConnectedPlatformsByClient(clientId);

        const data = connected.map(c => ({
            platform: c.platform,
            platform_account_id: c.platform_account_id,
            label: PLATFORM_LABELS[c.platform] || c.platform
        }));

        res.status(200).json({
            success: true,
            data,
            message: 'Connected platforms retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('PLATFORM_CONTROLLER', 'Failed to get connected platforms', error);
        res.status(500).json({
            success: false,
            error: { code: 'GET_CONNECTED_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    getConnectUrl,
    handleCallback,
    getAccounts,
    getConnectedPlatforms,
    disconnect,
    handleDataDeletion,
    rediscoverAccounts
};
