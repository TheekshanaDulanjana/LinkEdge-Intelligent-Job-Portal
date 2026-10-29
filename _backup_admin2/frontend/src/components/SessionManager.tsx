'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { secureStorage } from '@/lib/secureStorage';

/** Inactivity limits: companies are logged out after 10 minutes, job seekers after 15. */
export const COMPANY_IDLE_LIMIT_MS = 10 * 60 * 1000;
export const SEEKER_IDLE_LIMIT_MS = 15 * 60 * 1000;
export const ADMIN_IDLE_LIMIT_MS = 10 * 60 * 1000;

// The access token lives for 15 minutes. While the session is still valid (the user has
// not passed the idle limit) it is renewed in the background every few minutes, so the
// token can never run out before the idle limit and no request fails with a 401.
const RENEW_AFTER_MS = 4 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const ACTIVITY_THROTTLE_MS = 2000;

const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001/api/v1';

/**
 * Watches for user activity. After the idle limit (10 min company, 15 min seeker) with no mouse, keyboard, scroll or
 * touch activity (in any open tab) the session is cleared and the user is sent to
 * the login page. Pages that must stay open without input, such as the mock
 * interview, set document.body.dataset.keepSession = 'true' while they are busy.
 */
export default function SessionManager() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const logout = useAuthStore((s) => s.logout);
  const setToken = useAuthStore((s) => s.setToken);
  const role = useAuthStore((s) => s.user?.role);
  const idleLimit =
    role === 'ADMIN' ? ADMIN_IDLE_LIMIT_MS : role === 'COMPANY' ? COMPANY_IDLE_LIMIT_MS : SEEKER_IDLE_LIMIT_MS;

  // Restore the saved session as soon as the app opens
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let renewing = false;
    let lastWrite = 0;

    const loginPath = role === 'ADMIN' ? '/admin/login' : '/login';
    const endSession = () => {
      logout();
      router.replace(`${loginPath}?reason=timeout`);
    };

    const renewToken = async () => {
      if (renewing) return;
      const token = secureStorage.getAccessToken();
      if (!token) return;
      renewing = true;
      try {
        // A plain axios call, so a failure here never triggers the global 401 handler
        const res = await axios.post(
          `${AUTH_URL}/auth/refresh-token`,
          {},
          { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
        );
        const fresh = res.data?.data?.accessToken;
        if (fresh) setToken(fresh);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        // Only a real rejection ends the session. A network error is ignored and retried.
        if (status === 401) endSession();
      } finally {
        renewing = false;
      }
    };

    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_THROTTLE_MS) return;
      lastWrite = now;
      secureStorage.setLastActivity(now);
      if (now - secureStorage.getIssuedAt() > RENEW_AFTER_MS) void renewToken();
    };

    const check = () => {
      if (document.body.dataset.keepSession === 'true') {
        // A page such as the mock interview is busy: stay signed in and keep the token fresh
        secureStorage.setLastActivity(Date.now());
        if (Date.now() - secureStorage.getIssuedAt() > RENEW_AFTER_MS) void renewToken();
        return;
      }
      const last = secureStorage.getLastActivity() || Date.now();
      if (Date.now() - last >= idleLimit) {
        endSession();
        return;
      }
      // Still inside the idle limit: keep the token fresh even if the user is only reading
      if (Date.now() - secureStorage.getIssuedAt() > RENEW_AFTER_MS) void renewToken();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    // The session was ended in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'jp_at' && !e.newValue) {
        logout();
        router.replace(loginPath);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
    events.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('storage', onStorage);

    // Check first: reopening a page after a long break must not restart the idle timer
    check();
    if (secureStorage.getLastActivity() === 0) secureStorage.setLastActivity(Date.now());
    const timer = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActive));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, [isAuthenticated, idleLimit, role, logout, router, setToken]);

  return null;
}
