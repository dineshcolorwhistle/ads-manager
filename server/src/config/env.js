const fs = require('fs');
const path = require('path');

/**
 * Environment Configuration Loader
 * Loads and validates required environment variables
 */

// Load .env file
require('dotenv').config();

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

    // Database Configuration
    mongoUri: getEnvVar('MONGO_URI', null, true),

    // Logging
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
};

/**
 * Validate configuration
 */
const validateConfig = () => {
    if (!config.mongoUri) {
        throw new Error('MONGO_URI is required in environment variables');
    }

    if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
        throw new Error('PORT must be a valid port number (1-65535)');
    }

    console.log('✅ Environment configuration validated');
};

// Validate on load
validateConfig();

module.exports = config;
