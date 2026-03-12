const mongoose = require('mongoose');
require('dotenv').config();

async function auditPhase2() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ad_campaigns');
        console.log('=== Phase 2 Database Audit ===\n');

        const credentials = await mongoose.connection.collection('oauthcredentials').find({}).toArray();
        console.log(`OAuth Credentials found: ${credentials.length}`);
        credentials.forEach(c => {
            console.log(`- Platform: ${c.platform}, Client ID: ${c.client_id}, Expiry: ${c.token_expiry}`);
        });

        const accounts = await mongoose.connection.collection('platformaccounts').find({}).toArray();
        console.log(`\nPlatform Accounts found: ${accounts.length}`);
        accounts.forEach(a => {
            console.log(`- Platform: ${a.platform}, Name: ${a.name}, ID: ${a.platform_account_id}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Audit failed:', err);
        process.exit(1);
    }
}

auditPhase2();
