const logger = require('../utils/logger');

/**
 * Public API Key Auth Middleware
 * Protects "public" endpoints using a shared API key.
 *
 * Header: x-api-key: <PUBLIC_API_KEY>
 */
module.exports = function publicApiKeyAuth(req, res, next) {
    try {
        const configuredKey = process.env.PUBLIC_API_KEY;
        if (!configuredKey || String(configuredKey).trim() === '') {
            logger.error('PUBLIC_API_KEY_AUTH', 'PUBLIC_API_KEY is not configured');
            return res.status(500).json({
                success: false,
                error: { code: 'SERVER_MISCONFIGURED', message: 'PUBLIC_API_KEY is not configured' },
                timestamp: new Date().toISOString()
            });
        }

        const providedKey = req.headers['x-api-key'];
        if (!providedKey || String(providedKey).trim() === '') {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'x-api-key header is required' },
                timestamp: new Date().toISOString()
            });
        }

        if (String(providedKey) !== String(configuredKey)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Invalid API key' },
                timestamp: new Date().toISOString()
            });
        }

        return next();
    } catch (error) {
        logger.error('PUBLIC_API_KEY_AUTH', 'API key auth failed', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal server error occurred' },
            timestamp: new Date().toISOString()
        });
    }
};

