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

module.exports = {
    create,
    findById
};

