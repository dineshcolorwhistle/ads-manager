const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Campaign = require('./src/models/Campaign');

        // Update all meta campaigns to use the correct Page ID from the API
        const result = await Campaign.updateMany(
            { platform: 'meta' },
            { $set: { facebook_page_id: '944598498748166' } }
        );
        console.log('Updated', result.modifiedCount, 'campaign(s) with Page ID: 944598498748166');

        // Verify
        const campaigns = await Campaign.find({ platform: 'meta' }).select('name facebook_page_id status');
        campaigns.forEach(c => console.log('  ', c.name, '| page_id:', c.facebook_page_id, '| status:', c.status));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
