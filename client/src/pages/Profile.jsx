import { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import './Profile.css';

function formatRoleLabel(role) {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'CLIENT') return 'User';
    return role || '—';
}

function getInitials(user) {
    if (user?.name?.trim()) {
        const parts = user.name.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
        const local = user.email.split('@')[0] || user.email;
        return local.slice(0, 2).toUpperCase();
    }
    return '?';
}

/** Normalize client_id from API (string or { _id }) */
function formatClientId(clientId) {
    if (clientId == null) return null;
    if (typeof clientId === 'string' && clientId.trim()) return clientId.trim();
    if (typeof clientId === 'object' && clientId._id != null) return String(clientId._id);
    const s = String(clientId);
    return s && s !== '[object Object]' ? s : null;
}

function DetailRow({ label, value, variant, children }) {
    return (
        <div className={`profile-detail-row${variant ? ` profile-detail-row--${variant}` : ''}`}>
            <span className="profile-detail-label">{label}</span>
            <div className="profile-detail-value-wrap">
                {children ?? <span className="profile-detail-value">{value}</span>}
            </div>
        </div>
    );
}

/**
 * Profile view — session user with a structured, professional layout.
 */
function Profile() {
    const user = authService.getCurrentUser();
    const [copied, setCopied] = useState(false);

    const clientIdDisplay =
        user?.role === 'CLIENT' ? formatClientId(user.client_id) : null;

    const copyClientId = async () => {
        if (!clientIdDisplay) return;
        try {
            await navigator.clipboard.writeText(clientIdDisplay);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    if (!user) {
        return (
            <div className="profile-page">
                <div className="profile-page-bg" aria-hidden />
                <div className="profile-empty-state">
                    <div className="profile-empty-icon" aria-hidden>!</div>
                    <h1 className="profile-empty-title">Not signed in</h1>
                    <p className="profile-empty-text">Sign in to view your account profile.</p>
                    <Link to="/login" className="profile-btn profile-btn--primary">
                        Go to login
                    </Link>
                </div>
            </div>
        );
    }

    const statusNormalized = user.status ? String(user.status).toLowerCase() : '';
    const isActive = statusNormalized === 'active';

    return (
        <div className="profile-page">
            <div className="profile-page-bg" aria-hidden />

            <div className="profile-inner">
                <Link to="/" className="profile-nav-back">
                    <span className="profile-nav-back-icon" aria-hidden>←</span>
                    Back to dashboard
                </Link>

                <header className="profile-hero">
                    <div className="profile-hero-avatar" aria-hidden>
                        {getInitials(user)}
                    </div>
                    <div className="profile-hero-text">
                        <p className="profile-hero-eyebrow">Account</p>
                        <h1 className="profile-hero-name">{user.name?.trim() || 'Your profile'}</h1>
                        <p className="profile-hero-email">{user.email}</p>
                        <div className="profile-hero-badges">
                            <span className="profile-badge profile-badge--role">
                                {formatRoleLabel(user.role)}
                            </span>
                            {user.status && (
                                <span
                                    className={`profile-badge profile-badge--status${isActive ? ' profile-badge--status-active' : ''}`}
                                >
                                    {isActive ? '● ' : ''}
                                    <span className="profile-status-cap">{user.status}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                <section className="profile-panel" aria-labelledby="profile-details-heading">
                    <div className="profile-panel-head">
                        <h2 id="profile-details-heading" className="profile-panel-title">
                            Account details
                        </h2>
                        <p className="profile-panel-sub">
                            Information associated with your signed-in session.
                        </p>
                    </div>

                    <div className="profile-detail-list">
                        {user.name?.trim() && (
                            <DetailRow label="Full name" value={user.name.trim()} />
                        )}
                        <DetailRow label="Email address" value={user.email} />
                        <DetailRow label="Role" value={formatRoleLabel(user.role)} />
                        {user.status && (
                            <DetailRow
                                label="Account status"
                                value={user.status}
                                variant="status"
                            />
                        )}
                        {clientIdDisplay && (
                            <DetailRow label="Client ID" variant="mono">
                                <div className="profile-client-id-block">
                                    <code className="profile-client-id-code">{clientIdDisplay}</code>
                                    <button
                                        type="button"
                                        className="profile-copy-btn"
                                        onClick={copyClientId}
                                        aria-label="Copy client ID"
                                    >
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </DetailRow>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Profile;
