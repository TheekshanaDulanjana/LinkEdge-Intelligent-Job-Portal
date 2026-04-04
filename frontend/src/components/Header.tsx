'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
  metadata?: { applicationId?: string; date?: string; time?: string; venue?: string };
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loadFromStorage } = useAuthStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  async function fetchUnreadCount() {
    try {
      const res = await applicationApi.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch { /* silent */ }
  }

  async function fetchNotifications() {
    try {
      const res = await applicationApi.get('/notifications');
      setNotifications(res.data.data);
    } catch { /* silent */ }
  }

  useEffect(() => { loadFromStorage(); }, []);

  // Poll for notification count every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const timeout = window.setTimeout(fetchUnreadCount, 0);
    const interval = window.setInterval(fetchUnreadCount, 30000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleBellClick() {
    if (!showNotifications) {
      await fetchNotifications();
    }
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  }

  async function markRead(id: string) {
    await applicationApi.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await applicationApi.patch('/notifications/mark-all-read');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  function handleLogout() {
    logout();
    setShowUserMenu(false);
    router.push('/');
  }

  const dashboardPath = user?.role === 'SEEKER'
    ? '/seeker/dashboard' : '/company/dashboard';

  const profilePath = user?.role === 'SEEKER'
    ? '/seeker/profile' : '/company/profile';

  // Don't show header on auth pages
  const hideOn = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  if (hideOn.some((p) => pathname?.startsWith(p))) return null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JP</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:block">
              Intelligent Job Portal
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className={`text-sm font-medium transition-colors ${pathname === '/jobs' ? 'text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}>
              Browse Jobs
            </Link>
            {isAuthenticated && (
              <Link href={dashboardPath} className={`text-sm font-medium transition-colors ${pathname?.includes('dashboard') ? 'text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}>
                Dashboard
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {!isAuthenticated ? (
              /* Guest buttons */
              <>
                <Link href="/login">
                  <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    Login
                  </button>
                </Link>
                <Link href="/register">
                  <button className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors">
                    Register
                  </button>
                </Link>
              </>
            ) : (
              /* Authenticated state */
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleBellClick}
                    className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="flex justify-between items-center px-4 py-3 border-b">
                        <p className="font-semibold text-sm text-gray-800">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-purple-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-gray-400 text-sm">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => markRead(notif.id)}
                              className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-purple-50' : ''}`}
                            >
                              <div className="flex gap-2 items-start">
                                {!notif.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                                )}
                                <div className={!notif.isRead ? '' : 'ml-4'}>
                                  <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                  {notif.metadata?.date && (
                                    <p className="text-xs text-purple-600 mt-1">
                                      {notif.metadata.date} at {notif.metadata.time} — {notif.metadata.venue}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Avatar + Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
                        <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                      </div>
                      <Link href={dashboardPath} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/></svg>
                        Dashboard
                      </Link>
                      <Link href={profilePath} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        Profile Settings
                      </Link>
                      <div className="border-t border-gray-100 mt-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile menu button */}
            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}/>
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3 space-y-1">
            <Link href="/jobs" onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Browse Jobs
            </Link>
            {isAuthenticated && (
              <Link href={dashboardPath} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Dashboard
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}