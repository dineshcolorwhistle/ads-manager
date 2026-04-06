import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

const ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'wheel'
];

/** Throttle how often we reschedule the idle timer (ms). */
const THROTTLE_MS = 1000;

/**
 * Resolve idle duration from env. Prefer VITE_IDLE_LOGOUT_MINUTES; optional VITE_IDLE_LOGOUT_MS overrides.
 * Defaults to 10 minutes (testing); set VITE_IDLE_LOGOUT_MINUTES=120 for 2 hours in production.
 */
function getIdleDurationMs() {
    const rawMs = import.meta.env.VITE_IDLE_LOGOUT_MS;
    if (rawMs !== undefined && rawMs !== '' && !Number.isNaN(Number(rawMs))) {
        return Number(rawMs);
    }
    const mins = import.meta.env.VITE_IDLE_LOGOUT_MINUTES;
    if (mins !== undefined && mins !== '' && !Number.isNaN(Number(mins))) {
        return Number(mins) * 60 * 1000;
    }
    return 10 * 60 * 1000;
}

/**
 * Logs the user out after a period without input. Only runs while a session token exists.
 */
function IdleSessionWatcher() {
    const navigate = useNavigate();
    const location = useLocation();
    const timeoutRef = useRef(null);
    const lastBumpRef = useRef(0);
    const idleMs = getIdleDurationMs();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            return undefined;
        }

        const clearTimer = () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };

        const scheduleLogout = () => {
            clearTimer();
            timeoutRef.current = window.setTimeout(() => {
                authService.logout();
                navigate('/login', { replace: true });
            }, idleMs);
        };

        const onActivity = () => {
            const now = Date.now();
            if (now - lastBumpRef.current < THROTTLE_MS) return;
            lastBumpRef.current = now;
            scheduleLogout();
        };

        scheduleLogout();

        const opts = { passive: true };
        ACTIVITY_EVENTS.forEach((evt) => {
            window.addEventListener(evt, onActivity, opts);
        });
        window.addEventListener('focus', onActivity);

        return () => {
            clearTimer();
            ACTIVITY_EVENTS.forEach((evt) => {
                window.removeEventListener(evt, onActivity, opts);
            });
            window.removeEventListener('focus', onActivity);
        };
    }, [navigate, location.pathname, idleMs]);

    return null;
}

export default IdleSessionWatcher;
