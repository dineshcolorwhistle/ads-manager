const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * Campaign Routes
 * All routes protected by auth and RBAC
 */

// Create campaign (Admin and Client users)
router.post('/', auth, requireRole('ADMIN', 'CLIENT'), campaignController.create);

// List campaigns
router.get('/', auth, requireRole('ADMIN', 'CLIENT'), campaignController.list);

// Get full campaign details
router.get('/:id', auth, requireRole('ADMIN', 'CLIENT'), campaignController.getFull);

// Update campaign (e.g., set status to READY)
router.put('/:id', auth, requireRole('ADMIN', 'CLIENT'), campaignController.update);

// Save full campaign structure (Campaign + AdGroups + Creatives)
router.post('/full', auth, requireRole('ADMIN', 'CLIENT'), campaignController.saveFull);

// Publish campaign (ADMIN and CLIENT)
router.post('/:id/publish', auth, requireRole('ADMIN', 'CLIENT'), campaignController.publish);

// Delete campaign (ADMIN only)
router.delete('/:id', auth, requireRole('ADMIN'), campaignController.remove);

module.exports = router;
