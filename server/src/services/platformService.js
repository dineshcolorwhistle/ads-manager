const googleAdsService = require('./googleAdsService');
const metaAdsService = require('./metaAdsService');
const credentialRepository = require('../repositories/credentialRepository');
const platformAccountRepository = require('../repositories/platformAccountRepository');
const userApiCredentialRepository = require('../repositories/userApiCredentialRepository');
const logger = require('../utils/logger');

/**
 * Platform Service
 * Orchestrates platform connection lifecycle, token storage, and account discovery
 * Refactored to support user-specific API credentials
 */

/**
 * Generate OAuth connection URL for a platform
 * @param {string} clientId - Client workspace ID (used as state)
 * @param {string} platform - 'google' or 'meta'
 * @returns {string} Connection URL
 */
const generateConnectUrl = async (clientId, platform) => {
    // Fetch user-specific API configuration
    const userApiCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, platform);
    const config = userApiCred ? userApiCred.getConfig() : {};

    if (platform === 'google') {
        return googleAdsService.getConnectUrl(clientId.toString(), config);
    } else if (platform === 'meta') {
        return metaAdsService.getConnectUrl(clientId.toString(), config);
    } else {
        throw new Error('Unsupported platform');
    }
};

/**
 * Handle OAuth callback, exchange code for tokens, and discover accounts
 * @param {string} clientId - Client workspace ID
 * @param {string} platform - 'google' or 'meta'
 * @param {string} code - OAuth code from callback
 * @returns {Promise<Object>} Success status and discovered accounts count
 */
const handleCallback = async (clientId, platform, code) => {
    try {
        let tokens;
        let platformAccounts = [];

        // Fetch user-specific API configuration
        const userApiCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, platform);
        const config = userApiCred ? userApiCred.getConfig() : {};

        // 1. Exchange code for tokens
        if (platform === 'google') {
            tokens = await googleAdsService.getTokensFromCode(code, config);
        } else if (platform === 'meta') {
            tokens = await metaAdsService.getTokensFromCode(code, config);
        }

        // 2. Store credentials (OAuth tokens) FIRST — before account discovery
        //    This ensures the connection is saved even if account discovery fails.
        const credential = await credentialRepository.upsertCredential({
            client_id: clientId,
            platform,
            platform_account_id: `${platform}_pending_${Date.now()}`,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || (platform === 'meta' ? 'meta_long_lived_token' : ''),
            token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
            scope: tokens.scope ? (Array.isArray(tokens.scope) ? tokens.scope : tokens.scope.split(' ')) : []
        });

        // 3. Discover accessible accounts (non-blocking — errors won't crash the callback)
        try {
            if (platform === 'google') {
                platformAccounts = await googleAdsService.getAccessibleAccounts(tokens.access_token, config);
            } else if (platform === 'meta') {
                platformAccounts = await metaAdsService.getAccessibleAccounts(tokens.access_token);
            }

            // Update credential with actual account ID if discovered
            if (platformAccounts.length > 0) {
                credential.platform_account_id = platformAccounts[0].platform_account_id;
                await credential.save();
            }

            // Store discovered accounts
            for (const account of platformAccounts) {
                await platformAccountRepository.upsertAccount({
                    client_id: clientId,
                    oauth_credential_id: credential._id,
                    platform,
                    ...account
                });
            }
        } catch (discoveryError) {
            // Account discovery failed, but the OAuth connection is still valid.
            // Create a placeholder account so the UI shows the platform as Connected.
            const detail = discoveryError.response?.data || discoveryError.message;
            logger.warn('PLATFORM_SERVICE', `Account discovery failed for ${platform} (non-fatal)`, { detail, status: discoveryError.response?.status });
            await platformAccountRepository.upsertAccount({
                client_id: clientId,
                oauth_credential_id: credential._id,
                platform,
                platform_account_id: credential.platform_account_id,
                name: `${platform === 'google' ? 'Google Ads' : 'Meta Ads'} Account (pending discovery)`,
                currency: 'USD',
                timezone: 'UTC'
            });
        }

        if (platformAccounts.length === 0) {
            logger.warn('PLATFORM_SERVICE', `No ad accounts found for ${platform} during connection`);
        }

        logger.success('PLATFORM_SERVICE', `Successfully connected ${platform} for client ${clientId}. Discovered ${platformAccounts.length} accounts.`);

        return {
            success: true,
            platform,
            accounts_count: platformAccounts.length
        };
    } catch (error) {
        logger.error('PLATFORM_SERVICE', `Failed to handle ${platform} callback`, error);
        throw error;
    }
};

