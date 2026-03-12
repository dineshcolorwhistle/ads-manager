const mongoose = require('mongoose');
const OAuthCredential = require('./src/models/OAuthCredential');
const { connectDatabase } = require('./src/config/database');
require('dotenv').config();

async function checkTokens() {
    try {
        await connectDatabase(process.env.MONGO_URI);
        const creds = await OAuthCredential.find({});
        console.log(`Checking ${creds.length} credentials...`);

        for (const cred of creds) {
            try {
                console.log(`Checking cred: ${cred._id} (${cred.platform})`);
                cred.getDecryptedAccessToken();
                cred.getDecryptedRefreshToken();
                console.log(`✅ Cred ${cred._id} is OK`);
            } catch (err) {
                console.error(`❌ Cred ${cred._id} FAILED decryption: ${err.message}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

checkTokens();
