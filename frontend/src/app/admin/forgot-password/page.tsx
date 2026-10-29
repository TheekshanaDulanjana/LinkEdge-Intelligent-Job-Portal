'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { errMsg } from '@/lib/admin';
import AuthLayout from '@/components/admin/AuthLayout';
import { Btn, inputCls } from '@/components/admin/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await adminApi.post('/auth/forgot-password', { email: email.trim() }); setSent(true); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your administrator email. We will send a link that works for 30 minutes.">
      {sent ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><MailCheck className="w-6 h-6" /></span>
          <p className="text-sm text-slate-700">If <b>{email.trim()}</b> belongs to an administrator, a reset link is on its way. Check your inbox.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <Btn type="submit" variant="primary" busy={busy} disabled={!email.includes('@')} className="w-full h-10">Send reset link</Btn>
        </form>
      )}
      <Link href="/admin/login" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0063CE] hover:underline"><ArrowLeft className="w-3.5 h-3.5" />Back to sign in</Link>
    </AuthLayout>
  );
}
