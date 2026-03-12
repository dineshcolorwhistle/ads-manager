const mongoose = require('mongoose');
require('dotenv').config();
const OAuthCredential = require('./src/models/OAuthCredential');
const { decrypt } = require('./src/utils/encryption');

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

            // Check if access token is encrypted (contains ':')
            if (cred.access_token && cred.access_token.includes(':')) {
                console.log(`Decrypting access token for ${cred.platform} account ${cred.platform_account_id}`);
                cred.access_token = decrypt(cred.access_token);
                modified = true;
            }

            // Check if refresh token is encrypted
            if (cred.refresh_token && cred.refresh_token.includes(':')) {
                console.log(`Decrypting refresh token for ${cred.platform} account ${cred.platform_account_id}`);
                cred.refresh_token = decrypt(cred.refresh_token);
                modified = true;
            }

            if (modified) {
                // Use updateOne to write the plaintext strings back directly
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

        console.log(`Successfully decrypted ${fixedCount} tokens back to plaintext!`);
    } catch (e) {
        console.error('Error decrypting tokens:', e);
    } finally {
        await mongoose.disconnect();
    }
}

fix();
