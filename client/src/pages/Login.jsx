import React, { useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const ssoError = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('error');
        if (!code) return null;
        if (code === 'SSO_USER_NOT_FOUND') return 'No account exists for this Google email.';
        if (code === 'ACCOUNT_INACTIVE') return 'Your account is inactive.';
        return 'Google sign-in failed. Please try again.';
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            await authService.login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    return (
        <div className="login-page">
            <div className="login-shell">
                <div className="login-brand-panel">
                    <div className="login-logo">
                        <span>ACM</span>
                    </div>
                    <h1>Ads Campaigner</h1>
                    <p>Plan, launch, and optimize ad campaigns from a single, unified dashboard.</p>
                    <ul className="login-brand-points">
                        <li>Real-time campaign performance</li>
                        <li>Unified view across channels</li>
                        <li>Smart recommendations</li>
                    </ul>
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <h2>Welcome back</h2>
                        <p>Sign in to continue to your workspace</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {(error || ssoError) && <div className="login-error">{error || ssoError}</div>}

                        <button
                            type="button"
                            className="google-btn"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                        >
                            Continue with Google
                        </button>

                        <div className="login-divider">
                            <span>or</span>
                        </div>

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

                        <div className="form-group">
                            <div className="form-label-row">
                                <label>Password</label>
                                <Link to="/forgot-password" className="link-button">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>

                        <div className="login-helper">
                            <p>Use the demo account for quick access:</p>
                            <p>
                                <strong>admin@example.com</strong> &nbsp;/&nbsp; <strong>password123</strong>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
