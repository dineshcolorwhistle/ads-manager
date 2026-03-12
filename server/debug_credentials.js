const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const User = require('./src/models/User');
const userApiCredentialRepository = require('./src/repositories/userApiCredentialRepository');
const platformService = require('./src/services/platformService');

async function debug() {
    const out = {};
    try {
        await mongoose.connect(process.env.MONGO_URI);
        out.status = 'Connected to DB';

        const email = 'manojtestdev011@gmail.com';
        const user = await User.findOne({ email });
        if (!user) {
            out.status = 'User not found';
            return;
        }

        const clientId = user.client_id;
        out.clientId = clientId;

        const creds = await mongoose.connection.collection('userapicredentials').find({ client_id: clientId }).toArray();
        out.rawDbRecords = creds.map(c => ({ platform: c.platform, id: c._id }));

        // Try getting Google config
        const googleCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, 'google');
        if (googleCred) {
            const gConfig = googleCred.getConfig();
            out.googleConfig = {
                clientId: gConfig.clientId,
                clientSecret: gConfig.clientSecret ? gConfig.clientSecret.substring(0, 4) + '...' : null,
                callbackUrl: gConfig.callbackUrl,
                developerToken: gConfig.developerToken ? 'PRESENT' : 'MISSING'
            };
            out.googleUrl = await platformService.generateConnectUrl(clientId, 'google');
        } else {
            out.googleConfig = 'NOT_FOUND';
        }

        // Try getting Meta config
        const metaCred = await userApiCredentialRepository.findByClientAndPlatform(clientId, 'meta');
        if (metaCred) {
            const mConfig = metaCred.getConfig();
            out.metaConfig = {
                appId: mConfig.appId,
                appSecret: mConfig.appSecret ? mConfig.appSecret.substring(0, 4) + '...' : null,
                callbackUrl: mConfig.callbackUrl,
                configId: mConfig.configId
            };
            out.metaUrl = await platformService.generateConnectUrl(clientId, 'meta');
        } else {
            out.metaConfig = 'NOT_FOUND';
        }

    } catch (e) {
        out.error = e.message;
    } finally {
        fs.writeFileSync('debug_output.json', JSON.stringify(out, null, 2));
        await mongoose.disconnect();
    }
}

debug();
