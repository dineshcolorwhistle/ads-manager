const express = require('express');
const router = express.Router();
const userCredentialController = require('../controllers/userCredentialController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * User API Credential Routes
 * Mounted at /api/users/api-credentials
 */

// All routes require authentication
router.use(auth);

// Get credentials for a platform
router.get('/:platform', userCredentialController.getCredential);

// Update credentials for a platform (Client or Admin role)
router.post('/:platform', requireRole('ADMIN', 'CLIENT'), userCredentialController.updateCredential);

// Delete credentials for a platform
router.delete('/:platform', requireRole('ADMIN', 'CLIENT'), userCredentialController.deleteCredential);

module.exports = router;
