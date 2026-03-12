require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        // Get a campaign
        // Find campaign with ad groups
        const camps = await db.collection('campaigns').find({ platform: 'google' }).sort({ created_at: -1 }).toArray();
        let camp = null;
        for (const c of camps) {
            const adgroups = await db.collection('adgroups').find({ campaign_id: c._id }).toArray();
            if (adgroups.length > 0) {
                camp = c;
                break;
            }
        }

        if (!camp) {
            console.log("Missing campaign");
            process.exit(1);
        }

        const user = await db.collection('users').findOne({ client_id: camp.client_id });
        if (!user) {
            console.log("Missing user for client " + camp.client_id);
            process.exit(1);
        }

        // We need to set the status to READY so it can be published
        await db.collection('campaigns').updateOne({ _id: camp._id }, { $set: { status: 'READY' } });

        // Create JWT token
        const token = jwt.sign({ id: user._id, role: user.role, client_id: user.client_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Make HTTP Request
        const req = http.request({
            hostname: 'localhost',
            port: 5001,
            path: `/api/campaigns/${camp._id}/publish`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                require('fs').writeFileSync('C:\\ads-manager\\server\\api_response.txt', data);
                console.log('Response saved to api_response.txt');
            });
        });

        req.on('error', e => console.error(e));
        req.end();
        console.log(`Requested publishing for ${camp._id}. Waiting a bit...`);
        setTimeout(() => process.exit(0), 15000);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
