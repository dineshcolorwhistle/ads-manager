const fs = require('fs');
const path = require('path');

/**
 * Environment Configuration Loader
 * Loads and validates required environment variables
 */

// Load .env file
require('dotenv').config({
    path: require('path').resolve(__dirname, '../../.env')
});

/**
 * Get environment variable with validation
 * @param {string} key - Environment variable name
 * @param {string} defaultValue - Default value if not set
 * @param {boolean} required - Whether the variable is required
 * @returns {string} Environment variable value
 */
const getEnvVar = (key, defaultValue = null, required = false) => {
    const value = process.env[key] || defaultValue;

    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
};

/**
 * Environment configuration object
 */
const config = {
    // Server Configuration
    port: parseInt(getEnvVar('PORT', '5000'), 10),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),

    // Database: use MONGO_URI if set; in development fall back to local MongoDB so app can run without Atlas
    mongoUri: getEnvVar('MONGO_URI', 'mongodb://127.0.0.1:27017/ads-manager', false),

    // Logging
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
};

/**
 * Validate configuration
 */
const validateConfig = () => {
    if (!config.mongoUri || config.mongoUri.trim() === '') {
        throw new Error('MONGO_URI is required in environment variables (or use default local MongoDB in development)');
    }

    if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
        throw new Error('PORT must be a valid port number (1-65535)');
    }

    console.log('✅ Environment configuration validated');
};

// Validate on load
validateConfig();

module.exports = config;
