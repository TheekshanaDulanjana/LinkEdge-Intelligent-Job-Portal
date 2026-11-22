'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react';
import { actionLabel, adminGet, adminSend, AuditRow, errMsg, fmtDate } from '@/lib/admin';
import { assetUrl } from '@/lib/assetUrl';
import { Btn, Card, CardHeader, ErrorBox, Pill, ReasonDialog, RolePill, Spinner, UserStatusPill, useToast } from '@/components/admin/ui';

interface Detail {
  id: string; email: string; role: 'SEEKER' | 'COMPANY'; status: 'ACTIVE' | 'DISABLED'; statusReason: string | null;
  statusChangedAt: string | null; isEmailVerified: boolean; authProvider: string; createdAt: string; lastLoginAt: string | null;
  seeker: Record<string, string | null> | null; company: Record<string, string | null> | null;
  stats: { jobs?: Record<string, number>; applicationsReceived?: number; applications?: number; resume?: { originalName: string; isParsed: boolean; uploadedDate: string } | null };
  history: AuditRow[];
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-slate-100 last:border-0 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900 break-words">{children || <span className="text-slate-400">–</span>}</dd>
    </div>
  );
}
const link = (v?: string | null) => v ? <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline inline-flex items-center gap-1">{v}<ExternalLink className="w-3 h-3" /></a> : null;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [dlg, setDlg] = useState<'status' | 'delete' | null>(null);

  const load = useCallback(async () => {
    setError('');
    try { setD(await adminGet<Detail>(`/users/${id}`)); } catch (e) { setError(errMsg(e)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <div className="space-y-4"><Link href="/admin/users" className="text-sm text-brand-600 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Users</Link><ErrorBox message={error} onRetry={load} /></div>;
  if (!d) return <Spinner />;

  const p = d.seeker ?? d.company ?? {};
  const name = d.seeker ? d.seeker.fullName : d.company?.companyName;
  const image = assetUrl(d.seeker?.profileImageUrl || d.company?.logoUrl);
  const disabling = d.status === 'ACTIVE';

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-brand-600 inline-flex items-center gap-1 mb-4 hover:underline"><ArrowLeft className="w-4 h-4" />Users</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          {image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={image} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
            : <span className="w-16 h-16 rounded-xl bg-brand-50 text-brand-700 text-2xl font-semibold flex items-center justify-center">{(name ?? '?').charAt(0).toUpperCase()}</span>}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{name}</h1>
            <p className="text-sm text-slate-600 truncate">{d.email}</p>
            <div className="flex gap-2 mt-2"><RolePill role={d.role} /><UserStatusPill status={d.status} />{!d.isEmailVerified && <Pill tone="amber">Email not verified</Pill>}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant={disabling ? 'secondary' : 'primary'} onClick={() => setDlg('status')}>
            {disabling ? <><Ban className="w-4 h-4" />Disable account</> : <><CheckCircle2 className="w-4 h-4" />Enable account</>}
          </Btn>
          <Btn variant="danger" onClick={() => setDlg('delete')}><Trash2 className="w-4 h-4" />Delete</Btn>
        </div>
      </div>

      {d.status === 'DISABLED' && (
        <div className="mb-6 border border-rose-200 bg-rose-50 rounded-lg px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Disabled {d.statusChangedAt ? `on ${fmtDate(d.statusChangedAt)}` : ''}</p>
          {d.statusReason && <p className="mt-1">Reason: {d.statusReason}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Account" />
          <dl className="px-5 py-2">
            <Row label="Joined">{fmtDate(d.createdAt)}</Row>
            <Row label="Last sign-in">{d.lastLoginAt ? fmtDate(d.lastLoginAt) : 'Never'}</Row>
            <Row label="Sign-in method">{d.authProvider === 'GOOGLE' ? 'Google' : 'Email and password'}</Row>
            <Row label="Email verified">{d.isEmailVerified ? 'Yes' : 'No'}</Row>
            {d.seeker && <Row label="Applications sent">{String(d.stats.applications ?? 0)}</Row>}
            {d.seeker && <Row label="CV">{d.stats.resume ? `${d.stats.resume.originalName} (${d.stats.resume.isParsed ? 'analysed' : 'not analysed'})` : 'Not uploaded'}</Row>}
            {d.company && <Row label="Applications received">{String(d.stats.applicationsReceived ?? 0)}</Row>}
            {d.company && <Row label="Job posts">{Object.entries(d.stats.jobs ?? {}).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ')}</Row>}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Profile" />
          <dl className="px-5 py-2">
            {d.seeker ? (<>
              <Row label="Full name">{p.fullName}</Row>
              <Row label="Phone">{p.phone}</Row>
              <Row label="Location">{p.location}</Row>
              <Row label="Interest area">{p.interestArea}</Row>
              <Row label="Work status">{p.workStatus === 'EMPLOYED' ? 'Employed' : 'Looking for work'}</Row>
              <Row label="Work style">{p.workStyle}</Row>
              <Row label="Website">{link(p.websiteUrl)}</Row>
              <Row label="GitHub">{link(p.githubUrl)}</Row>
              <Row label="Behance">{link(p.behanceUrl)}</Row>
              <Row label="Summary"><span className="whitespace-pre-line">{p.professionalSummary}</span></Row>
            </>) : (<>
              <Row label="Company name">{p.companyName}</Row>
              <Row label="Industry">{p.industry}</Row>
              <Row label="Website">{link(p.website)}</Row>
              <Row label="Phone">{p.phone}</Row>
              <Row label="Location">{p.location}</Row>
              <Row label="About"><span className="whitespace-pre-line">{p.aboutUs}</span></Row>
              <Row label="Public page"><a href={`/company/${d.company?.id}`} target="_blank" className="text-brand-600 hover:underline inline-flex items-center gap-1">Open<ExternalLink className="w-3 h-3" /></a></Row>
            </>)}
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Admin history" description="Actions taken on this account" />
        {d.history.length === 0 ? <p className="p-5 text-sm text-slate-500">No admin actions yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {d.history.map((h) => (
              <li key={h.id} className="px-5 py-3 text-sm">
                <span className="font-medium text-slate-900">{actionLabel(h.action)}</span>
                <span className="text-slate-500"> · {h.actorEmail} · {fmtDate(h.createdAt)}</span>
                {h.reason && <p className="text-slate-600 mt-0.5">Reason: {h.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ReasonDialog
        open={dlg === 'status'} onClose={() => setDlg(null)} danger={disabling}
        title={disabling ? 'Disable this account?' : 'Enable this account?'}
        confirmLabel={disabling ? 'Disable account' : 'Enable account'}
        description={disabling
          ? <>The user will be signed out and cannot sign in until the account is enabled again. {d.role === 'COMPANY' ? 'Their job posts stay as they are.' : ''}</>
          : <>The user will be able to sign in again.</>}
        onConfirm={async (reason) => {
          const r = await adminSend<{ emailSent: boolean }>('patch', `/users/${id}/status`, { status: disabling ? 'DISABLED' : 'ACTIVE', reason });
          toast(r.emailSent ? 'ok' : 'error', r.emailSent ? 'Account updated and the user was emailed.' : 'Account updated, but the email could not be sent.');
          setDlg(null); await load();
        }}
      />
      <ReasonDialog
        open={dlg === 'delete'} onClose={() => setDlg(null)} danger confirmText={d.email}
        title="Delete this account permanently?"
        confirmLabel="Delete permanently"
        description={<>This removes the account{d.company ? ', all of its job posts and the applications they received' : ' and all of its applications'}. <b>It cannot be undone.</b> The user is emailed first.</>}
        onConfirm={async (reason) => {
          const r = await adminSend<{ emailSent: boolean }>('delete', `/users/${id}`, { reason, confirmEmail: d.email });
          toast(r.emailSent ? 'ok' : 'error', r.emailSent ? 'Account deleted and the user was emailed.' : 'Account deleted, but the email could not be sent.');
          router.replace('/admin/users');
        }}
      />
    </div>
  );
}
