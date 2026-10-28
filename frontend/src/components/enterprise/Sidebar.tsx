'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Briefcase, Users, BarChart3,
  Calendar, Settings, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',  href: '/company/dashboard',  icon: LayoutDashboard },
  { label: 'Jobs',       href: '/company/jobs',       icon: Briefcase },
  { label: 'Candidates', href: '/company/candidates', icon: Users },
  { label: 'Analytics',  href: '/company/analytics',  icon: BarChart3 },
  { label: 'Calendar',   href: '/company/calendar',   icon: Calendar },
  { label: 'Settings',   href: '/company/profile',    icon: Settings },
];

export default function Sidebar({
  companyName, logoUrl,
}: { companyName: string; logoUrl?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    setMobileOpen(false);
    router.push('/');
  }

  const content = (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-xl border-r border-sky-100 shadow-xl lg:shadow-none">
      {/* Brand Logo Only (No text, responsive sizing on collapse) */}
      <div className={`flex items-center px-5 h-20 border-b border-sky-100 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-start'}`}>
        <Link href="/company/dashboard" className="flex items-center justify-center overflow-hidden">
          <img 
            src="/linkedgeColored.png" 
            alt="LinkEdge Logo" 
            className={`object-contain rounded-2xl flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-24 h-auto' : 'w-48 h-auto'}`} 
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                active
                  ? 'bg-gradient-to-r from-sky-50 to-blue-50/60 text-[#0025B8] shadow-xs border border-sky-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-[#0025B8] to-[#0F9DE4] rounded-r-full shadow-xs" />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-[#0F9DE4]' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={2.2} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="hidden lg:flex px-4 pb-3">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center justify-center w-full py-2.5 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all border border-transparent hover:border-sky-100 cursor-pointer shadow-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Logout */}
      <div className="px-4 pb-5 border-t border-sky-100 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 w-full transition-all cursor-pointer shadow-xs border border-transparent hover:border-rose-100"
        >
          <LogOut className="w-[18px] h-[18px] text-rose-500" strokeWidth={2.2} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md border border-sky-100 flex items-center justify-center shadow-lg cursor-pointer"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Desktop fixed sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-all duration-300 ${
        collapsed ? 'w-[88px]' : 'w-72'
      }`}>
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-4 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full bg-slate-100/80 z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {content}
          </div>
        </div>
      )}

      {/* Spacer for fixed sidebar */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${
        collapsed ? 'w-[88px]' : 'w-72'
      }`} />
    </>
  );
}