/**
 * Disconnect a platform - Revoke tokens and delete stored data
 * @param {string} clientId - Client workspace ID
 * @param {string} platform - 'google' or 'meta'
 */
const disconnect = async (clientId, platform) => {
    try {
        const credential = await credentialRepository.findCredentialByClientAndPlatform(clientId, platform);

        if (!credential) {
            return { message: 'No connection found' };
        }

        // 1. Delete discovered accounts
        await platformAccountRepository.deleteAccountsByCredential(credential._id);

        // 2. Delete credential
        await credentialRepository.deleteCredential(credential._id);

        logger.success('PLATFORM_SERVICE', `Disconnected ${platform} for client ${clientId}`);

        return { success: true };
    } catch (error) {
        logger.error('PLATFORM_SERVICE', `Failed to disconnect ${platform}`, error);
        throw error;
    }
};

/**
 * Re-discover accounts for an already-connected platform.
 * Useful when initial discovery failed (e.g. API version was sunset)
 * and the user wants to retry without disconnecting/reconnecting.
 * @param {string} clientId - Client workspace ID
 * @param {string} platform - 'google' or 'meta'
 * @returns {Promise<Object>} Discovery result
 */
const rediscoverAccounts = async (clientId, platform) => {
    try {
        // 1. Fetch existing credential
        const credential = await credentialRepository.findCredentialByClientAndPlatform(clientId, platform);
        if (!credential) {
            throw new Error(`No ${platform} connection found. Please connect first.`);
        }

        // Fetch user-specific API configuration
        const userApiCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, platform);
        const config = userApiCred ? userApiCred.getConfig() : {};

        // 2. Refresh access token to ensure it's valid
        let accessToken = credential.access_token;
        try {
            if (platform === 'google') {
                const refreshed = await googleAdsService.refreshAccessToken(credential.refresh_token, config);
                accessToken = refreshed.access_token;
                // Update stored token
                credential.access_token = accessToken;
                credential.token_expiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000);
                await credential.save();
            } else if (platform === 'meta') {
                // Meta uses long-lived tokens, use directly
                accessToken = credential.access_token;
            }
        } catch (refreshError) {
            logger.error('PLATFORM_SERVICE', `Token refresh failed during re-discovery for ${platform}`, refreshError);
            throw new Error(`Token refresh failed: ${refreshError.message}. Please reconnect ${platform}.`);
        }

        // 3. Discover accounts
        let platformAccounts = [];
        if (platform === 'google') {
            platformAccounts = await googleAdsService.getAccessibleAccounts(accessToken, config);
        } else if (platform === 'meta') {
            platformAccounts = await metaAdsService.getAccessibleAccounts(accessToken);
        }

        if (platformAccounts.length === 0) {
            logger.warn('PLATFORM_SERVICE', `Re-discovery found no accounts for ${platform}`);
            return { success: true, accounts_count: 0, message: 'No ad accounts found for this connection.' };
        }

        // 4. Update credential with first account ID
        credential.platform_account_id = platformAccounts[0].platform_account_id;
        await credential.save();

        // 5. Store/update discovered accounts (replaces placeholders)
        for (const account of platformAccounts) {
            await platformAccountRepository.upsertAccount({
                client_id: clientId,
                oauth_credential_id: credential._id,
                platform,
                ...account
            });
        }

        // 6. Delete old placeholder accounts that are no longer valid
        const existingAccounts = await platformAccountRepository.findAccountsByClient(clientId);
        for (const existing of existingAccounts) {
            if (existing.platform === platform && existing.name && existing.name.includes('(pending discovery)')) {
                await platformAccountRepository.deleteAccount(existing._id);
            }
        }

        logger.success('PLATFORM_SERVICE', `Re-discovery for ${platform}: found ${platformAccounts.length} accounts.`);

        return {
            success: true,
            accounts_count: platformAccounts.length,
            accounts: platformAccounts
        };
    } catch (error) {
        logger.error('PLATFORM_SERVICE', `Re-discovery failed for ${platform}`, error);
        throw error;
    }
};

module.exports = {
    generateConnectUrl,
    handleCallback,
    disconnect,
    rediscoverAccounts
};
