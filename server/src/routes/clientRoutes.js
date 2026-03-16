const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

/**
 * Client Routes
 * Admin-only list for client selector (e.g. create campaign for client)
 */

router.get('/', auth, requireRole('ADMIN'), clientController.list);

module.exports = router;
