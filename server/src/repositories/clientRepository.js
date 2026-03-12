const Client = require('../models/Client');
const logger = require('../utils/logger');

/**
 * Client Repository
 * Database access layer for Client model
 * Per rules.md section 1.3 - Repository pattern for database access
 */

/**
 * Create a new client
 * @param {Object} clientData - Client data
 * @returns {Promise<Object>} Created client
 */
const createClient = async (clientData) => {
    try {
        const client = new Client(clientData);
        await client.save();
        logger.success('CLIENT_REPOSITORY', `Client created: ${client.name}`);
        return client;
    } catch (error) {
        logger.error('CLIENT_REPOSITORY', 'Failed to create client', error);
        throw error;
    }
};

/**
 * Find client by ID
 * @param {string} clientId - Client ID
 * @returns {Promise<Object|null>} Client or null
 */
const findClientById = async (clientId) => {
    try {
        const client = await Client.findById(clientId);
        return client;
    } catch (error) {
        logger.error('CLIENT_REPOSITORY', 'Failed to find client by ID', error);
        throw error;
    }
};

/**
 * Find client by name
 * @param {string} name - Client name
 * @returns {Promise<Object|null>} Client or null
 */
const findClientByName = async (name) => {
    try {
        const client = await Client.findOne({ name });
        return client;
    } catch (error) {
        logger.error('CLIENT_REPOSITORY', 'Failed to find client by name', error);
        throw error;
    }
};

/**
 * Update client
 * @param {string} clientId - Client ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object|null>} Updated client or null
 */
const updateClient = async (clientId, updates) => {
    try {
        const client = await Client.findByIdAndUpdate(
            clientId,
            { ...updates, updated_at: new Date() },
            { new: true, runValidators: true }
        );

        if (client) {
            logger.success('CLIENT_REPOSITORY', `Client updated: ${client.name}`);
        }

        return client;
    } catch (error) {
        logger.error('CLIENT_REPOSITORY', 'Failed to update client', error);
        throw error;
    }
};

/**
 * Soft delete client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object|null>} Deleted client or null
 */
const softDeleteClient = async (clientId) => {
    try {
        const client = await Client.findById(clientId);

        if (!client) {
            return null;
        }

        await client.softDelete();
        logger.success('CLIENT_REPOSITORY', `Client soft deleted: ${client.name}`);

        return client;
    } catch (error) {
        logger.error('CLIENT_REPOSITORY', 'Failed to soft delete client', error);
        throw error;
    }
};

module.exports = {
    createClient,
    findClientById,
    findClientByName,
    updateClient,
    softDeleteClient
};
