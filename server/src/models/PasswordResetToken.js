const mongoose = require('mongoose');

/**
 * PasswordResetToken Schema
 * Stores one-time password reset tokens for users
 */

const passwordResetTokenSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    expires_at: {
        type: Date,
        required: true,
        index: true
    },

    used_at: {
        type: Date,
        default: null
    },

    created_at: {
        type: Date,
        default: () => new Date()
    }
});

// Only allow active, not-yet-used, non-expired tokens by default
passwordResetTokenSchema.pre(/^find/, function (next) {
    const now = new Date();
    this.where({
        expires_at: { $gt: now },
        used_at: null
    });
    next();
});

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken;

