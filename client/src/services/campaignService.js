const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Campaign Service
 * Handles API calls for campaign drafts
 */
const campaignService = {
    /**
     * Get all campaign drafts for the client
     */
    getDrafts: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch drafts');
        return result;
    },

    /**
     * Get a single campaign draft with full structure
     */
    getDraft: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch draft');
        return result;
    },

    /**
     * Create a new campaign draft
     */
    createDraft: async (data) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to create draft');
        return result;
    },

    /**
     * Update an existing draft
     */
    updateDraft: async (id, data) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to update draft');
        return result;
    },

    /**
     * Save full campaign structure (Hierarchical)
     */
    saveFull: async (data) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/full`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to save full campaign');
        return result;
    },

    /**
     * Trigger campaign publishing
     */
    publish: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/${id}/publish`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to publish campaign');
        return result;
    },

    /**
     * Stop/cancel a published campaign
     */
    stop: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/${id}/stop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to stop campaign');
        return result;
    },

    delete: async (id) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/campaigns/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to delete campaign');
        return result;
    },

    /**
     * Get platform accounts for the client
     */
    getPlatformAccounts: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/platforms/accounts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch platform accounts');
        return result;
    }
};

export default campaignService;
