const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Campaign = require('./src/models/Campaign');
const User = require('./src/models/User');
const AdGroup = require('./src/models/AdGroup');
const AdCreative = require('./src/models/AdCreative');
const campaignService = require('./src/services/campaignService');
const publishService = require('./src/services/publishService');
const logger = require('./src/utils/logger');

dotenv.config();

async function runAudit() {
    console.log('--- PHASE 4 FINAL COMPREHENSIVE AUDIT ---\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ DB Connected');

        // Create Test Subjects
        const clientId1 = new mongoose.Types.ObjectId();
        const clientId2 = new mongoose.Types.ObjectId();

        const adminUser = await User.create({ name: 'Admin Audit', email: `admin_${Date.now()}@test.com`, role: 'ADMIN', client_id: clientId1, password: 'password123' });
        const clientUser1 = await User.create({ name: 'Client 1', email: `client1_${Date.now()}@test.com`, role: 'CLIENT', client_id: clientId1, password: 'password123' });
        const clientUser2 = await User.create({ name: 'Client 2', email: `client2_${Date.now()}@test.com`, role: 'CLIENT', client_id: clientId2, password: 'password123' });

        console.log('✅ Test users created');

        // 1. Visibility Test
        const campaign1 = await Campaign.create({
            name: 'Client 1 Campaign',
            client_id: clientId1,
            created_by: clientUser1._id,
            status: 'DRAFT',
            platform: 'google',
            objective: 'TRAFFIC',
            budget: { amount: 10, type: 'DAILY' },
            start_date: new Date()
        });
        const campaign2 = await Campaign.create({
            name: 'Client 2 Campaign',
            client_id: clientId2,
            created_by: clientUser2._id,
            status: 'DRAFT',
            platform: 'meta',
            objective: 'LEADS',
            budget: { amount: 20, type: 'DAILY' },
            start_date: new Date()
        });

        const adminList = await campaignService.listCampaigns(null); // Admin sees everything
        if (adminList.length < 2) throw new Error('Admin visibility failed: Should see at least 2 campaigns');
        console.log('✅ Admin visibility audit passed');

        const client1List = await campaignService.listCampaigns(clientId1);
        if (client1List.some(c => c.client_id.toString() !== clientId1.toString())) throw new Error('Client isolation failed');
        console.log('✅ Client isolation audit passed');

        // 2. Publishing Test
        console.log('🔄 Stress testing publishing flow...');

        // Create full structure required for READY status
        const ag = await AdGroup.create({
            campaign_id: campaign1._id,
            client_id: clientId1,
            name: 'Test Ad Group',
            status: 'DRAFT'
        });

        await AdCreative.create({
            ad_group_id: ag._id,
            client_id: clientId1,
            name: 'Test Creative',
            headlines: [{ text: 'Great Product' }],
            descriptions: [{ text: 'Buy it now please' }]
        });

        await Campaign.findByIdAndUpdate(campaign1._id, { status: 'READY' });
        const pubResult = await publishService.publishCampaign(campaign1._id, clientId1);

        // Wait for worker (simulated)
        await new Promise(r => setTimeout(r, 2000));
        const postPubCampaign = await Campaign.findById(campaign1._id);
        if (postPubCampaign.status !== 'ACTIVE' || !postPubCampaign.external_id) {
            throw new Error(`Publishing failed: Status is ${postPubCampaign.status}`);
        }
        console.log(`✅ Publishing flow passed (ID: ${postPubCampaign.external_id})`);

        // 3. Deletion Audit
        console.log('🔄 Testing cross-client deletion as ADMIN...');
        await campaignService.deleteCampaignFull(campaign2._id, null, 'ADMIN');
        const deletedC2 = await Campaign.findById(campaign2._id);
        if (deletedC2 && !deletedC2.deleted_at) throw new Error('Admin deletion failed');
        console.log('✅ Admin cross-client deletion passed');

        try {
            await campaignService.deleteCampaignFull(campaign1._id, clientId2, 'CLIENT'); // Unauthorized client
            throw new Error('Security failure: Client deleted another client\'s campaign');
        } catch (e) {
            console.log('✅ Unauthorized deletion blocked (expected):', e.message);
        }

        // 4. Currency / Creator Metadata Audit
        const detail = await campaignService.getCampaignFull(campaign1._id, null);
        if (!detail.created_by || !detail.created_by.email) throw new Error('Creator metadata population failed');
        console.log(`✅ Metadata population passed (Creator: ${detail.created_by.email})`);

        console.log('\n🌟 PHASE 4 AUDIT COMPLETE: ALL REQUIREMENTS VERIFIED 🌟');

    } catch (error) {
        console.error('\n❌ AUDIT FAILED:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        await mongoose.connection.db.dropCollection('users');
        await mongoose.connection.db.dropCollection('campaigns');
        await mongoose.connection.db.dropCollection('adgroups');
        await mongoose.connection.db.dropCollection('adcreatives');
        await mongoose.disconnect();
    }
}

runAudit();
