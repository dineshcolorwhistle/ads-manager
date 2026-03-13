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
            const pageId = data.facebook_page_id && String(data.facebook_page_id).trim();
            if (!pageId) {
                return {
                    success: false,
                    error: 'Meta Ads Error: Facebook Page ID is required. Set it in campaign details before publishing.'
                };
            }

            const api = bizSdk.FacebookAdsApi.init(credentials.access_token);
            api.setDebug(false);

            const accountId = credentials.platform_account_id.startsWith('act_')
                ? credentials.platform_account_id
                : `act_${credentials.platform_account_id}`;
            const account = new bizSdk.AdAccount(accountId, api);

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
                let optGoal = 'REACH';
                let promotedObject = null;
                if (data.objective === 'OUTCOME_TRAFFIC') {
                    optGoal = 'LINK_CLICKS';
                } else if (data.objective === 'OUTCOME_LEADS') {
                    optGoal = 'LEAD_GENERATION';
                    promotedObject = { page_id: pageId };
                } else if (data.objective === 'OUTCOME_SALES') {
                    optGoal = 'OFFSITE_CONVERSIONS';
                }

                const countries = (ag.targeting && ag.targeting.countries && ag.targeting.countries.length > 0)
                    ? ag.targeting.countries.map(c => (c && String(c).toUpperCase())).filter(Boolean)
                    : ['US'];
                const targeting = {
                    geo_locations: { countries }
                };
                if (ag.targeting) {
                    if (ag.targeting.age_min != null && ag.targeting.age_min >= 13) targeting.age_min = ag.targeting.age_min;
                    if (ag.targeting.age_max != null && ag.targeting.age_max <= 65) targeting.age_max = ag.targeting.age_max;
                    if (ag.targeting.genders && ag.targeting.genders.length > 0) targeting.genders = ag.targeting.genders;
                }

                const adSetData = {
                    name: ag.name,
                    campaign_id: campaignId,
                    status: 'PAUSED',
                    billing_event: 'IMPRESSIONS',
                    optimization_goal: optGoal,
                    // Use Meta's lowest cost strategy without a bid cap so that
                    // we are not required to pass bid_amount or bid_constraints.
                    // This avoids "Bid Amount Or Bid Constraints Required" errors
                    // when no explicit bid settings are configured in the UI.
                    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
                    targeting
                };

                if (promotedObject) {
                    adSetData.promoted_object = promotedObject;
                }

                // Add budget if present (enforce minimum of 10000 minor units, e.g. 100 INR/USD)
                // Meta requires higher minimums for certain objectives and currencies.
                if (data.daily_budget > 0) {
                    adSetData.daily_budget = Math.max(data.daily_budget, 10000);
                } else if (data.lifetime_budget > 0) {
                    adSetData.lifetime_budget = Math.max(data.lifetime_budget, 100000);
                }

                if (data.start_time) {
                    // Meta API expects ISO-8601 or unix timestamp string
                    adSetData.start_time = new Date(data.start_time * 1000).toISOString();
                } else {
                    // Fallback to current time + 5 mins if not set
                    adSetData.start_time = new Date(Date.now() + 5 * 60000).toISOString();
                }

                if (data.end_time) {
                    adSetData.end_time = new Date(data.end_time * 1000).toISOString();
                }

                const metaAdSet = await account.createAdSet([], adSetData);

                if (ag.creatives && ag.creatives.length > 0) {
                    for (const creative of ag.creatives) {
                        const finalUrls = creative.final_urls && Array.isArray(creative.final_urls)
                            ? creative.final_urls.filter(u => u && String(u).trim() !== '')
                            : [];
                        const linkUrl = finalUrls.length > 0 ? finalUrls[0].trim() : null;
                        if (!linkUrl) {
                            logger.warn('META_ADAPTER', `Skipping creative "${creative.name}" - no destination URL (validation should have caught this)`);
                            continue;
                        }

                        const message = creative.descriptions && creative.descriptions.length > 0
                            ? (creative.descriptions[0].text || creative.descriptions[0])
                            : 'Default Description';
                        const headline = creative.headlines && creative.headlines.length > 0
                            ? (creative.headlines[0].text || creative.headlines[0])
                            : 'Default Headline';

                        const linkData = {
                            link: linkUrl,
                            message,
                            name: headline
                        };
                        if (creative.call_to_action_type && String(creative.call_to_action_type).trim()) {
                            linkData.call_to_action = {
                                type: creative.call_to_action_type.trim(),
                                value: { link: linkUrl }
                            };
                        }

                        const creativeData = {
                            name: creative.name,
                            object_story_spec: {
                                page_id: pageId,
                                link_data: linkData
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
