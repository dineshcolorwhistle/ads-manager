const mongoose = require('mongoose');
const User = require('./src/models/User');
const Client = require('./src/models/Client');

/**
 * Migration Script
 * Syncs Users and Clients from a source MongoDB to a target MongoDB.
 * Usage: node migrate-users.js <source_uri> <target_uri>
 */

async function migrate() {
    const sourceUri = process.argv[2];
    const targetUri = process.argv[3];

    if (!sourceUri || !targetUri) {
        console.error('Usage: node migrate-users.js <source_uri> <target_uri>');
        process.exit(1);
    }

    try {
        console.log('--- Starting Migration ---');

        // 1. Connect to Source
        console.log('Connecting to Source DB...');
        const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        console.log('✅ Connected to Source');

        // 2. Connect to Target
        console.log('Connecting to Target DB...');
        const targetConn = await mongoose.createConnection(targetUri).asPromise();
        console.log('✅ Connected to Target');

        // Define models on respective connections
        const SourceUser = sourceConn.model('User', User.schema);
        const SourceClient = sourceConn.model('Client', Client.schema);

        const TargetUser = targetConn.model('User', User.schema);
        const TargetClient = targetConn.model('Client', Client.schema);

        // 3. Migrate Clients (Required for User foreign keys)
        console.log('Fetching Clients from source...');
        const clients = await SourceClient.find({});
        console.log(`Found ${clients.length} clients.`);

        for (const client of clients) {
            const exists = await TargetClient.findOne({ _id: client._id });
            if (!exists) {
                // Remove version key and re-insert
                const clientData = client.toObject();
                delete clientData.__v;
                await TargetClient.create(clientData);
                console.log(`Migrated Client: ${client.name}`);
            } else {
                console.log(`Client already exists: ${client.name}`);
            }
        }

        // 4. Migrate Users
        console.log('Fetching Users from source...');
        const users = await SourceUser.find({});
        console.log(`Found ${users.length} users.`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const exists = await TargetUser.findOne({ email: user.email });
            if (!exists) {
                // Remove version key and re-insert
                const userData = user.toObject();
                delete userData.__v;
                await TargetUser.create(userData);
                console.log(`Migrated User: ${user.email}`);
                migratedCount++;
            } else {
                console.log(`User already exists (skipped): ${user.email}`);
                skippedCount++;
            }
        }

        console.log('--- Migration Finished ---');
        console.log(`Total Migrated: ${migratedCount}`);
        console.log(`Total Skipped: ${skippedCount}`);

        await sourceConn.close();
        await targetConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
