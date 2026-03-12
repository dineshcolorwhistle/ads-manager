const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * User Repository
 * Database access layer for User model
 * Per rules.md section 1.3 - Repository pattern for database access
 */

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData) => {
    try {
        const user = new User(userData);
        await user.save();
        logger.success('USER_REPOSITORY', `User created: ${user.email}`);
        return user;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to create user', error);
        throw error;
    }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User or null
 */
const findUserByEmail = async (email) => {
    try {
        // Include password for authentication
        const user = await User.findOne({ email }).select('+password');
        return user;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to find user by email', error);
        throw error;
    }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User or null
 */
const findUserById = async (userId) => {
    try {
        const user = await User.findById(userId);
        return user;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to find user by ID', error);
        throw error;
    }
};

/**
 * Find all users for a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Array of users
 */
const findUsersByClientId = async (clientId) => {
    try {
        const users = await User.find({ client_id: clientId });
        return users;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to find users by client ID', error);
        throw error;
    }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object|null>} Updated user or null
 */
const updateUser = async (userId, updates) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { ...updates, updated_at: new Date() },
            { new: true, runValidators: true }
        );

        if (user) {
            logger.success('USER_REPOSITORY', `User updated: ${user.email}`);
        }

        return user;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to update user', error);
        throw error;
    }
};

/**
 * Soft delete user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Deleted user or null
 */
const softDeleteUser = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            return null;
        }

        await user.softDelete();
        logger.success('USER_REPOSITORY', `User soft deleted: ${user.email}`);

        return user;
    } catch (error) {
        logger.error('USER_REPOSITORY', 'Failed to soft delete user', error);
        throw error;
    }
};

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUsersByClientId,
    updateUser,
    softDeleteUser
};
