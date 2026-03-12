const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function debug() {
    const out = {};
    try {
        await mongoose.connect(process.env.MONGO_URI);
        out.status = 'Connected';

        const allCreds = await mongoose.connection.collection('oauthcredentials').find({}).toArray();
        out.totalCredentials = allCreds.length;
        out.credentials = allCreds.map(c => ({
            id: c._id.toString(),
            client_id: c.client_id ? c.client_id.toString() : null,
            platform: c.platform,
            platform_account_id: c.platform_account_id,
            token_expiry: c.token_expiry
        }));

        const allAccounts = await mongoose.connection.collection('platformaccounts').find({}).toArray();
        out.totalAccounts = allAccounts.length;
        out.accounts = allAccounts.map(a => ({
            id: a._id.toString(),
            client_id: a.client_id ? a.client_id.toString() : null,
            platform: a.platform,
            name: a.name,
            platform_account_id: a.platform_account_id
        }));

    } catch (e) {
        out.error = e.message;
    } finally {
        fs.writeFileSync('debug_collections.json', JSON.stringify(out, null, 2));
        await mongoose.disconnect();
    }
}

debug();
