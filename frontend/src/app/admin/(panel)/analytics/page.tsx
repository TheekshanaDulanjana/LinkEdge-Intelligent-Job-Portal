'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, Bell, BriefcaseBusiness, CheckCircle2, Clock, Cpu, Database, FileCheck2, Gauge, Globe2, Sparkles, TrendingUp, UserPlus, XCircle,
} from 'lucide-react';
import { actionLabel, fmtDate, timeAgo, useAdminQuery } from '@/lib/admin';
import type { Engagement, Growth, Hiring, Marketplace, SystemInfo } from '@/lib/adminTypes';
import { KpiTile, Panel, PanelSkeleton, ErrorNote, EmptyNote, cx } from '@/components/enterprise/dashboard/primitives';
import { Segmented, PageHead } from '@/components/enterprise/dashboard/kit';
import { BarList, Columns, COLORS, Donut, Funnel, HourStrip, Legend, LineChart, PALETTE, Stat, num, shortDay, skillName } from '@/components/admin/charts';
import { Pill, th, td, UserStatusPill } from '@/components/admin/ui';

const TABS = [
  { value: 'growth', label: 'Growth' }, { value: 'marketplace', label: 'Marketplace' }, { value: 'hiring', label: 'Hiring & AI' },
  { value: 'engagement', label: 'Engagement' }, { value: 'system', label: 'System & security' },
];
const RANGES = [{ value: '7', label: '7 d' }, { value: '30', label: '30 d' }, { value: '90', label: '90 d' }, { value: '365', label: '1 yr' }];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nice = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const money = (n: number | null | undefined) => (n === null || n === undefined ? '–' : n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(Math.round(n)));
const bytes = (n: number | null) => (n === null ? '–' : n > 1073741824 ? `${(n / 1073741824).toFixed(2)} GB` : `${(n / 1048576).toFixed(1)} MB`);
const uptime = (s: number) => (s > 86400 ? `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h` : s > 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m`);

function Section<T>({ q, children }: { q: { data: T | null; error: string; loading: boolean; reload: () => void }; children: (d: T) => React.ReactNode }) {
  if (q.error && !q.data) return <Panel title="Analytics"><ErrorNote text={q.error} onRetry={q.reload} /></Panel>;
  if (!q.data) return <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <Panel key={i} title="Loading…"><PanelSkeleton rows={5} /></Panel>)}</div>;
  return <>{children(q.data)}</>;
}
const Table = ({ head, rows, empty = 'No data yet' }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) => rows.length === 0 ? <EmptyNote text={empty} /> : (
  <div className="overflow-x-auto"><table className="w-full">
    <thead><tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="hover:bg-slate-50/60">{r.map((c, j) => <td key={j} className={td}>{c}</td>)}</tr>)}</tbody>
  </table></div>
);

/* ------------------------------------------------------------------ growth */
function GrowthTab({ days }: { days: string }) {
  const q = useAdminQuery<Growth>('/analytics/growth', { days });
  return (
    <Section q={q}>{(g) => {
      const s = g.funnels.seeker, c = g.funnels.company;
      return (
        <div className="space-y-5">
          <Panel title="Total accounts over time" subtitle={`Cumulative, last ${days} days`} actions={<Legend items={[{ name: 'Job seekers', color: COLORS.blue }, { name: 'Companies', color: COLORS.violet }]} />}>
            <LineChart labels={g.cumulative.map((x) => shortDay(x.day))} series={[
              { name: 'Job seekers', color: COLORS.blue, data: g.cumulative.map((x) => x.seekers) }, { name: 'Companies', color: COLORS.violet, data: g.cumulative.map((x) => x.companies) }]} />
          </Panel>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Job seeker journey" subtitle="From sign-up to first application">
              <Funnel steps={[{ label: 'Registered', value: s.registered }, { label: 'Email verified', value: s.verified }, { label: 'Uploaded a CV', value: s.resume }, { label: 'Applied to a job', value: s.applied }]} />
            </Panel>
            <Panel title="Company journey" subtitle="From sign-up to receiving applications">
              <Funnel steps={[{ label: 'Registered', value: c.registered }, { label: 'Email verified', value: c.verified }, { label: 'Completed profile', value: c.profile }, { label: 'Posted a job', value: c.posted }, { label: 'Received applications', value: c.received }]} />
            </Panel>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Panel title="Weekly cohorts" subtitle="Sign-ups and how many came back" className="xl:col-span-2" noPad>
              <Table head={['Week of', 'Sign-ups', 'Came back', 'Return rate']} empty="No sign-ups in the last 8 weeks"
                rows={g.cohorts.map((c) => [shortDay(c.week), num(c.signups), num(c.returned),
                  <div key="r" className="flex items-center gap-2"><div className="w-24 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0063CE]" style={{ width: `${c.returnRate}%` }} /></div><span className="text-xs tabular-nums">{c.returnRate}%</span></div>])} />
            </Panel>
            <Panel title="Sign-in method" subtitle="How people join">
              <Donut sub="accounts" slices={g.providers.map((p, i) => ({ label: p.provider === 'GOOGLE' ? 'Google' : 'Email & password', value: p.n, color: PALETTE[i] }))} />
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                {g.verification.map((v) => <p key={v.role} className="text-xs text-slate-600 flex justify-between"><span>{v.role === 'COMPANY' ? 'Companies' : 'Job seekers'} verified</span><b className="text-slate-900">{v.verified}/{v.total}</b></p>)}
              </div>
            </Panel>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Applications by weekday" subtitle={`Last ${days} days`}><Columns data={g.applicationsByWeekday.map((d) => ({ label: WEEKDAYS[d.day], value: d.count }))} /></Panel>
            <Panel title="Applications by hour of day" subtitle="Server time (UTC)"><HourStrip data={g.applicationsByHour} /></Panel>
          </div>
        </div>
      );
    }}</Section>
  );
}

/* ------------------------------------------------------------- marketplace */
function MarketTab({ days }: { days: string }) {
  const q = useAdminQuery<Marketplace>('/analytics/marketplace', { days });
  return (
    <Section q={q}>{(m) => (
      <div className="space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiTile label="Jobs with salary" icon={<BriefcaseBusiness className="w-3.5 h-3.5" />} value={num(m.salary?.jobs)} hint="Posts that show a range" />
          <KpiTile label="Median salary" icon={<TrendingUp className="w-3.5 h-3.5" />} value={money(m.salary?.median)} hint="Midpoint of min and max" />
          <KpiTile label="Average minimum" icon={<Gauge className="w-3.5 h-3.5" />} value={money(m.salary?.avg_min)} />
          <KpiTile label="Average maximum" icon={<Gauge className="w-3.5 h-3.5" />} value={money(m.salary?.avg_max)} />
        </div>
        <Panel title="Skills: demand vs supply" subtitle="Skills asked for in job posts compared with skills found in uploaded CVs" actions={<Legend items={[{ name: 'Demand (jobs)', color: COLORS.blue }, { name: 'Supply (CVs)', color: COLORS.green }]} />}>
          {m.skillGap.length === 0 ? <EmptyNote text="No skills recorded yet." icon={<Sparkles className="w-6 h-6" />} /> : (
            <div className="space-y-3">
              {m.skillGap.map((s) => {
                const max = Math.max(1, ...m.skillGap.flatMap((x) => [x.demand, x.supply]));
                return (
                  <div key={s.skill} className="grid grid-cols-[120px_1fr_70px] items-center gap-3 text-xs">
                    <span className="font-medium text-slate-700 truncate">{skillName(s.skill)}</span>
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(s.demand / max) * 100}%`, background: COLORS.blue }} /></div>
                      <div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(s.supply / max) * 100}%`, background: COLORS.green }} /></div>
                    </div>
                    <span className={cx('text-right tabular-nums font-semibold', s.supply < s.demand ? 'text-rose-600' : 'text-emerald-600')}>{s.demand}/{s.supply}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Job types"><Donut sub="posts" slices={m.jobType.map((x, i) => ({ label: nice(x.k), value: x.n, color: PALETTE[i % PALETTE.length] }))} /></Panel>
          <Panel title="Work location"><Donut sub="posts" slices={m.locationType.map((x, i) => ({ label: nice(x.k), value: x.n, color: PALETTE[i % PALETTE.length] }))} /></Panel>
          <Panel title="Job seeker work status"><Donut sub="seekers" slices={m.workStatus.map((x, i) => ({ label: nice(x.k), value: x.n, color: PALETTE[i % PALETTE.length] }))} /></Panel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Most wanted skills"><BarList rows={m.topDemand.slice(0, 10).map((x) => ({ label: skillName(x.skill), value: x.n }))} /></Panel>
          <Panel title="Most common CV skills"><BarList color={COLORS.green} rows={m.topSupply.slice(0, 10).map((x) => ({ label: skillName(x.skill), value: x.n }))} /></Panel>
          <Panel title="Experience levels asked"><BarList color={COLORS.violet} rows={m.experienceLevel.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Company industries" icon={<Globe2 className="w-3.5 h-3.5" />}><BarList color={COLORS.sky} rows={m.industries.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
          <Panel title="Where jobs are" icon={<Globe2 className="w-3.5 h-3.5" />}><BarList rows={m.jobLocations.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
          <Panel title="Where job seekers are" icon={<Globe2 className="w-3.5 h-3.5" />}><BarList color={COLORS.green} rows={m.seekerLocations.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Departments hiring"><BarList color={COLORS.amber} rows={m.departments.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
          <Panel title="Seeker interest areas"><BarList color={COLORS.violet} rows={m.interestAreas.map((x) => ({ label: x.k, value: x.n }))} /></Panel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Salary by job type" subtitle="Average range of posts that show one" noPad>
            <Table head={['Type', 'Avg min', 'Avg max', 'Posts']} empty="No salary data yet" rows={m.salaryByType.map((s) => [nice(s.k), money(s.avg_min), money(s.avg_max), s.n])} />
          </Panel>
          <Panel title="Applications per job, by type" noPad>
            <Table head={['Type', 'Jobs', 'Applications', 'Per job']} rows={m.perType.map((s) => [nice(s.k), s.jobs, s.applications, <b key="p">{s.perJob}</b>])} />
          </Panel>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Top companies" subtitle="By applications received" noPad>
            <Table head={['Company', 'Jobs', 'Applicants', 'Responded']} empty="No companies yet"
              rows={m.topCompanies.map((c) => [<span key="n" className="font-medium text-slate-800">{c.name}</span>, `${c.active}/${c.jobs} active`, num(c.applications), <Pill key="r" tone={c.responseRate >= 70 ? 'green' : c.responseRate >= 30 ? 'amber' : 'slate'}>{c.responseRate}%</Pill>])} />
          </Panel>
          <Panel title="Top job posts" subtitle={`Most applications in the last ${days} days`} noPad>
            <Table head={['Job', 'Company', 'Applicants', 'Avg match']} empty="No job posts yet"
              rows={m.topJobs.map((j) => [<span key="t" className="font-medium text-slate-800">{j.title}</span>, j.company, num(j.applications), j.avg_ats === null ? '–' : `${Math.round(j.avg_ats)}%`])} />
          </Panel>
        </div>
      </div>
    )}</Section>
  );
}

/* ------------------------------------------------------------------ hiring */
function HiringTab({ days }: { days: string }) {
  const q = useAdminQuery<Hiring>('/analytics/hiring', { days });
  return (
    <Section q={q}>{(h) => {
      const dims = h.dimensions && h.dimensions.n > 0 ? h.dimensions : null;
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiTile label="Shortlist rate" icon={<CheckCircle2 className="w-3.5 h-3.5" />} value={h.conversion.shortlistRate} unit="%" hint="Shortlisted or interviewing" />
            <KpiTile label="Interview rate" icon={<UserPlus className="w-3.5 h-3.5" />} value={h.conversion.interviewRate} unit="%" hint={`${h.screening.interviews} interviews booked`} />
            <KpiTile label="Rejection rate" icon={<XCircle className="w-3.5 h-3.5" />} value={h.conversion.rejectRate} unit="%" hint="Of all applications" />
            <KpiTile label="Avg response time" icon={<Clock className="w-3.5 h-3.5" />} value={h.avgResponseHours === null ? '–' : num(h.avgResponseHours, 1)} unit={h.avgResponseHours === null ? undefined : 'h'} hint={`${h.conversion.responseRate}% get a response`} />
            <KpiTile label="Average ATS match" icon={<Gauge className="w-3.5 h-3.5" />} value={h.screening.avgAts === null ? '–' : num(h.screening.avgAts, 1)} unit={h.screening.avgAts === null ? undefined : '%'} hint={`${h.screening.scored} of ${h.screening.total} scored`} />
            <KpiTile label="Auto-rejected" icon={<Cpu className="w-3.5 h-3.5" />} value={h.conversion.autoRejectRate} unit="%" hint={`${h.screening.autoRejected} below the job threshold`} />
            <KpiTile label="Overridden by companies" icon={<FileCheck2 className="w-3.5 h-3.5" />} value={h.conversion.overrideRate} unit="%" hint="Of auto-rejections" />
            <KpiTile label="CVs parsed" icon={<FileCheck2 className="w-3.5 h-3.5" />} value={h.resumes.parseRate} unit="%" hint={`${h.resumes.parsed}/${h.resumes.total} · ${h.resumes.failed} failed`} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Panel title="Applications per day" subtitle={`Last ${days} days`} className="xl:col-span-2">
              <LineChart labels={h.perDay.map((x) => shortDay(x.day))} series={[{ name: 'Applications', color: COLORS.amber, data: h.perDay.map((x) => x.count) }]} />
            </Panel>
            <Panel title="Pipeline" subtitle={`Applications from the last ${days} days`}>
              <Funnel showStep={false} steps={[{ label: 'Pending', value: h.funnel.PENDING ?? 0, color: COLORS.slate }, { label: 'Under review', value: h.funnel.REVIEWING ?? 0, color: COLORS.blue }, { label: 'Shortlisted', value: h.funnel.SHORTLISTED ?? 0, color: COLORS.violet }, { label: 'Interview', value: h.funnel.INTERVIEW ?? 0, color: COLORS.sky }, { label: 'Rejected', value: h.funnel.REJECTED ?? 0, color: COLORS.rose }]} />
            </Panel>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Panel title="Match score spread" subtitle="How well candidates fit the jobs they apply to"><Columns color={COLORS.sky} data={h.atsDistribution.map((b) => ({ label: b.label, value: b.count }))} /></Panel>
            <Panel title="What the ATS scores" subtitle={dims ? `Average of ${dims.n} scored applications` : 'No detailed scores yet'}>
              {dims ? <BarList format={(n) => `${Math.round(n)}%`} rows={[
                { label: 'Technical skills', value: dims.technical ?? 0, color: COLORS.blue }, { label: 'Experience', value: dims.experience ?? 0, color: COLORS.violet },
                { label: 'Education', value: dims.education ?? 0, color: COLORS.green }, { label: 'Certifications', value: dims.certification ?? 0, color: COLORS.amber },
                { label: 'Keywords', value: dims.keyword ?? 0, color: COLORS.sky }]} /> : <EmptyNote text="Scores appear after the first applications are screened." />}
            </Panel>
            <Panel title="Why candidates are rejected" subtitle="Most used reasons"><BarList color={COLORS.rose} empty="No rejection reasons yet" rows={h.rejectionReasons.map((r) => ({ label: r.k, value: r.n }))} /></Panel>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Skills candidates match"><BarList color={COLORS.green} rows={h.matchedSkills.map((s) => ({ label: skillName(s.skill), value: s.n }))} /></Panel>
            <Panel title="Skills candidates are missing"><BarList color={COLORS.rose} rows={h.missingSkills.map((s) => ({ label: skillName(s.skill), value: s.n }))} /></Panel>
          </div>
          <Panel title="How quickly companies respond" subtitle={`Applications from the last ${days} days`} noPad>
            <Table head={['Company', 'Applications', 'Responded', 'Avg time to respond']} empty="No applications in this period"
              rows={h.companyResponsiveness.map((c) => [<span key="n" className="font-medium text-slate-800">{c.name}</span>, num(c.applications), <Pill key="r" tone={c.responseRate >= 70 ? 'green' : c.responseRate >= 30 ? 'amber' : 'rose'}>{c.responseRate}%</Pill>, c.hours === null ? '–' : c.hours < 48 ? `${num(c.hours, 1)} h` : `${num(c.hours / 24, 1)} days`])} />
          </Panel>
          <p className="text-xs text-slate-500">Calendar: {h.calendar?.events ?? 0} events scheduled by companies, {h.calendar?.upcoming ?? 0} still to come.</p>
        </div>
      );
    }}</Section>
  );
}

/* -------------------------------------------------------------- engagement */
function EngagementTab({ days }: { days: string }) {
  const q = useAdminQuery<Engagement>('/analytics/engagement', { days });
  return (
    <Section q={q}>{(e) => {
      const tot = e.activity.reduce((a, r) => ({ d1: a.d1 + r.d1, d7: a.d7 + r.d7, d30: a.d30 + r.d30, total: a.total + r.total }), { d1: 0, d7: 0, d30: 0, total: 0 });
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiTile label="Daily active" icon={<Activity className="w-3.5 h-3.5" />} value={num(tot.d1)} hint="Signed in last 24 h" />
            <KpiTile label="Weekly active" icon={<Activity className="w-3.5 h-3.5" />} value={num(tot.d7)} hint="Signed in last 7 days" />
            <KpiTile label="Monthly active" icon={<Activity className="w-3.5 h-3.5" />} value={num(tot.d30)} hint="Signed in last 30 days" />
            <KpiTile label="Stickiness" icon={<TrendingUp className="w-3.5 h-3.5" />} value={tot.d30 ? Math.round((tot.d1 / tot.d30) * 100) : 0} unit="%" hint="Daily / monthly active" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Panel title="Activity by account type" className="xl:col-span-2" noPad>
              <Table head={['Type', 'Total', 'Today', '7 days', '30 days', 'Never signed in']} rows={e.activity.map((r) => [r.role === 'COMPANY' ? 'Companies' : 'Job seekers', num(r.total), num(r.d1), num(r.d7), num(r.d30), num(r.never)])} />
            </Panel>
            <Panel title="Notifications" subtitle={`Last ${days} days`} icon={<Bell className="w-3.5 h-3.5" />}>
              <Donut center={`${e.notifications.readRate}%`} sub="read" slices={[{ label: 'Read', value: e.notifications.read, color: COLORS.green }, { label: 'Unread', value: e.notifications.total - e.notifications.read, color: COLORS.slate }]} />
              <div className="mt-4 pt-3 border-t border-slate-100"><BarList color={COLORS.sky} rows={e.notifications.byType.map((n) => ({ label: nice(n.k), value: n.n }))} empty="No notifications yet" /></div>
            </Panel>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Panel title="Job seeker profile completeness" subtitle="Phone, location, photo, interest, summary, CV, links"><Columns color={COLORS.blue} data={e.seekerProfileCompleteness.map((b) => ({ label: b.label, value: b.count }))} /></Panel>
            <Panel title="Company profile completeness" subtitle="Industry, website, location, phone, logo, cover, about"><Columns color={COLORS.violet} data={e.companyProfileCompleteness.map((b) => ({ label: b.label, value: b.count }))} /></Panel>
          </div>
          <Panel title="Dormant accounts" subtitle="Active accounts with no sign-in for 30+ days" noPad>
            <Table head={['Account', 'Type', 'Last sign-in', 'Joined']} empty="Nobody has been away for 30 days."
              rows={e.dormant.map((u) => [<Link key="a" href={`/admin/users/${u.id}`} className="font-medium text-[#0063CE] hover:underline">{u.email}</Link>, u.role === 'COMPANY' ? 'Company' : 'Job seeker', u.last ? timeAgo(u.last) : 'Never', fmtDate(u.created, false)])} />
          </Panel>
        </div>
      );
    }}</Section>
  );
}

/* ------------------------------------------------------------------ system */
function SystemTab() {
  const q = useAdminQuery<SystemInfo>('/analytics/system');
  return (
    <Section q={q}>{(s) => (
      <div className="space-y-5">
        <Panel title="Services" subtitle="Checked from the auth service just now" actions={<button onClick={q.reload} className="text-xs font-semibold text-[#0063CE] hover:underline cursor-pointer">Re-check</button>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {s.services.map((v) => (
              <div key={v.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">{v.name}</span>
                  <span className={cx('w-2.5 h-2.5 rounded-full', v.status === 'up' ? 'bg-emerald-500' : v.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500')} /></div>
                <p className={cx('mt-2 text-lg font-semibold', v.status === 'up' ? 'text-emerald-600' : v.status === 'degraded' ? 'text-amber-600' : 'text-rose-600')}>{v.status === 'up' ? 'Online' : v.status === 'degraded' ? 'Degraded' : 'Offline'}</p>
                <p className="text-xs text-slate-500">{v.latencyMs === null ? 'No response' : `${v.latencyMs} ms`}</p>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Database" icon={<Database className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Status" value={s.database.ok ? 'Healthy' : 'Down'} tone={s.database.ok ? 'good' : 'bad'} />
              <Stat label="Query time" value={s.database.latencyMs === null ? '–' : `${s.database.latencyMs} ms`} />
              <Stat label="Size" value={bytes(s.database.sizeBytes)} />
              <Stat label="Auth service" value={uptime(s.process.uptimeSeconds)} hint={`${s.process.rssMb} MB memory`} />
            </div>
            <BarList color={COLORS.sky} rows={s.database.tables.map((t) => ({ label: t.name, value: t.rows }))} />
          </Panel>
          <Panel title="Admin security (24 h)" icon={<Cpu className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Sign-ins" value={s.security.logins24} />
              <Stat label="Failed" value={s.security.failed24} tone={s.security.failed24 ? 'warn' : undefined} />
              <Stat label="Blocked (locked)" value={s.security.blocked24} tone={s.security.blocked24 ? 'bad' : undefined} />
              <Stat label="Locked now" value={s.security.lockedAdmins} tone={s.security.lockedAdmins ? 'bad' : undefined} />
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Admin actions, last 7 days</p>
            <BarList color={COLORS.violet} rows={s.auditByAction.map((a) => ({ label: actionLabel(a.action), value: a.n }))} empty="No admin actions yet" />
          </Panel>
          <Panel title="Audit activity" subtitle="Last 14 days">
            <Columns color={COLORS.blue} data={s.auditPerDay.map((d) => ({ label: shortDay(d.day), value: d.count }))} />
          </Panel>
        </div>
        <Panel title="Administrator accounts" noPad>
          <Table head={['Account', 'Role', 'Status', 'Last sign-in', 'Password changed']}
            rows={s.security.admins.map((a) => [<span key="e" className="font-medium text-slate-800">{a.email}</span>, a.adminLevel === 'OWNER' ? <Pill key="r" tone="violet">Owner</Pill> : <Pill key="r" tone="blue">Admin</Pill>,
              <UserStatusPill key="s" status={a.status} />, a.lastLoginAt ? timeAgo(a.lastLoginAt) : 'Never',
              a.mustChangePassword ? <Pill key="p" tone="amber">Temporary password</Pill> : a.passwordChangedAt ? timeAgo(a.passwordChangedAt) : '–'])} />
        </Panel>
      </div>
    )}</Section>
  );
}

function AnalyticsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = TABS.some((t) => t.value === sp.get('tab')) ? (sp.get('tab') as string) : 'growth';
  const [days, setDays] = useState('30');
  return (
    <div className="space-y-5">
      <PageHead eyebrow="Insights" title="Analytics" description="Every number is calculated live from the platform database."
        actions={tab !== 'system' ? <Segmented value={days} onChange={setDays} options={RANGES} /> : undefined} />
      <div className="flex overflow-x-auto"><Segmented value={tab} onChange={(v) => router.replace(`/admin/analytics?tab=${v}`)} options={TABS} /></div>
      {tab === 'growth' && <GrowthTab days={days} />}
      {tab === 'marketplace' && <MarketTab days={days} />}
      {tab === 'hiring' && <HiringTab days={days} />}
      {tab === 'engagement' && <EngagementTab days={days} />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
}

export default function AnalyticsPage() {
  return <Suspense><AnalyticsInner /></Suspense>;
}
