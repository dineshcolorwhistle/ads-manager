const logger = require('../utils/logger');

/**
 * RBAC (Role-Based Access Control) Middleware
 * Enforces role-based access restrictions
 * Per rules.md section 2.1 - RBAC from Phase 1
 */

/**
 * Require specific role(s) to access route
 * @param {...string} allowedRoles - Roles allowed to access the route
 * @returns {Function} Middleware function
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                logger.warn('RBAC_MIDDLEWARE', 'User not authenticated');
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // Check if user role is allowed
            if (!allowedRoles.includes(req.user.role)) {
                logger.warn('RBAC_MIDDLEWARE', `Access denied for role: ${req.user.role}`);
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to access this resource'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            logger.debug('RBAC_MIDDLEWARE', `Access granted for role: ${req.user.role}`);

            next();

        } catch (error) {
            logger.error('RBAC_MIDDLEWARE', 'RBAC check failed', error);

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
};

module.exports = { requireRole };
