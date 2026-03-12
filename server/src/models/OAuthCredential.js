const mongoose = require('mongoose');

/**
 * OAuth Credential Schema
 * Stores OAuth tokens for Google Ads and Meta Ads
 */

const oauthCredentialSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required']
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

    // plaintext token
    access_token: {
        type: String,
        required: [true, 'Access token is required']
    },

    // plaintext token
    refresh_token: {
        type: String,
        required: [true, 'Refresh token is required']
    },

    token_expiry: {
        type: Date,
        required: [true, 'Token expiry is required']
    },

    scope: [String], // Permissions granted during OAuth

    last_refresh_at: {
        type: Date
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

// Compound index for unique constraint and performance
oauthCredentialSchema.index({ client_id: 1, platform: 1, platform_account_id: 1 }, { unique: true });

const OAuthCredential = mongoose.model('OAuthCredential', oauthCredentialSchema);

module.exports = OAuthCredential;
