const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger');

/**
 * User Service
 * User management business logic
 * Per rules.md section 1.2 - Service layer for business logic
 */

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
const getUserById = async (userId) => {
    try {
        const user = await userRepository.findUserById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        return user;

    } catch (error) {
        logger.error('USER_SERVICE', 'Failed to get user by ID', error);
        throw error;
    }
};

/**
 * Get users by client ID
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} Array of users
 */
const getUsersByClientId = async (clientId) => {
    try {
        const users = await userRepository.findUsersByClientId(clientId);
        return users;
    } catch (error) {
        logger.error('USER_SERVICE', 'Failed to get users by client ID', error);
        throw error;
    }
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData) => {
    try {
        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(userData.email)) {
            const error = new Error('Invalid email format');
            error.statusCode = 400;
            error.code = 'INVALID_EMAIL';
            throw error;
        }

        // Validate password strength
        if (userData.password && userData.password.length < 8) {
            const error = new Error('Password must be at least 8 characters');
            error.statusCode = 400;
            error.code = 'WEAK_PASSWORD';
            throw error;
        }

        // Validate role
        if (!['ADMIN', 'CLIENT'].includes(userData.role)) {
            const error = new Error('Invalid role. Must be ADMIN or CLIENT');
            error.statusCode = 400;
            error.code = 'INVALID_ROLE';
            throw error;
        }

        // Validate client_id for CLIENT role
        if (userData.role === 'CLIENT' && !userData.client_id) {
            const error = new Error('client_id is required for CLIENT role');
            error.statusCode = 400;
            error.code = 'MISSING_CLIENT_ID';
            throw error;
        }

        // Check if email already exists
        const existingUser = await userRepository.findUserByEmail(userData.email);
        if (existingUser) {
            const error = new Error('Email already exists');
            error.statusCode = 409;
            error.code = 'EMAIL_EXISTS';
            throw error;
        }

        const user = await userRepository.createUser(userData);

        logger.success('USER_SERVICE', `User created: ${user.email}`);

        return user;

    } catch (error) {
        logger.error('USER_SERVICE', 'Failed to create user', error);
        throw error;
    }
};

/**
 * Update user
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (userId, updates) => {
    try {
        // Don't allow updating password through this method
        if (updates.password) {
            delete updates.password;
            logger.warn('USER_SERVICE', 'Attempted to update password through updateUser');
        }

        const user = await userRepository.updateUser(userId, updates);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        logger.success('USER_SERVICE', `User updated: ${user.email}`);

        return user;

    } catch (error) {
        logger.error('USER_SERVICE', 'Failed to update user', error);
        throw error;
    }
};

/**
 * Delete user (soft delete)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deleted user
 */
const deleteUser = async (userId) => {
    try {
        const user = await userRepository.softDeleteUser(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        logger.success('USER_SERVICE', `User deleted: ${user.email}`);

        return user;

    } catch (error) {
        logger.error('USER_SERVICE', 'Failed to delete user', error);
        throw error;
    }
};

module.exports = {
    getUserById,
    getUsersByClientId,
    createUser,
    updateUser,
    deleteUser
};
