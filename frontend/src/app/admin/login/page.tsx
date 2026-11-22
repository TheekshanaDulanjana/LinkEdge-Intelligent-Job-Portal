'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/admin/AuthLayout';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { errMsg } from '@/lib/admin';
import { Btn, inputCls } from '@/components/admin/ui';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { isAuthenticated, isHydrated, user, loadFromStorage } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isHydrated && isAuthenticated && user?.role === 'ADMIN') router.replace('/admin');
  }, [isHydrated, isAuthenticated, user, router]);

  const done = params.get('reset') === '1';
  const reason = params.get('reason');
  const notice = reason === 'timeout' ? 'You were signed out after 10 minutes of inactivity.'
    : reason === 'expired' ? 'Your session has ended. Please sign in again.' : '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await adminApi.post('/auth/login', { email: email.trim(), password });
      const { accessToken, user: u } = res.data.data;
      setAuth({ ...u, profile: null }, accessToken);
      router.replace(u.mustChangePassword ? '/admin/account' : '/admin');
    } catch (err) {
      setError(errMsg(err, 'Sign-in failed. Please try again.'));
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Use the email and password from the owner. First time? Use the generated credentials.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {notice && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{notice}</p>}
        {done && <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Password updated. Sign in with your new password.</p>}
        {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">Password
            <Link href="/admin/forgot-password" className="font-semibold text-[#0063CE] hover:underline">Forgot password?</Link>
          </span>
          <div className="relative">
            <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <Btn type="submit" variant="primary" busy={busy} disabled={!email || !password} className="w-full h-10">Sign in</Btn>
        <p className="text-[11px] text-slate-500 text-center">All activity is logged. Five wrong attempts lock the account for 30 minutes.</p>
      </form>
    </AuthLayout>
  );
}

export default function AdminLoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
