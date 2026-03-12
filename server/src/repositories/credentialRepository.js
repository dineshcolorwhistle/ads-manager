const OAuthCredential = require('../models/OAuthCredential');
const logger = require('../utils/logger');

/**
 * Credential Repository
 * Database access for platform OAuth credentials
 */

const upsertCredential = async (credentialData) => {
    try {
        const { client_id, platform, platform_account_id } = credentialData;

        // Find existing or create new
        const credential = await OAuthCredential.findOneAndUpdate(
            { client_id, platform, platform_account_id },
            { ...credentialData, updated_at: new Date() },
            { upsert: true, new: true, runValidators: true }
        );

        logger.success('CREDENTIAL_REPOSITORY', `Credential upserted for ${platform} (${platform_account_id})`);
        return credential;
    } catch (error) {
        logger.error('CREDENTIAL_REPOSITORY', 'Failed to upsert credential', error);
        throw error;
    }
};

const findCredentialByClientAndPlatform = async (clientId, platform, platformAccountId) => {
    try {
        const query = { client_id: clientId, platform };
        if (platformAccountId) {
            query.platform_account_id = platformAccountId;
        }

        // Return only the most recent one for now, or use platform_account_id if provided
        return await OAuthCredential.findOne(query)
            .sort({ updated_at: -1 });
    } catch (error) {
        logger.error('CREDENTIAL_REPOSITORY', 'Failed to find credential', error);
        throw error;
    }
};

const deleteCredential = async (id) => {
    try {
        const result = await OAuthCredential.findByIdAndDelete(id);
        if (result) {
            logger.success('CREDENTIAL_REPOSITORY', `Credential deleted: ${id}`);
        }
        return result;
    } catch (error) {
        logger.error('CREDENTIAL_REPOSITORY', 'Failed to delete credential', error);
        throw error;
    }
};

const deleteCredentialsByClientAndPlatform = async (clientId, platform) => {
    try {
        const result = await OAuthCredential.deleteMany({ client_id: clientId, platform });
        logger.success('CREDENTIAL_REPOSITORY', `Deleted ${result.deletedCount} credentials for ${platform}`);
        return result;
    } catch (error) {
        logger.error('CREDENTIAL_REPOSITORY', 'Failed to delete credentials by client and platform', error);
        throw error;
    }
};

const findConnectedPlatformsByClient = async (clientId) => {
    try {
        const credentials = await OAuthCredential.find({ client_id: clientId })
            .select('platform platform_account_id')
            .sort({ updated_at: -1 });

        // Deduplicate by platform (keep the most recently updated credential per platform)
        const seen = new Set();
        const uniquePlatforms = [];
        for (const cred of credentials) {
            if (!seen.has(cred.platform)) {
                seen.add(cred.platform);
                uniquePlatforms.push({
                    platform: cred.platform,
                    platform_account_id: cred.platform_account_id
                });
            }
        }
        return uniquePlatforms;
    } catch (error) {
        logger.error('CREDENTIAL_REPOSITORY', 'Failed to find connected platforms', error);
        throw error;
    }
};

module.exports = {
    upsertCredential,
    findCredentialByClientAndPlatform,
    findConnectedPlatformsByClient,
    deleteCredential,
    deleteCredentialsByClientAndPlatform
};
