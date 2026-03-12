const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to Atlas MongoDB');

        const email = 'manoj@colorwhistle.com';
        const password = 'cwopentool-adc*prod';

        const existing = await User.findOne({ email });
        if (existing) {
            console.log(`User ${email} already exists in Atlas.`);
            process.exit(0);
        }

        const admin = new User({
            name: 'Manoj Admin',
            email: email,
            password: password, // Will be hashed by pre-save hook
            role: 'ADMIN',
            status: 'active'
        });

        await admin.save();
        console.log(`✅ Admin user created in Atlas: ${email}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create admin:', error);
        process.exit(1);
    }
}

createAdmin();
