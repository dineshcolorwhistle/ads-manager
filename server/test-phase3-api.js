const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const authService = require('./src/services/authService');

const API_URL = 'http://localhost:5000/api'; // Based on platformRoutes.js/app.js naming

async function testApi() {
    console.log('=== Phase 3 API Integration Test ===');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const testUser = await User.findOne({ email: 'manoj@colorwhistle.com' });
        if (!testUser) throw new Error('Test user not found');

        const token = authService.generateToken(testUser);
        console.log('✅ Token generated for user:', testUser.email);

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Test Create Campaign
        console.log('Testing Campaign creation...');
        const createRes = await axios.post('http://localhost:5000/api/campaigns', {
            name: 'API Test Campaign',
            platform: 'google',
            objective: 'TRAFFIC',
            budget: { amount: 50, type: 'DAILY' },
            start_date: new Date()
        }, { headers });

        const campaignId = createRes.data.data._id;
        console.log('✅ Campaign created via API:', campaignId);

        // 2. Test Get Campaign
        console.log('Testing Get Campaign...');
        const getRes = await axios.get(`http://localhost:5000/api/campaigns/${campaignId}`, { headers });
        if (getRes.data.success) {
            console.log('✅ Campaign retrieved via API');
        }

        // 3. Test multi-tenant isolation (negative test)
        // Creating a token for a different (fake) client
        const otherToken = authService.generateToken({
            _id: new mongoose.Types.ObjectId(),
            role: 'CLIENT',
            client_id: new mongoose.Types.ObjectId()
        });

        console.log('Testing tenant isolation (should fail)...');
        try {
            await axios.get(`http://localhost:5000/api/campaigns/${campaignId}`, {
                headers: { Authorization: `Bearer ${otherToken}` }
            });
            console.error('❌ Isolation test failed: Accessed other tenant data');
        } catch (err) {
            if (err.response?.status === 404) {
                console.log('✅ Isolation test passed: Correctly blocked other tenant access (404)');
            } else {
                console.error('❌ Isolation test unexpected result:', err.response?.status);
            }
        }

        // Cleanup
        const Campaign = require('./src/models/Campaign');
        await Campaign.deleteOne({ _id: campaignId });
        console.log('✅ Cleanup successful');

    } catch (error) {
        console.error('❌ API Test failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    } finally {
        await mongoose.connection.close();
        console.log('=== API Integration Test Complete ===');
    }
}

testApi();
