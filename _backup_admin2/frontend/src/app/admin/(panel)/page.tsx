'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, EyeOff, FileText, MailWarning, UserX, Users, Building2 } from 'lucide-react';
import { actionLabel, adminGet, AuditRow, errMsg, fmtDate, timeAgo } from '@/lib/admin';
import { Card, CardHeader, ErrorBox, PageHeader, Spinner } from '@/components/admin/ui';

interface Dashboard {
  users: { seekers: number; companies: number; disabled: number; unverified: number; newSeekers7: number; newCompanies7: number };
  jobs: { ACTIVE: number; INACTIVE: number; CLOSED: number; DRAFT: number; HIDDEN: number; total: number };
  applications: { total: number; last7: number };
  signups: { day: string; role: 'SEEKER' | 'COMPANY'; count: number }[];
  recentAudit: AuditRow[];
}

function Stat({ icon: Icon, label, value, sub, href }: { icon: React.ElementType; label: string; value: number | string; sub?: string; href?: string }) {
  const body = (
    <Card className="p-5 h-full hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide"><Icon className="w-4 h-4" />{label}</div>
      <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function SignupChart({ data }: { data: Dashboard['signups'] }) {
  const days = useMemo(() => {
    const out: { key: string; label: string; seeker: number; company: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), seeker: 0, company: 0 });
    }
    data.forEach((r) => {
      const k = new Date(r.day).toISOString().slice(0, 10);
      const row = out.find((x) => x.key === k) ?? out.find((x) => x.key === new Date(r.day).toLocaleDateString('en-CA'));
      if (row) { if (r.role === 'SEEKER') row.seeker += r.count; else row.company += r.count; }
    });
    return out;
  }, [data]);
  const max = Math.max(1, ...days.map((d) => d.seeker + d.company));
  const total = days.reduce((a, d) => a + d.seeker + d.company, 0);
  const W = 600, H = 140, bw = W / days.length;
  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600" />Job seekers</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-300" />Companies</span>
        <span className="ml-auto">{total} new in 30 days</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full h-44" role="img" aria-label="New sign-ups per day for the last 30 days">
        {days.map((d, i) => {
          const hs = (d.seeker / max) * H, hc = (d.company / max) * H;
          return (
            <g key={d.key}>
              <title>{`${d.label}: ${d.seeker} job seekers, ${d.company} companies`}</title>
              <rect x={i * bw + 2} y={H - hs} width={bw - 4} height={hs} rx={2} className="fill-brand-600" />
              <rect x={i * bw + 2} y={H - hs - hc} width={bw - 4} height={hc} rx={2} className="fill-brand-300" />
              {(i === 0 || i === 14 || i === 29) && <text x={i * bw + bw / 2} y={H + 14} textAnchor={i === 0 ? 'start' : i === 29 ? 'end' : 'middle'} className="fill-slate-500" fontSize="10">{d.label}</text>}
            </g>
          );
        })}
        <line x1="0" x2={W} y1={H} y2={H} className="stroke-slate-200" />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setData(await adminGet<Dashboard>('/dashboard')); } catch (e) { setError(errMsg(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;
  const { users, jobs, applications } = data;

  return (
    <div>
      <PageHeader title="Dashboard" description="What is happening on the platform right now." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="Job seekers" value={users.seekers} sub={`+${users.newSeekers7} this week`} href="/admin/users?role=SEEKER" />
        <Stat icon={Building2} label="Companies" value={users.companies} sub={`+${users.newCompanies7} this week`} href="/admin/users?role=COMPANY" />
        <Stat icon={Briefcase} label="Active jobs" value={jobs.ACTIVE} sub={`${jobs.total} in total`} href="/admin/jobs" />
        <Stat icon={FileText} label="Applications" value={applications.total} sub={`+${applications.last7} this week`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Stat icon={UserX} label="Disabled accounts" value={users.disabled} href="/admin/users?status=DISABLED" />
        <Stat icon={MailWarning} label="Email not verified" value={users.unverified} />
        <Stat icon={EyeOff} label="Hidden job posts" value={jobs.HIDDEN} href="/admin/jobs?status=HIDDEN" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mt-6">
        <Card className="xl:col-span-3">
          <CardHeader title="New sign-ups" description="Last 30 days" />
          <div className="p-5"><SignupChart data={data.signups} /></div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Recent admin activity" actions={<Link href="/admin/audit" className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>} />
          <ul className="divide-y divide-slate-100">
            {data.recentAudit.length === 0 && <li className="p-5 text-sm text-slate-500">No activity yet.</li>}
            {data.recentAudit.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="text-sm text-slate-800">{actionLabel(a.action)}{a.targetLabel ? <span className="text-slate-500"> · {a.targetLabel}</span> : null}</p>
                <p className="text-xs text-slate-500 mt-0.5" title={fmtDate(a.createdAt)}>{a.actorEmail} · {timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
