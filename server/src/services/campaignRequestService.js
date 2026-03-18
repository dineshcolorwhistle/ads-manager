const mongoose = require('mongoose');
const clientRepository = require('../repositories/clientRepository');
const campaignRequestRepository = require('../repositories/campaignRequestRepository');

/**
 * Campaign Request Service (Ingest-only)
 * Validates incoming automation payloads and stores them for async processing.
 */

const requireString = (value, field, errors) => {
    if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${field} is required`);
    }
};

const validateMetaPayload = (payload, errors) => {
    requireString(payload.metaAdAccount, 'metaAdAccount', errors);
    requireString(payload.facebookPageId, 'facebookPageId', errors);

    if (!['daily', 'lifetime'].includes(String(payload.budgetType || '').toLowerCase())) {
        errors.push('budgetType must be "daily" or "lifetime"');
    }
    if (typeof payload.budgetAmount !== 'number' || Number.isNaN(payload.budgetAmount) || payload.budgetAmount <= 0) {
        errors.push('budgetAmount must be a number > 0');
    }
    requireString(payload.currency, 'currency', errors);
    requireString(payload.startDate, 'startDate', errors);

    if (!Array.isArray(payload.adGroups) || payload.adGroups.length === 0) {
        errors.push('adGroups must be a non-empty array');
        return;
    }

    for (let i = 0; i < payload.adGroups.length; i++) {
        const ag = payload.adGroups[i] || {};
        requireString(ag.adGroupName, `adGroups[${i}].adGroupName`, errors);

        if (!Array.isArray(ag.countries) || ag.countries.length === 0) {
            errors.push(`adGroups[${i}].countries must be a non-empty array`);
        }
        if (typeof ag.ageMin !== 'number' || typeof ag.ageMax !== 'number' || ag.ageMin > ag.ageMax) {
            errors.push(`adGroups[${i}].ageMin/ageMax must be numbers and ageMin <= ageMax`);
        }
        requireString(ag.gender, `adGroups[${i}].gender`, errors);

        if (!Array.isArray(ag.headlines) || ag.headlines.length === 0) {
            errors.push(`adGroups[${i}].headlines must be a non-empty array`);
        }
        if (!Array.isArray(ag.descriptions) || ag.descriptions.length === 0) {
            errors.push(`adGroups[${i}].descriptions must be a non-empty array`);
        }

        requireString(ag.destinationUrl, `adGroups[${i}].destinationUrl`, errors);
        requireString(ag.callToAction, `adGroups[${i}].callToAction`, errors);
        requireString(ag.imageUrl, `adGroups[${i}].imageUrl`, errors);
    }
};

/**
 * Create a campaign request record (QUEUED).
 * Expected body:
 * {
 *   client_id: "...",
 *   ...platform payload...
 * }
 */
const createCampaignRequest = async (body) => {
    const errors = [];

    // Client context (needed for future publishing)
    const clientId = body.client_id || body.clientId;
    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
        errors.push('client_id is required and must be a valid ObjectId');
    }

    // Basic shared fields
    requireString(body.campaignName, 'campaignName', errors);
    requireString(body.platform, 'platform', errors);
    requireString(body.objective, 'objective', errors);

    const platform = String(body.platform || '').toLowerCase();
    if (platform && !['meta', 'google'].includes(platform)) {
        errors.push('platform must be "meta" or "google"');
    }

    // Platform-specific validation
    if (platform === 'meta') {
        validateMetaPayload(body, errors);
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const client = await clientRepository.findClientById(clientId);
    if (!client) {
        throw new Error('Invalid client_id: client not found');
    }

    const record = await campaignRequestRepository.create({
        client_id: clientId,
        platform,
        campaign_name: String(body.campaignName).trim(),
        status: 'QUEUED',
        payload: body
    });

    return record;
};

const getCampaignRequest = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return await campaignRequestRepository.findById(id);
};

module.exports = {
    createCampaignRequest,
    getCampaignRequest
};

