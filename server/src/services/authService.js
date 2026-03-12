const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger');

/**
 * Auth Service
 * Authentication business logic
 * Per rules.md section 1.2 - Service layer for business logic
 */

/**
 * Login user and generate JWT
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} JWT token and user data
 */
const login = async (email, password) => {
    try {
        // Validate input
        if (!email || !password) {
            const error = new Error('Email and password are required');
            error.statusCode = 400;
            error.code = 'MISSING_CREDENTIALS';
            throw error;
        }

        // Find user by email
        const user = await userRepository.findUserByEmail(email);

        if (!user) {
            logger.warn('AUTH_SERVICE', `Login attempt with invalid email: ${email}`);
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }

        // Check if user is active
        if (user.status !== 'active') {
            logger.warn('AUTH_SERVICE', `Login attempt for inactive user: ${email}`);
            const error = new Error('Account is inactive');
            error.statusCode = 401;
            error.code = 'ACCOUNT_INACTIVE';
            throw error;
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            logger.warn('AUTH_SERVICE', `Login attempt with invalid password: ${email}`);
            const error = new Error('Invalid email or password');
            error.statusCode = 401;
            error.code = 'INVALID_CREDENTIALS';
            throw error;
        }

        // Generate JWT
        const token = generateToken(user);

        logger.success('AUTH_SERVICE', `User logged in: ${email}`);

        // Return token and user data (without password)
        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                client_id: user.client_id,
                status: user.status
            }
        };

    } catch (error) {
        logger.error('AUTH_SERVICE', 'Login failed', error);
        throw error;
    }
};

/**
 * Generate JWT for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    try {
        const payload = {
            user_id: user._id,
            role: user.role,
            client_id: user.client_id
        };

        const secret = process.env.JWT_SECRET;
        const expiry = process.env.JWT_EXPIRY || '7d';

        if (!secret) {
            throw new Error('JWT_SECRET is not set in environment variables');
        }

        const token = jwt.sign(payload, secret, { expiresIn: expiry });

        return token;

    } catch (error) {
        logger.error('AUTH_SERVICE', 'Failed to generate token', error);
        throw error;
    }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET is not set in environment variables');
        }

        const decoded = jwt.verify(token, secret);

        return decoded;

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            const err = new Error('Token has expired');
            err.statusCode = 401;
            err.code = 'TOKEN_EXPIRED';
            throw err;
        }

        if (error.name === 'JsonWebTokenError') {
            const err = new Error('Invalid token');
            err.statusCode = 401;
            err.code = 'INVALID_TOKEN';
            throw err;
        }

        throw error;
    }
};

module.exports = {
    login,
    generateToken,
    verifyToken
};
