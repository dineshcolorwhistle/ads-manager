const mongoose = require('mongoose');

async function findAdmin() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        console.log('Searching all databases for "users" collection...');

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            if (collections.some(c => c.name === 'users')) {
                const count = await db.db.collection('users').countDocuments();
                console.log(`- Database "${dbName}" has "users" collection with ${count} documents.`);

                if (count > 0) {
                    const admins = await db.db.collection('users').find({ role: 'ADMIN' }).toArray();
                    if (admins.length > 0) {
                        console.log(`  ✅ FOUND ADMINS in "${dbName}":`);
                        admins.forEach(a => console.log(`    - ${a.email}`));
                    } else {
                        const anyUser = await db.db.collection('users').findOne();
                        console.log(`  (No Admins, but found user: ${anyUser.email})`);
                    }
                }
            }
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Search failed:', error);
        process.exit(1);
    }
}

findAdmin();
