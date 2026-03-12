const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createClientUser() {
    try {
        console.log(`Connecting to: ${process.env.MONGO_URI.substring(0, 50)}...`);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000
        });
        console.log('✅ Connected to Atlas MongoDB');

        const email = 'manojtestdev011@gmail.com';
        const password = 'cwopentool-adc*client';

        const existing = await User.findOne({ email });
        if (existing) {
            console.log(`User ${email} already exists in Atlas.`);
            process.exit(0);
        }

        const clientUser = new User({
            name: 'Client User',
            email: email,
            password: password, // Will be hashed by pre-save hook in the User model
            role: 'CLIENT',
            client_id: new mongoose.Types.ObjectId('69897ce6efec076b70207e1b'),
            status: 'active'
        });

        await clientUser.save();
        console.log(`✅ Client user created in Atlas: ${email}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create user:', error.message);
        process.exit(1);
    }
}

createClientUser();
