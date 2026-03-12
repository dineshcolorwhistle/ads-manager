const mongoose = require('mongoose');

/**
 * AdCreative Schema
 * Represents the creative content of an ad
 * Per Phase 3 scope - TEXT ONLY (Headlines, Descriptions)
 */

const adCreativeSchema = new mongoose.Schema({
    ad_group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdGroup',
        required: [true, 'Ad Group ID is required'],
        index: true
    },

    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: [true, 'Client ID is required'],
        index: true
    },

    name: {
        type: String,
        required: [true, 'Creative name is required'],
        trim: true
    },

    // Shared text fields across both platforms
    headlines: [{
        text: { type: String, required: true, trim: true },
        asset_id: String // For future platform sync
    }],

    descriptions: [{
        text: { type: String, required: true, trim: true },
        asset_id: String // For future platform sync
    }],

    // Metadata for platform-specific rendering
    platform_data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
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

// Update updated_at on save
adCreativeSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

const AdCreative = mongoose.model('AdCreative', adCreativeSchema);

module.exports = AdCreative;
