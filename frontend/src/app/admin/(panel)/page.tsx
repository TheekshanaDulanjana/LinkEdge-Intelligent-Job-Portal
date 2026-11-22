'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users, Building2, Briefcase, FileText, UserCheck, ShieldCheck, Inbox, Gauge, RefreshCw, AlertTriangle, ArrowRight, Activity, BarChart3,
} from 'lucide-react';
import { actionLabel, timeAgo, useAdminQuery } from '@/lib/admin';
import { Summary } from '@/lib/adminTypes';
import { assetUrl } from '@/lib/assetUrl';
import { KpiTile, Panel, PanelSkeleton, ErrorNote, EmptyNote, cx } from '@/components/enterprise/dashboard/primitives';
import { Segmented, JobStatusPill, btnSecondary, Avatar } from '@/components/enterprise/dashboard/kit';
import { COLORS, Donut, Funnel, Legend, LineChart, num, shortDay } from '@/components/admin/charts';
import { RolePill } from '@/components/admin/ui';

const RANGES = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }];
const SERIES = [
  { key: 'seekers', name: 'Job seekers', color: COLORS.blue },
  { key: 'companies', name: 'Companies', color: COLORS.violet },
  { key: 'jobs', name: 'Job posts', color: COLORS.green },
  { key: 'applications', name: 'Applications', color: COLORS.amber },
] as const;

function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

