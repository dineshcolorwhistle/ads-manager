const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user data to request
 * Per rules.md section 2.1 - All endpoints must have RBAC guards from Phase 1
 */

/**
 * Authenticate user via JWT
 * Extracts JWT from Authorization header, verifies it, and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('AUTH_MIDDLEWARE', 'Missing or invalid Authorization header');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                },
                timestamp: new Date().toISOString()
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = authService.verifyToken(token);

        // Attach user data to request
        req.user = {
            user_id: decoded.user_id,
            role: decoded.role,
            client_id: decoded.client_id
        };

        logger.debug('AUTH_MIDDLEWARE', `User authenticated: ${decoded.user_id}`);

        next();

    } catch (error) {
        logger.error('AUTH_MIDDLEWARE', 'Authentication failed', error);

        return res.status(error.statusCode || 401).json({
            success: false,
            error: {
                code: error.code || 'UNAUTHORIZED',
                message: error.message || 'Authentication failed'
            },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = auth;
