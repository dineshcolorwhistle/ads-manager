const crypto = require('crypto');
const logger = require('./logger');

/**
 * AES-256-GCM Encryption Utility
 * Used for encrypting OAuth tokens and other sensitive data
 * Per rules.md section 2.2 - OAuth tokens must be encrypted
 */

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag

/**
 * Get master encryption key from environment
 * @returns {Buffer} Encryption key
 */
const getMasterKey = () => {
    const key = process.env.MASTER_ENCRYPTION_KEY;

    if (!key) {
        throw new Error('MASTER_ENCRYPTION_KEY is not set in environment variables');
    }

    // Convert hex string to buffer (expecting 64 hex chars = 32 bytes)
    if (key.length !== 64) {
        throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    return Buffer.from(key, 'hex');
};

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted text in format: iv:encryptedData:authTag
 */
const encrypt = (text) => {
    try {
        if (!text) {
            throw new Error('Text to encrypt cannot be empty');
        }

        const key = getMasterKey();

        // Generate random IV for each encryption
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag
        const authTag = cipher.getAuthTag();

        // Return format: iv:encryptedData:authTag (all in hex)
        const result = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;

        logger.debug('ENCRYPTION', 'Text encrypted successfully');

        return result;

    } catch (error) {
        logger.error('ENCRYPTION', 'Encryption failed', error);
        throw new Error('Encryption failed');
    }
};

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData:authTag
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
    try {
        if (!encryptedText) {
            throw new Error('Encrypted text cannot be empty');
        }

        const key = getMasterKey();

        // Split the encrypted text into components
        const parts = encryptedText.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        // Set authentication tag
        decipher.setAuthTag(authTag);

        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        logger.debug('ENCRYPTION', 'Text decrypted successfully');

        return decrypted;

    } catch (error) {
        logger.error('ENCRYPTION', 'Decryption failed', error);
        throw new Error('Decryption failed');
    }
};

/**
 * Generate a random encryption key (for setup purposes)
 * @returns {string} 64-character hex string (32 bytes)
 */
const generateKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = {
    encrypt,
    decrypt,
    generateKey
};
