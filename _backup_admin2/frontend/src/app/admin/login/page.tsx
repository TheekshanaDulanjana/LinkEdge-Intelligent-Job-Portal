'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <span className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center text-lg font-bold">S</span>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">SkillSync</p>
            <p className="text-xs text-slate-500">Admin console</p>
          </div>
        </div>
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm" noValidate>
          <div className="flex items-center gap-2 text-slate-900">
            <Lock className="w-4 h-4 text-brand-600" />
            <h1 className="text-base font-semibold">Sign in</h1>
          </div>
          {notice && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{notice}</p>}
          {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Password</span>
            <div className="relative">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          <Btn type="submit" variant="primary" busy={busy} disabled={!email || !password} className="w-full">Sign in</Btn>
          <p className="text-xs text-slate-500 text-center">Authorised administrators only. All activity is logged.</p>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
