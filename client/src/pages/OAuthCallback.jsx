import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState(null);

    useEffect(() => {
        const run = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setError('Missing token from sign-in callback');
                return;
            }

            try {
                localStorage.setItem('token', token);

                const response = await fetch(`${API_URL}/users/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error?.message || 'Failed to load user profile');
                }

                localStorage.setItem('user', JSON.stringify(result.data));
                navigate('/', { replace: true });
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setError(e.message || 'Google sign-in failed');
            }
        };

        run();
    }, [navigate, searchParams]);

    if (error) {
        return (
            <div style={{ padding: 24, color: '#e5e7eb' }}>
                <h2 style={{ marginBottom: 8 }}>Sign-in failed</h2>
                <p style={{ marginBottom: 16, color: 'rgba(229,231,235,0.8)' }}>{error}</p>
                <button
                    onClick={() => navigate('/login', { replace: true })}
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(148,163,184,0.35)',
                        background: '#0b1220',
                        color: '#e5e7eb',
                        cursor: 'pointer'
                    }}
                >
                    Back to login
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, color: '#e5e7eb' }}>
            <h2 style={{ marginBottom: 8 }}>Signing you in…</h2>
            <p style={{ color: 'rgba(229,231,235,0.8)' }}>Completing Google sign-in.</p>
        </div>
    );
};

export default OAuthCallback;

