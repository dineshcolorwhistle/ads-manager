const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Client Service
 * Fetches client list for admin (e.g. campaign client selector)
 */
const clientService = {
    /**
     * Get all clients (Admin only). Returns [{ _id, name }].
     */
    getClients: async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/clients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch clients');
        return result;
    }
};

export default clientService;
