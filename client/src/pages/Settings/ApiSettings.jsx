import React, { useState, useEffect } from 'react';
import userCredentialService from '../../services/userCredentialService';
import './ApiSettings.css';

const ApiSettings = () => {
    const [googleConfig, setGoogleConfig] = useState({
        clientId: '',
        clientSecret: '',
        callbackUrl: '',
        developerToken: ''
    });

    const [metaConfig, setMetaConfig] = useState({
        appId: '',
        appSecret: '',
        callbackUrl: '',
        configId: ''
    });

    const [hasGoogleConfig, setHasGoogleConfig] = useState(false);
    const [isEditingGoogle, setIsEditingGoogle] = useState(true);

    const [hasMetaConfig, setHasMetaConfig] = useState(false);
    const [isEditingMeta, setIsEditingMeta] = useState(true);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        try {
            setLoading(true);
            const google = await userCredentialService.getCredential('google');
            const meta = await userCredentialService.getCredential('meta');

            if (google) {
                setGoogleConfig(google);
                setHasGoogleConfig(true);
                setIsEditingGoogle(false);
            }
            if (meta) {
                setMetaConfig(meta);
                setHasMetaConfig(true);
                setIsEditingMeta(false);
            }
        } catch (err) {
            setError('Failed to fetch API credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleChange = (e) => {
        const { name, value } = e.target;
        setGoogleConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleMetaChange = (e) => {
        const { name, value } = e.target;
        setMetaConfig(prev => ({ ...prev, [name]: value }));
    };

    const saveGoogle = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            await userCredentialService.updateCredential('google', googleConfig);
            setSuccess('Google API credentials saved successfully');
            setHasGoogleConfig(true);
            setIsEditingGoogle(false);
            // Refresh to get sanitized secret
            setTimeout(fetchCredentials, 1500);
        } catch (err) {
            setError(err.message || 'Failed to save Google credentials');
        } finally {
            setSaving(false);
        }
    };

    const saveMeta = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            await userCredentialService.updateCredential('meta', metaConfig);
            setSuccess('Meta API credentials saved successfully');
            setHasMetaConfig(true);
            setIsEditingMeta(false);
            // Refresh to get sanitized secret
            setTimeout(fetchCredentials, 1500);
        } catch (err) {
            setError(err.message || 'Failed to save Meta credentials');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state">Loading settings...</div>;

    return (
        <div className="settings-container">
            <h1>API Settings</h1>
            <p className="subtitle">Configure your own Google and Meta Ads API credentials to connect your accounts.</p>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="settings-grid">
                {/* Google Ads Config */}
                <section className="settings-section">
                    <div className="section-header">
                        <div className="platform-icon google">G</div>
                        <h2>Google Ads API</h2>
                    </div>
                    <form onSubmit={saveGoogle}>
                        <div className="form-group">
                            <label>Client ID</label>
                            <input
                                name="clientId"
                                value={googleConfig.clientId}
                                onChange={handleGoogleChange}
                                placeholder="953...apps.googleusercontent.com"
                                required
                                disabled={!isEditingGoogle}
                            />
                        </div>
                        <div className="form-group">
                            <label>Client Secret</label>
                            <input
                                type="text"
                                name="clientSecret"
                                value={googleConfig.clientSecret}
                                onChange={handleGoogleChange}
                                placeholder="GOCSPX-..."
                                required
                                disabled={!isEditingGoogle}
                            />
                        </div>
                        <div className="form-group">
                            <label>Callback URL</label>
                            <input
                                name="callbackUrl"
                                value={googleConfig.callbackUrl}
                                onChange={handleGoogleChange}
                                placeholder="http://localhost:5001/api/oauth/google/callback"
                                required
                                disabled={!isEditingGoogle}
                            />
                            <small>Must match your Google Cloud Console redirect URI.</small>
                        </div>
                        <div className="form-group">
                            <label>Developer Token</label>
                            <input
                                name="developerToken"
                                value={googleConfig.developerToken}
                                onChange={handleGoogleChange}
                                placeholder="Your Google Ads dev token"
                                required
                                disabled={!isEditingGoogle}
                            />
                        </div>

                        {!isEditingGoogle ? (
                            <button type="button" className="btn-edit" onClick={() => setIsEditingGoogle(true)}>
                                View and Edit Credentials
                            </button>
                        ) : (
                            <div className="button-group">
                                <button type="submit" className="btn-save" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Google Credentials'}
                                </button>
                                {hasGoogleConfig && (
                                    <button type="button" className="btn-cancel" onClick={() => { setIsEditingGoogle(false); fetchCredentials(); }} disabled={saving}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        )}
                    </form>
                </section>

                {/* Meta Ads Config */}
                <section className="settings-section">
                    <div className="section-header">
                        <div className="platform-icon meta">M</div>
                        <h2>Meta Ads (Facebook) API</h2>
                    </div>
                    <form onSubmit={saveMeta}>
                        <div className="form-group">
                            <label>App ID</label>
                            <input
                                name="appId"
                                value={metaConfig.appId}
                                onChange={handleMetaChange}
                                placeholder="763..."
                                required
                                disabled={!isEditingMeta}
                            />
                        </div>
                        <div className="form-group">
                            <label>App Secret</label>
                            <input
                                type="text"
                                name="appSecret"
                                value={metaConfig.appSecret}
                                onChange={handleMetaChange}
                                placeholder="ed42..."
                                required
                                disabled={!isEditingMeta}
                            />
                        </div>
                        <div className="form-group">
                            <label>Callback URL</label>
                            <input
                                name="callbackUrl"
                                value={metaConfig.callbackUrl}
                                onChange={handleMetaChange}
                                placeholder="https://your-ngrok.ngrok-free.dev/api/oauth/meta/callback"
                                required
                                disabled={!isEditingMeta}
                            />
                            <small>Must match your Meta App Dashboard redirect URI.</small>
                        </div>
                        <div className="form-group">
                            <label>Config ID (Optional)</label>
                            <input
                                name="configId"
                                value={metaConfig.configId}
                                onChange={handleMetaChange}
                                placeholder="132..."
                                disabled={!isEditingMeta}
                            />
                        </div>

                        {!isEditingMeta ? (
                            <button type="button" className="btn-edit" onClick={() => setIsEditingMeta(true)}>
                                View and Edit Credentials
                            </button>
                        ) : (
                            <div className="button-group">
                                <button type="submit" className="btn-save" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Meta Credentials'}
                                </button>
                                {hasMetaConfig && (
                                    <button type="button" className="btn-cancel" onClick={() => { setIsEditingMeta(false); fetchCredentials(); }} disabled={saving}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        )}
                    </form>
                </section>
            </div>
        </div>
    );
};

export default ApiSettings;
