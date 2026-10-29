'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api, { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // References to handle outside clicks correctly
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Check screen width for mobile view
  useEffect(() => {
    function checkScreen() {
      setIsMobile(window.innerWidth < 768);
    }
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    api.get('/auth/me').then((res) => {
      const profile = res.data.data.profile;
      const imgUrl = profile?.profileImageUrl || profile?.logoUrl || '';
      if (imgUrl) {
        setProfileImageUrl(assetUrl(imgUrl));
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

  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    setShowUserMenu(false);
    setConfirmLogout(true);
  }

  function doLogout() {
    setConfirmLogout(false);
    logout();
    router.push('/');
  }

  const dashboardPath = user?.role === 'SEEKER'
    ? '/seeker/dashboard' : '/company/dashboard';

  // A signed-in company never lands on the public home page.
  const homePath = user?.role === 'COMPANY' ? '/company/dashboard' : '/';

  const profilePath = user?.role === 'SEEKER'
    ? '/seeker/profile' : '/company/profile';

  const hideOn = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  if (hideOn.some((p) => pathname?.startsWith(p))) return null;

  const navLinks = [
    { name: 'Home', href: homePath },
    { name: 'Discover', href: '/jobs' },
    { name: 'Overview', href: '/overview' },
    { name: 'For Job Seekers', href: '/seeker' },
    { name: 'For Companies', href: '/companies' },
  ];

  const useColoredTheme = isMobile || isScrolled;

  // Apply sm:pt-12 only on Home page when NOT scrolled, otherwise sm:pt-4
  const isHomePage = pathname === '/';
  const topPaddingClass = (isHomePage && !isScrolled) ? 'pt-2 sm:pt-12' : 'pt-2 sm:pt-4';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${topPaddingClass} transition-all duration-300 ${useColoredTheme ? 'bg-white shadow-md py-2' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">

          {/* Logo */}
          <Link href={homePath} className="flex items-center gap-2 group">
            <img 
              src={useColoredTheme ? "/linkedgeColored.png" : "/linkedge.png"} 
              alt="LinkEdge.ai" 
              className="h-6 sm:h-9 w-auto transition-transform group-hover:scale-105" 
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase tracking-widest transition-all ${
                    isActive
                      ? (useColoredTheme ? 'text-[#0F9DE4] font-bold underline underline-offset-4 decoration-2' : 'text-cyan-300 font-bold underline underline-offset-4 decoration-2')
                      : (useColoredTheme ? 'text-gray-700 font-medium hover:text-[#0F9DE4]' : 'text-white/90 font-medium hover:text-cyan-300')
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4">

            {!isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/login">
                  <Button 
                    variant="gradient"
                    size="sm"
                    className="border-white border-2 w-20 sm:w-24 cursor-pointer hover:scale-105 shadow-md"
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
                    className={`${useColoredTheme ? 'text-[#0025B8] border-[#0025B8] hover:bg-gray-100' : 'text-white border-white hover:bg-white/10'} bg-transparent w-20 sm:w-24 cursor-pointer hover:scale-105 shadow-sm`}
                  >
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">

                {/* Notification Bell Icon */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleBellClick}
                    className={`relative p-2 rounded-full transition-colors ${useColoredTheme ? 'text-[#0025B8] hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>

                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900 z-50"
                      >
                        <div className="flex justify-between items-center px-4 py-3 border-b bg-slate-50">
                          <p className="font-semibold text-sm text-gray-800">Notifications</p>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-[#0F9DE4] hover:underline font-medium">
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id}
                                onClick={() => markRead(n.id)}
                                className={`px-4 py-3 cursor-pointer transition-colors ${!n.isRead ? 'bg-sky-50/70 hover:bg-sky-100/50' : 'hover:bg-gray-50'}`}
                              >
                                <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center p-0.5 rounded-full border-2 transition-all shadow-sm ${useColoredTheme ? 'border-[#0025B8]/40 hover:border-[#0F9DE4]' : 'border-white/40 hover:border-cyan-300'}`}
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-gradient-to-tr from-[#0025B8] to-[#0F9DE4]">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-white font-semibold text-sm">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl py-2 border border-gray-100 z-50"
                      >
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{user?.email}</p>
                        </div>
                        <Link href={dashboardPath} onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-sky-50 hover:text-[#0F9DE4] transition-colors">Dashboard</Link>
                        <Link href={profilePath} onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-sky-50 hover:text-[#0F9DE4] transition-colors">Profile Settings</Link>
                        <div className="border-t border-gray-100 my-1" />
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* Mobile Menu Button / Hamburger Icon */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors focus:outline-none ${useColoredTheme ? 'text-[#0025B8] hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#001b87] rounded-3xl border border-white/20 py-6 px-6 shadow-2xl mb-4 space-y-4 text-center overflow-hidden"
            >
              <div className="flex flex-col space-y-3 pb-4 border-b border-white/10">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm uppercase tracking-wider py-1.5 ${
                        isActive ? 'text-cyan-300 font-bold' : 'text-white font-medium hover:text-cyan-300'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              {!isAuthenticated && (
                <div className="flex flex-col gap-3 pt-2 w-full">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                    <Button variant="gradient" size="md" className="w-full border-2 border-white">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                    <Button variant="outline" size="md" border={true} hasBg={false} className="w-full text-white bg-transparent border-white">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <LogoutConfirmModal open={confirmLogout} onConfirm={doLogout} onCancel={() => setConfirmLogout(false)} />
    </header>
  );
}