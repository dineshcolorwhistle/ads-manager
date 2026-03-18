const bizSdk = require('facebook-nodejs-business-sdk');
const logger = require('../utils/logger');

/**
 * Meta Insights Service
 * Fetches basic performance metrics for a Meta campaign.
 */

/**
 * Get insights for a Meta campaign for the last 7 days.
 * @param {Object} credentials - { access_token }
 * @param {string} campaignExternalId - Meta campaign ID
 * @returns {Promise<Array>} Raw insights rows from Meta SDK
 */
const getCampaignInsights = async (credentials, campaignExternalId) => {
    try {
        const api = bizSdk.FacebookAdsApi.init(credentials.access_token);
        api.setDebug(false);

        const Campaign = bizSdk.Campaign;
        const campaign = new Campaign(campaignExternalId, api);

        const fields = [
            'impressions',
            'clicks',
            'spend',
            'cpc',
            'ctr',
            'conversions'
        ];

        const params = {
            // Meta expects specific snake_case presets like "last_7d"
            date_preset: 'last_7d'
        };

        const insights = await campaign.getInsights(fields, params);
        return insights;
    } catch (error) {
        logger.error('META_INSIGHTS_SERVICE', 'Failed to fetch Meta insights', error);
        throw error;
    }
};

module.exports = {
    getCampaignInsights
};

