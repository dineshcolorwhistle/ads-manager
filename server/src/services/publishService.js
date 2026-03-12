const campaignRepository = require('../repositories/campaignRepository');
const googleAdapter = require('../platforms/googleAdapter');
const metaAdapter = require('../platforms/metaAdapter');
const credentialRepository = require('../repositories/credentialRepository');
const userApiCredentialRepository = require('../repositories/userApiCredentialRepository');
const logger = require('../utils/logger');
const campaignService = require('./campaignService'); // For validation logic

/**
 * Publish Service
 * Handles the orchestration of campaign publishing
 */

/**
 * Trigger campaign publishing
 * @param {string} campaignId 
 * @param {string} clientId 
 */
const publishCampaign = async (campaignId, clientId) => {
    // 1. Fetch campaign and verify ownership/state
    const campaign = await campaignService.getCampaignFull(campaignId, clientId);

    if (!campaign) {
        throw new Error('Campaign not found');
    }

    if (campaign.status !== 'READY') {
        throw new Error(`Only READY campaigns can be published. Current status: ${campaign.status}`);
    }

    // 2. Platform-specific validation (re-run Phase 3 checks)
    const errors = await campaignService.validatePlatformSpecific(campaign.platform, campaignId, clientId);
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('. ')}`);
    }

    // 3. Update status to PUBLISHING
    await campaignRepository.update(campaignId, clientId, {
        status: 'PUBLISHING',
        $push: { publish_logs: { status: 'PUBLISHING', message: 'Publishing initiated' } }
    });

    // 4. Trigger ASYNC background processing (MERN-Only / No Redis)
    // Using setImmediate to let the event loop finish the request first
    setImmediate(() => {
        processPublish(campaignId, clientId).catch(err => {
            logger.error('PUBLISH_SERVICE', `Background process failed for ${campaignId}`, err);
        });
    });

    return { success: true, message: 'Publishing started in background' };
};

/**
 * Background processor for publishing
 * This runs out-of-band of the HTTP request
 */
const processPublish = async (campaignId, clientId) => {
    try {
        const campaign = await campaignService.getCampaignFull(campaignId, clientId);
        const adapter = campaign.platform === 'google' ? googleAdapter : metaAdapter;

        // Map internal data to platform format
        const platformData = adapter.mapCampaign(campaign);

        // Fetch actual platform credentials
        const credential = await credentialRepository.findCredentialByClientAndPlatform(
            clientId,
            campaign.platform,
            campaign.platform_account_id
        );

        if (!credential) {
            throw new Error(`Platform connection for ${campaign.platform} account ${campaign.platform_account_id} not found.`);
        }

        // Fetch user-specific API configuration (IDs and Secrets)
        const userApiCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, campaign.platform);
        const config = userApiCred ? userApiCred.getConfig() : {};

        const credentials = {
            access_token: credential.access_token,
            refresh_token: credential.refresh_token,
            // Use user-specific config or fallback to .env
            client_id: campaign.platform === 'google'
                ? (config.clientId || process.env.GOOGLE_CLIENT_ID)
                : (config.appId || process.env.META_APP_ID),
            client_secret: campaign.platform === 'google'
                ? (config.clientSecret || process.env.GOOGLE_CLIENT_SECRET)
                : (config.appSecret || process.env.META_APP_SECRET),
            developer_token: config.developerToken || process.env.GOOGLE_DEVELOPER_TOKEN,
            platform_account_id: campaign.platform_account_id
        };

        logger.info('PUBLISH_SERVICE', `Processing ${campaign.platform} publish for ${campaignId}`, {
            platform_account_id: credentials.platform_account_id,
            has_access_token: !!credentials.access_token,
            has_refresh_token: !!credentials.refresh_token,
            has_developer_token: !!credentials.developer_token,
            has_client_id: !!credentials.client_id,
            has_client_secret: !!credentials.client_secret
        });

        // Call Platform API
        const result = await adapter.createCampaign(credentials, platformData);

        if (result.success) {
            await campaignRepository.update(campaignId, clientId, {
                status: 'ACTIVE',
                external_id: result.externalId,
                $push: {
                    publish_logs: {
                        status: 'ACTIVE',
                        message: 'Successfully published to platform',
                        details: result.platformResponse
                    }
                }
            });
            logger.success('PUBLISH_SERVICE', `Campaign ${campaignId} is now ACTIVE (${result.externalId})`);
        } else {
            throw new Error(result.error || 'Platform creation failed');
        }

    } catch (error) {
        logger.error('PUBLISH_SERVICE', `Publish failed for ${campaignId}`, error);

        await campaignRepository.update(campaignId, clientId, {
            status: 'FAILED',
            failure_reason: error.message,
            $push: {
                publish_logs: {
                    status: 'FAILED',
                    message: `Publishing failed: ${error.message}`
                }
            }
        });
    }
};

module.exports = {
    publishCampaign
};
