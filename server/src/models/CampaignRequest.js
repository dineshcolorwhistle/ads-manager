const mongoose = require('mongoose');

/**
 * CampaignRequest Schema
 * Stores incoming automation requests (ingest-only).
 * A background worker will later pick QUEUED requests and publish to platforms.
 */

const campaignRequestSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true
    },

    platform: {
        type: String,
        enum: ['meta', 'google'],
        required: [true, 'Platform is required'],
        index: true
    },

    // Helpful for listing/searching without parsing payload
    campaign_name: {
        type: String,
        required: [true, 'Campaign name is required'],
        trim: true,
        index: true
    },

    status: {
        type: String,
        enum: ['QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED'],
        default: 'QUEUED',
        index: true
    },

    // Original request payload as received (validated on ingest)
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    platform_result: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    error: {
        code: { type: String, default: null },
        message: { type: String, default: null },
        details: { type: mongoose.Schema.Types.Mixed, default: null }
    },

    created_at: {
        type: Date,
        default: () => new Date()
    },

    updated_at: {
        type: Date,
        default: () => new Date()
    }
});

campaignRequestSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

campaignRequestSchema.index({ client_id: 1, status: 1, created_at: -1 });
campaignRequestSchema.index({ client_id: 1, platform: 1, created_at: -1 });

const CampaignRequest = mongoose.model('CampaignRequest', campaignRequestSchema);

module.exports = CampaignRequest;

