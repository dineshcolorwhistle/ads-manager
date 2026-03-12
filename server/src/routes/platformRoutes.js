const express = require('express');
const platformController = require('../controllers/platformController');
const auth = require('../middleware/auth');
const { enforceClientIsolation } = require('../middleware/clientIsolation');
const { requireRole } = require('../middleware/rbac');

/**
 * Platform Routes
 * Protected endpoints for Google and Meta Ads connectivity
 * Per rules.md section 2.1 - All endpoints must have RBAC guards
 */

const router = express.Router();

/**
 * GET /platforms/:platform/callback
 * Handle OAuth callback from platform
 * Public endpoint (uses state parameter for security)
 */
router.get('/:platform/callback', platformController.handleCallback);

/**
 * POST /platforms/meta/data-deletion
 * Handle Meta User Data Deletion Callback
 * Public endpoint for compliance
 */
router.post('/meta/data-deletion', platformController.handleDataDeletion);

// Apply global middleares for protected platform routes
router.use(auth);
router.use(requireRole('ADMIN', 'CLIENT'));
router.use(enforceClientIsolation);

/**
 * GET /platforms/connected
 * List only the platforms that are connected (have OAuth credentials)
 */
router.get('/connected', platformController.getConnectedPlatforms);

/**
 * GET /platforms/:platform/connect
 * Get the OAuth connection URL
 */
router.get('/:platform/connect', platformController.getConnectUrl);

/**
 * GET /platforms/accounts
 * List all discovered ad accounts for the client
 */
router.get('/accounts', platformController.getAccounts);

/**
 * POST /platforms/:platform/rediscover
 * Re-discover ad accounts for a connected platform
 * Useful when initial discovery failed
 */
router.post('/:platform/rediscover', platformController.rediscoverAccounts);

/**
 * DELETE /platforms/:platform
 * Disconnect a platform and delete credentials/accounts
 */
router.delete('/:platform', platformController.disconnect);

module.exports = router;
