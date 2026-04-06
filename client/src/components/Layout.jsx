import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import IdleSessionWatcher from './IdleSessionWatcher';
import UserAvatarMenu from './UserAvatarMenu';
import './Layout.css';

/**
 * Layout Component
 * Base layout with header, main content, and footer
 */
function Layout({ children }) {
    const location = useLocation();
    const user = authService.getCurrentUser();
    const isLoginPage = location.pathname === '/login';

    return (
        <div className="layout">
            <IdleSessionWatcher />
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
                            <UserAvatarMenu user={user} />
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
