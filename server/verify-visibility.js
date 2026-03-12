const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Campaign = require('./src/models/Campaign');
const campaignService = require('./src/services/campaignService');
const campaignRepository = require('./src/repositories/campaignRepository');

dotenv.config();

async function runVerification() {
    console.log('=== ADMIN VISIBILITY VERIFICATION ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const tenantAId = new mongoose.Types.ObjectId();
        const tenantBId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        // 1. Create campaign for Tenant A
        const campaignA = await Campaign.create({
            client_id: tenantAId,
            created_by: userId,
            name: 'Tenant A Campaign',
            platform: 'google',
            objective: 'TRAFFIC',
            budget: { amount: 100, type: 'DAILY' },
            start_date: new Date(),
            status: 'DRAFT'
        });
        console.log(`✅ Created campaign for Tenant A: ${campaignA._id}`);

        // 2. Create campaign for Tenant B
        const campaignB = await Campaign.create({
            client_id: tenantBId,
            created_by: userId,
            name: 'Tenant B Campaign',
            platform: 'meta',
            objective: 'AWARENESS',
            budget: { amount: 200, type: 'DAILY' },
            start_date: new Date(),
            status: 'DRAFT'
        });
        console.log(`✅ Created campaign for Tenant B: ${campaignB._id}`);

        // 3. Test Repository - Find as Tenant A (Isolated)
        const tenantAList = await campaignRepository.findAllByClient(tenantAId);
        console.log(`📊 Tenant A list count: ${tenantAList.length} (Expected: 1)`);
        if (tenantAList.length !== 1) throw new Error('Tenant A visibility isolation failed');

        // 4. Test Repository - Find as Global Admin (No clientId)
        const globalList = await campaignRepository.findAllByClient(null);
        console.log(`📊 Global Admin list count (recent): ${globalList.length >= 2 ? 'PASSED' : 'FAILED'}`);
        if (globalList.length < 2) throw new Error('Global Admin visibility failed');

        // 5. Verify names are present
        const hasA = globalList.some(c => c.name === 'Tenant A Campaign');
        const hasB = globalList.some(c => c.name === 'Tenant B Campaign');
        console.log(`✅ Global list contains Tenant A: ${hasA}`);
        console.log(`✅ Global list contains Tenant B: ${hasB}`);

        if (!hasA || !hasB) throw new Error('Global visibility is missing specific tenant data');

        // Cleanup
        await Campaign.findByIdAndDelete(campaignA._id);
        await Campaign.findByIdAndDelete(campaignB._id);
        console.log('\n✅ VISIBILITY VERIFICATION COMPLETE: ALL PASSING');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runVerification();
