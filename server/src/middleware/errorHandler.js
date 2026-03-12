const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 * Per rules.md section 7.2 and 10.2
 */

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
    // Log error with stack trace
    logger.error('ERROR_HANDLER', `${err.message} - ${req.method} ${req.path}`, err);

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Determine error code
    const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

    // Never expose internal error details to clients
    const message = statusCode === 500
        ? 'An internal server error occurred'
        : err.message;

    // Return consistent error response format (per rules.md section 10.2)
    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: message
        },
        timestamp: new Date().toISOString() // UTC timestamp
    });
};

/**
 * 404 Not Found handler
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const notFoundHandler = (req, res) => {
    logger.warn('NOT_FOUND', `Route not found: ${req.method} ${req.path}`);

    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found'
        },
        timestamp: new Date().toISOString() // UTC timestamp
    });
};

module.exports = { errorHandler, notFoundHandler };
