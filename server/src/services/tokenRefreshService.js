const OAuthCredential = require('../models/OAuthCredential');
const googleAdsService = require('./googleAdsService');
const userApiCredentialRepository = require('../repositories/userApiCredentialRepository');
const logger = require('../utils/logger');

/**
 * Token Refresh Service
 * Manages automated or on-demand token refreshes
 * Refactored to support user-specific API credentials
 */

/**
 * Refresh tokens for a specific credential
 * @param {Object} credential - OAuthCredential document
 * @returns {Promise<Object>} Updated credential
 */
const refreshCredential = async (credential) => {
    try {
        if (credential.platform === 'google') {
            const refreshToken = credential.getDecryptedRefreshToken();

            // Fetch user-specific API configuration
            const userApiCred = await userApiCredentialRepository.findByClientAndPlatform(credential.client_id, 'google');
            const config = userApiCred ? userApiCred.getConfig() : {};

            const newTokens = await googleAdsService.refreshAccessToken(refreshToken, config);

            credential.access_token = newTokens.access_token;
            if (newTokens.refresh_token) {
                credential.refresh_token = newTokens.refresh_token;
            }
            credential.token_expiry = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000);
            credential.last_refresh_at = new Date();

            await credential.save();
            logger.debug('TOKEN_REFRESH', `Google token refreshed for client ${credential.client_id}`);
        }

        // Meta long-lived tokens don't need "refreshing" in the same way, 
        // they just need to be re-obtained if they expire (approx 60 days).

        return credential;
    } catch (error) {
        logger.error('TOKEN_REFRESH', `Failed to refresh token for credential ${credential._id}`, error);
        throw error;
    }
};

/**
 * Run a background check and refresh all expiring tokens
 * (To be called by a scheduled job or manually)
 */
const refreshAllExpiringTokens = async () => {
    try {
        // Find credentials expiring in the next 10 minutes
        const margin = 10 * 60 * 1000;
        const expiringSoon = new Date(Date.now() + margin);

        const credentials = await OAuthCredential.find({
            token_expiry: { $lte: expiringSoon },
            platform: 'google' // Only Google for now as Meta has very long-lived tokens
        });

        logger.info('TOKEN_REFRESH', `Checking ${credentials.length} expiring credentials`);

        for (const cred of credentials) {
            try {
                if (!cred || !cred.platform || !cred.client_id) {
                    logger.warn('TOKEN_REFRESH', 'Skipping invalid credential during refresh check');
                    continue;
                }
                logger.info('TOKEN_REFRESH', `Attempting to refresh ${cred.platform} token for client ${cred.client_id}`);
                await refreshCredential(cred);
            } catch (err) {
                // Continue with others even if one fails
                logger.error('TOKEN_REFRESH', `Failed to refresh credential ${cred?._id || 'unknown'}`, err);
            }
        }

        return { checked: credentials.length };
    } catch (error) {
        logger.error('TOKEN_REFRESH', 'Error during background token refresh', error);
        // Do not throw here, as it might crash the background job caller
        return { error: error.message };
    }
};

module.exports = {
    refreshCredential,
    refreshAllExpiringTokens
};
