const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Meta Ads Service
 * Handles Meta OAuth flow and Account Discovery
 * Per Phase 2 requirements - Read-only account metadata
 */

/**
 * Generate Meta OAuth Connection URL
 * @param {string} state - Client ID or state
 * @param {Object} config - Optional user-specific API configuration
 * @returns {string} Connection URL
 */
const getConnectUrl = (state, config = {}) => {
    const appId = config.appId || process.env.META_APP_ID;
    const redirectUri = config.callbackUrl || process.env.META_CALLBACK_URL;

    // Standard OAuth 2.0 flow - This is the most reliable way for an app owner
    // to connect their own assets. It avoids the "Business Portfolio selection" block.
    // NOTE: If this leads to a "Product not available" error, the user must add 
    // "Facebook Login" (standard) in their Meta App Dashboard sidebar.
    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: 'ads_management,ads_read,pages_manage_ads,pages_read_engagement',
        state: state,
        response_type: 'code'
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
};

/**
 * Exchange code for tokens
 * @param {string} code - OAuth code from callback
 * @param {Object} config - Optional user-specific API configuration
 * @returns {Promise<Object>} Tokens
 */
const getTokensFromCode = async (code, config = {}) => {
    try {
        const appId = config.appId || process.env.META_APP_ID;
        const appSecret = config.appSecret || process.env.META_APP_SECRET;
        const redirectUri = config.callbackUrl || process.env.META_CALLBACK_URL;

        const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code
            }
        });

        // Meta returns a short-lived token by default. 
        // We should exchange it for a long-lived token (approx 60 days).
        const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: response.data.access_token
            }
        });

        return {
            access_token: longLivedTokenResponse.data.access_token,
            refresh_token: 'meta_no_refresh_token', // Meta long-lived tokens don't use refresh tokens, they are just longer lived
            expires_in: longLivedTokenResponse.data.expires_in
        };
    } catch (error) {
        if (error.response && error.response.data) {
            logger.error('META_ADS_SERVICE', 'Failed to exchange code for tokens', {
                status: error.response.status,
                data: error.response.data
            });
        } else {
            logger.error('META_ADS_SERVICE', 'Failed to exchange code for tokens', error);
        }
        throw error;
    }
};

/**
 * Fetch accessible ad accounts (Read-only)
 * @param {string} accessToken - Decrypted access token
 * @returns {Promise<Array>} List of ad accounts
 */
const getAccessibleAccounts = async (accessToken) => {
    try {
        const response = await axios.get('https://graph.facebook.com/v21.0/me/adaccounts', {
            params: {
                access_token: accessToken,
                fields: 'id,name,currency,timezone_name'
            }
        });

        return (response.data.data || []).map(account => ({
            platform_account_id: account.id,
            name: account.name,
            currency: account.currency,
            timezone: account.timezone_name
        }));
    } catch (error) {
        logger.error('META_ADS_SERVICE', 'Failed to fetch ad accounts', error);
        throw error;
    }
};

module.exports = {
    getConnectUrl,
    getTokensFromCode,
    getAccessibleAccounts
};
