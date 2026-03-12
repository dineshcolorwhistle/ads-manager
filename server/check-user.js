const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./src/models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}, { password: 0 });
        console.log('Database Users:', JSON.stringify(users, null, 2));

        if (users.length === 0) {
            console.log('⚠️ No users found. Creating a default user...');
            const newUser = new User({
                name: 'Default Admin',
                email: 'admin@example.com',
                password: 'password123',
                role: 'ADMIN',
                status: 'active',
                client_id: new mongoose.Types.ObjectId()
            });
            await newUser.save();
            console.log('✅ Default user created: admin@example.com / password123');
        }

    } catch (error) {
        console.error('❌ Error checking users:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

checkUser();
