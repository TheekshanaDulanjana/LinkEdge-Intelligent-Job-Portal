'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Briefcase, FileText, ScrollText, ShieldCheck, KeyRound, LogOut, Menu, X, ExternalLink,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ToastProvider } from './ui';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jobs', label: 'Job posts', icon: Briefcase },
  { href: '/admin/content', label: 'Site content', icon: FileText },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
  { href: '/admin/admins', label: 'Administrators', icon: ShieldCheck, ownerOnly: true },
  { href: '/admin/account', label: 'My account', icon: KeyRound },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const forced = !!user?.mustChangePassword;

  // A temporary password must be replaced before anything else can be used.
  useEffect(() => {
    if (forced && pathname !== '/admin/account') router.replace('/admin/account');
  }, [forced, pathname, router]);
  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    try { await adminApi.post('/auth/logout'); } catch { /* the session ends either way */ }
    logout();
    router.replace('/admin/login');
  }

  const items = NAV.filter((n) => !n.ownerOnly || user?.adminLevel === 'OWNER');

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
      {items.map((n) => {
        const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/');
        const disabled = forced && n.href !== '/admin/account';
        return (
          <Link
            key={n.href} href={disabled ? '#' : n.href} aria-disabled={disabled}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
              disabled && 'opacity-40 pointer-events-none',
            )}
          >
            <n.icon className="w-4 h-4 shrink-0" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100">
          <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-sm font-bold">S</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">SkillSync</p>
            <p className="text-xs text-slate-500">Admin console</p>
          </div>
        </div>
        {nav}
        <div className="p-3 border-t border-slate-100">
          <Link href="/" target="_blank" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-800">
            <ExternalLink className="w-3.5 h-3.5" /> View public site
          </Link>
        </div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-white flex flex-col">{nav}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center gap-3 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100 cursor-pointer" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-medium truncate max-w-[220px]">{user?.email}</p>
            <p className="text-xs text-slate-500">{user?.adminLevel === 'OWNER' ? 'Owner' : 'Administrator'}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">{children}</main>
      </div>
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
