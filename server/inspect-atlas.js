const mongoose = require('mongoose');

async function inspectAtlas() {
    const targetUri = 'mongodb+srv://manojcolorwhistle_db_user:zWHQIMwZFy73hTuZ@cluster0.8izwet6.mongodb.net/?appName=Cluster0';

    try {
        const conn = await mongoose.createConnection(targetUri).asPromise();
        console.log('✅ Connected to Atlas');

        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        console.log('\nDatabases found in Atlas cluster:');
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            console.log(`\n--- DB: ${dbName} ---`);
            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            if (collections.length === 0) {
                console.log('  (No collections)');
            }

            for (const col of collections) {
                const count = await db.db.collection(col.name).countDocuments();
                console.log(`  - ${col.name} (${count} docs)`);

                if (col.name === 'users' && count > 0) {
                    const sample = await db.db.collection('users').findOne();
                    console.log(`    Sample user: ${sample.email}`);
                }
            }
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Inspection failed:', error);
        process.exit(1);
    }
}

inspectAtlas();
