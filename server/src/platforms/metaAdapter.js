const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');
const bizSdk = require('facebook-nodejs-business-sdk');

/**
 * Meta Ads Adapter
 * Handles communication with Meta (Facebook) Ads API
 */
class MetaAdapter extends BaseAdapter {
    constructor() {
        super('meta');
    }

    /**
     * Map internal model to Meta format
     */
    mapCampaign(campaign) {
        // Map generic internal objectives to Meta-specific Graph API objectives
        const objectiveMap = {
            'TRAFFIC': 'OUTCOME_TRAFFIC',
            'LEADS': 'OUTCOME_LEADS',
            'SALES': 'OUTCOME_SALES',
            'AWARENESS': 'OUTCOME_AWARENESS'
        };

        return {
            name: campaign.name,
            objective: objectiveMap[campaign.objective] || 'OUTCOME_AWARENESS', // Fallback to awareness
            status: 'PAUSED',
            daily_budget: campaign.budget.type === 'DAILY' ? campaign.budget.amount * 100 : null,
            lifetime_budget: campaign.budget.type === 'LIFETIME' ? campaign.budget.amount * 100 : null,
            start_time: Math.floor(new Date(campaign.start_date).getTime() / 1000),
            end_time: campaign.end_date ? Math.floor(new Date(campaign.end_date).getTime() / 1000) : null,
            special_ad_categories: ['NONE'],
            facebook_page_id: campaign.facebook_page_id || null,
            ad_groups: campaign.ad_groups || []
        };
    }

    /**
     * Create campaign on Meta
     */
    async createCampaign(credentials, data) {
        logger.info('META_ADAPTER', `Creating campaign: ${data.name}`);

        try {
            // Since we need to support concurrent users, initialize API instance dynamically
            const api = bizSdk.FacebookAdsApi.init(credentials.access_token);
            api.setDebug(false);

            // Ad Account ID format for Meta is usually act_<ID>
            const accountId = credentials.platform_account_id.startsWith('act_')
                ? credentials.platform_account_id
                : `act_${credentials.platform_account_id}`;
            const account = new bizSdk.AdAccount(accountId, api);

            // 1. Create Campaign
            const campaignData = {
                name: data.name,
                objective: data.objective,
                status: data.status,
                special_ad_categories: data.special_ad_categories,
                is_adset_budget_sharing_enabled: false
            };

            logger.info('META_ADAPTER', `API Call: Create Campaign for ${accountId}`);
            const metaCampaign = await account.createCampaign([], campaignData);
            const campaignId = metaCampaign.id;

            for (const ag of data.ad_groups) {
                // 2. Create Ad Set
                const adSetData = {
                    name: ag.name,
                    campaign_id: campaignId,
                    status: 'PAUSED',
                    billing_event: 'IMPRESSIONS',
                    optimization_goal: 'REACH', // Generic fallback
                    bid_amount: 100, // 1 USD equivalent
                    targeting: {
                        geo_locations: { countries: ['US'] }
                    }
                };

                // Add budget if present (enforce minimum of 10000 minor units, e.g. 100 INR/USD)
                // Meta requires higher minimums for certain objectives and currencies.
                if (data.daily_budget > 0) {
                    adSetData.daily_budget = Math.max(data.daily_budget, 10000);
                } else if (data.lifetime_budget > 0) {
                    adSetData.lifetime_budget = Math.max(data.lifetime_budget, 100000);
                }

                const metaAdSet = await account.createAdSet([], adSetData);

                // 3. Create Creatives and Ads
                if (ag.creatives && ag.creatives.length > 0) {

                    // Fetch an actual Facebook Page ID instead of a dummy one
                    // Meta requires a Page ID for ad creatives
                    let pageId = data.facebook_page_id || '944598498748166'; // Fallback Page ID from Meta API

                    if (!data.facebook_page_id) {
                        try {
                            const pages = await account.getPromotePages(['id']);
                            if (pages && pages.length > 0) {
                                pageId = pages[0].id;
                            }
                        } catch (err) {
                            logger.warn('META_ADAPTER', 'Failed to fetch promote pages, using fallback', err);
                        }
                    }

                    for (const creative of ag.creatives) {
                        // Create AdCreative
                        const creativeData = {
                            name: creative.name,
                            object_story_spec: {
                                page_id: pageId,
                                link_data: {
                                    link: 'https://example.com',
                                    message: creative.descriptions && creative.descriptions.length > 0 ? creative.descriptions[0].text : 'Default Description',
                                    name: creative.headlines && creative.headlines.length > 0 ? creative.headlines[0].text : 'Default Headline'
                                }
                            }
                        };

                        const metaCreative = await account.createAdCreative([], creativeData);

                        // Create Ad
                        const adData = {
                            name: `${creative.name} - Ad`,
                            adset_id: metaAdSet.id,
                            creative: { creative_id: metaCreative.id },
                            status: 'PAUSED'
                        };

                        await account.createAd([], adData);
                    }
                }
            }

            return {
                success: true,
                externalId: campaignId,
                platformResponse: { message: 'Meta Ads Campaign Created via Graph API' }
            };

        } catch (error) {
            console.log('RAW SDK ERROR:', error);
            let errorDetails = '';
            // FacebookRequestError typically puts the payload in error.response
            const errorObj = (error.response && error.response.error) ? error.response.error : (error.response || {});

            if (Object.keys(errorObj).length > 0) {
                errorDetails = JSON.stringify(errorObj);
                logger.error('META_ADAPTER', 'Meta API detailed error', errorObj);
            } else {
                logger.error('META_ADAPTER', 'Meta API Call Failed', error);
            }

            // Extract user-friendly error message from Meta SDK response
            const errorMessage = errorObj.message
                ? `${errorObj.message}` + (errorObj.error_user_title ? ` - ${errorObj.error_user_title}. ${errorObj.error_user_msg || ''}` : '')
                : error.message;

            return {
                success: false,
                error: `Meta Ads Error: ${errorMessage}. Details: ${errorDetails}`
            };
        }
    }

    async deleteCampaign(credentials, externalId) {
        logger.info('META_ADAPTER', `Deleting campaign ${externalId} from platform...`);
        try {
            const api = bizSdk.FacebookAdsApi.init(credentials.access_token);
            const campaign = new bizSdk.Campaign(externalId, api);
            await campaign.delete([]);

            return { success: true, platformId: externalId };
        } catch (error) {
            logger.error('META_ADAPTER', 'Failed to delete Meta campaign', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new MetaAdapter();
