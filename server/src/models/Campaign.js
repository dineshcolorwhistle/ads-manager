const mongoose = require('mongoose');

/**
 * Campaign Schema
 * Platform-agnostic representation of an advertising campaign
 * Per Phase 3 requirements - Internal modeling and draft lifecycle
 */

const campaignSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true
    },

    name: {
        type: String,
        required: [true, 'Campaign name is required'],
        trim: true
    },

    objective: {
        type: String,
        enum: ['TRAFFIC', 'LEADS', 'SALES', 'AWARENESS'],
        required: [true, 'Campaign objective is required']
    },

    platform: {
        type: String,
        enum: ['google', 'meta'],
        required: [true, 'Platform is required']
    },

    status: {
        type: String,
        enum: ['DRAFT', 'READY', 'PUBLISHING', 'ACTIVE', 'FAILED', 'PAUSED'],
        default: 'DRAFT',
        index: true
    },

    budget: {
        amount: {
            type: Number,
            required: [true, 'Budget amount is required'],
            min: [0, 'Budget cannot be negative']
        },
        type: {
            type: String,
            enum: ['DAILY', 'LIFETIME'],
            default: 'DAILY'
        }
    },

    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },

    start_date: {
        type: Date,
        required: [true, 'Start date is required']
    },

    end_date: {
        type: Date
    },

    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    created_at: {
        type: Date,
        default: () => new Date() // UTC timestamp
    },

    updated_at: {
        type: Date,
        default: () => new Date() // UTC timestamp
    },

    platform_account_id: {
        type: String,
        required: [true, 'Platform account ID is required for publishing'],
        index: true
    },

    facebook_page_id: {
        type: String,
        default: null
    },

    /**
     * Google Ads–specific settings (Search vs Display, geo, language).
     * Used by the campaign form and publish pipeline for Display campaigns.
     */
    google_settings: {
        ad_format: {
            type: String,
            enum: ['SEARCH', 'DISPLAY'],
            default: 'SEARCH'
        },
        /** BCP-47 / Google Ads language constant codes, e.g. en, es */
        languages: [{ type: String, trim: true, lowercase: true }],
        /** ISO 3166-1 alpha-2 country codes for location targeting */
        location_countries: [{ type: String, trim: true, uppercase: true }]
    },

    external_id: {
        type: String,
        default: null
    },

    publish_logs: [{
        timestamp: { type: Date, default: Date.now },
        status: String,
        message: String,
        details: mongoose.Schema.Types.Mixed
    }],

    failure_reason: {
        type: String,
        default: null
    },

    deleted_at: {
        type: Date,
        default: null
    }
});

// Update updated_at on save
campaignSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Exclude deleted campaigns by default
campaignSchema.pre(/^find/, function (next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ deleted_at: null });
    }
    next();
});

// Compound indexes for common queries
campaignSchema.index({ client_id: 1, status: 1 });
campaignSchema.index({ client_id: 1, platform: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
