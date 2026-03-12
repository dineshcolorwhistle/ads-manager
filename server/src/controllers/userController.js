const userService = require('../services/userService');
const Client = require('../models/Client');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendClientWelcomeEmail } = require('../utils/emailService');

/**
 * User Controller
 * Handles user endpoints (request/response ONLY)
 * Per rules.md section 7.1 - No business logic in controllers
 */

/**
 * Get current user profile
 * GET /users/me
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const getMe = async (req, res) => {
    try {
        // Get user ID from authenticated user
        const userId = req.user.user_id;

        // Call user service (business logic)
        const user = await userService.getUserById(userId);

        // Return success response (per rules.md section 10.2)
        res.status(200).json({
            success: true,
            data: user,
            message: 'User profile retrieved',
            timestamp: new Date().toISOString() // UTC timestamp
        });

    } catch (error) {
        logger.error('USER_CONTROLLER', 'Failed to get user profile', error);

        // Return error response
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Get all users (Admin only)
 * GET /users
 * Enriched with real connected platform status from OAuthCredential
 */
const getUsers = async (req, res) => {
    try {
        const OAuthCredential = require('../models/OAuthCredential');

        // Fetch all users with their client workspace populated
        const users = await User.find({}).populate('client_id');

        // For each user, look up their client's OAuth connections
        const enriched = await Promise.all(users.map(async (user) => {
            const userData = user.toJSON();

            if (user.client_id) {
                // Find all OAuth credentials for this client
                const oauthCreds = await OAuthCredential.find({
                    client_id: user.client_id._id || user.client_id
                }).select('platform token_expiry last_refresh_at created_at');

                // Build connected_platforms array with status details
                userData.connected_platforms = oauthCreds.map(cred => ({
                    platform: cred.platform,
                    token_expiry: cred.token_expiry,
                    last_refresh_at: cred.last_refresh_at,
                    is_expired: cred.token_expiry ? new Date(cred.token_expiry) < new Date() : false,
                    connected_since: cred.created_at
                }));
            } else {
                userData.connected_platforms = [];
            }

            return userData;
        }));

        res.status(200).json({
            success: true,
            data: enriched,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('USER_CONTROLLER', 'Failed to fetch users', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
};

/**
 * Create a new user (Admin only)
 * POST /users
 */
const createUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;

        let client_id = null;

        // If creating a client user, automatically create their workspace 
        if (role === 'CLIENT') {
            const client = new Client({ name: `${name} Workspace` });
            await client.save();
            client_id = client._id;
        }

        // Generate a secure temporary password rather than accepting one from the form
        const generateTempPassword = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
            let pwd = '';
            for (let i = 0; i < 12; i += 1) {
                pwd += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return pwd;
        };

        const tempPassword = generateTempPassword();

        const newUser = await userService.createUser({
            name,
            email,
            password: tempPassword,
            role: role || 'CLIENT',
            client_id,
            status: 'active'
        });

        // Fire-and-forget welcome email with temporary password
        if (role === 'CLIENT') {
            sendClientWelcomeEmail({
                name,
                email,
                tempPassword
            }).catch((err) => {
                logger.error('USER_CONTROLLER', 'Failed to send client welcome email', err);
            });
        }

        res.status(201).json({
            success: true,
            data: newUser,
            message: 'User created successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('USER_CONTROLLER', 'Failed to create user', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'CREATION_FAILED',
                message: error.message || 'Failed to create user'
            }
        });
    }
};

module.exports = {
    getMe,
    getUsers,
    createUser,
    deleteUser
};

/**
 * Delete a user (soft delete) - Admin only
 * DELETE /users/:id
 */
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' }
            });
        }

        // Soft delete
        user.deleted_at = new Date();
        user.status = 'inactive';
        await user.save();

        logger.success('USER_CONTROLLER', `User soft-deleted: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('USER_CONTROLLER', 'Failed to delete user', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_FAILED', message: error.message }
        });
    }
}
