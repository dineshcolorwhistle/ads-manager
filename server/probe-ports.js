const mongoose = require('mongoose');

async function probePorts() {
    const ports = [27017, 27018, 27019, 27020];
    const emailToFind = 'manojtestdev011@gmail.com';

    for (const port of ports) {
        console.log(`Probing port ${port}...`);
        try {
            const uri = `mongodb://127.0.0.1:${port}`;
            const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 2000 }).asPromise();
            console.log(`✅ Connected to port ${port}`);

            const admin = conn.db.admin();
            const dbs = await admin.listDatabases();

            for (const dbInfo of dbs.databases) {
                const dbName = dbInfo.name;
                const db = conn.useDb(dbName);
                const collections = await db.db.listCollections().toArray();

                for (const col of collections) {
                    if (col.name === 'users') {
                        const user = await db.db.collection('users').findOne({ email: emailToFind });
                        if (user) {
                            console.log(`\n🔥🔥 FOUND USER on Port ${port}, DB: ${dbName} 🔥🔥`);
                            console.log(JSON.stringify(user, null, 2));
                        }
                    }
                }
            }
            await conn.close();
        } catch (err) {
            console.log(`❌ Port ${port} not reachable or error: ${err.message}`);
        }
    }
    process.exit(0);
}

probePorts();
