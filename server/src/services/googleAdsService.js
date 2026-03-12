const { google } = require('googleapis');
const logger = require('../utils/logger');

/**
 * Google Ads Service
 * Handles Google OAuth flow and Account Discovery
 * Per Phase 2 requirements - Read-only account metadata
 */

const getOAuthClient = (config = {}) => {
    return new google.auth.OAuth2(
        config.clientId || process.env.GOOGLE_CLIENT_ID,
        config.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
        config.callbackUrl || process.env.GOOGLE_CALLBACK_URL
    );
};

/**
 * Generate Google OAuth Connection URL
 * @param {string} state - Client ID or state to maintain between request and callback
 * @param {Object} config - Optional user-specific API configuration
 * @returns {string} Connection URL
 */
const getConnectUrl = (state, config = {}) => {
    const oauth2Client = getOAuthClient(config);

    // Scopes required for Google Ads API
    const scopes = [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for refresh token
        scope: scopes,
        state: state, // Securely pass clientId back to our callback
        prompt: 'consent' // Force consent to ensure refresh token is returned
    });
};

/**
 * Exchange code for tokens
 * @param {string} code - OAuth code from callback
 * @param {Object} config - Optional user-specific API configuration
 * @returns {Promise<Object>} Tokens (access_token, refresh_token, expiry_date)
 */
const getTokensFromCode = async (code, config = {}) => {
    try {
        const oauth2Client = getOAuthClient(config);
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (error) {
        logger.error('GOOGLE_ADS_SERVICE', 'Failed to exchange code for tokens', error);
        throw error;
    }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Decrypted refresh token
 * @param {Object} config - Optional user-specific API configuration
 * @returns {Promise<Object>} Refreshed tokens
 */
const refreshAccessToken = async (refreshToken, config = {}) => {
    try {
        const oauth2Client = getOAuthClient(config);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (error) {
        logger.error('GOOGLE_ADS_SERVICE', 'Failed to refresh access token', error);
        throw error;
    }
};

/**
 * Fetch accessible ad accounts (Read-only)
 * @param {string} accessToken - Decrypted access token
 * @param {Object} config - Optional user-specific API configuration
 * @returns {Promise<Array>} List of ad accounts
 */
const getAccessibleAccounts = async (accessToken, config = {}) => {
    try {
        const oauth2Client = getOAuthClient(config);
        oauth2Client.setCredentials({ access_token: accessToken });

        const developerToken = config.developerToken || process.env.GOOGLE_DEVELOPER_TOKEN;

        // Using Google Ads query to list accessible customers
        // Note: For full Customer metadata, another call for each customer_id might be needed
        const url = 'https://googleads.googleapis.com/v23/customers:listAccessibleCustomers';

        const response = await oauth2Client.request({
            url,
            headers: {
                'developer-token': developerToken
            }
        });
        const resourceNames = response.data.resourceNames || [];

        // Extract customer IDs from resource names (format: customers/1234567890)
        const accounts = resourceNames.map(name => {
            const id = name.split('/')[1];
            return {
                platform_account_id: id,
                name: `Google Ads Account (${id})`, // Name will be updated during sync if possible
                currency: 'USD', // Default until detailed fetch
                timezone: 'UTC'
            };
        });

        return accounts;
    } catch (error) {
        const detail = error.response?.data || error.message;
        logger.error('GOOGLE_ADS_SERVICE', 'Failed to fetch ad accounts', { detail, status: error.response?.status });
        throw error;
    }
};

module.exports = {
    getConnectUrl,
    getTokensFromCode,
    refreshAccessToken,
    getAccessibleAccounts
};
