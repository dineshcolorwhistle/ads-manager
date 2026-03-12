require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const Campaign = require('./src/models/Campaign');
        const camp = await Campaign.findOne({ platform: 'google' }).sort({ created_at: -1 });
        
        if (!camp) {
            console.log('No failed Google campaign found.');
            process.exit(0);
        }

        console.log(`Retrying campaign ${camp._id}`);

        await Campaign.updateOne({ _id: camp._id }, { $set: { status: 'READY' } });
        console.log(`Campaign ${camp._id} marked as READY`);

        const publishService = require('./src/services/publishService');
        await publishService.publishCampaign(camp._id.toString(), camp.client_id.toString());
        
        console.log('Publish triggered. Waiting 30s...');
        setTimeout(() => {
            console.log('Done waiting');
            process.exit(0);
        }, 30000);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
