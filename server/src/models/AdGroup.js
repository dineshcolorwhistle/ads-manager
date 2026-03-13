const mongoose = require('mongoose');

/**
 * AdGroup Schema
 * Represents an Ad Group (Google) or Ad Set (Meta)
 * Linked to a Campaign and contains creative/targeting configs
 */

const adGroupSchema = new mongoose.Schema({
    campaign_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: [true, 'Campaign ID is required'],
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
        required: [true, 'Ad Group name is required'],
        trim: true
    },

    status: {
        type: String,
        enum: ['DRAFT', 'READY'],
        default: 'DRAFT'
    },

    // Budget can be at AdGroup level for Meta (Ad Sets)
    budget: {
        amount: {
            type: Number,
            min: [0, 'Budget cannot be negative']
        },
        type: {
            type: String,
            enum: ['DAILY', 'LIFETIME']
        }
    },

    // Meta: Ad Set targeting (geo_locations, age_min, age_max, genders). Used when publishing to Meta.
    targeting: {
        countries: [{ type: String, trim: true, uppercase: true }], // e.g. ['US', 'GB']
        age_min: { type: Number, min: 13, max: 65 },
        age_max: { type: Number, min: 13, max: 65 },
        genders: [{ type: Number }] // 1 = male, 2 = female; empty = all
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
adGroupSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Index for quick access to all ad groups in a campaign
adGroupSchema.index({ campaign_id: 1, name: 1 });

const AdGroup = mongoose.model('AdGroup', adGroupSchema);

module.exports = AdGroup;
