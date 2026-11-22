'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, KeyRound, Mail, ShieldCheck, X } from 'lucide-react';
import { adminGet, adminSend, errMsg, fmtDate, timeAgo } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';
import { Btn, Card, CardHeader, PageHeader, Pill, TextInput, useToast } from '@/components/admin/ui';

const RULES: [string, (p: string) => boolean][] = [
  ['At least 12 characters', (p) => p.length >= 12],
  ['An uppercase letter', (p) => /[A-Z]/.test(p)],
  ['A lowercase letter', (p) => /[a-z]/.test(p)],
  ['A number', (p) => /\d/.test(p)],
  ['A symbol (e.g. ! @ # $)', (p) => /[^A-Za-z0-9]/.test(p)],
  ['No spaces', (p) => !/\s/.test(p)],
];

type AuthUser = { id: string; email: string; role: 'ADMIN'; adminLevel: 'OWNER' | 'ADMIN'; mustChangePassword: boolean };
type Session = { accessToken: string; user: AuthUser };
interface Me { email: string; adminLevel: string; lastLoginAt: string | null; createdAt: string; pendingEmail: string | null; passwordChangedAt: string | null }

function Err({ text }: { text: string }) {
  return text ? <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{text}</p> : null;
}

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const forced = !!user?.mustChangePassword;
  const [me, setMe] = useState<Me | null>(null);
  const loadMe = useCallback(() => adminGet<Me>('/auth/me').then(setMe).catch(() => undefined), []);
  useEffect(() => { void loadMe(); }, [loadMe]);

  // password
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const rulesOk = RULES.every(([, f]) => f(next));

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwBusy(true); setPwErr('');
    try {
      const d = await adminSend<Session>('post', '/auth/change-password', { currentPassword: current, newPassword: next });
      setAuth({ ...d.user, profile: null }, d.accessToken);
      toast('ok', 'Password changed.');
      setCurrent(''); setNext(''); setAgain(''); void loadMe();
      if (forced) router.replace('/admin');
    } catch (err) { setPwErr(errMsg(err)); } finally { setPwBusy(false); }
  }

  // e-mail
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [emBusy, setEmBusy] = useState(false);
  const [emErr, setEmErr] = useState('');
  useEffect(() => { if (me?.pendingEmail) { setStep('code'); setNewEmail(me.pendingEmail); } }, [me?.pendingEmail]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault(); setEmBusy(true); setEmErr('');
    try {
      await adminSend('post', '/auth/change-email/request', { newEmail: newEmail.trim(), currentPassword: emailPw });
      setStep('code'); setEmailPw(''); toast('ok', `Code sent to ${newEmail.trim()}.`);
    } catch (err) { setEmErr(errMsg(err)); } finally { setEmBusy(false); }
  }
  async function confirmCode(e: React.FormEvent) {
    e.preventDefault(); setEmBusy(true); setEmErr('');
    try {
      const d = await adminSend<Session>('post', '/auth/change-email/confirm', { code });
      setAuth({ ...d.user, profile: null }, d.accessToken);
      toast('ok', 'Email address changed.');
      setStep('form'); setCode(''); setNewEmail(''); void loadMe();
    } catch (err) { setEmErr(errMsg(err)); void loadMe(); } finally { setEmBusy(false); }
  }
  async function cancelChange() {
    try { await adminSend('post', '/auth/change-email/cancel'); } catch { /* nothing to cancel */ }
    setStep('form'); setCode(''); setEmErr(''); void loadMe();
  }

  return (
    <div>
      <PageHeader title="My account" description="Your sign-in details and security." />
      {forced && (
        <div className="mb-5 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold">Set up your own credentials</p>
          <p className="mt-0.5">You signed in with a system-generated password. Choose a new password to continue. You can also change your sign-in email now. A 6-digit code is sent to the new address to confirm it.</p>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <Card className="xl:col-span-1">
          <CardHeader title="Profile" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0063CE] to-[#0084DA] text-white text-lg font-semibold flex items-center justify-center">{user?.email?.[0]?.toUpperCase()}</span>
              <div className="min-w-0"><p className="text-sm font-semibold truncate">{user?.email}</p><Pill tone={user?.adminLevel === 'OWNER' ? 'violet' : 'blue'}>{user?.adminLevel === 'OWNER' ? 'Owner' : 'Administrator'}</Pill></div>
            </div>
            <dl className="text-xs space-y-2.5">
              {[['Last sign-in', me?.lastLoginAt ? `${fmtDate(me.lastLoginAt)} (${timeAgo(me.lastLoginAt)})` : '–'],
                ['Password changed', me?.passwordChangedAt ? timeAgo(me.passwordChangedAt) : 'Never (temporary password)'],
                ['Account created', fmtDate(me?.createdAt, false)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 text-right">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Sessions end after 10 minutes of inactivity. Changing your password or email signs out your other devices.</div>
          </div>
        </Card>

        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Sign-in email" description="The new address must be confirmed with a code before it replaces the current one." />
            <div className="p-5">
              {step === 'form' ? (
                <form onSubmit={requestCode} className="space-y-4 max-w-md" noValidate>
                  <div className="flex items-center gap-2 text-sm text-slate-600"><Mail className="w-4 h-4 text-slate-400" />Current: <b className="text-slate-900">{user?.email}</b></div>
                  <TextInput label="New email address" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  <TextInput label="Current password" type="password" autoComplete="current-password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} hint="Needed to confirm it is you." />
                  <Err text={emErr} />
                  <Btn type="submit" variant="primary" busy={emBusy} disabled={!newEmail.includes('@') || !emailPw}>Send confirmation code</Btn>
                </form>
              ) : (
                <form onSubmit={confirmCode} className="space-y-4 max-w-md" noValidate>
                  <p className="text-sm text-slate-600">We sent a 6-digit code to <b className="text-slate-900">{newEmail}</b>. It expires in 10 minutes.</p>
                  <TextInput label="Confirmation code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="tracking-[0.4em] text-center text-lg font-semibold" />
                  <Err text={emErr} />
                  <div className="flex gap-2">
                    <Btn type="submit" variant="primary" busy={emBusy} disabled={code.length !== 6}>Confirm new email</Btn>
                    <Btn type="button" onClick={cancelChange} disabled={emBusy}>Cancel</Btn>
                  </div>
                </form>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" description="Other devices are signed out when you change it." />
            <form onSubmit={changePassword} className="p-5 space-y-4 max-w-md" noValidate>
              <div className="flex items-center gap-2 text-sm text-slate-600"><KeyRound className="w-4 h-4 text-slate-400" />12+ characters with upper, lower, number and symbol.</div>
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
              <Err text={pwErr} />
              <Btn type="submit" variant="primary" busy={pwBusy} disabled={!current || !rulesOk || next !== again}>Update password</Btn>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
