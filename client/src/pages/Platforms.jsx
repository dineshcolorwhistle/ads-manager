import { useState, useEffect } from 'react';
import platformService from '../services/platformService';
import './Platforms.css';

/**
 * Platforms Page
 * Manage Google Ads and Meta Ads connections
 */
function Platforms() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAccounts();

        // Check for redirect parameters
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('connected');
        const errorParam = params.get('error');

        if (connected) {
            alert(`Successfully connected ${connected}!`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (errorParam) {
            alert(`Connection failed: ${errorParam}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const data = await platformService.getAccounts();
            setAccounts(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform) => {
        try {
            const url = await platformService.getConnectUrl(platform);
            // In a real app, we would redirect. 
            // Since this is local dev, we'll open in a new window for verification if possible, 
            // or just show the URL for manual click.
            window.location.href = url;
        } catch (err) {
            alert('Failed to get connection URL: ' + err.message);
        }
    };

    const handleDisconnect = async (platform) => {
        if (!window.confirm(`Are you sure you want to disconnect ${platform}?`)) return;

        try {
            await platformService.disconnect(platform);
            fetchAccounts();
            alert(`${platform} disconnected successfully`);
        } catch (err) {
            alert('Failed to disconnect: ' + err.message);
        }
    };

    const googleAccounts = accounts.filter(a => a.platform === 'google');
    const metaAccounts = accounts.filter(a => a.platform === 'meta');

    return (
        <div className="platforms-page">
            <header className="page-header">
                <h2>Platform Connections</h2>
                <p>Connect and manage your advertising platform accounts.</p>
            </header>

            <div className="platform-grid">
                {/* Google Ads Card */}
                <div className="platform-card google">
                    <div className="card-header">
                        <img src="https://www.gstatic.com/images/branding/product/1x/google_ads_48dp.png" alt="Google Ads" />
                        <h3>Google Ads</h3>
                        {googleAccounts.length > 0 ? (
                            <span className="status-badge connected">Connected</span>
                        ) : (
                            <span className="status-badge disconnected">Disconnected</span>
                        )}
                    </div>
                    <div className="card-body">
                        {googleAccounts.length > 0 ? (
                            <div className="account-list">
                                <h4>Discovered Accounts:</h4>
                                <ul>
                                    {googleAccounts.map(acc => (
                                        <li key={acc._id}>
                                            <span className="acc-name">{acc.name}</span>
                                            <span className="acc-id">ID: {acc.platform_account_id}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="btn btn-danger" onClick={() => handleDisconnect('google')}>Disconnect</button>
                            </div>
                        ) : (
                            <div className="connect-prompt">
                                <p>Connect your Google Ads account to start managing campaigns.</p>
                                <button className="btn btn-google" onClick={() => handleConnect('google')}>Connect Google Ads</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta Ads Card */}
                <div className="platform-card meta">
                    <div className="card-header">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" alt="Meta Ads" />
                        <h3>Meta Ads</h3>
                        {metaAccounts.length > 0 ? (
                            <span className="status-badge connected">Connected</span>
                        ) : (
                            <span className="status-badge disconnected">Disconnected</span>
                        )}
                    </div>
                    <div className="card-body">
                        {metaAccounts.length > 0 ? (
                            <div className="account-list">
                                <h4>Discovered Accounts:</h4>
                                <ul>
                                    {metaAccounts.map(acc => (
                                        <li key={acc._id}>
                                            <span className="acc-name">{acc.name}</span>
                                            <span className="acc-id">ID: {acc.platform_account_id}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="btn btn-danger" onClick={() => handleDisconnect('meta')}>Disconnect</button>
                            </div>
                        ) : (
                            <div className="connect-prompt">
                                <p>Connect your Meta Ads account to start managing campaigns.</p>
                                <button className="btn btn-meta" onClick={() => handleConnect('meta')}>Connect Meta Ads</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && <div className="error-message">Error: {error}</div>}
            {loading && <div className="loading-spinner">Loading platform data...</div>}
        </div>
    );
}

export default Platforms;
