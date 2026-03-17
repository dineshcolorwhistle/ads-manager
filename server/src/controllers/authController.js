const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Handles authentication endpoints (request/response ONLY)
 * Per rules.md section 7.1 - No business logic in controllers
 */

/**
 * Start Google OAuth sign-in
 * GET /auth/google
 */
const googleAuthStart = async (req, res) => {
    try {
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
        const authUrl = authService.getGoogleAuthUrl({ callbackUrl });
        return res.redirect(authUrl);
    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Google auth start failed', error);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Google OAuth callback
 * GET /auth/google/callback
 */
const googleAuthCallback = async (req, res) => {
    try {
        const { code } = req.query;
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

        const { token } = await authService.loginWithGoogle({ code, callbackUrl });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = new URL('/oauth-callback', frontendUrl);
        redirectUrl.searchParams.set('token', token);

        return res.redirect(redirectUrl.toString());
    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Google auth callback failed', error);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = new URL('/login', frontendUrl);
        redirectUrl.searchParams.set('error', error.code || 'GOOGLE_AUTH_FAILED');

        return res.redirect(redirectUrl.toString());
    }
};

/**
 * Login endpoint
 * POST /auth/login
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Call auth service (business logic)
        const result = await authService.login(email, password);

        // Return success response (per rules.md section 10.2)
        res.status(200).json({
            success: true,
            data: result,
            message: 'Login successful',
            timestamp: new Date().toISOString() // UTC timestamp
        });

    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Login failed', error);

        // Return error response
        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Request password reset
 * POST /auth/forgot-password
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        await authService.requestPasswordReset(email);

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Forgot password failed', error);

        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Reset password with token
 * POST /auth/reset-password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        await authService.resetPassword(token, password);

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('AUTH_CONTROLLER', 'Reset password failed', error);

        res.status(error.statusCode || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An internal server error occurred'
            },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    googleAuthStart,
    googleAuthCallback,
    login,
    forgotPassword,
    resetPassword
};
