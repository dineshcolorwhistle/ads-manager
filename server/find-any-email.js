const mongoose = require('mongoose');

async function findEmail() {
    try {
        const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/ad_campaigns').asPromise();
        const collections = await conn.db.listCollections().toArray();

        for (const col of collections) {
            const sample = await conn.db.collection(col.name).findOne({ email: { $exists: true } });
            if (sample) {
                console.log(`✅ FOUND EMAIL in collection "${col.name}":`, sample.email);
                console.log('Full Doc:', JSON.stringify(sample, null, 2));
            }
        }

        await conn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Check failed:', error);
        process.exit(1);
    }
}

findEmail();
