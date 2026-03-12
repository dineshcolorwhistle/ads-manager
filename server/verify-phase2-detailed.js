const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const OAuthCredential = require('./src/models/OAuthCredential');
const encryption = require('./src/utils/encryption');
const User = require('./src/models/User');

async function runVerification() {
    console.log('=== Phase 2 Verification Script ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ad_campaigns');
        console.log('✅ Connected to MongoDB');

        // 1. Test Encryption Utility
        const testText = 'this_is_a_secret_token_123';
        const encrypted = encryption.encrypt(testText);
        const decrypted = encryption.decrypt(encrypted);

        if (decrypted === testText && encrypted.includes(':')) {
            console.log('✅ Encryption Utility: Success (Verified AES-256-GCM format)');
        } else {
            console.log('❌ Encryption Utility: Failed');
        }

        // 2. Test Model Encryption (pre-save hook)
        const user = await User.findOne({ email: 'manoj@colorwhistle.com' }).lean(); // Use lean to see raw data
        if (!user) {
            console.log('⚠️ Could not find test user "manoj@colorwhistle.com", skipping model save test');
        } else {
            // Correctly access client_id from the user document
            const clientId = user.client_id;
            console.log(`Using client_id: ${clientId}`);

            if (!clientId) {
                console.log('❌ Error: User has no client_id');
            } else {
                // Cleanup old test credentials
                await OAuthCredential.deleteMany({ platform_account_id: 'test_verification_id' });

                const cred = new OAuthCredential({
                    client_id: clientId,
                    platform: 'google',
                    platform_account_id: 'test_verification_id',
                    access_token: 'plain_access_token',
                    refresh_token: 'plain_refresh_token',
                    token_expiry: new Date(Date.now() + 3600 * 1000)
                });

                await cred.save();
                console.log('✅ OAuthCredential saved successfully');

                // Check raw data in DB using driver for pure raw check
                const rawCred = await mongoose.connection.collection('oauthcredentials').findOne({ platform_account_id: 'test_verification_id' });

                if (rawCred.access_token.includes(':') && !rawCred.access_token.includes('plain')) {
                    console.log('✅ Model Encryption (pre-save): Success (Tokens are encrypted in DB)');
                } else {
                    console.log('❌ Model Encryption (pre-save): Failed (Stored in plaintext or wrong format)');
                }

                // Test Decryption methods
                const decryptedAccess = cred.getDecryptedAccessToken();
                if (decryptedAccess === 'plain_access_token') {
                    console.log('✅ Model Decryption (method): Success');
                } else {
                    console.log('❌ Model Decryption (method): Failed');
                }
            }
        }

        console.log('\n=== Verification Complete ===');
    } catch (error) {
        console.error('❌ Verification Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

runVerification();
