const clientRepository = require('../repositories/clientRepository');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Client Controller
 * Handles client list endpoint for admin (e.g. campaign client selector)
 */

/**
 * List all clients (Admin only)
 * GET /clients
 * Returns minimal list for dropdowns: _id, name
 *
 * Only includes clients that have at least one ACTIVE client user attached,
 * so admin dropdowns mirror the Users page and exclude orphaned/inactive workspaces.
 */
const list = async (req, res) => {
    try {
        // Find active client users and load their client workspaces
        const users = await User.find({
            role: 'CLIENT',
            status: 'active',
            client_id: { $ne: null }
        })
            .populate('client_id', '_id name')
            .lean();

        // Build a unique list of client workspaces from these users
        const uniqueClientsMap = new Map();
        for (const user of users) {
            const client = user.client_id;
            if (client && client._id && !uniqueClientsMap.has(String(client._id))) {
                uniqueClientsMap.set(String(client._id), {
                    _id: client._id,
                    name: client.name
                });
            }
        }

        const clients = Array.from(uniqueClientsMap.values());

        res.status(200).json({
            success: true,
            data: clients,
            message: 'Clients retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CLIENT_CONTROLLER', 'Failed to list clients', error);
        res.status(500).json({
            success: false,
            error: { code: 'LIST_FAILED', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = { list };
