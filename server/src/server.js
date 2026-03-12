const app = require('./app');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');
const logger = require('./utils/logger');
const backgroundJobService = require('./services/backgroundJobService');

/**
 * Server Bootstrap
 * Initializes database connection and starts Express server
 */

/**
 * Start server
 */
const startServer = async () => {
    try {
        // Connect to MongoDB
        logger.info('SERVER', 'Connecting to MongoDB...');
        await connectDatabase(config.mongoUri);

        // Start Express server
        const server = app.listen(config.port, () => {
            logger.success('SERVER', `Server running on http://localhost:${config.port}`);
            logger.info('SERVER', `Environment: ${config.nodeEnv}`);
            logger.info('SERVER', `Health check: http://localhost:${config.port}/health`);

            // Start background jobs
            backgroundJobService.startTokenRefreshJob();
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SERVER', 'SIGTERM signal received: closing HTTP server');
            server.close(() => {
                backgroundJobService.stopAllJobs();
                logger.info('SERVER', 'HTTP server closed');
            });
        });

    } catch (error) {
        logger.error('SERVER', 'Failed to start server', error);
        process.exit(1);
    }
};

// Start the server
startServer();

