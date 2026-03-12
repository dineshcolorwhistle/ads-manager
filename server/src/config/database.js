const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Database Connection
 * Handles connection to MongoDB using Mongoose
 */

/**
 * Connect to MongoDB
 * @param {string} mongoUri - MongoDB connection URI
 * @returns {Promise<void>}
 */
const connectDatabase = async (mongoUri) => {
    try {
        // Mongoose connection options
        const options = {
            // Use new URL parser
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };

        // Connect to MongoDB
        await mongoose.connect(mongoUri, options);

        logger.info('DATABASE', 'MongoDB connected successfully');
        logger.success('DATABASE', `Connected to: ${mongoose.connection.name}`);

    } catch (error) {
        logger.error('DATABASE', `MongoDB connection failed: ${error.message}`, error);
        throw error;
    }
};

/**
 * Handle MongoDB connection events
 */
mongoose.connection.on('connected', () => {
    logger.info('DATABASE', 'Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    logger.error('DATABASE', `Mongoose connection error: ${err.message}`, err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('DATABASE', 'Mongoose disconnected from MongoDB');
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('DATABASE', 'MongoDB connection closed due to app termination');
    process.exit(0);
});

module.exports = { connectDatabase };
