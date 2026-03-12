import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './Login.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) {
            setError('Reset link is invalid. Please request a new one.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return;

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);
        try {
            await authService.resetPassword(token, password);
            setMessage('Your password has been reset successfully. You can now sign in.');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-shell">
                <div className="login-brand-panel">
                    <div className="login-logo">
                        <span>AC</span>
                    </div>
                    <h1>Ads Campaigner</h1>
                    <p>Choose a new password for your account.</p>
                    <ul className="login-brand-points">
                        <li>Keep it unique and secure</li>
                        <li>Minimum 8 characters</li>
                        <li>Avoid reusing old passwords</li>
                    </ul>
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <h2>Reset password</h2>
                        <p>Enter a new password for your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {message && <div className="login-success">{message}</div>}
                        {error && <div className="login-error">{error}</div>}

                        <div className="form-group">
                            <label>New password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirm new password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button type="submit" className="login-btn" disabled={loading || !token}>
                            {loading ? 'Updating password...' : 'Update password'}
                        </button>

                        <div className="login-helper">
                            <p>
                                Back to{' '}
                                <Link to="/login" className="inline-link">Login</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

