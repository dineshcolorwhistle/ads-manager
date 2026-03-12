const mongoose = require('mongoose');

async function listAll() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            console.log(`\nDB: ${dbName}`);
            for (const col of collections) {
                const count = await db.db.collection(col.name).countDocuments();
                console.log(`  - ${col.name} (${count} docs)`);
            }
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

listAll();
