const mongoose = require('mongoose');
const OAuthCredential = require('./src/models/OAuthCredential');
const { connectDatabase } = require('./src/config/database');
require('dotenv').config();

async function cleanupTokens() {
    try {
        await connectDatabase(process.env.MONGO_URI);
        const creds = await OAuthCredential.find({});
        console.log(`Auditing ${creds.length} credentials...`);

        let deletedCount = 0;
        for (const cred of creds) {
            try {
                // Try decrypting both tokens
                cred.getDecryptedAccessToken();
                cred.getDecryptedRefreshToken();
                console.log(`✅ Cred ${cred._id} (${cred.platform}) is OK`);
            } catch (err) {
                console.error(`❌ Cred ${cred._id} (${cred.platform}) FAILED decryption. Deleting...`);
                await OAuthCredential.deleteOne({ _id: cred._id });
                deletedCount++;
            }
        }
        console.log(`Cleanup complete. Deleted ${deletedCount} corrupted credentials.`);
        process.exit(0);
    } catch (err) {
        console.error('Fatal error during cleanup:', err);
        process.exit(1);
    }
}

cleanupTokens();
