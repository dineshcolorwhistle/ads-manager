const mongoose = require('mongoose');

async function findId() {
    const idToFind = '69a81b7b5fd56355ccea3f2d';
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        console.log(`--- Searching for ID ${idToFind} ---`);

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            for (const col of collections) {
                const found = await db.db.collection(col.name).findOne({
                    $or: [
                        { _id: new mongoose.Types.ObjectId(idToFind) },
                        { user_id: new mongoose.Types.ObjectId(idToFind) },
                        { created_by: new mongoose.Types.ObjectId(idToFind) },
                        { userId: idToFind },
                        { id: idToFind }
                    ]
                });

                if (found) {
                    console.log(`\n✅ FOUND in DB: "${dbName}", Collection: "${col.name}"`);
                    console.log('Document:', JSON.stringify(found, null, 2));
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

findId();
