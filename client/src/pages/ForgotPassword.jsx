import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import './Login.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);
        try {
            await authService.requestPasswordReset(email);
            setMessage('If an account with that email exists, a password reset link has been sent.');
        } catch (err) {
            setError(err.message || 'Failed to request password reset');
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
                    <p>Reset access to your workspace securely.</p>
                    <ul className="login-brand-points">
                        <li>No password shared over email</li>
                        <li>Time-limited reset links</li>
                        <li>Secure account recovery</li>
                    </ul>
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <h2>Forgot password</h2>
                        <p>Enter your email and we’ll send you a reset link</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {message && <div className="login-success">{message}</div>}
                        {error && <div className="login-error">{error}</div>}

                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Sending link...' : 'Send reset link'}
                        </button>

                        <div className="login-helper">
                            <p>
                                Remembered your password?{' '}
                                <Link to="/login" className="inline-link">Back to login</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

