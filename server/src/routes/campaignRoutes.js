const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads/campaign-images'),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${crypto.randomUUID()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype.split('/')[1]);
        cb(extOk && mimeOk ? null : new Error('Only image files (jpg, png, gif, webp) are allowed'), extOk && mimeOk);
    }
});

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

// Upload image for a campaign creative
router.post('/upload-image', auth, requireRole('ADMIN', 'CLIENT'), upload.single('image'), campaignController.uploadImage);

// Publish campaign (ADMIN and CLIENT)
router.post('/:id/publish', auth, requireRole('ADMIN', 'CLIENT'), campaignController.publish);

// Stop/cancel a published campaign (ADMIN and CLIENT)
router.post('/:id/stop', auth, requireRole('ADMIN', 'CLIENT'), campaignController.stop);

// Get performance insights for a campaign
router.get('/:id/insights', auth, requireRole('ADMIN', 'CLIENT'), campaignController.getInsights);

// Delete campaign (ADMIN and CLIENT; CLIENT can only delete own client's campaigns)
router.delete('/:id', auth, requireRole('ADMIN', 'CLIENT'), campaignController.remove);

module.exports = router;
