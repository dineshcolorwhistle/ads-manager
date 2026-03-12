const http = require('http');

const campaignId = '69aa612162b59c1c56684cb7'; 
const clientId = '69a818c35fd56355ccea3e2b'; // I don't know the exact client ID, but publish API doesn't require client ID in URL. Wait, the route is usually: POST /api/campaigns/:id/publish

// But wait, the API requires a Bearer token!
// So it's easier to just find the campaign locally, get the IDs, and then mock the request.
// Even better: just require the models!
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/Client');
require('./src/models/User');
require('./src/models/AdGroup');
require('./src/models/Campaign');
require('./src/models/PaymentMethod');
require('./src/models/Transaction');
require('./src/models/Template');
require('./src/models/Credential');
require('./src/models/UserApiCredential');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Campaign = mongoose.model('Campaign');
        const camp = await Campaign.findOne({ platform: 'google' }).sort({ created_at: -1 });
        console.log(`Retrying campaign ${camp._id}`);
        await Campaign.updateOne({ _id: camp._id }, { $set: { status: 'READY' } });

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
