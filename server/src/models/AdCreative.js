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

    // Meta/Google: destination URL(s) for link ads (required for Meta link_data.link)
    final_urls: [{
        type: String,
        trim: true
    }],

    // Meta: call-to-action button type (e.g. LEARN_MORE, SHOP_NOW, SIGN_UP). Optional; Meta defaults to LEARN_MORE.
    call_to_action_type: {
        type: String,
        trim: true,
        default: null
    },

    // Image for the ad creative (uploaded via /api/campaigns/upload-image)
    image_url: {
        type: String,
        trim: true,
        default: null
    },

    image_filename: {
        type: String,
        trim: true,
        default: null
    },

    /** Google Responsive Display Ad – short business / brand name */
    business_name: {
        type: String,
        trim: true,
        default: ''
    },

    /** Square marketing image (1:1) for Google Display */
    square_image_url: {
        type: String,
        trim: true,
        default: null
    },
    square_image_filename: {
        type: String,
        trim: true,
        default: null
    },

    /** Landscape marketing image (~1.91:1) for Google Display */
    landscape_image_url: {
        type: String,
        trim: true,
        default: null
    },
    landscape_image_filename: {
        type: String,
        trim: true,
        default: null
    },

    /** Logo image for Google Display */
    logo_url: {
        type: String,
        trim: true,
        default: null
    },
    logo_filename: {
        type: String,
        trim: true,
        default: null
    },

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
