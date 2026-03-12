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

module.exports = router;
