import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import './UserAvatarMenu.css';

function formatRoleLabel(role) {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'CLIENT') return 'User';
    return role || 'User';
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

/**
 * Circular avatar with dropdown: email, role, Profile link, Logout
 */
function UserAvatarMenu({ user }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleLogout = () => {
        setOpen(false);
        authService.logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="user-avatar-menu" ref={menuRef}>
            <button
                type="button"
                className="user-avatar-trigger"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label="Account menu"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="user-avatar-circle" aria-hidden>
                    {getInitials(user)}
                </span>
            </button>
            {open && (
                <div className="user-avatar-dropdown" role="menu">
                    <div className="user-avatar-dropdown-meta">
                        <span className="user-avatar-dropdown-email">{user.email}</span>
                        <span className="user-avatar-dropdown-role">{formatRoleLabel(user.role)}</span>
                    </div>
                    <div className="user-avatar-dropdown-divider" />
                    <Link
                        to="/profile"
                        className="user-avatar-dropdown-item"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        Profile
                    </Link>
                    <button
                        type="button"
                        className="user-avatar-dropdown-item user-avatar-dropdown-logout"
                        role="menuitem"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserAvatarMenu;
