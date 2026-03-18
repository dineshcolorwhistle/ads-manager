const express = require('express');
const router = express.Router();
const publicCampaignRequestController = require('../controllers/publicCampaignRequestController');
const publicApiKeyAuth = require('../middleware/publicApiKeyAuth');

/**
 * Public Campaign Request Routes
 * Mounted at /api/public/campaign-requests
 */

// Public ingest endpoint (stores to DB only)
router.post('/', publicApiKeyAuth, publicCampaignRequestController.create);

// Public lookup endpoint (useful for status polling)
router.get('/:id', publicApiKeyAuth, publicCampaignRequestController.getById);

module.exports = router;