export default function DashboardPage() {
  const [days, setDays] = useState('30');
  const [off, setOff] = useState<Record<string, boolean>>({});
  const { data, error, loading, reload } = useAdminQuery<Summary>('/analytics/summary', { days });
  const d = data;
  const spark = (k: 'seekers' | 'companies' | 'jobs' | 'applications') => d?.series.map((s) => s[k]);
  const a = d?.attention;
  const attention = a ? [
    { n: a.lockedAdmins, text: 'Locked administrator accounts', href: '/admin/admins', tone: 'rose' as const },
    { n: a.failedLogins24, text: 'Failed admin sign-ins in the last 24 hours', href: '/admin/audit', tone: 'rose' as const },
    { n: a.hiddenJobs, text: 'Job posts hidden by admins', href: '/admin/jobs?status=HIDDEN', tone: 'amber' as const },
    { n: a.unverifiedOld, text: 'Accounts still unverified after 3 days', href: '/admin/users', tone: 'amber' as const },
    { n: a.expiring, text: 'Active jobs closing within 7 days', href: '/admin/jobs?status=ACTIVE', tone: 'slate' as const },
    { n: a.zeroApps, text: 'Active jobs with no applicants after a week', href: '/admin/jobs?status=ACTIVE', tone: 'slate' as const },
  ].filter((x) => x.n > 0) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight mt-0.5">{greeting()}</h1>
          <p className="text-xs text-slate-600 mt-1">Everything happening on SkillSync, live from the database.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Segmented value={days} onChange={setDays} options={RANGES} />
          <button onClick={reload} className={btnSecondary} aria-label="Refresh"><RefreshCw className={cx('w-3.5 h-3.5', loading && 'animate-spin')} />Refresh</button>
          <Link href="/admin/analytics" className={btnSecondary}><BarChart3 className="w-3.5 h-3.5" />Full analytics</Link>
        </div>
      </div>

      {error && !d && <Panel title="Dashboard"><ErrorNote text={error} onRetry={reload} /></Panel>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiTile label="Job seekers" icon={<Users className="w-3.5 h-3.5" />} loading={!d} value={num(d?.kpis.seekers.total)} spark={spark('seekers')} sparkColor={COLORS.blue}
          delta={d ? { value: d.kpis.seekers.change, label: `+${d.kpis.seekers.current} in ${days} days` } : null} />
        <KpiTile label="Companies" icon={<Building2 className="w-3.5 h-3.5" />} loading={!d} value={num(d?.kpis.companies.total)} spark={spark('companies')} sparkColor={COLORS.violet}
          delta={d ? { value: d.kpis.companies.change, label: `+${d.kpis.companies.current} in ${days} days` } : null} />
        <KpiTile label="Job posts" icon={<Briefcase className="w-3.5 h-3.5" />} loading={!d} value={num(d?.kpis.jobs.total)} spark={spark('jobs')} sparkColor={COLORS.green}
          delta={d ? { value: d.kpis.jobs.change, label: `${d.kpis.jobs.active} active now` } : null} />
        <KpiTile label="Applications" icon={<FileText className="w-3.5 h-3.5" />} loading={!d} value={num(d?.kpis.applications.total)} spark={spark('applications')} sparkColor={COLORS.amber}
          delta={d ? { value: d.kpis.applications.change, label: `+${d.kpis.applications.current} in ${days} days` } : null} />
        <KpiTile label="Active users (7 d)" icon={<Activity className="w-3.5 h-3.5" />} loading={!d} value={num(d?.users.active7)} hint={d ? `${d.users.active1} today · ${d.users.active30} in 30 days` : undefined} />
        <KpiTile label="Verified accounts" icon={<UserCheck className="w-3.5 h-3.5" />} loading={!d} value={d?.users.verifiedRate ?? 0} unit="%" hint={d ? `${d.users.unverified} not verified yet` : undefined} />
        <KpiTile label="Awaiting review" icon={<Inbox className="w-3.5 h-3.5" />} loading={!d} value={num(d?.attention.pendingApplications)} hint="Applications in Pending" />
        <KpiTile label="Applications per job" icon={<Gauge className="w-3.5 h-3.5" />} loading={!d} value={d?.applications.perJob ?? 0} hint="All time average" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Panel title="Platform growth" subtitle={`Daily activity, last ${days} days`} className="xl:col-span-2"
          actions={<Legend items={SERIES.map((s) => ({ name: s.name, color: s.color }))} />}>
          {!d ? <PanelSkeleton rows={6} /> : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {SERIES.map((s) => (
                  <button key={s.key} onClick={() => setOff((o) => ({ ...o, [s.key]: !o[s.key] }))} aria-pressed={!off[s.key]}
                    className={cx('inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-xs font-semibold cursor-pointer', off[s.key] ? 'border-slate-200 text-slate-400' : 'border-slate-300 text-slate-700 bg-slate-50')}>
                    <span className="w-2 h-2 rounded-full" style={{ background: off[s.key] ? '#cbd5e1' : s.color }} />{s.name}
                  </button>
                ))}
              </div>
              <LineChart labels={d.series.map((s) => shortDay(s.day))} series={SERIES.filter((s) => !off[s.key]).map((s) => ({ name: s.name, color: s.color, data: d.series.map((p) => p[s.key]) }))} />
            </>
          )}
        </Panel>

        <Panel title="Needs attention" subtitle="Things an admin should look at" icon={<AlertTriangle className="w-3.5 h-3.5" />} noPad>
          {!d ? <div className="p-5"><PanelSkeleton /></div> : attention.length === 0 ? <EmptyNote text="All clear. Nothing needs attention right now." icon={<ShieldCheck className="w-6 h-6" />} /> : (
            <ul className="divide-y divide-slate-100">
              {attention.map((x) => (
                <li key={x.text}>
                  <Link href={x.href} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group">
                    <span className={cx('min-w-8 h-8 px-2 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums', x.tone === 'rose' ? 'bg-rose-50 text-rose-600' : x.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{x.n}</span>
                    <span className="text-xs text-slate-700 flex-1">{x.text}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Application pipeline" subtitle="Where candidates are right now">
          {!d ? <PanelSkeleton /> : (
            <Funnel showStep={false} steps={[
              { label: 'Pending', value: d.applications.PENDING ?? 0, color: COLORS.slate },
              { label: 'Under review', value: d.applications.REVIEWING ?? 0, color: COLORS.blue },
              { label: 'Shortlisted', value: d.applications.SHORTLISTED ?? 0, color: COLORS.violet },
              { label: 'Interview', value: d.applications.INTERVIEW ?? 0, color: COLORS.sky },
              { label: 'Rejected', value: d.applications.REJECTED ?? 0, color: COLORS.rose },
            ]} />
          )}
        </Panel>
        <Panel title="Job posts by status" subtitle={`${d?.jobs.total ?? 0} posts in total`}>
          {!d ? <PanelSkeleton /> : (
            <Donut sub="posts" slices={[
              { label: 'Active', value: d.jobs.ACTIVE ?? 0, color: COLORS.green }, { label: 'Paused', value: d.jobs.INACTIVE ?? 0, color: COLORS.slate },
              { label: 'Closed', value: d.jobs.CLOSED ?? 0, color: COLORS.amber }, { label: 'Draft', value: d.jobs.DRAFT ?? 0, color: COLORS.sky },
              { label: 'Hidden by admin', value: d.jobs.HIDDEN ?? 0, color: COLORS.rose },
            ]} />
          )}
        </Panel>
        <Panel title="Accounts" subtitle="Who is on the platform">
          {!d ? <PanelSkeleton /> : (
            <Donut sub="accounts" slices={[
              { label: 'Job seekers', value: d.users.seekers, color: COLORS.blue }, { label: 'Companies', value: d.users.companies, color: COLORS.violet },
            ]} />
          )}
          {d && <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between"><span>Disabled accounts <b className="text-slate-900">{d.users.disabled}</b></span><span>Unverified <b className="text-slate-900">{d.users.unverified}</b></span></p>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Newest accounts" actions={<Link href="/admin/users" className="text-xs font-semibold text-[#0063CE] hover:underline">All users</Link>} noPad>
          {!d ? <div className="p-5"><PanelSkeleton /></div> : d.recentUsers.length === 0 ? <EmptyNote text="No accounts yet." /> : (
            <ul className="divide-y divide-slate-100">
              {d.recentUsers.map((u) => (
                <li key={u.id}><Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                  <Avatar name={u.name} src={u.image ? assetUrl(u.image) : null} size={32} />
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-slate-800 truncate">{u.name}</span><span className="block text-xs text-slate-500 truncate">{u.email}</span></span>
                  <span className="text-right shrink-0"><RolePill role={u.role} /><span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(u.createdAt)}</span></span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Latest job posts" actions={<Link href="/admin/jobs" className="text-xs font-semibold text-[#0063CE] hover:underline">All jobs</Link>} noPad>
          {!d ? <div className="p-5"><PanelSkeleton /></div> : d.recentJobs.length === 0 ? <EmptyNote text="No job posts yet." /> : (
            <ul className="divide-y divide-slate-100">
              {d.recentJobs.map((j) => (
                <li key={j.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-slate-800 truncate">{j.title}</span><span className="block text-xs text-slate-500 truncate">{j.company} · {j.location}</span></span>
                  <span className="text-right shrink-0"><JobStatusPill status={j.status} /><span className="block text-[11px] text-slate-400 mt-0.5">{j.applications} applicants · {timeAgo(j.createdAt)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Admin activity" actions={<Link href="/admin/audit" className="text-xs font-semibold text-[#0063CE] hover:underline">Audit log</Link>} noPad>
          {!d ? <div className="p-5"><PanelSkeleton /></div> : d.recentAudit.length === 0 ? <EmptyNote text="No activity yet." /> : (
            <ul className="divide-y divide-slate-100">
              {d.recentAudit.map((l) => (
                <li key={l.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium text-slate-800 truncate">{actionLabel(l.action)}</span><span className="text-[11px] text-slate-400 shrink-0">{timeAgo(l.createdAt)}</span></div>
                  <p className="text-xs text-slate-500 truncate">{l.targetLabel ? `${l.targetLabel} · ` : ''}{l.actorEmail}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
