const AdGroup = require('../models/AdGroup');

/**
 * AdGroup Repository
 * Database access layer for AdGroup model
 * Enforces client_id isolation
 */

const create = async (data) => {
    return await AdGroup.create(data);
};

const findById = async (id, clientId) => {
    return await AdGroup.findOne({ _id: id, client_id: clientId });
};

const findAllByCampaign = async (campaignId, clientId) => {
    return await AdGroup.find({ campaign_id: campaignId, client_id: clientId });
};

const update = async (id, clientId, updateData) => {
    return await AdGroup.findOneAndUpdate(
        { _id: id, client_id: clientId },
        { $set: updateData },
        { new: true, runValidators: true }
    );
};

const deleteByCampaign = async (campaignId, clientId) => {
    return await AdGroup.deleteMany({ campaign_id: campaignId, client_id: clientId });
};

const deleteOne = async (id, clientId) => {
    return await AdGroup.findOneAndDelete({ _id: id, client_id: clientId });
};

module.exports = {
    create,
    findById,
    findAllByCampaign,
    update,
    deleteByCampaign,
    deleteOne
};
