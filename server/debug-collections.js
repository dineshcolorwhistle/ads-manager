const mongoose = require('mongoose');

async function debugCollections() {
    const sourceUri = process.argv[2];
    if (!sourceUri) {
        console.error('Usage: node debug-collections.js <source_uri>');
        process.exit(1);
    }

    try {
        console.log('Connecting to Source DB...');
        const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        console.log('✅ Connected to Source');

        const admin = sourceConn.db.admin();
        const collections = await sourceConn.db.listCollections().toArray();
        console.log('Collections found in DB:');
        collections.forEach(c => console.log(`- ${c.name}`));

        if (collections.some(c => c.name === 'users')) {
            const usersCount = await sourceConn.db.collection('users').countDocuments();
            console.log(`\nDocument count in "users": ${usersCount}`);

            if (usersCount > 0) {
                const sample = await sourceConn.db.collection('users').findOne();
                console.log('Sample User:', JSON.stringify(sample, null, 2));
            }
        }

        await sourceConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Debug failed:', error);
        process.exit(1);
    }
}

debugCollections();
