const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * User Routes
 * Protected user endpoints - all require authentication
 * Per rules.md section 2.1 - All endpoints must have RBAC guards from Phase 1
 */

const router = express.Router();

/**
 * GET /users/me
 * Get current user profile
 * Protected: Requires authentication
 * Allowed: ADMIN, CLIENT
 */
router.get('/me', auth, requireRole('ADMIN', 'CLIENT'), userController.getMe);

/**
 * GET /users
 * Get all users
 * Protected: Admin only
 */
router.get('/', auth, requireRole('ADMIN'), userController.getUsers);

/**
 * POST /users
 * Create a new user
 * Protected: Admin only
 */
router.post('/', auth, requireRole('ADMIN'), userController.createUser);

/**
 * DELETE /users/:id
 * Soft delete a user
 * Protected: Admin only
 */
router.delete('/:id', auth, requireRole('ADMIN'), userController.deleteUser);

module.exports = router;
