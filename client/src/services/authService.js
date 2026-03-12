const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Auth Service
 * Handles user authentication (login, logout, token management)
 */
const authService = {
    /**
     * Login user
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} User data and token
     */
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Login failed');
        }

        // Store token and user info
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        return result.data;
    },

    /**
     * Logout user
     */
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    /**
     * Get current user
     */
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};

export default authService;
