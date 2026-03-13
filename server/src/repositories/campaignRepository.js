const Campaign = require('../models/Campaign');

/**
 * Campaign Repository
 * Database access layer for Campaign model
 * Enforces client_id isolation on all queries
 */

const create = async (data) => {
    return await Campaign.create(data);
};

const findById = async (id, clientId) => {
    const query = { _id: id };
    if (clientId) {
        query.client_id = clientId;
    }
    return await Campaign.findOne(query).populate('created_by', 'name email');
};

const findAllByClient = async (clientId, filters = {}) => {
    const query = { ...filters };
    if (clientId) {
        query.client_id = clientId;
    }
    return await Campaign.find(query).populate('created_by', 'name email').sort({ created_at: -1 });
};

const update = async (id, clientId, updateData) => {
    const query = { _id: id };
    if (clientId) {
        query.client_id = clientId;
    }
    return await Campaign.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true, runValidators: true }
    );
};

const deleteCampaign = async (id, clientId) => {
    const query = { _id: id };
    if (clientId) {
        query.client_id = clientId;
    }
    // Phase 3 uses soft delete logic as per schema default query filters
    return await Campaign.findOneAndUpdate(
        query,
        { $set: { deleted_at: new Date() } },
        { new: true }
    );
};

const countByClient = async (clientId, filters = {}) => {
    const query = { ...filters };
    if (clientId) {
        query.client_id = clientId;
    }
    return await Campaign.countDocuments(query);
};

/**
 * Pause all campaigns for a client/platform combination.
 * Used when a platform connection is disconnected.
 */
const pauseByClientAndPlatform = async (clientId, platform) => {
    const query = { client_id: clientId, platform };
    // Only pause campaigns that are currently live or ready to go live.
    query.status = { $in: ['READY', 'PUBLISHING', 'ACTIVE'] };

    return await Campaign.updateMany(
        query,
        {
            $set: { status: 'PAUSED' }
        }
    );
};

module.exports = {
    create,
    findById,
    findAllByClient,
    update,
    deleteCampaign,
    countByClient,
    pauseByClientAndPlatform
};
