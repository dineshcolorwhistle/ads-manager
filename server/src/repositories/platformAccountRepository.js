const PlatformAccount = require('../models/PlatformAccount');
const logger = require('../utils/logger');

/**
 * Platform Account Repository
 * Database access for discovered ad accounts
 */

const upsertAccount = async (accountData) => {
    try {
        const { client_id, platform, platform_account_id } = accountData;

        const account = await PlatformAccount.findOneAndUpdate(
            { client_id, platform, platform_account_id },
            { ...accountData, updated_at: new Date() },
            { upsert: true, new: true, runValidators: true }
        );

        return account;
    } catch (error) {
        logger.error('PLATFORM_ACCOUNT_REPOSITORY', 'Failed to upsert account', error);
        throw error;
    }
};

const findAccountsByClient = async (clientId) => {
    try {
        return await PlatformAccount.find({ client_id: clientId });
    } catch (error) {
        logger.error('PLATFORM_ACCOUNT_REPOSITORY', 'Failed to find accounts', error);
        throw error;
    }
};

const deleteAccountsByCredential = async (credentialId) => {
    try {
        const result = await PlatformAccount.deleteMany({ oauth_credential_id: credentialId });
        logger.success('PLATFORM_ACCOUNT_REPOSITORY', `Deleted ${result.deletedCount} accounts for credential ${credentialId}`);
        return result;
    } catch (error) {
        logger.error('PLATFORM_ACCOUNT_REPOSITORY', 'Failed to delete accounts', error);
        throw error;
    }
};

const deleteAccountsByClientAndPlatform = async (clientId, platform) => {
    try {
        const result = await PlatformAccount.deleteMany({ client_id: clientId, platform });
        logger.success('PLATFORM_ACCOUNT_REPOSITORY', `Deleted ${result.deletedCount} accounts for ${platform}`);
        return result;
    } catch (error) {
        logger.error('PLATFORM_ACCOUNT_REPOSITORY', 'Failed to delete accounts by client and platform', error);
        throw error;
    }
};

const deleteAccount = async (accountId) => {
    try {
        const result = await PlatformAccount.deleteOne({ _id: accountId });
        return result;
    } catch (error) {
        logger.error('PLATFORM_ACCOUNT_REPOSITORY', 'Failed to delete account', error);
        throw error;
    }
};

module.exports = {
    upsertAccount,
    findAccountsByClient,
    deleteAccountsByCredential,
    deleteAccountsByClientAndPlatform,
    deleteAccount
};
