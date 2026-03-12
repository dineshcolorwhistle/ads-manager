const mongoose = require('mongoose');
require('dotenv').config();

async function auditPhase2() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ad_campaigns');
        console.log('=== PHASE 2 FINAL AUDIT ===');

        const credentials = await mongoose.connection.collection('oauthcredentials').find({}).toArray();
        console.log(`\n1. OAuth Credentials (${credentials.length}):`);
        credentials.forEach(c => {
            console.log(`   - [${c.platform.toUpperCase()}] Client: ${c.client_id} | Expiry: ${c.token_expiry}`);
        });

        const accounts = await mongoose.connection.collection('platformaccounts').find({}).toArray();
        console.log(`\n2. Platform Accounts (${accounts.length}):`);
        accounts.forEach(a => {
            console.log(`   - [${a.platform.toUpperCase()}] Name: ${a.name} | ID: ${a.platform_account_id} | Currency: ${a.currency}`);
        });

        console.log('\n=== END AUDIT ===');
        process.exit(0);
    } catch (err) {
        console.error('Audit failed:', err);
        process.exit(1);
    }
}

auditPhase2();
