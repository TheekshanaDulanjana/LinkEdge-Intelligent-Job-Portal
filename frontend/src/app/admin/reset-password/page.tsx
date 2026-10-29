'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { errMsg } from '@/lib/admin';
import AuthLayout from '@/components/admin/AuthLayout';
import { Btn, inputCls } from '@/components/admin/ui';

const RULES: [string, (p: string) => boolean][] = [
  ['At least 12 characters', (p) => p.length >= 12],
  ['An uppercase letter', (p) => /[A-Z]/.test(p)],
  ['A lowercase letter', (p) => /[a-z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
  ['A symbol (e.g. ! @ # $)', (p) => /[^A-Za-z0-9]/.test(p)],
  ['No spaces', (p) => !/\s/.test(p)],
];

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = RULES.every(([, f]) => f(pw)) && pw === again;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await adminApi.post('/auth/reset-password', { token, newPassword: pw });
      router.replace('/admin/login?reset=1');
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  }

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthLayout title="Link not valid" subtitle="This reset link is incomplete or was already used.">
        <Link href="/admin/forgot-password" className="text-sm font-semibold text-[#0063CE] hover:underline">Ask for a new link</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Choose a new password" subtitle="You will be signed out everywhere else.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error} <Link href="/admin/forgot-password" className="font-semibold underline">New link</Link></p>}
        <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">New password</span>
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} /></label>
        <ul className="grid grid-cols-1 gap-1 text-xs">
          {RULES.map(([label, f]) => (
            <li key={label} className={f(pw) ? 'text-emerald-700 flex items-center gap-1.5' : 'text-slate-500 flex items-center gap-1.5'}>
              {f(pw) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {label}
            </li>
          ))}
        </ul>
        <label className="block"><span className="block text-xs font-semibold text-slate-700 mb-1.5">Repeat password</span>
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} /></label>
        {again && pw !== again && <p className="text-xs text-rose-600">Passwords do not match.</p>}
        <Btn type="submit" variant="primary" busy={busy} disabled={!ok} className="w-full h-10">Update password</Btn>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
