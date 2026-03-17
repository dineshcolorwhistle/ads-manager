const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { google } = require('googleapis');
const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendEmail } = require('../utils/emailService');

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
 * Request password reset
 * Generates a one-time token and emails a reset link
 * @param {string} email - User email
 */
const requestPasswordReset = async (email) => {
    try {
        if (!email) {
            const error = new Error('Email is required');
            error.statusCode = 400;
            error.code = 'MISSING_EMAIL';
            throw error;
        }

        const user = await userRepository.findUserByEmail(email);

        // For security, do not reveal whether user exists
        if (!user || user.status !== 'active') {
            logger.warn('AUTH_SERVICE', `Password reset requested for non-existing or inactive user: ${email}`);
            return;
        }

        // Invalidate existing tokens for this user
        await PasswordResetToken.updateMany(
            { user_id: user._id, used_at: null },
            { $set: { used_at: new Date() } }
        );

        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');

        const expiresInMinutes = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES) || 60;
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        const resetToken = await PasswordResetToken.create({
            user_id: user._id,
            token: rawToken,
            expires_at: expiresAt
        });

        logger.success('AUTH_SERVICE', `Password reset token created for user ${email} (${resetToken._id})`);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

        const subject = 'Password reset requested';

        const plainText = [
            `Hi ${user.name || 'there'},`,
            '',
            'We received a request to reset the password for your Ads Campaigner account.',
            '',
            `To reset your password, click the link below (or paste it into your browser):`,
            resetUrl,
            '',
            `This link will expire in ${expiresInMinutes} minutes.`,
            '',
            'If you did not request a password reset, you can safely ignore this email.'
        ].join('\n');

        const html = `
            <p>Hi ${user.name || 'there'},</p>
            <p>We received a request to reset the password for your <strong>Ads Campaigner</strong> account.</p>
            <p>
                <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;
                          text-decoration:none;border-radius:6px;font-weight:500;">
                    Reset your password
                </a>
            </p>
            <p style="margin-top: 12px;">
                Or copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
            </p>
            <p style="margin-top: 12px; color:#4b5563;font-size:14px;">
                This link will expire in ${expiresInMinutes} minutes.
            </p>
            <p style="margin-top: 24px; color:#6b7280;font-size:12px;">
                If you did not request a password reset, you can safely ignore this email.
            </p>
        `;

        await sendEmail({
            to: user.email,
            subject,
            text: plainText,
            html
        });
    } catch (error) {
        logger.error('AUTH_SERVICE', 'Password reset request failed', error);
        throw error;
    }
};

/**
 * Reset password using token
 * @param {string} token - Raw reset token
 * @param {string} newPassword - New password
 */
const resetPassword = async (token, newPassword) => {
    try {
        if (!token || !newPassword) {
            const error = new Error('Token and new password are required');
            error.statusCode = 400;
            error.code = 'MISSING_FIELDS';
            throw error;
        }

        const now = new Date();

        const record = await PasswordResetToken.findOne({
            token,
            expires_at: { $gt: now },
            used_at: null
        });

        if (!record) {
            const error = new Error('Reset link is invalid or has expired');
            error.statusCode = 400;
            error.code = 'INVALID_OR_EXPIRED_TOKEN';
            throw error;
        }

        const user = await userRepository.findUserById(record.user_id);

        if (!user || user.status !== 'active') {
            const error = new Error('User account is not available');
            error.statusCode = 400;
            error.code = 'USER_NOT_AVAILABLE';
            throw error;
        }

        user.password = newPassword;
        await user.save();

        record.used_at = new Date();
        await record.save();

        logger.success('AUTH_SERVICE', `Password reset successful for user ${user.email}`);
    } catch (error) {
        logger.error('AUTH_SERVICE', 'Password reset failed', error);
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
    getGoogleAuthUrl,
    loginWithGoogle,
    requestPasswordReset,
    resetPassword,
    generateToken,
    verifyToken
};

/**
 * Build Google OAuth client, validating env config.
 * @param {string} callbackUrl - Fully-qualified backend callback URL
 */
function createGoogleOAuthClient(callbackUrl) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        const error = new Error('Google OAuth is not configured');
        error.statusCode = 500;
        error.code = 'GOOGLE_OAUTH_NOT_CONFIGURED';
        throw error;
    }

    return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
}

/**
 * Get Google OAuth start URL (redirect URL).
 * @param {Object} params
 * @param {string} params.callbackUrl - Fully-qualified backend callback URL
 */
function getGoogleAuthUrl({ callbackUrl }) {
    const oauth2Client = createGoogleOAuthClient(callbackUrl);

    return oauth2Client.generateAuthUrl({
        access_type: 'online',
        prompt: 'select_account',
        scope: ['openid', 'email', 'profile'],
        include_granted_scopes: true
    });
}

/**
 * Login with Google using OAuth authorization code.
 * For safety, this only allows sign-in for EXISTING active users (matched by email).
 * @param {Object} params
 * @param {string} params.code - Authorization code from Google
 * @param {string} params.callbackUrl - Fully-qualified backend callback URL
 */
async function loginWithGoogle({ code, callbackUrl }) {
    try {
        if (!code) {
            const error = new Error('Missing authorization code');
            error.statusCode = 400;
            error.code = 'MISSING_AUTH_CODE';
            throw error;
        }

        const oauth2Client = createGoogleOAuthClient(callbackUrl);
        const { tokens } = await oauth2Client.getToken(String(code));

        if (!tokens?.id_token) {
            const error = new Error('Google did not return an ID token');
            error.statusCode = 400;
            error.code = 'MISSING_ID_TOKEN';
            throw error;
        }

        const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload?.email;

        if (!email) {
            const error = new Error('Google account email is not available');
            error.statusCode = 400;
            error.code = 'GOOGLE_EMAIL_NOT_AVAILABLE';
            throw error;
        }

        const user = await userRepository.findUserByEmail(email.toLowerCase());

        if (!user) {
            const error = new Error('No account exists for this Google email');
            error.statusCode = 401;
            error.code = 'SSO_USER_NOT_FOUND';
            throw error;
        }

        if (user.status !== 'active') {
            const error = new Error('Account is inactive');
            error.statusCode = 401;
            error.code = 'ACCOUNT_INACTIVE';
            throw error;
        }

        const token = generateToken(user);

        logger.success('AUTH_SERVICE', `User logged in via Google SSO: ${email}`);

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
        logger.error('AUTH_SERVICE', 'Google SSO login failed', error);
        throw error;
    }
}
