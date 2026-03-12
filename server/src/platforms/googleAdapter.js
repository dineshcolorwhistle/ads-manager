const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');
const { GoogleAdsApi } = require('google-ads-api');

/**
 * Google Ads Adapter
 * Handles communication with Google Ads API
 */
class GoogleAdapter extends BaseAdapter {
    constructor() {
        super('google');
    }

    /**
     * Map internal model to Google Ads format
     */
    mapCampaign(campaign) {
        return {
            name: campaign.name,
            advertising_channel_type: 'SEARCH', // Default for Phase 4
            status: 'PAUSED', // Always create as paused initially
            amount_micros: campaign.budget.amount * 1000000,
            campaign_budget: {
                // Google Ads API uses enum values
                type: campaign.budget.type === 'DAILY' ? 'DAILY' : 'LIFETIME'
            },
            ad_groups: campaign.ad_groups || []
        };
    }

    /**
     * Create campaign on Google Ads
     */
    async createCampaign(credentials, data) {
        logger.info('GOOGLE_ADAPTER', `Creating campaign: ${data.name}`);

        try {
            // Pre-flight validation: reject pending/placeholder account IDs
            if (!credentials.platform_account_id || credentials.platform_account_id.startsWith('google_pending_')) {
                return {
                    success: false,
                    error: 'Google Ads Error: No valid ad account discovered. Please re-discover your accounts from the Platforms page before publishing.'
                };
            }

            if (!credentials.developer_token) {
                return {
                    success: false,
                    error: 'Google Ads Error: Developer token is missing. Please configure your Google API credentials.'
                };
            }

            const client = new GoogleAdsApi({
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                developer_token: credentials.developer_token
            });

            // Initialize customer using the platform_account_id
            const customer = client.Customer({
                customer_id: credentials.platform_account_id,
                refresh_token: credentials.refresh_token
            });

            // 1. Create Campaign Budget
            const amountMicros = data.amount_micros;
            if (!amountMicros || isNaN(amountMicros) || amountMicros <= 0) {
                return {
                    success: false,
                    error: 'Google Ads Error: Invalid budget amount. Please set a valid budget greater than 0.'
                };
            }

            const budgetData = [{
                name: `${data.name} - Budget - ${Date.now()}`,
                amount_micros: amountMicros,
                delivery_method: 2, // STANDARD = 2
                explicitly_shared: false
            }];

            logger.info('GOOGLE_ADAPTER', `STEP 1: Creating Budget`, { budgetData: JSON.stringify(budgetData) });

            let budgetId;
            try {
                const budgetResponse = await customer.campaignBudgets.create(budgetData);
                budgetId = budgetResponse.results[0].resource_name;
                logger.info('GOOGLE_ADAPTER', `STEP 1 SUCCESS: Budget created: ${budgetId}`);
            } catch (budgetError) {
                const msg = this._extractErrorMessage(budgetError);
                logger.error('GOOGLE_ADAPTER', `STEP 1 FAILED: Budget creation failed: ${msg}`, { error: budgetError });
                return { success: false, error: `Google Ads Error (Budget): ${msg}` };
            }

            // 2. Create Campaign
            const campaignData = [{
                name: data.name,
                advertising_channel_type: 2, // SEARCH = 2
                status: 3, // PAUSED = 3
                campaign_budget: budgetId,
                // Bidding strategy is REQUIRED since Google Ads API v15+
                maximize_clicks: {
                    cpc_bid_ceiling_micros: 0
                },
                network_settings: {
                    target_google_search: true,
                    target_search_network: true,
                    target_content_network: false,
                    target_partner_search_network: false
                }
            }];

            logger.info('GOOGLE_ADAPTER', `STEP 2: Creating Campaign`, { campaignData: JSON.stringify(campaignData) });

            let campaignResourceName;
            let campaignId;
            try {
                const campaignResponse = await customer.campaigns.create(campaignData);
                campaignResourceName = campaignResponse.results[0].resource_name;
                campaignId = campaignResourceName.split('/')[3];
                logger.info('GOOGLE_ADAPTER', `STEP 2 SUCCESS: Campaign created: ${campaignResourceName} (ID: ${campaignId})`);
            } catch (campaignError) {
                const msg = this._extractErrorMessage(campaignError);
                logger.error('GOOGLE_ADAPTER', `STEP 2 FAILED: Campaign creation failed: ${msg}`, { error: campaignError });
                return { success: false, error: `Google Ads Error (Campaign): ${msg}` };
            }

            // 3. Create Ad Groups and Ads
            for (const ag of data.ad_groups) {
                const adGroupData = [{
                    name: ag.name || `${data.name} - Ad Group`,
                    campaign: campaignResourceName,
                    status: 3, // PAUSED = 3
                    type: 2 // SEARCH_STANDARD = 2
                }];

                logger.info('GOOGLE_ADAPTER', `STEP 3: Creating Ad Group`, { adGroupData: JSON.stringify(adGroupData) });

                let adGroupResourceName;
                try {
                    const adGroupResponse = await customer.adGroups.create(adGroupData);
                    adGroupResourceName = adGroupResponse.results[0].resource_name;
                    logger.info('GOOGLE_ADAPTER', `STEP 3 SUCCESS: Ad Group created: ${adGroupResourceName}`);
                } catch (adGroupError) {
                    const msg = this._extractErrorMessage(adGroupError);
                    logger.error('GOOGLE_ADAPTER', `STEP 3 FAILED: Ad Group creation failed: ${msg}`, { error: adGroupError });
                    return { success: false, error: `Google Ads Error (Ad Group): ${msg}` };
                }

                if (ag.creatives) {
                    for (const creative of ag.creatives) {
                        const headlines = (creative.headlines || []).map(h => ({ text: h.text || h }));
                        const descriptions = (creative.descriptions || []).map(d => ({ text: d.text || d }));

                        // Ensure minimum headlines (3) and descriptions (2) for RSA
                        while (headlines.length < 3) {
                            headlines.push({ text: `Ad Headline ${headlines.length + 1}` });
                        }
                        while (descriptions.length < 2) {
                            descriptions.push({ text: `Ad Description ${descriptions.length + 1}` });
                        }

                        const adGroupAdData = [{
                            status: 3, // PAUSED = 3
                            ad_group: adGroupResourceName,
                            ad: {
                                final_urls: creative.final_urls || ['https://example.com'],
                                responsive_search_ad: {
                                    headlines: headlines,
                                    descriptions: descriptions
                                }
                            }
                        }];

                        logger.info('GOOGLE_ADAPTER', `STEP 4: Creating Ad`, { adData: JSON.stringify(adGroupAdData) });

                        try {
                            await customer.adGroupAds.create(adGroupAdData);
                            logger.info('GOOGLE_ADAPTER', `STEP 4 SUCCESS: Ad created in group ${adGroupResourceName}`);
                        } catch (adError) {
                            const msg = this._extractErrorMessage(adError);
                            logger.error('GOOGLE_ADAPTER', `STEP 4 FAILED: Ad creation failed: ${msg}`, { error: adError });
                            return { success: false, error: `Google Ads Error (Ad Creative): ${msg}` };
                        }
                    }
                }
            }

            return {
                success: true,
                externalId: campaignId,
                platformResponse: { message: 'Google Ads Campaign Created via API' }
            };

        } catch (error) {
            const errorMessage = this._extractErrorMessage(error);
            logger.error('GOOGLE_ADAPTER', `Google Ads API Call Failed: ${errorMessage}`, {
                raw: error,
                keys: Object.keys(error || {})
            });

            return {
                success: false,
                error: `Google Ads Error: ${errorMessage}`
            };
        }
    }

