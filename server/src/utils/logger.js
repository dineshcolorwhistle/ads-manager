const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * Provides structured logging with console and file transports
 * Format: [TIMESTAMP] [LEVEL] [MODULE] Message
 */

// Define log format
const logFormat = winston.format.printf(({ timestamp, level, module, message, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}] [${module || 'SYSTEM'}] ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0 && meta.stack) {
        log += `\n${meta.stack}`;
    } else if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }

    return log;
});

// Create Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => {
                // Always use UTC
                return new Date().toISOString();
            }
        }),
        logFormat
    ),
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),

        // File transport for errors (append mode)
        new winston.transports.File({
            filename: path.join(process.cwd(), 'error.log'),
            level: 'error',
            options: { flags: 'a' } // Append mode
        }),

        // File transport for all logs (append mode)
        new winston.transports.File({
            filename: path.join(process.cwd(), 'success.log'),
            level: 'info',
            options: { flags: 'a' } // Append mode
        })
    ]
});

/**
 * Logger wrapper with module context
 */
const createLogger = {
    /**
     * Log info message
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     */
    info: (module, message, meta = {}) => {
        logger.info({ module, message, ...meta });
    },

    /**
     * Log success message
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     */
    success: (module, message, meta = {}) => {
        logger.info({ module, message: `✅ ${message}`, ...meta });
    },

    /**
     * Log warning message
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     */
    warn: (module, message, meta = {}) => {
        logger.warn({ module, message, ...meta });
    },

    /**
     * Log error message
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {Error} error - Error object
     */
    error: (module, message, error = null) => {
        const meta = error ? { stack: error.stack } : {};
        logger.error({ module, message, ...meta });
    },

    /**
     * Log debug message
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     */
    debug: (module, message, meta = {}) => {
        logger.debug({ module, message, ...meta });
    }
};

module.exports = createLogger;
