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
        // Connect to MongoDB (driver 4+ uses new URL parser and unified topology by default)
        await mongoose.connect(mongoUri);

        logger.info('DATABASE', 'MongoDB connected successfully');
        logger.success('DATABASE', `Connected to: ${mongoose.connection.name}`);

    } catch (error) {
        const hint = error.message && error.message.includes('whitelist')
            ? ' Fix: Add your current IP to MongoDB Atlas Network Access (IP Access List), or use a local MongoDB by setting MONGO_URI=mongodb://127.0.0.1:27017/ads-manager in .env'
            : '';
        logger.error('DATABASE', `MongoDB connection failed: ${error.message}.${hint}`, error);
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
