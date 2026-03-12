const mongoose = require('mongoose');

async function checkData() {
    try {
        const sourceConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/ad_campaigns').asPromise();
        console.log('--- ad_campaigns Data Check ---');

        const clientsCount = await sourceConn.db.collection('clients').countDocuments();
        const usersCount = await sourceConn.db.collection('users').countDocuments();
        const campaignsCount = await sourceConn.db.collection('campaigns').countDocuments();

        console.log(`Clients: ${clientsCount}`);
        console.log(`Users: ${usersCount}`);
        console.log(`Campaigns: ${campaignsCount}`);

        if (usersCount > 0) {
            const users = await sourceConn.db.collection('users').find({}).toArray();
            console.log('Users found:');
            users.forEach(u => console.log(`- ${u.email} (${u.role})`));
        }

        await sourceConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Check failed:', error);
        process.exit(1);
    }
}

checkData();
