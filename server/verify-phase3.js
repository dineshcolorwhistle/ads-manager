const mongoose = require('mongoose');
require('dotenv').config();

const Campaign = require('./src/models/Campaign');
const AdGroup = require('./src/models/AdGroup');
const AdCreative = require('./src/models/AdCreative');
const campaignService = require('./src/services/campaignService');

async function verifyPhase3() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ad_campaigns');
        console.log('=== PHASE 3 VERIFICATION ===');

        const testClientId = new mongoose.Types.ObjectId();
        const testUserId = new mongoose.Types.ObjectId();

        // 1. Test Hierarchical Save (DRAFT)
        console.log('\n1. Testing Hierarchical Save (DRAFT)...');
        const campaignData = {
            name: 'Phase 3 Test Campaign',
            platform: 'google',
            objective: 'TRAFFIC',
            budget: { amount: 100, type: 'DAILY' },
            start_date: new Date(),
            ad_groups: [
                {
                    name: 'Test Ad Group',
                    creatives: [
                        {
                            name: 'Test Creative',
                            headlines: [{ text: 'Headline 1' }],
                            descriptions: [{ text: 'Description 1' }]
                        }
                    ]
                }
            ]
        };

        const result = await campaignService.saveFullCampaign(testClientId, testUserId, campaignData);
        console.log('✅ Full Campaign saved successfully');
        console.log(`   - Campaign ID: ${result._id}`);
        console.log(`   - Ad Groups: ${result.ad_groups.length}`);
        console.log(`   - Creatives: ${result.ad_groups[0].creatives.length}`);

        // 2. Test Validation (Switching to READY without creatives)
        console.log('\n2. Testing READY status validation...');
        try {
            await campaignService.updateCampaign(result._id, testClientId, {
                status: 'READY',
                platform: 'google' // Explicitly pass platform as updateData is partial in the test
            });
            console.log('✅ READY status transition valid (because we have creatives)');
        } catch (err) {
            console.log(`❌ Unexpected failure: ${err.message}`);
        }

        // Test failure case
        console.log('\n3. Testing READY status failure (No Ad Groups)...');
        const emptyCampaign = await campaignService.createCampaign(testClientId, testUserId, {
            name: 'Empty Campaign',
            platform: 'meta',
            objective: 'LEADS',
            budget: { amount: 50, type: 'DAILY' },
            start_date: new Date()
        });

        try {
            await campaignService.updateCampaign(emptyCampaign._id, testClientId, { status: 'READY', platform: 'meta' });
            console.log('❌ Failure: READY status set on empty campaign');
        } catch (err) {
            console.log(`✅ Success: Caught expected error - ${err.message}`);
        }

        console.log('\n=== PHASE 3 VERIFICATION COMPLETE ===');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyPhase3();
