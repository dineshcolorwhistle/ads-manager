const adapter = require('./src/platforms/googleAdapter');
require('dotenv').config();

const creds = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
    // I need a refresh token! It's in the DB.
};

const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        
        // Find credentials
        const cred = await db.collection('credentials').findOne({ platform: 'google' });
        if (!cred) throw new Error('No creds');
        
        creds.refresh_token = cred.refresh_token.value; // It's encrypted! 
        console.log('Got creds');
        
        // Wait, the encryption might require decrypting
        // I can just find the campaign from DB and look at its platform_account_id
        const camp = await db.collection('campaigns').findOne({ platform: 'google', status: 'FAILED' }, { sort: { created_at: -1 } });
        creds.platform_account_id = camp.platform_account_id;
        
        // Let's just create a test campaign payload
        const platformData = {
            name: 'Test Campaign ' + Date.now(),
            budget: { amount: 10, type: 'DAILY' },
            amount_micros: 10000000,
            ad_groups: [
                {
                    name: 'Ad Group 1',
                    creatives: [
                        { headlines: ['Test Headline 1', 'Test Headline 2', 'Test Headline 3'], descriptions: ['Desc 1', 'Desc 2'], final_urls: ['https://example.com'] }
                    ]
                }
            ]
        };

        // BUT I have to decrypt the refresh_token! This is getting complicated.
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
})();
