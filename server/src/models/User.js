const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents users with role-based access control
 * Per rules.md section 2.1 - RBAC from Phase 1
 */

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include password in queries by default
    },

    role: {
        type: String,
        enum: ['ADMIN', 'CLIENT'],
        required: [true, 'Role is required']
    },

    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: function () {
            // client_id is required for CLIENT role
            return this.role === 'CLIENT';
        }
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

// Hash password before saving (rules.md section 2.2)
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update updated_at on save
userSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Soft delete method (rules.md section 3.4)
userSchema.methods.softDelete = function () {
    this.deleted_at = new Date();
    this.status = 'inactive';
    return this.save();
};

// Hide password in JSON responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

// Indexes for performance (email is already indexed via unique:true on the field)
userSchema.index({ client_id: 1 });

// Exclude deleted users by default
userSchema.pre(/^find/, function (next) {
    // Only apply if not explicitly including deleted
    if (!this.getOptions().includeDeleted) {
        this.where({ deleted_at: null });
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
