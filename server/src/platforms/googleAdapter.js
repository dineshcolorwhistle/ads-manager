const fs = require('fs').promises;
const path = require('path');
const BaseAdapter = require('./baseAdapter');
const logger = require('../utils/logger');
const { GoogleAdsApi } = require('google-ads-api');

const CAMPAIGN_IMAGES_DIR = path.join(__dirname, '../../uploads/campaign-images');

/** Geo target resource names (subset — extend as needed) */
const GEO_BY_COUNTRY = {
    US: 'geoTargetConstants/2840',
    GB: 'geoTargetConstants/2826',
    CA: 'geoTargetConstants/2124',
    AU: 'geoTargetConstants/2036',
    IN: 'geoTargetConstants/2356',
    DE: 'geoTargetConstants/2276',
    FR: 'geoTargetConstants/2250',
    ES: 'geoTargetConstants/2724',
    IT: 'geoTargetConstants/2380',
    BR: 'geoTargetConstants/2076',
    MX: 'geoTargetConstants/2484',
    JP: 'geoTargetConstants/2392'
};

/** Language constant resource names */
const LANGUAGE_BY_CODE = {
    en: 'languageConstants/1000',
    es: 'languageConstants/1003',
    fr: 'languageConstants/1002',
    de: 'languageConstants/1001',
    it: 'languageConstants/1004',
    ja: 'languageConstants/1005',
    pt: 'languageConstants/1014',
    hi: 'languageConstants/1023'
};

const CTA_TO_DISPLAY_LABEL = {
    LEARN_MORE: 'Learn More',
    SHOP_NOW: 'Shop Now',
    SIGN_UP: 'Sign Up',
    CONTACT_US: 'Contact Us',
    GET_QUOTE: 'Get Quote',
    DOWNLOAD: 'Download',
    BOOK_NOW: 'Book Now',
    GET_OFFER: 'Get Offer',
    VISIT_WEBSITE: 'Visit Website'
};

/**
 * Google Ads Adapter
 * Handles communication with Google Ads API
 */
class GoogleAdapter extends BaseAdapter {
    constructor() {
        super('google');
    }

    _geoResourceForCountry(code) {
        return GEO_BY_COUNTRY[String(code || '').toUpperCase()] || null;
    }

    _languageResourceForCode(code) {
        return LANGUAGE_BY_CODE[String(code || '').toLowerCase()] || null;
    }

    _displayCtaText(callToActionType) {
        const key = String(callToActionType || 'LEARN_MORE').toUpperCase();
        return CTA_TO_DISPLAY_LABEL[key] || 'Learn More';
    }

    /**
     * Upload a stored campaign image as a Google Ads IMAGE asset.
     */
    async _createImageAsset(customer, storedFilename, assetLabel) {
        const safe = path.basename(String(storedFilename || '').trim());
        if (!safe) {
            throw new Error('Missing image file reference');
        }
        const fullPath = path.join(CAMPAIGN_IMAGES_DIR, safe);
        const buf = await fs.readFile(fullPath);

        const assetPayload = {
            name: `${assetLabel}-${Date.now()}`,
            type: 3, // AssetType.IMAGE
            image_asset: { data: buf }
        };

        const assetResponse = await customer.assets.create([assetPayload]);
        return assetResponse.results[0].resource_name;
    }

    async _applyGeoAndLanguageCriteria(customer, campaignResourceName, googleSettings) {
        const gs = googleSettings || {};
        const countries = Array.isArray(gs.location_countries) ? gs.location_countries : [];
        const langs = Array.isArray(gs.languages) ? gs.languages : [];

        const ops = [];

        for (const c of countries) {
            const geo = this._geoResourceForCountry(c);
            if (!geo) {
                logger.warn('GOOGLE_ADAPTER', `No geoTargetConstant mapping for country "${c}" — add to GEO_BY_COUNTRY or set targeting in Google Ads UI`);
                continue;
            }
            ops.push({
                campaign: campaignResourceName,
                location: { geo_target_constant: geo },
                negative: false
            });
        }

        for (const lang of langs) {
            const lc = this._languageResourceForCode(lang);
            if (!lc) {
                logger.warn('GOOGLE_ADAPTER', `No languageConstant mapping for "${lang}" — add to LANGUAGE_BY_CODE or set languages in Google Ads UI`);
                continue;
            }
            ops.push({
                campaign: campaignResourceName,
                language: { language_constant: lc },
                negative: false
            });
        }

        if (ops.length === 0) return;

        try {
            await customer.campaignCriteria.create(ops);
            logger.info('GOOGLE_ADAPTER', `Applied ${ops.length} campaign criteria (geo/language)`);
        } catch (err) {
            const msg = this._extractErrorMessage(err);
            logger.error('GOOGLE_ADAPTER', `Campaign criteria (geo/language) failed: ${msg}`, { error: err });
            throw new Error(`Geo/Language targeting failed: ${msg}`);
        }
    }

