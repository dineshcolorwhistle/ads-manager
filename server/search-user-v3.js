const mongoose = require('mongoose');

async function aggressiveSearch() {
    const emailToFind = 'manojtestdev011@gmail.com';
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        console.log(`--- Aggressive Searching for ${emailToFind} ---`);

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            console.log(`Checking DB: ${dbName}...`);

            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            for (const col of collections) {
                // Search for any document where any field contains the email
                const rawDocs = await db.db.collection(col.name).find({}).toArray();

                for (const doc of rawDocs) {
                    const docString = JSON.stringify(doc);
                    if (docString.toLowerCase().includes(emailToFind.toLowerCase())) {
                        console.log(`\n✅ MATCH FOUND in DB: "${dbName}", Collection: "${col.name}"`);
                        console.log('Document:', JSON.stringify(doc, null, 2));
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

aggressiveSearch();
