const mongoose = require('mongoose');

/**
 * Platform Account Schema
 * Stores metadata for discovered ad accounts (Google Ads / Meta Ads)
 * Per Phase 2 requirements - Read-only account metadata
 */

const platformAccountSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required']
    },

    oauth_credential_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OAuthCredential',
        required: [true, 'OAuth Credential ID is required']
    },

    platform: {
        type: String,
        enum: ['google', 'meta'],
        required: [true, 'Platform is required']
    },

    platform_account_id: {
        type: String,
        required: [true, 'Platform account ID is required']
    },

    name: {
        type: String,
        required: [true, 'Account name is required']
    },

    currency: {
        type: String,
        default: 'USD'
    },

    timezone: {
        type: String,
        default: 'UTC'
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },

    created_at: {
        type: Date,
        default: () => new Date() // UTC timestamp
    },

    updated_at: {
        type: Date,
        default: () => new Date() // UTC timestamp
    }
});

// Update timestamp before saving
platformAccountSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Unique index to prevent duplicate accounts per client/platform
platformAccountSchema.index({ client_id: 1, platform: 1, platform_account_id: 1 }, { unique: true });

const PlatformAccount = mongoose.model('PlatformAccount', platformAccountSchema);

module.exports = PlatformAccount;
