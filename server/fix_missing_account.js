const mongoose = require('mongoose');
require('dotenv').config();
const platformAccountRepository = require('./src/repositories/platformAccountRepository');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected');

        const clientId = '69a9125f55c6bef9e8c964f0';

        // Get the most recent Google credential for this client
        const googleCreds = await mongoose.connection.collection('oauthcredentials')
            .find({ client_id: new mongoose.Types.ObjectId(clientId), platform: 'google' })
            .sort({ updated_at: -1 })
            .toArray();

        console.log(`Found ${googleCreds.length} Google credentials`);

        if (googleCreds.length > 0) {
            const latestCred = googleCreds[0];
            console.log(`Using latest credential: ${latestCred._id}`);

            // Create the missing platform account
            await platformAccountRepository.upsertAccount({
                client_id: clientId,
                oauth_credential_id: latestCred._id,
                platform: 'google',
                platform_account_id: latestCred.platform_account_id,
                name: 'Google Ads Account (pending discovery)',
                currency: 'USD',
                timezone: 'UTC'
            });
            console.log('Google platform account created!');

            // Clean up duplicate older credentials (keep only the latest)
            if (googleCreds.length > 1) {
                for (let i = 1; i < googleCreds.length; i++) {
                    await mongoose.connection.collection('oauthcredentials').deleteOne({ _id: googleCreds[i]._id });
                    console.log(`Deleted older credential: ${googleCreds[i]._id}`);
                }
            }
        }

        console.log('Done!');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fix();