    /**
     * Extract meaningful error message from google-ads-api SDK errors
     */
    _extractErrorMessage(error) {
        if (error.message && error.message !== '') return error.message;
        if (error.errors && Array.isArray(error.errors)) {
            return error.errors.map(e => e.message || JSON.stringify(e.error_code || e)).join('; ');
        }
        if (error.failure) {
            const failures = error.failure.errors || [error.failure];
            return failures.map(f => f.message || JSON.stringify(f)).join('; ');
        }
        if (error.details) {
            return typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
        }
        try {
            const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
            if (serialized && serialized !== '{}') return serialized;
        } catch (_) { /* ignore */ }
        return 'Unknown Google Ads API error';
    }

    async deleteCampaign(credentials, externalId) {
        logger.info('GOOGLE_ADAPTER', `Deleting campaign ${externalId} from platform...`);
        try {
            const client = new GoogleAdsApi({
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                developer_token: credentials.developer_token
            });

            const customer = client.Customer({
                customer_id: credentials.platform_account_id,
                refresh_token: credentials.refresh_token
            });

            // Delete campaign (sets status to REMOVED)
            await customer.campaigns.delete(externalId);

            return { success: true, platformId: externalId };
        } catch (error) {
            logger.error('GOOGLE_ADAPTER', 'Failed to delete Google campaign', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new GoogleAdapter();
