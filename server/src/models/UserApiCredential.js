const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * User API Credential Schema
 * Stores user-specific API IDs and Secrets (Google/Meta)
 * Credentials are encrypted at rest.
 */

const userApiCredentialSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true
    },

    platform: {
        type: String,
        enum: ['google', 'meta'],
        required: [true, 'Platform is required']
    },

    // Encrypted configuration object
    // For Google: { clientId, clientSecret, callbackUrl, developerToken }
    // For Meta: { appId, appSecret, callbackUrl, configId }
    encrypted_config: {
        type: String,
        required: [true, 'Configuration data is required']
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

// Compound index to ensure one set of credentials per platform per client
userApiCredentialSchema.index({ client_id: 1, platform: 1 }, { unique: true });

// Pre-save hook to update updated_at
userApiCredentialSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Helper methods to encrypt/decrypt config
userApiCredentialSchema.methods.setConfig = function (configObj) {
    const configString = JSON.stringify(configObj);
    this.encrypted_config = encrypt(configString);
};

userApiCredentialSchema.methods.getConfig = function () {
    try {
        const decryptedString = decrypt(this.encrypted_config);
        return JSON.parse(decryptedString);
    } catch (error) {
        throw new Error('Failed to decrypt and parse API configuration');
    }
};

const UserApiCredential = mongoose.model('UserApiCredential', userApiCredentialSchema);

module.exports = UserApiCredential;