    async _applyPlacementCriteria(customer, adGroupResourceName, placementTargets) {
        const list = Array.isArray(placementTargets) ? placementTargets : [];
        const ops = [];
        for (let raw of list) {
            let url = String(raw || '').trim();
            if (!url) continue;
            if (!/^https?:\/\//i.test(url)) {
                url = `https://${url}`;
            }
            ops.push({
                ad_group: adGroupResourceName,
                placement: { url },
                negative: false
            });
        }
        if (ops.length === 0) return;
        try {
            await customer.adGroupCriteria.create(ops);
            logger.info('GOOGLE_ADAPTER', `Applied ${ops.length} placement criteria`);
        } catch (err) {
            const msg = this._extractErrorMessage(err);
            logger.error('GOOGLE_ADAPTER', `Placement criteria failed: ${msg}`, { error: err });
            throw new Error(`Placement targeting failed: ${msg}`);
        }
    }

    /**
     * Map internal model to Google Ads format
     */
    mapCampaign(campaign) {
        const adFormat = (campaign.google_settings && campaign.google_settings.ad_format) || 'SEARCH';
        return {
            name: campaign.name,
            google_ad_format: adFormat,
            advertising_channel_type: adFormat === 'DISPLAY' ? 'DISPLAY' : 'SEARCH',
            google_settings: campaign.google_settings || { languages: [], location_countries: [] },
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

            // Pre-flight: block publishing into Manager/MCC accounts.
            // The Google Ads API does not allow creating campaigns directly in MCCs.
            try {
                const rows = await customer.query(`
                    SELECT
                      customer.id,
                      customer.descriptive_name,
                      customer.manager
                    FROM customer
                    LIMIT 1
                `);
                const isManager = !!(rows && rows[0] && rows[0].customer && rows[0].customer.manager);
                if (isManager) {
                    return {
                        success: false,
                        error: 'Google Ads Error: The selected Google Ads account is a Manager (MCC) account. Please select a client (non-manager) ad account to publish campaigns.'
                    };
                }
            } catch (preflightErr) {
                // If we cannot query customer metadata, continue and let the API surface the exact error.
                // But include additional context to reduce confusion.
                logger.warn('GOOGLE_ADAPTER', 'Preflight customer query failed (continuing)', { message: preflightErr.message });
            }

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

            const isDisplay = data.google_ad_format === 'DISPLAY';

            // 2. Create Campaign
            const campaignData = [{
                name: data.name,
                advertising_channel_type: isDisplay ? 3 : 2, // DISPLAY = 3, SEARCH = 2
                status: 3, // PAUSED = 3
                campaign_budget: budgetId,
                // EU Political Advertising declaration is REQUIRED since Google Ads API v19.2+
                // (EU TTPA regulation enforcement). Enum value 3 = DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
                contains_eu_political_advertising: 3,
                ...(isDisplay
                    ? {
                        // Use a simpler bidding configuration for Display campaigns.
                        // This avoids having to supply `campaign_bidding_strategy` as a bidding
                        // strategy *resource name* (which requires an additional API call).
                        manual_cpc: {
                            enhanced_cpc_enabled: false
                        }
                    }
                    : {
                        // Search: In API v23, 'maximize_clicks' on Search is often expressed via target_spend
                        target_spend: {
                            cpc_bid_ceiling_micros: 100000000 // $100 Max CPC limit
                        }
                    }),
                network_settings: isDisplay
                    ? {
                        target_google_search: false,
                        target_search_network: false,
                        target_content_network: true,
                        target_partner_search_network: false
                    }
                    : {
                        target_google_search: true,
                        target_search_network: true,
                        target_content_network: false,
                        target_partner_search_network: false
                    }
            }];

            logger.info('GOOGLE_ADAPTER', `STEP 2: Creating Campaign (${isDisplay ? 'DISPLAY' : 'SEARCH'})`, { campaignData: JSON.stringify(campaignData) });

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

            if (isDisplay) {
                try {
                    await this._applyGeoAndLanguageCriteria(customer, campaignResourceName, data.google_settings);
                } catch (critErr) {
                    return { success: false, error: critErr.message || String(critErr) };
                }
            }

            // 3. Create Ad Groups and Ads
            for (const ag of data.ad_groups) {
                const adGroupData = [{
                    name: ag.name || `${data.name} - Ad Group`,
                    campaign: campaignResourceName,
                    status: 3, // PAUSED = 3
                    type: isDisplay ? 3 : 2 // DISPLAY_STANDARD = 3, SEARCH_STANDARD = 2
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

                if (isDisplay && ag.targeting && ag.targeting.audience_description) {
                    logger.info('GOOGLE_ADAPTER', 'Display audience context (refine in Google Ads with interests / segments)', {
                        audience_description: ag.targeting.audience_description
                    });
                }

                if (isDisplay) {
                    try {
                        await this._applyPlacementCriteria(
                            customer,
                            adGroupResourceName,
                            (ag.targeting && ag.targeting.placement_targets) || []
                        );
                    } catch (plErr) {
                        return { success: false, error: plErr.message || String(plErr) };
                    }
                }

                if (ag.creatives) {
                    for (const creative of ag.creatives) {
                        const headlines = (creative.headlines || []).map(h => ({ text: h.text || h }));
                        const descriptions = (creative.descriptions || []).map(d => ({ text: d.text || d }));

                        if (isDisplay) {
                            let landscapeAsset;
                            let squareAsset;
                            let logoAsset;
                            try {
                                landscapeAsset = await this._createImageAsset(
                                    customer,
                                    creative.landscape_image_filename,
                                    'landscape'
                                );
                                squareAsset = await this._createImageAsset(
                                    customer,
                                    creative.square_image_filename,
                                    'square'
                                );
                                logoAsset = await this._createImageAsset(
                                    customer,
                                    creative.logo_filename,
                                    'logo'
                                );
                            } catch (imgErr) {
                                const msg = this._extractErrorMessage(imgErr);
                                logger.error('GOOGLE_ADAPTER', `Image asset upload failed: ${msg}`, { error: imgErr });
                                return { success: false, error: `Google Ads Error (Image Asset): ${msg}` };
                            }

                            while (headlines.length < 3) {
                                headlines.push({ text: `Headline ${headlines.length + 1}` });
                            }
                            while (descriptions.length < 2) {
                                descriptions.push({ text: `Description ${descriptions.length + 1}` });
                            }

                            const headlineTexts = headlines.map(h => h.text).filter(Boolean);
                            const longHeadlineSource = headlineTexts[0] || data.name || 'Your business';
                            const longHeadline = { text: String(longHeadlineSource).slice(0, 90) };

                            const finalUrls = (creative.final_urls || []).map(u => String(u || '').trim()).filter(Boolean);
                            const destUrl = finalUrls[0] || 'https://example.com';

                            const adGroupAdData = [{
                                status: 3,
                                ad_group: adGroupResourceName,
                                ad: {
                                    final_urls: finalUrls.length ? finalUrls : [destUrl],
                                    responsive_display_ad: {
                                        marketing_images: [{ asset: landscapeAsset }],
                                        square_marketing_images: [{ asset: squareAsset }],
                                        logo_images: [{ asset: logoAsset }],
                                        headlines: headlines.slice(0, 5),
                                        long_headline: longHeadline,
                                        descriptions: descriptions.slice(0, 5),
                                        business_name: String(creative.business_name || 'Business').slice(0, 25),
                                        call_to_action_text: this._displayCtaText(creative.call_to_action_type)
                                    }
                                }
                            }];

                            logger.info('GOOGLE_ADAPTER', `STEP 4: Creating Responsive Display Ad`, { adGroup: adGroupResourceName });

                            try {
                                await customer.adGroupAds.create(adGroupAdData);
                                logger.info('GOOGLE_ADAPTER', `STEP 4 SUCCESS: Display ad created in group ${adGroupResourceName}`);
                            } catch (adError) {
                                const msg = this._extractErrorMessage(adError);
                                logger.error('GOOGLE_ADAPTER', `STEP 4 FAILED: Display ad creation failed: ${msg}`, { error: adError });
                                return { success: false, error: `Google Ads Error (Ad Creative): ${msg}` };
                            }
                        } else {
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

                            logger.info('GOOGLE_ADAPTER', `STEP 4: Creating Search Ad`, { adData: JSON.stringify(adGroupAdData) });

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
        try {
            const fs = require('fs');
            const data = {
                msg: error.message,
                errors: error.errors ? error.errors.map(e => ({ name: e.name, message: e.message, path: JSON.stringify(e.location || e.fieldPathElements || e) })) : null,
                failure: error.failure ? JSON.stringify(error.failure) : null
            };
            fs.writeFileSync('C:\\ads-manager\\server\\debug_err.json', JSON.stringify(data, null, 2));
        } catch(e) {}
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

    /**
     * Pause/stop a campaign on Google Ads (set status to PAUSED)
     */
    async pauseCampaign(credentials, externalId) {
        logger.info('GOOGLE_ADAPTER', `Pausing campaign ${externalId} on platform...`);
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

            await customer.campaigns.update([
                {
                    resource_name: `customers/${credentials.platform_account_id}/campaigns/${externalId}`,
                    status: 3 // PAUSED = 3
                }
            ]);

            return { success: true, platformId: externalId };
        } catch (error) {
            logger.error('GOOGLE_ADAPTER', 'Failed to pause Google campaign', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new GoogleAdapter();
