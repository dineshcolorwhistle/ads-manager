import { useState, useEffect } from 'react';
import './Home.css';

/**
 * Home Page Component
 * Displays welcome message and system status
 */
function Home() {
    const [systemStatus, setSystemStatus] = useState({
        loading: true,
        healthy: false,
        database: 'unknown',
        message: 'Checking system status...'
    });

    useEffect(() => {
        // Check backend health
        const checkHealth = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                const response = await fetch(`${apiUrl}/health`);
                const data = await response.json();

                if (data.success) {
                    setSystemStatus({
                        loading: false,
                        healthy: true,
                        database: data.data.database,
                        message: 'System is operational'
                    });
                } else {
                    throw new Error('Health check failed');
                }
            } catch (error) {
                setSystemStatus({
                    loading: false,
                    healthy: false,
                    database: 'disconnected',
                    message: 'Backend is not reachable'
                });
            }
        };

        checkHealth();
    }, []);

    return (
        <div className="home">
            <h2>Welcome to Ad Campaign Automation System</h2>
            <p>Manage your Google Ads and Meta Ads campaigns from a single platform.</p>

            <div className={`status-card ${systemStatus.healthy ? 'healthy' : 'unhealthy'}`}>
                <h3>System Status</h3>
                {systemStatus.loading ? (
                    <p>Loading...</p>
                ) : (
                    <>
                        <p className="status-message">{systemStatus.message}</p>
                        <div className="status-details">
                            <div className="status-item">
                                <span className="label">Backend:</span>
                                <span className={`value ${systemStatus.healthy ? 'success' : 'error'}`}>
                                    {systemStatus.healthy ? '✅ Online' : '❌ Offline'}
                                </span>
                            </div>
                            <div className="status-item">
                                <span className="label">Database:</span>
                                <span className={`value ${systemStatus.database === 'connected' ? 'success' : 'error'}`}>
                                    {systemStatus.database === 'connected' ? '✅ Connected' : '❌ Disconnected'}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="info-section">
                <h3>Phase 0 - Foundation Complete</h3>
                <ul>
                    <li>✅ Backend server with Express</li>
                    <li>✅ MongoDB connection</li>
                    <li>✅ Logging system (Winston)</li>
                    <li>✅ Error handling middleware</li>
                    <li>✅ React frontend with routing</li>
                </ul>
            </div>
        </div>
    );
}

export default Home;
