const CampaignRequest = require('../models/CampaignRequest');

/**
 * CampaignRequest Repository
 * Isolates direct database access for campaign automation requests.
 */

const create = async (data) => {
    return await CampaignRequest.create(data);
};

const findById = async (id) => {
    return await CampaignRequest.findById(id);
};

const updateById = async (id, update) => {
    return await CampaignRequest.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true }
    );
};

module.exports = {
    create,
    findById,
    updateById
};

