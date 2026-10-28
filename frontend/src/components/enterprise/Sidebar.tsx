'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Briefcase, Users, BarChart3, CalendarDays, Settings,
  PanelLeftClose, PanelLeftOpen, LogOut, Menu, X, Plus,
} from 'lucide-react';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { cx } from '@/components/enterprise/dashboard/primitives';

const GROUPS = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard',  href: '/company/dashboard',  icon: LayoutDashboard },
      { label: 'Jobs',       href: '/company/jobs',       icon: Briefcase },
      { label: 'Candidates', href: '/company/candidates', icon: Users },
      { label: 'Calendar',   href: '/company/calendar',   icon: CalendarDays },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', href: '/company/analytics', icon: BarChart3 }],
  },
  {
    label: 'Account',
    items: [{ label: 'Company profile', href: '/company/profile', icon: Settings }],
  },
];

const STORE_KEY = 'ls-company-sidebar-collapsed';

export default function Sidebar({
  companyName, logoUrl,
}: { companyName: string; logoUrl?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORE_KEY) === '1'); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function toggle() {
    setCollapsed(v => {
      try { localStorage.setItem(STORE_KEY, v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  }

  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    setConfirmLogout(true);
  }

  function doLogout() {
    setConfirmLogout(false);
    logout();
    router.push('/');
  }

  const content = (compact: boolean) => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className={cx('flex items-center h-16 border-b border-slate-100 shrink-0', compact ? 'justify-center' : 'px-5')}>
        <Link href="/company/dashboard" className="flex items-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkedgeColored.png" alt="Logo" className={cx('object-contain h-auto', compact ? 'w-12' : 'w-36')} />
        </Link>
      </div>

      <div className={cx('pt-4', compact ? 'px-3' : 'px-4')}>
        <Link href="/company/post-job"
          title="Post a job"
          className={cx('flex items-center justify-center gap-2 h-9 rounded-lg bg-[#0025B8] text-white text-xs font-semibold shadow-sm hover:bg-[#001f9c] transition-colors',
            compact && 'px-0')}>
          <Plus className="w-4 h-4" />{!compact && 'Post a job'}
        </Link>
      </div>

      <nav className={cx('flex-1 overflow-y-auto py-4 space-y-5', compact ? 'px-3' : 'px-3')}>
        {GROUPS.map(g => (
          <div key={g.label}>
            {!compact && <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/') || (href === '/company/jobs' && pathname.startsWith('/company/post-job'));
                return (
                  <li key={href}>
                    <Link href={href} title={compact ? label : undefined}
                      className={cx('group relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors',
                        compact ? 'justify-center h-10' : 'px-3 h-9',
                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}>
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#0025B8]" />}
                      <Icon className={cx('w-[17px] h-[17px] shrink-0', active ? 'text-[#0025B8]' : 'text-slate-400 group-hover:text-slate-600')} strokeWidth={2} />
                      {!compact && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3 space-y-2">
        <div className={cx('flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-100', compact ? 'justify-center p-2' : 'p-2.5')}>
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
            : <span className="w-8 h-8 rounded-md bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white text-xs font-semibold flex items-center justify-center shrink-0">{companyName?.[0]?.toUpperCase() ?? 'C'}</span>}
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{companyName}</p>
              <p className="text-[10.5px] text-slate-400">Employer account</p>
            </div>
          )}
          {!compact && (
            <button onClick={handleLogout} title="Sign out" className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {compact && (
          <button onClick={handleLogout} title="Sign out" className="w-full h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        )}
        <button onClick={toggle} className="hidden lg:flex w-full h-8 items-center justify-center gap-2 rounded-lg text-[11px] font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer">
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Collapse</>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-40 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer">
        <Menu className="w-4 h-4 text-slate-700" />
      </button>

      <aside className={cx('hidden lg:block fixed left-0 top-0 h-screen z-30 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[248px]')}>
        {content(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[268px] shadow-2xl">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-md z-10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            {content(false)}
          </div>
        </div>
      )}

      <div className={cx('hidden lg:block shrink-0 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[248px]')} />
      <LogoutConfirmModal open={confirmLogout} onConfirm={doLogout} onCancel={() => setConfirmLogout(false)} />
    </>
  );
}
