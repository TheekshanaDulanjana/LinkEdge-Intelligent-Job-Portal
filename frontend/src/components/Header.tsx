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
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  async function fetchUnreadCount() {
    try {
      const res = await applicationApi.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count);
    } catch {}
  }

  async function fetchNotifications() {
    try {
      const res = await applicationApi.get('/notifications');
      setNotifications(res.data.data);
    } catch {}
  }

  useEffect(() => { loadFromStorage(); }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    applicationApi.get('/auth/me').then((res) => {
      const profile = res.data.data.profile;
      const imgUrl = profile?.profileImageUrl || profile?.logoUrl || '';
      if (imgUrl) {
        setProfileImageUrl(`http://localhost:3001${imgUrl}`);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeout = window.setTimeout(fetchUnreadCount, 0);
    const interval = window.setInterval(fetchUnreadCount, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

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

  const hideOn = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  if (hideOn.some((p) => pathname?.startsWith(p))) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img src="/linkedge.png" alt="LinkEdge.ai" className="h-6 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/jobs" className="text-xs font-base text-white uppercase tracking-widest hover:opacity-80">Discover</Link>
            <Link href="/overview" className="text-xs font-base text-white uppercase tracking-widest hover:opacity-80">Overview</Link>
            <Link href="/seeker" className="text-xs font-base text-white uppercase tracking-widest hover:opacity-80">For Job Seekers</Link>
            <Link href="/companies" className="text-xs font-base text-white uppercase tracking-widest hover:opacity-80">For Companies</Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">

            {!isAuthenticated ? (
              <>
                <Link href="/login">
                 <Button 
                    variant="gradient"
                    size="sm"
                    className="border-white border-2 w-24 cursor-pointer hover:scale-105"
                  >
                    Login
                  </Button>

                </Link>

                <Link href="/register">
                                  <Button 
                    variant="outline"
                    size="sm"
                    border={true}
                    hasBg={false}
                    className="text-white border-white w-24 cursor-pointer hover:scale-105"
                  >
                    Register
                  </Button>
                 
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">

                {/* Notification */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleBellClick}
                    className="relative p-2 text-white hover:bg-white/10 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>

                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border overflow-hidden text-gray-900">
                      <div className="flex justify-between px-4 py-3 border-b">
                        <p className="font-semibold text-sm">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-blue-600">
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-gray-400">No notifications</div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id}
                              onClick={() => markRead(n.id)}
                              className={`px-4 py-3 cursor-pointer ${!n.isRead ? 'bg-blue-50' : ''}`}
                            >
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-gray-500">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center p-1 rounded-full border border-white/30 hover:bg-white/10"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-white">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg py-1">
                      <Link href={dashboardPath} className="block px-4 py-2 text-sm hover:bg-gray-50">Dashboard</Link>
                      <Link href={profilePath} className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        Sign out
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white"
            >
              ☰
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-blue-900/95 backdrop-blur-md rounded-b-2xl py-3 px-4 space-y-2">
            <Link href="/discover" className="block text-white">Discover</Link>
            <Link href="/overview" className="block text-white">Overview</Link>
            <Link href="/seeker" className="block text-white">For Job Seekers</Link>
            <Link href="/companies" className="block text-white">For Companies</Link>
          </div>
        )}
      </div>
    </header>
  );
}