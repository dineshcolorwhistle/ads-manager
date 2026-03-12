const UserApiCredential = require('../models/UserApiCredential');
const logger = require('../utils/logger');

/**
 * User API Credential Repository
 * Handles DB operations for user-specific API configurations
 */

const upsertCredential = async (clientId, platform, config) => {
    try {
        let credential = await UserApiCredential.findOne({ client_id: clientId, platform });

        if (!credential) {
            credential = new UserApiCredential({
                client_id: clientId,
                platform
            });
        }

        credential.setConfig(config);
        await credential.save();

        logger.success('USER_API_CREDENTIAL_REPOSITORY', `API Config updated for client ${clientId} on ${platform}`);
        return credential;
    } catch (error) {
        logger.error('USER_API_CREDENTIAL_REPOSITORY', 'Failed to upsert API config', error);
        throw error;
    }
};

const findByClientAndPlatform = async (clientId, platform) => {
    try {
        return await UserApiCredential.findOne({ client_id: clientId, platform });
    } catch (error) {
        logger.error('USER_API_CREDENTIAL_REPOSITORY', 'Failed to find API config', error);
        throw error;
    }
};

const deleteCredential = async (clientId, platform) => {
    try {
        const result = await UserApiCredential.deleteOne({ client_id: clientId, platform });
        if (result.deletedCount > 0) {
            logger.success('USER_API_CREDENTIAL_REPOSITORY', `API Config deleted for client ${clientId} on ${platform}`);
        }
        return result;
    } catch (error) {
        logger.error('USER_API_CREDENTIAL_REPOSITORY', 'Failed to delete API config', error);
        throw error;
    }
};

module.exports = {
    upsertCredential,
    findByClientAndPlatform,
    deleteCredential
};
