const logger = require('../utils/logger');

/**
 * Client Isolation Middleware
 * Enforces client-level data isolation for multi-tenancy
 * Per rules.md section 6 - Multi-tenancy isolation
 */

/**
 * Enforce client isolation
 * Ensures CLIENT role users can only access their own client's data
 * ADMIN role users can access all clients
 */
const enforceClientIsolation = (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            logger.warn('CLIENT_ISOLATION', 'User not authenticated');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Attach client_id to request for easy access
        req.client_id = req.user.client_id;

        // ADMIN role can access all clients (no filtering)
        if (req.user.role === 'ADMIN') {
            logger.debug('CLIENT_ISOLATION', 'Admin user - no client isolation');
            return next();
        }

        // CLIENT role must have client_id
        if (req.user.role === 'CLIENT' && !req.user.client_id) {
            logger.error('CLIENT_ISOLATION', 'CLIENT role user missing client_id');
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Invalid user configuration'
                },
                timestamp: new Date().toISOString()
            });
        }

        logger.debug('CLIENT_ISOLATION', `Client isolation enforced for client: ${req.client_id}`);

        next();

    } catch (error) {
        logger.error('CLIENT_ISOLATION', 'Client isolation check failed', error);

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Helper function to filter query by client_id
 * Use in services/repositories to enforce client isolation
 * @param {Object} query - Mongoose query object
 * @param {Object} req - Express request object
 * @returns {Object} Modified query with client_id filter
 */
const filterByClient = (query, req) => {
    // ADMIN can access all clients
    if (req.user.role === 'ADMIN') {
        return query;
    }

    // CLIENT role - filter by client_id
    if (req.user.role === 'CLIENT') {
        query.client_id = req.user.client_id;
    }

    return query;
};

module.exports = {
    enforceClientIsolation,
    filterByClient
};
