import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
                            {user && user.role === 'ADMIN' ? (
                                <>
                                    {/* Admin Dashboard: 1. Dashboard, 2. Users, 3. Campaigns */}
                                    <NavLink to="/" end>Dashboard</NavLink>
                                    <NavLink to="/admin/clients">Users</NavLink>
                                    <NavLink to="/drafts">Campaigns</NavLink>
                                </>
                            ) : (
                                <>
                                    {/* User role: Dashboard, API Settings, Platforms, Campaigns */}
                                    <NavLink to="/" end>Dashboard</NavLink>
                                    <NavLink to="/settings/api">API Settings</NavLink>
                                    <NavLink to="/platforms">Platforms</NavLink>
                                    <NavLink to="/drafts">Campaigns</NavLink>
                                </>
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
