'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {companyName?.[0]?.toUpperCase() ?? 'C'}
          </div>
        )}
        {!collapsed && (
          <span className="font-semibold text-gray-900 truncate">{companyName}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
              )}
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="hidden lg:flex px-3 pb-2">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <button
          onClick={() => { /* wire to your existing logout */ }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
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
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Desktop fixed sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-all duration-200
        ${collapsed ? 'w-[76px]' : 'w-64'}`}>
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 shadow-xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
            {content}
          </div>
        </div>
      )}

      {/* Spacer for fixed sidebar */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-[76px]' : 'w-64'}`} />
    </>
  );
}