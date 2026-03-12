const mongoose = require('mongoose');

async function verifyAtlas() {
    const targetUri = 'mongodb+srv://manojcolorwhistle_db_user:zWHQIMwZFy73hTuZ@cluster0.8izwet6.mongodb.net/?appName=Cluster0';

    try {
        const conn = await mongoose.createConnection(targetUri).asPromise();
        console.log('--- Atlas Final Verification ---');

        const counts = {
            users: await conn.db.collection('users').countDocuments(),
            clients: await conn.db.collection('clients').countDocuments(),
            campaigns: await conn.db.collection('campaigns').countDocuments(),
            oauthcredentials: await conn.db.collection('oauthcredentials').countDocuments(),
            platformaccounts: await conn.db.collection('platformaccounts').countDocuments()
        };

        console.log('Document Counts in Atlas:');
        Object.entries(counts).forEach(([col, count]) => {
            console.log(`- ${col}: ${count}`);
        });

        const admin = await conn.db.collection('users').findOne({ email: 'manoj@colorwhistle.com' });
        console.log('\nAdmin Status:', admin ? '✅ Exists' : '❌ MISSING');
        if (admin) {
            console.log(`- Role: ${admin.role}`);
            console.log(`- Password Hashed: ${admin.password.startsWith('$2')}`);
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyAtlas();
