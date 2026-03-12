const AdCreative = require('../models/AdCreative');

/**
 * AdCreative Repository
 * Database access layer for AdCreative model
 * Enforces client_id isolation
 */

const create = async (data) => {
    return await AdCreative.create(data);
};

const findById = async (id, clientId) => {
    return await AdCreative.findOne({ _id: id, client_id: clientId });
};

const findAllByAdGroup = async (adGroupId, clientId) => {
    return await AdCreative.find({ ad_group_id: adGroupId, client_id: clientId });
};

const update = async (id, clientId, updateData) => {
    return await AdCreative.findOneAndUpdate(
        { _id: id, client_id: clientId },
        { $set: updateData },
        { new: true, runValidators: true }
    );
};

const deleteByAdGroup = async (adGroupId, clientId) => {
    return await AdCreative.deleteMany({ ad_group_id: adGroupId, client_id: clientId });
};

const deleteOne = async (id, clientId) => {
    return await AdCreative.findOneAndDelete({ _id: id, client_id: clientId });
};

module.exports = {
    create,
    findById,
    findAllByAdGroup,
    update,
    deleteByAdGroup,
    deleteOne
};
