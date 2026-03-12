const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Campaign = require('./src/models/Campaign');
const AdGroup = require('./src/models/AdGroup');
const AdCreative = require('./src/models/AdCreative');
const OAuthCredential = require('./src/models/OAuthCredential');
const User = require('./src/models/User'); // Required for Schema refs
const googleAdapter = require('./src/platforms/googleAdapter');
const publishService = require('./src/services/publishService');
const logger = require('./src/utils/logger');

dotenv.config();

async function runVerification() {
    console.log('=== PHASE 4 VERIFICATION (API PUBLISHING EXTENSION) ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Setup Mocking for Google Adapter
        const originalCreate = googleAdapter.createCampaign;
        googleAdapter.createCampaign = async (credentials, data) => {
            console.log(`[MOCK GOOGLE ADAPTER] Pretending to call real Google Ads API for ${data.name}`);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        externalId: `goog_ext_${Math.random().toString(36).substr(2, 9)}`,
                        platformResponse: { message: 'Google Ads Campaign Created (Simulated via test script)' }
                    });
                }, 1500);
            });
        };

        const client_id = new mongoose.Types.ObjectId();
        const user_id = new mongoose.Types.ObjectId();
        const platform_account_id = 'test_acc_123';

        // 0. Create a dummy credential so publishService doesn't fail
        const credential = await OAuthCredential.create({
            client_id,
            platform: 'google',
            platform_account_id,
            access_token: 'dummy_access',
            refresh_token: 'dummy_refresh',
            token_expiry: new Date(Date.now() + 3600 * 1000) // expires in 1 hour
        });

        // 1. Create a dummy READY campaign structure
        const campaign = await Campaign.create({
            client_id,
            created_by: user_id,
            name: 'Test Real Publishing Campaign',
            platform: 'google',
            platform_account_id,
            objective: 'TRAFFIC',
            budget: { amount: 100, type: 'DAILY' },
            start_date: new Date(),
            status: 'READY'
        });

        const adGroup = await AdGroup.create({
            client_id,
            campaign_id: campaign._id,
            name: 'Test Ad Group',
            status: 'READY'
        });

        await AdCreative.create({
            client_id,
            ad_group_id: adGroup._id,
            name: 'Test Creative',
            headlines: [{ text: 'Test Headline' }],
            descriptions: [{ text: 'Test Description' }]
        });

        console.log(`✅ Created full READY campaign structure: ${campaign._id}`);

        // 2. Trigger Publish
        console.log('🚀 Triggering publish service...');
        const result = await publishService.publishCampaign(campaign._id, client_id);
        console.log('✅ Publish triggered successfully:', result.message);

        // 3. Verify status changed to PUBLISHING immediately
        const publishingCampaign = await Campaign.findById(campaign._id);
        console.log(`📊 Immediate status check: ${publishingCampaign.status} (Expected: PUBLISHING)`);

        if (publishingCampaign.status !== 'PUBLISHING') {
            throw new Error('Immediate status should be PUBLISHING');
        }

        // 4. Wait for background process 
        console.log('⏳ Waiting 3 seconds for background process (mock adapter takes 1.5s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Verify final status (ACTIVE)
        const activeCampaign = await Campaign.findById(campaign._id);
        console.log(`📊 Final status check: ${activeCampaign.status} (Expected: ACTIVE)`);
        console.log(`🆔 External ID: ${activeCampaign.external_id}`);

        if (activeCampaign.status !== 'ACTIVE') {
            console.log('❌ Failure reason:', activeCampaign.failure_reason);
            throw new Error(`Background process failed. Status is ${activeCampaign.status}`);
        }

        if (!activeCampaign.external_id || !activeCampaign.external_id.startsWith('goog_ext_')) {
            throw new Error('External ID was not correctly set');
        }

        // Cleanup
        await OAuthCredential.findByIdAndDelete(credential._id);
        await Campaign.findByIdAndDelete(campaign._id);
        await AdGroup.deleteMany({ campaign_id: campaign._id });
        await AdCreative.deleteMany({ ad_group_id: adGroup._id });

        // Restore adapter
        googleAdapter.createCampaign = originalCreate;

        console.log('\n✅ PHASE 4 API PUBLISHING VERIFICATION COMPLETE: ALL PASSING');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runVerification();
