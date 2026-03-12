import React, { useState, useEffect } from 'react';
import './AdminClients.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const PLATFORMS = {
    google: { label: 'Google Ads', icon: '🔵', color: '#4285F4' },
    meta: { label: 'Facebook Ads', icon: '🟢', color: '#1877F2' },
};

const PLATFORM_OPTIONS = [
    { id: 'google', ...PLATFORMS.google },
    { id: 'meta', ...PLATFORMS.meta },
];

const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const AdminClients = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteModal, setDeleteModal] = useState(null); // user object or null

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'CLIENT',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    // Auto-clear messages after 4s
    useEffect(() => {
        if (success || error) {
            const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
            return () => clearTimeout(t);
        }
    }, [success, error]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
            const result = await res.json();
            if (result.success) setUsers(result.data);
            else setError(result.error?.message || 'Failed to load users');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            });
            const result = await res.json();
            if (result.success) {
                setSuccess(`✅ Client "${formData.name}" created successfully! A password setup email has been sent to ${formData.email}.`);
                setFormData({ name: '', email: '', role: 'CLIENT' });
                fetchUsers();
            } else {
                setError(result.error?.message || 'Failed to create user');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal) return;
        try {
            const res = await fetch(`${API_BASE}/users/${deleteModal._id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            const result = await res.json();
            if (result.success) {
                setSuccess(`🗑️ User "${deleteModal.name}" has been deleted.`);
                setUsers(prev => prev.filter(u => u._id !== deleteModal._id));
            } else {
                setError(result.error?.message || 'Failed to delete user');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleteModal(null);
        }
    };

    const getPlatformBadges = (user) => {
        const connected = user.connected_platforms || [];

        if (connected.length === 0) {
            return <span className="no-platforms">Not connected</span>;
        }

        return connected.map(cp => {
            const meta = PLATFORMS[cp.platform];
            if (!meta) return null;
            const isExpired = cp.is_expired;
            return (
                <span
                    key={cp.platform}
                    className={`platform-badge ${isExpired ? 'platform-badge--expired' : 'platform-badge--connected'}`}
                    style={{ '--badge-color': isExpired ? '#f59e0b' : meta.color }}
                    title={isExpired
                        ? `Token expired — last refreshed ${cp.last_refresh_at ? new Date(cp.last_refresh_at).toLocaleDateString() : 'never'}`
                        : `Connected since ${new Date(cp.connected_since).toLocaleDateString()}`}
                >
                    {isExpired ? '⚠️' : '✅'} {meta.label}
                </span>
            );
        });
    };

    return (
        <div className="admin-clients">
            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon">🗑️</div>
                        <h3>Delete User</h3>
                        <p>Are you sure you want to permanently delete <strong>{deleteModal.name}</strong>?</p>
                        <p className="modal-email">{deleteModal.email}</p>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteConfirm}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h2>👥 Client User Management</h2>
                    <p>Create and manage client workspaces and their platform access.</p>
                </div>
                <div className="header-stats">
                    <div className="stat-chip">
                        <span className="stat-num">{users.filter(u => u.role === 'CLIENT').length}</span>
                        <span>Clients</span>
                    </div>
                    <div className="stat-chip">
                        <span className="stat-num">{users.filter(u => u.status === 'active').length}</span>
                        <span>Active</span>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {error && <div className="toast toast-error">⚠️ {error}</div>}
            {success && <div className="toast toast-success">{success}</div>}

            <div className="admin-grid">
                {/* Create Form */}
                <section className="client-section">
                    <h3>➕ New Client User</h3>
                    <form onSubmit={handleSubmit} className="admin-form">
                        <div className="form-group">
                            <label htmlFor="name">Full Name / Company</label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g. Acme Corp"
                                autoComplete="off"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="client@example.com"
                                autoComplete="off"
                            />
                        </div>
                        <p className="form-helper-text">
                            A secure, temporary password will be generated automatically. The client will receive an email with instructions to set their own password.
                        </p>

                        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                            {submitting ? 'Creating...' : '+ Create Client User'}
                        </button>
                    </form>
                </section>

                {/* Users Table */}
                <section className="client-section">
                    <div className="table-header">
                        <h3>All Users</h3>
                        <button className="btn btn-outline btn-sm" onClick={fetchUsers}>↻ Refresh</button>
                    </div>

                    {loading ? (
                        <div className="table-loading">
                            <div className="spinner"></div>
                            <span>Loading users…</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Platforms</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">
                                                <div>👤</div>
                                                <div>No users found. Create your first client user!</div>
                                            </td>
                                        </tr>
                                    ) : users.map(user => (
                                        <tr key={user._id} className={user.status === 'inactive' ? 'row-inactive' : ''}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
                                                    <div>
                                                        <div className="user-name">{user.name}</div>
                                                        <span className={`role-badge role-${user.role?.toLowerCase()}`}>{user.role}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="email-cell">{user.email}</td>
                                            <td>{getPlatformBadges(user)}</td>
                                            <td>
                                                <span className={`status-pill ${user.status}`}>
                                                    {user.status === 'active' ? '● Active' : '○ Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-danger-ghost btn-sm"
                                                    onClick={() => setDeleteModal(user)}
                                                    title="Delete user"
                                                >
                                                    🗑 Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminClients;
