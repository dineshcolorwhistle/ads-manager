const mongoose = require('mongoose');
require('dotenv').config();
const OAuthCredential = require('./src/models/OAuthCredential');
const { encrypt } = require('./src/utils/encryption');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database.');

        // Find all credentials
        const creds = await OAuthCredential.find({});
        console.log(`Found ${creds.length} total credentials.`);
        let fixedCount = 0;

        for (const cred of creds) {
            let modified = false;

            // Check if access token is plaintext (does not contain ':')
            if (cred.access_token && !cred.access_token.includes(':')) {
                console.log(`Fixing access token for ${cred.platform} account ${cred.platform_account_id}`);
                cred.access_token = encrypt(cred.access_token);
                modified = true;
            }

            // Check if refresh token is plaintext
            if (cred.refresh_token && !cred.refresh_token.includes(':')) {
                console.log(`Fixing refresh token for ${cred.platform} account ${cred.platform_account_id}`);
                cred.refresh_token = encrypt(cred.refresh_token);
                modified = true;
            }

            if (modified) {
                // Use updateOne to write the raw encrypted strings back directly, 
                // avoiding any double-encryption issues with the pre('save') hook
                await OAuthCredential.updateOne(
                    { _id: cred._id },
                    {
                        $set: {
                            access_token: cred.access_token,
                            refresh_token: cred.refresh_token
                        }
                    }
                );
                fixedCount++;
            }
        }

        console.log(`Successfully encrypted ${fixedCount} corrupted tokens!`);
    } catch (e) {
        console.error('Error fixing tokens:', e);
    } finally {
        await mongoose.disconnect();
    }
}

fix();
