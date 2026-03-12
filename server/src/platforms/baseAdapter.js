/**
 * Base Platform Adapter
 * Defines the contract for all platform adapters
 */
class BaseAdapter {
    constructor(platformName) {
        this.platformName = platformName;
    }

    /**
     * Map internal campaign to platform-specific format
     * @param {Object} campaign - Full campaign structure
     */
    mapCampaign(campaign) {
        throw new Error('mapCampaign not implemented');
    }

    /**
     * Create campaign on platform
     * @param {Object} credentials - Platform credentials
     * @param {Object} data - Mapped campaign data
     */
    async createCampaign(credentials, data) {
        throw new Error('createCampaign not implemented');
    }

    async deleteCampaign(externalId) {
        throw new Error('deleteCampaign method not implemented');
    }
}

module.exports = BaseAdapter;
