const express = require('express');
const authController = require('../controllers/authController');

/**
 * Auth Routes
 * Public authentication endpoints
 */

const router = express.Router();

/**
 * POST /auth/login
 * Login endpoint - no authentication required
 */
router.post('/login', authController.login);

/**
 * POST /auth/forgot-password
 * Request password reset link
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
