const tokenRefreshService = require('./tokenRefreshService');
const logger = require('../utils/logger');

/**
 * Background Job Service
 * Manages periodic tasks like token refreshes
 */

let refreshInterval = null;

/**
 * Start the token refresh background job
 * Runs every 15 minutes to check for tokens expiring in the next 30 minutes
 */
const startTokenRefreshJob = () => {
    if (refreshInterval) {
        logger.warn('BACKGROUND_JOBS', 'Token refresh job is already running');
        return;
    }

    logger.info('BACKGROUND_JOBS', 'Starting automated token refresh job (15m interval)');

    // Run immediately on start - Wrapped in a safety block
    setTimeout(async () => {
        try {
            await tokenRefreshService.refreshAllExpiringTokens();
        } catch (err) {
            logger.error('BACKGROUND_JOBS', 'Initial token refresh check failed', err);
        }
    }, 1000); // Wait 1 second after server starts

    // Schedule periodic runs (15 minutes = 15 * 60 * 1000 ms)
    refreshInterval = setInterval(async () => {
        try {
            const result = await tokenRefreshService.refreshAllExpiringTokens();
            if (result.checked > 0) {
                logger.info('BACKGROUND_JOBS', `Automated refresh check complete. Tokens checked/refreshed: ${result.checked}`);
            }
        } catch (error) {
            logger.error('BACKGROUND_JOBS', 'Automated token refresh failed', error);
        }
    }, 15 * 60 * 1000);
};

/**
 * Stop all background jobs
 */
const stopAllJobs = () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        logger.info('BACKGROUND_JOBS', 'Stopped token refresh job');
    }
};

module.exports = {
    startTokenRefreshJob,
    stopAllJobs
};
