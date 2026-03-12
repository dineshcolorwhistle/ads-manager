const mongoose = require('mongoose');

async function findSpecificAdmin() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/ad_campaigns').asPromise();
        console.log('Checking "users" collection in "ad_campaigns" for manoj@colorwhistle.com...');

        // Use a direct find on the collection to avoid model issues
        const user = await conn.db.collection('users').findOne({ email: 'manoj@colorwhistle.com' });

        if (user) {
            console.log('✅ FOUND USER:', JSON.stringify(user, null, 2));
        } else {
            console.log('❌ User not found in "ad_campaigns" users collection.');

            // Try searching all collections in this DB for any document with that email
            const collections = await conn.db.listCollections().toArray();
            for (const col of collections) {
                const found = await conn.db.collection(col.name).findOne({ email: 'manoj@colorwhistle.com' });
                if (found) {
                    console.log(`✅ FOUND in collection "${col.name}":`, JSON.stringify(found, null, 2));
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

findSpecificAdmin();
