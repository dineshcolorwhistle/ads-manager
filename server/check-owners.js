const mongoose = require('mongoose');

async function checkOwnership() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/ad_campaigns').asPromise();

        console.log('Checking "campaigns" for owners...');
        const campaign = await conn.db.collection('campaigns').findOne();
        if (campaign) {
            console.log('Campaign owner client_id:', campaign.client_id);
            console.log('Campaign created_by user_id:', campaign.created_by);
        }

        console.log('\nChecking "platformaccounts" for owners...');
        const account = await conn.db.collection('platformaccounts').findOne();
        if (account) {
            console.log('Account client_id:', account.client_id);
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Check failed:', error);
        process.exit(1);
    }
}

checkOwnership();
