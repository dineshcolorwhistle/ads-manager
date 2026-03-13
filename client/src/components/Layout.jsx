import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './Layout.css';

/**
 * Layout Component
 * Base layout with header, main content, and footer
 */
function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getCurrentUser();
    const isLoginPage = location.pathname === '/login';

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {!isLoginPage && (
                <header className="header">
                    <div className="container">
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <h1>Ad Campaign Automation</h1>
                        </Link>
                        <nav>
                            {/* Menu order for authenticated users:
                                1. Dashboard
                                2. API Settings
                                3. Platforms
                                4. Campaigns (was Drafts)
                            */}
                            <Link to="/">Dashboard</Link>
                            <Link to="/settings/api">API Settings</Link>
                            <Link to="/platforms">Platforms</Link>
                            <Link to="/drafts">Campaigns</Link>
                            {user && user.role === 'ADMIN' && (
                                <Link to="/admin/clients" className="admin-link">Admin: Clients</Link>
                            )}
                        </nav>
                        <div className="user-nav">
                            {user && <span className="user-email">{user.email}</span>}
                            <button onClick={handleLogout} className="logout-btn">Logout</button>
                        </div>
                    </div>
                </header>
            )}

            <main className="main">
                <div className="container">
                    {children}
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>&copy; {new Date().getFullYear()} Ad Campaign Automation System</p>
                </div>
            </footer>
        </div>
    );
}

export default Layout;
