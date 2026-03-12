const userApiCredentialRepository = require('../repositories/userApiCredentialRepository');
const logger = require('../utils/logger');

/**
 * User API Credential Controller
 * Handles requests for managing per-user API IDs and Secrets
 */

/**
 * Get user-specific API credentials for a platform
 */
const getCredential = async (req, res) => {
    try {
        const { platform } = req.params;
        const clientId = req.user.client_id; // From authMiddleware

        if (!clientId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Client access required' }
            });
        }

        const credential = await userApiCredentialRepository.findByClientAndPlatform(clientId, platform);

        if (!credential) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const config = credential.getConfig();

        // Sanitize secret for response (show only last 4 chars or masked)
        const sanitizedConfig = { ...config };
        if (sanitizedConfig.clientSecret) {
            sanitizedConfig.clientSecret = `••••••••${sanitizedConfig.clientSecret.slice(-4)}`;
        }
        if (sanitizedConfig.appSecret) {
            sanitizedConfig.appSecret = `••••••••${sanitizedConfig.appSecret.slice(-4)}`;
        }

        res.status(200).json({
            success: true,
            data: sanitizedConfig
        });
    } catch (error) {
        logger.error('USER_CREDENTIAL_CONTROLLER', 'Failed to get credentials', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch API credentials' }
        });
    }
};

/**
 * Update or create user-specific API credentials
 */
const updateCredential = async (req, res) => {
    try {
        const { platform } = req.params;
        const config = req.body;
        const clientId = req.user.client_id;

        if (!clientId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Client access required' }
            });
        }

        // Basic validation
        if (platform === 'google') {
            if (!config.clientId || !config.clientSecret || !config.developerToken) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Google credentials (Client ID, Secret, Dev Token) are required' }
                });
            }
        } else if (platform === 'meta') {
            if (!config.appId || !config.appSecret) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Meta credentials (App ID, Secret) are required' }
                });
            }
        }

        // Prevent saving masked secrets (e.g. "••••••••1234") 
        // If the user didn't change the field, reuse the original secret.
        const existingCredential = await userApiCredentialRepository.findByClientAndPlatform(clientId, platform);
        if (existingCredential) {
            const existingConfig = existingCredential.getConfig();

            if (platform === 'google' && config.clientSecret && config.clientSecret.startsWith('••••')) {
                config.clientSecret = existingConfig.clientSecret;
            }

            if (platform === 'meta' && config.appSecret && config.appSecret.startsWith('••••')) {
                config.appSecret = existingConfig.appSecret;
            }
        }

        await userApiCredentialRepository.upsertCredential(clientId, platform, config);

        res.status(200).json({
            success: true,
            message: `${platform} API credentials updated successfully`
        });
    } catch (error) {
        logger.error('USER_CREDENTIAL_CONTROLLER', 'Failed to update credentials', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to update API credentials' }
        });
    }
};

/**
 * Delete user-specific API credentials
 */
const deleteCredential = async (req, res) => {
    try {
        const { platform } = req.params;
        const clientId = req.user.client_id;

        await userApiCredentialRepository.deleteCredential(clientId, platform);

        res.status(200).json({
            success: true,
            message: `${platform} API credentials removed`
        });
    } catch (error) {
        logger.error('USER_CREDENTIAL_CONTROLLER', 'Failed to delete credentials', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete API credentials' }
        });
    }
};

module.exports = {
    getCredential,
    updateCredential,
    deleteCredential
};
