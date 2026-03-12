const mongoose = require('mongoose');

async function moveData() {
    const targetUriBase = 'mongodb+srv://manojcolorwhistle_db_user:zWHQIMwZFy73hTuZ@cluster0.8izwet6.mongodb.net';
    const appName = 'Cluster0';

    try {
        console.log('--- Data Move: test -> ad_campaigns ---');
        const conn = await mongoose.createConnection(`${targetUriBase}/?appName=${appName}`).asPromise();

        const sourceDb = conn.useDb('test');
        const targetDb = conn.useDb('ad_campaigns');

        const collections = [
            'users',
            'clients',
            'oauthcredentials',
            'platformaccounts',
            'campaigns',
            'adgroups',
            'adcreatives',
            'userapicredentials'
        ];

        for (const colName of collections) {
            console.log(`Moving ${colName}...`);
            const docs = await sourceDb.db.collection(colName).find({}).toArray();
            if (docs.length > 0) {
                for (const doc of docs) {
                    const exists = await targetDb.db.collection(colName).findOne({ _id: doc._id });
                    if (!exists) {
                        await targetDb.db.collection(colName).insertOne(doc);
                        console.log(`  Moved doc ${doc._id}`);
                    }
                }
                // Optional: Cleanup source
                // await sourceDb.db.collection(colName).deleteMany({});
            }
        }

        console.log('✅ Data moved successfully to ad_campaigns database.');
        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Move failed:', error);
        process.exit(1);
    }
}

moveData();
