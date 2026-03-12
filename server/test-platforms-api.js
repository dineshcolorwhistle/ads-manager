const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/User');
const authService = require('./src/services/authService');

const API_URL = 'http://localhost:5001/api';

async function testPlatforms() {
    console.log('=== Phase 2 Platform API Test ===');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const testUser = await User.findOne({ email: 'manoj@colorwhistle.com' });
        if (!testUser) throw new Error('Test user not found');

        const token = authService.generateToken(testUser);
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Test Get Google Connect URL
        console.log('Testing Google Connect URL...');
        const googleRes = await axios.get(`${API_URL}/platforms/google/connect`, { headers });
        if (googleRes.data.success) {
            console.log('✅ Google Connect URL generated:', googleRes.data.data.url);
        }

        // 2. Test Get Meta Connect URL
        console.log('Testing Meta Connect URL...');
        const metaRes = await axios.get(`${API_URL}/platforms/meta/connect`, { headers });
        if (metaRes.data.success) {
            console.log('✅ Meta Connect URL generated:', metaRes.data.data.url);
        }

    } catch (error) {
        console.error('❌ Platform API Test failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    } finally {
        await mongoose.connection.close();
        console.log('=== Platform API Test Complete ===');
    }
}

testPlatforms();
