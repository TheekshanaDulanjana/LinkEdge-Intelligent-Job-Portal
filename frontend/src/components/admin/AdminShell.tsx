'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BarChart3, Users, Briefcase, FileText, ScrollText, ShieldCheck, KeyRound, LogOut, Menu, X, ExternalLink,
  PanelLeftClose, PanelLeftOpen, Search, Bell, AlertTriangle, ChevronDown,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';
import { adminGet } from '@/lib/admin';
import { cn } from '@/lib/utils';
import { ToastProvider } from './ui';

const GROUPS = [
  { label: 'Overview', items: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ] },
  { label: 'Manage', items: [
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/jobs', label: 'Job posts', icon: Briefcase },
    { href: '/admin/content', label: 'Site content', icon: FileText },
  ] },
  { label: 'Security', items: [
    { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
    { href: '/admin/admins', label: 'Administrators', icon: ShieldCheck, ownerOnly: true },
    { href: '/admin/account', label: 'My account', icon: KeyRound },
  ] },
];
const STORE_KEY = 'ls-admin-sidebar-collapsed';

interface Attention { unverifiedOld: number; expiring: number; zeroApps: number; hiddenJobs: number; lockedAdmins: number; failedLogins24: number; pendingApplications: number }

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [att, setAtt] = useState<Attention | null>(null);
  const [term, setTerm] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const forced = !!user?.mustChangePassword;

  useEffect(() => { try { setCollapsed(localStorage.getItem(STORE_KEY) === '1'); } catch { /* storage unavailable */ } }, []);
  useEffect(() => { if (forced && pathname !== '/admin/account') router.replace('/admin/account'); }, [forced, pathname, router]);
  useEffect(() => { setMobile(false); setBell(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    if (forced) return;
    const load = () => adminGet<{ attention: Attention }>('/analytics/summary', { days: 7 }).then((d) => setAtt(d.attention)).catch(() => undefined);
    void load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, [forced]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBell(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle() {
    setCollapsed((v) => { try { localStorage.setItem(STORE_KEY, v ? '0' : '1'); } catch { /* ignore */ } return !v; });
  }
  async function signOut() {
    setConfirm(false);
    try { await adminApi.post('/auth/logout'); } catch { /* the session ends either way */ }
    logout();
    router.replace('/admin/login');
  }

  const owner = user?.adminLevel === 'OWNER';
  const alerts = att ? [
    { n: att.lockedAdmins, text: 'Locked admin account', href: '/admin/admins', tone: 'rose' },
    { n: att.failedLogins24, text: 'Failed admin sign-ins (24 h)', href: '/admin/audit', tone: 'rose' },
    { n: att.hiddenJobs, text: 'Hidden job posts', href: '/admin/jobs?status=HIDDEN', tone: 'amber' },
    { n: att.expiring, text: 'Jobs closing within 7 days', href: '/admin/jobs?status=ACTIVE', tone: 'slate' },
    { n: att.zeroApps, text: 'Active jobs with no applicants', href: '/admin/jobs?status=ACTIVE', tone: 'slate' },
    { n: att.unverifiedOld, text: 'Accounts unverified for 3+ days', href: '/admin/users', tone: 'amber' },
  ].filter((a) => a.n > 0) : [];
  const urgent = alerts.filter((a) => a.tone === 'rose').reduce((s, a) => s + a.n, 0);

  const content = (compact: boolean) => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className={cn('flex items-center h-16 border-b border-slate-100 shrink-0', compact ? 'justify-center' : 'px-5')}>
        <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkedgeColored.png" alt="Logo" className={cn('object-contain h-auto', compact ? 'w-12' : 'w-32')} />
          {!compact && <span className="text-[10px] font-bold uppercase tracking-wider text-[#0063CE] bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5">Admin</span>}
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" aria-label="Admin navigation">
        {GROUPS.map((g) => (
          <div key={g.label}>
            {!compact && <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.filter((i) => !('ownerOnly' in i && i.ownerOnly) || owner).map((n) => {
                const active = ('exact' in n && n.exact) ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/');
                const disabled = forced && n.href !== '/admin/account';
                return (
                  <li key={n.href}>
                    <Link href={disabled ? '#' : n.href} aria-disabled={disabled} title={compact ? n.label : undefined}
                      className={cn('group relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors', compact ? 'justify-center h-10' : 'px-3 h-9',
                        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900', disabled && 'opacity-40 pointer-events-none')}>
                      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#0063CE]" />}
                      <n.icon className={cn('w-[17px] h-[17px] shrink-0', active ? 'text-[#0063CE]' : 'text-slate-500 group-hover:text-slate-600')} strokeWidth={2} />
                      {!compact && <span className="truncate">{n.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3 space-y-2">
        <Link href="/" target="_blank" title="View public site" className={cn('flex items-center gap-2 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50', compact ? 'justify-center h-8' : 'px-3 h-8')}>
          <ExternalLink className="w-3.5 h-3.5" />{!compact && 'View public site'}
        </Link>
        <button onClick={toggle} className="hidden lg:flex w-full h-8 items-center justify-center gap-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-600 cursor-pointer">
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Collapse</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F8FC] text-slate-900">
      <aside className={cn('hidden lg:block fixed left-0 top-0 h-screen z-30 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[248px]')}>{content(collapsed)}</aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-[268px] shadow-2xl">
            <button onClick={() => setMobile(false)} aria-label="Close menu" className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center text-slate-500 rounded-md z-10 cursor-pointer"><X className="w-4 h-4" /></button>
            {content(false)}
          </div>
        </div>
      )}
      <div className={cn('hidden lg:block shrink-0 transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-[248px]')} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-3 sticky top-0 z-20">
          <button className="lg:hidden w-9 h-9 -ml-1 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="w-4 h-4" /></button>
          <form className="relative flex-1 max-w-md" onSubmit={(e) => { e.preventDefault(); if (term.trim()) router.push(`/admin/users?q=${encodeURIComponent(term.trim())}`); }} role="search">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search users by name or email" aria-label="Search users" disabled={forced}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0084DA]/25 focus:border-[#0084DA]" />
          </form>
          <div className="flex-1" />
          <div ref={bellRef} className="relative">
            <button onClick={() => { setBell((v) => !v); setMenu(false); }} aria-label="Needs attention" disabled={forced}
              className="relative w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && <span className={cn('absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center', urgent ? 'bg-rose-600' : 'bg-[#0063CE]')}>{alerts.length}</span>}
            </button>
            {bell && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><p className="text-[13px] font-semibold">Needs attention</p></div>
                {alerts.length === 0 ? <p className="px-4 py-8 text-center text-xs text-slate-500">All clear. Nothing needs you right now.</p> : (
                  <ul className="max-h-80 overflow-y-auto">
                    {alerts.map((a) => (
                      <li key={a.text}><Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold', a.tone === 'rose' ? 'bg-rose-50 text-rose-600' : a.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{a.n}</span>
                        <span className="text-xs text-slate-700">{a.text}</span>
                      </Link></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div ref={menuRef} className="relative">
            <button onClick={() => { setMenu((v) => !v); setBell(false); }} className="flex items-center gap-2.5 h-9 pl-1 pr-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0063CE] to-[#0084DA] text-white text-xs font-semibold flex items-center justify-center">{user?.email?.[0]?.toUpperCase() ?? 'A'}</span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-xs font-semibold truncate max-w-[160px]">{user?.email}</span>
                <span className="block text-[11px] text-slate-500">{owner ? 'Owner' : 'Administrator'}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5">
                <Link href="/admin/account" className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><KeyRound className="w-3.5 h-3.5" />My account</Link>
                <button onClick={() => { setMenu(false); setConfirm(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"><LogOut className="w-3.5 h-3.5" />Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1680px] w-full mx-auto">{children}</main>
      </div>
      <LogoutConfirmModal open={confirm} onConfirm={signOut} onCancel={() => setConfirm(false)} />
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="ADMIN">
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </AuthGuard>
  );
}
