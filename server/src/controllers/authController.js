const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Handles authentication endpoints (request/response ONLY)
 * Per rules.md section 7.1 - No business logic in controllers
 */

/**
 * Login endpoint
 * POST /auth/login
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Call auth service (business logic)
        const result = await authService.login(email, password);

        // Return success response (per rules.md section 10.2)
        res.status(200).json({
            success: true,
            data: result,
            message: 'Login successful',
            timestamp: new Date().toISOString() // UTC timestamp
        });

    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Login failed', error);

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

module.exports = {
    login
};
