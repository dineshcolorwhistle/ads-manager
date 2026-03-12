const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Express App Configuration
 * Sets up Express app with middleware and routes
 */

const app = express();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
    logger.info('HTTP', `${req.method} ${req.path}`);
    next();
});

/**
 * Health Check Endpoint
 * GET /health
 * Returns system health status
 */
app.get('/api/health', async (req, res) => {
    try {
        const mongoose = require('mongoose');

        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        // Calculate uptime in seconds
        const uptime = process.uptime();

        // Return health status (per rules.md section 10.2)
        res.status(200).json({
            success: true,
            data: {
                status: 'healthy',
                database: dbStatus,
                uptime: uptime,
                environment: process.env.NODE_ENV || 'development'
            },
            message: 'System is healthy',
            timestamp: new Date().toISOString() // UTC timestamp
        });

        logger.success('HEALTH', 'Health check passed');

    } catch (error) {
        logger.error('HEALTH', 'Health check failed', error);

        res.status(503).json({
            success: false,
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service is unavailable'
            },
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Root Endpoint
 * GET /
 * Returns API information
 */
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: 'Ad Campaign Automation System API',
            version: '1.0.0',
            status: 'running'
        },
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userCredentialRoutes = require('./routes/userCredentialRoutes');
const platformRoutes = require('./routes/platformRoutes');
const campaignRoutes = require('./routes/campaignRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users/api-credentials', userCredentialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/oauth', platformRoutes);
app.use('/api/campaigns', campaignRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;

