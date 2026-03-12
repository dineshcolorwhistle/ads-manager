const mongoose = require('mongoose');

/**
 * Client Schema
 * Represents a multi-tenant client workspace
 * Per rules.md section 6 - Multi-tenancy isolation
 */

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Client name is required'],
        unique: true,
        trim: true
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
    },

    deleted_at: {
        type: Date,
        default: null // For soft deletes (rules.md section 3.4)
    }
});

// Update updated_at on save
clientSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Soft delete method (rules.md section 3.4)
clientSchema.methods.softDelete = function () {
    this.deleted_at = new Date();
    this.status = 'inactive';
    return this.save();
};

// name is already indexed via unique:true on the field definition

// Exclude deleted clients by default
clientSchema.pre(/^find/, function (next) {
    // Only apply if not explicitly including deleted
    if (!this.getOptions().includeDeleted) {
        this.where({ deleted_at: null });
    }
    next();
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
