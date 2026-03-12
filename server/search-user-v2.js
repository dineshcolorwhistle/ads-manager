const mongoose = require('mongoose');

async function searchUser() {
    const emailToFind = 'manojtestdev011@gmail.com';
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017').asPromise();
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();

        console.log(`--- Searching for ${emailToFind} ---`);

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            const db = conn.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            for (const col of collections) {
                const found = await db.db.collection(col.name).findOne({
                    $or: [
                        { email: emailToFind },
                        { email_id: emailToFind },
                        { user_email: emailToFind },
                        { username: emailToFind }
                    ]
                });

                if (found) {
                    console.log(`\n✅ FOUND in DB: "${dbName}", Collection: "${col.name}"`);
                    console.log('Document:', JSON.stringify(found, null, 2));

                    // Also check for associated Client if it's a user
                    if (found.client_id) {
                        const client = await db.db.collection('clients').findOne({ _id: found.client_id });
                        if (client) {
                            console.log('Associated Client:', JSON.stringify(client, null, 2));
                        }
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

searchUser();
