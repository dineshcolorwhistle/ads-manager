const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Platform Service
 * Handles platform connection and account discovery API calls
 */
const platformService = {
    /**
     * Get OAuth connection URL
     * @param {string} platform - 'google' or 'meta'
     */
    getConnectUrl: async (platform) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/oauth/${platform}/connect`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error.message);
        return result.data.url;
    },

    /**
     * Get discovered ad accounts
     */
    getAccounts: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/oauth/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    },

    /**
     * Disconnect platform
     * @param {string} platform - 'google' or 'meta'
     */
    disconnect: async (platform) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/oauth/${platform}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error.message);
        return result.data;
    },

    /**
     * Get connected platforms (only platforms with active OAuth credentials)
     * @returns {Array} List of { platform, platform_account_id, label }
     */
    getConnectedPlatforms: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/oauth/connected`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch connected platforms');
        return result.data;
    }
};

export default platformService;
