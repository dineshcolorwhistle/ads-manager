import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import campaignService from '../services/campaignService';
import platformService from '../services/platformService';
import './Home.css';

/**
 * User Dashboard Component
 * Displays Google Ads and Meta Ads campaign summaries
 */
function Home() {
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Fetch both campaigns and platform connection statuses
                const [draftsResult, connectedPlatforms] = await Promise.all([
                    campaignService.getDrafts(),
                    platformService.getConnectedPlatforms().catch(() => []) 
                ]);

                // Result format comes directly from backend payload
                setCampaigns(draftsResult.data || []);
                setPlatforms(connectedPlatforms || []);
                setError(null);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const isGoogleConnected = platforms.some(p => p.platform === 'google');
    const isMetaConnected = platforms.some(p => p.platform === 'meta');

    const googleCampaigns = campaigns.filter(c => c.platform === 'google');
    const metaCampaigns = campaigns.filter(c => c.platform === 'meta');

    const renderPlatformCard = (title, platform, isConnected, platformCampaigns, colorClass) => {
        const activeCount = platformCampaigns.filter(c => c.status === 'ACTIVE').length;
        const draftCount = platformCampaigns.filter(c => c.status === 'DRAFT').length;
        const failedCount = platformCampaigns.filter(c => c.status === 'FAILED').length;

        return (
            <div className={`platform-card ${colorClass}`}>
                <div className="platform-header">
                    <h3>{title}</h3>
                    <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                </div>
                
                <div className="platform-stats">
                    <div className="stat-item">
                        <span className="stat-value">{platformCampaigns.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value text-success">{activeCount}</span>
                        <span className="stat-label">Active</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value text-warning">{draftCount}</span>
                        <span className="stat-label">Draft</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value text-danger">{failedCount}</span>
                        <span className="stat-label">Failed</span>
                    </div>
                </div>

                <div className="platform-actions">
                    {!isConnected && (
                        <Link to="/platforms" className={`btn-connect ${colorClass}-btn`}>
                            Connect Account
                        </Link>
                    )}
                    <Link to={platformCampaigns.length === 0 ? "/drafts/new" : "/drafts"} className={`btn-view ${colorClass}-btn-outline`}>
                        {platformCampaigns.length === 0 ? "Create Campaign" : "View Campaigns"}
                    </Link>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="home-dashboard loading-state">
                <div className="spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="home-dashboard">
            <header className="dashboard-header">
                <h2>Campaign Dashboard</h2>
                <p>Overview of your Google Ads and Meta Ads performance and statuses.</p>
            </header>

            {error && <div className="error-message">{error}</div>}

            <div className="dashboard-grid">
                {renderPlatformCard("Google Ads", "google", isGoogleConnected, googleCampaigns, "platform-google")}
                {renderPlatformCard("Meta Ads", "meta", isMetaConnected, metaCampaigns, "platform-meta")}
            </div>
            
            <div className="recent-activity-section">
                <div className="section-header">
                    <h3>Recent Campaigns</h3>
                    <Link to="/drafts/new" className="create-new-btn">
                        + New Campaign
                    </Link>
                </div>
                
                {campaigns.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <p>No campaigns found across your ad platforms.</p>
                        <span className="empty-hint">Start by creating your first campaign to see analytics here.</span>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="campaigns-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Platform</th>
                                    <th>Objective</th>
                                    <th>Status</th>
                                    <th>Created On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Sort campaigns by latest created_at and show top 5 */}
                                {[...campaigns]
                                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                    .slice(0, 5)
                                    .map(c => (
                                    <tr key={c._id}>
                                        <td className="campaign-name">{c.name}</td>
                                        <td>
                                            <span className={`platform-tag tag-${c.platform}`}>
                                                {c.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
                                            </span>
                                        </td>
                                        <td className="campaign-objective">{c.objective}</td>
                                        <td>
                                            <span className={`status-tag status-${c.status?.toLowerCase()}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="campaign-date">{new Date(c.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
