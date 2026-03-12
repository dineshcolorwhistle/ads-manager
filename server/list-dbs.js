const mongoose = require('mongoose');

async function listDbs() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases on local MongoDB:');
        dbs.databases.forEach(db => console.log(`- ${db.name}`));
        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to list databases:', error);
        process.exit(1);
    }
}

listDbs();
