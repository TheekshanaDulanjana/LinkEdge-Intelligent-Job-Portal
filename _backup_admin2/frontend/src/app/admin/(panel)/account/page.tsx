'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { adminSend, errMsg } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';
import { Btn, Card, CardHeader, PageHeader, TextInput, useToast } from '@/components/admin/ui';

const RULES: [string, (p: string) => boolean][] = [
  ['At least 12 characters', (p) => p.length >= 12],
  ['An uppercase letter', (p) => /[A-Z]/.test(p)],
  ['A lowercase letter', (p) => /[a-z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
  ['A symbol (e.g. ! @ # $)', (p) => /[^A-Za-z0-9]/.test(p)],
  ['No spaces', (p) => !/\s/.test(p)],
];

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const forced = !!user?.mustChangePassword;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rulesOk = RULES.every(([, f]) => f(next));
  const can = !!current && rulesOk && next === again;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await adminSend<{ accessToken: string; user: { id: string; email: string; role: 'ADMIN'; adminLevel: 'OWNER' | 'ADMIN'; mustChangePassword: boolean } }>(
        'post', '/auth/change-password', { currentPassword: current, newPassword: next });
      setAuth({ ...data.user, profile: null }, data.accessToken);
      toast('ok', 'Password changed.');
      setCurrent(''); setNext(''); setAgain('');
      if (forced) router.replace('/admin');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="My account" description={user?.email} />
      {forced && (
        <div className="mb-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-lg px-4 py-3 text-sm">
          You are using a temporary password. Choose a new password to continue.
        </div>
      )}
      <Card>
        <CardHeader title="Change password" description="Other devices are signed out when you change it." />
        <form onSubmit={submit} className="p-5 space-y-4" noValidate>
          <TextInput label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <TextInput label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            {RULES.map(([label, f]) => (
              <li key={label} className={f(next) ? 'text-emerald-700 flex items-center gap-1.5' : 'text-slate-500 flex items-center gap-1.5'}>
                {f(next) ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {label}
              </li>
            ))}
          </ul>
          <TextInput label="Repeat new password" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          {again && next !== again && <p className="text-xs text-rose-600">Passwords do not match.</p>}
          {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <Btn type="submit" variant="primary" busy={busy} disabled={!can}>Update password</Btn>
        </form>
      </Card>
    </div>
  );
}
