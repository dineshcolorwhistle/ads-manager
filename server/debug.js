const mongoose = require('mongoose');
require('dotenv').config();
const publishService = require('./src/services/publishService');
const campaignService = require('./src/services/campaignService');
const metaAdapter = require('./src/platforms/metaAdapter');
const credentialRepository = require('./src/repositories/credentialRepository');
require('./src/models/User');
require('./src/models/Client');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const Campaign = require('./src/models/Campaign');
        const campaign = await Campaign.findOne({ status: 'FAILED', platform: 'meta' }).sort({ updated_at: -1 });

        if (!campaign) {
            console.log('No failed Meta campaigns found.');
            return;
        }

        console.log(`Debugging publish for Campaign ${campaign._id} (${campaign.name})`);

        const fullCampaign = await campaignService.getCampaignFull(campaign._id, campaign.client_id);
        const platformData = metaAdapter.mapCampaign(fullCampaign);
        console.log('Mapped Data:', JSON.stringify(platformData, null, 2));

        const credential = await credentialRepository.findCredentialByClientAndPlatform(
            campaign.client_id,
            'meta',
            campaign.platform_account_id
        );

        const credentials = {
            access_token: credential.access_token,
            platform_account_id: campaign.platform_account_id
        };

        try {
            console.log('Calling Meta Adapter...');
            const result = await metaAdapter.createCampaign(credentials, platformData);
            console.log('Result:', result);
        } catch (e) {
            console.error('Adapter threw an error, dumping to meta_error.txt');
            const fs = require('fs');
            const util = require('util');
            const dump = util.inspect(e, { showHidden: false, depth: null, colors: false });
            fs.writeFileSync('meta_error.txt', dump, 'utf8');
        }
    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
