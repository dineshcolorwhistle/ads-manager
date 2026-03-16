import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import campaignService from '../../services/campaignService';
import clientService from '../../services/clientService';
import authService from '../../services/authService';
import './DraftList.css';

const DraftList = () => {
    const [drafts, setDrafts] = useState([]);
    const [clients, setClients] = useState([]);
    const [filterClientId, setFilterClientId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isAdmin = authService.getCurrentUser()?.role === 'ADMIN';

    useEffect(() => {
        loadDrafts();
    }, [filterClientId]);

    useEffect(() => {
        if (isAdmin) {
            clientService.getClients()
                .then(res => res.success && res.data && setClients(res.data))
                .catch(() => setClients([]));
        }
    }, [isAdmin]);

    const loadDrafts = async () => {
        try {
            setLoading(true);
            const response = await campaignService.getDrafts(filterClientId || null);
            setDrafts(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to load drafts:', err);
            setError('Failed to load campaign drafts. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Loading drafts...</div>;

    return (
        <div className="drafts-container">
            <header className="drafts-header">
                <h1>Campaign Management</h1>
                <div className="drafts-header-actions">
                    {isAdmin && clients.length > 0 && (
                        <select
                            className="drafts-client-filter"
                            value={filterClientId}
                            onChange={(e) => setFilterClientId(e.target.value)}
                            title="Filter by client"
                        >
                            <option value="">All clients</option>
                            {clients.map(c => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    <Link to="/drafts/new" className="btn-new-campaign">
                        + New Campaign
                    </Link>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            {drafts.length === 0 ? (
                <div className="empty-state">
                    <h3>No campaigns found</h3>
                    <p>Start by creating your first campaign.</p>
                </div>
            ) : (
                <div className="drafts-grid">
                    {drafts.map((draft) => (
                        <div key={draft._id} className="draft-card">
                            <div className="draft-meta">
                                <span className={`badge badge-platform-${draft.platform}`}>
                                    {draft.platform}
                                </span>
                                <span className={`badge badge-status-${draft.status.toLowerCase()}`}>
                                    {draft.status}
                                </span>
                            </div>
                            <h3>{draft.name}</h3>
                            <div className="creator-info">
                                <span>Created by: <strong>{draft.created_by?.email || draft.created_by?.name || 'Unknown'}</strong></span>
                            </div>
                            <div className="draft-details">
                                <p><strong>Objective:</strong> {draft.objective}</p>
                                <p><strong>Budget:</strong> {draft.budget?.amount} {draft.currency}</p>
                                {draft.external_id && (
                                    <p className="external-id"><strong>Platform ID:</strong> {draft.external_id}</p>
                                )}
                            </div>
                            <Link to={`/drafts/${draft._id}`} className="btn-edit">
                                {draft.status === 'ACTIVE' ? 'Manage Campaign' : 'Edit Draft'}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DraftList;
