const mongoose = require('mongoose');

async function fullMigration() {
    const sourceUri = 'mongodb://127.0.0.1:27017/ad_campaigns';
    const targetUri = 'mongodb+srv://manojcolorwhistle_db_user:zWHQIMwZFy73hTuZ@cluster0.8izwet6.mongodb.net/?appName=Cluster0';

    try {
        console.log('--- Full Migration Started ---');
        const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        const targetConn = await mongoose.createConnection(targetUri).asPromise();

        const collections = [
            'clients',
            'oauthcredentials',
            'platformaccounts',
            'campaigns',
            'adgroups',
            'adcreatives',
            'userapicredentials'
        ];

        for (const colName of collections) {
            console.log(`Migrating collection: ${colName}...`);
            const docs = await sourceConn.db.collection(colName).find({}).toArray();
            console.log(`  Found ${docs.length} documents.`);

            for (const doc of docs) {
                const exists = await targetConn.db.collection(colName).findOne({ _id: doc._id });
                if (!exists) {
                    await targetConn.db.collection(colName).insertOne(doc);
                    console.log(`    Inserted doc ID: ${doc._id}`);
                } else {
                    console.log(`    Doc ID ${doc._id} already exists (skipped).`);
                }
            }
        }

        console.log('--- Full Migration Finished ---');
        await sourceConn.close();
        await targetConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

fullMigration();
