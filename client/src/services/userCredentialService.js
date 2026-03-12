const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * User API Credential Service
 * Handles API calls for managing per-user Google and Meta API configurations
 */

const userCredentialService = {
    /**
     * Get credentials for a platform
     * @param {string} platform - 'google' or 'meta'
     */
    getCredential: async (platform) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/api-credentials/${platform}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch credentials');
        return result.data;
    },

    /**
     * Update/Create credentials for a platform
     * @param {string} platform - 'google' or 'meta'
     * @param {Object} config - { clientId, clientSecret, developerToken, etc. }
     */
    updateCredential: async (platform, config) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/api-credentials/${platform}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to update credentials');
        return result;
    },

    /**
     * Delete credentials for a platform
     * @param {string} platform - 'google' or 'meta'
     */
    deleteCredential: async (platform) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/users/api-credentials/${platform}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to delete credentials');
        return result;
    }
};

export default userCredentialService;
