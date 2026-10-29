'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Briefcase, FileText, CalendarCheck, UserCheck, Plus, Download, RefreshCw, Percent, Timer, Hourglass,
  TrendingUp, Filter, Users, Activity, CalendarDays, Trophy, Lightbulb, AlertTriangle, ArrowUpRight,
  Clock, MapPin, ChevronRight, Search, Zap, Star,
} from 'lucide-react';
import {
  fetchDashboardStats, fetchRecentActivity, DashboardStats,
} from '@/lib/dashboard';
import {
  fetchKpis, fetchTrend, fetchFunnel, fetchJobPerformance, fetchStatusDistribution, fetchInsights,
  AnalyticsKpis, TrendPoint, FunnelStage, JobPerformanceRow, StatusDistItem, Insights,
} from '@/lib/analytics';
import { fetchCompanyJobs, fetchJobsSummary, JobRow, JobsSummary } from '@/lib/jobs';
import {
  fetchCandidates, fetchCandidatesSummary, fetchCandidateProfile, CandidateRow, CandidatesSummary,
} from '@/lib/candidates';
import { fetchCalendarEvents, CalendarEvent } from '@/lib/calendar';
import {
  Panel, PanelSkeleton, EmptyNote, ErrorNote, KpiTile, ScoreRing, Pill, cx, fmtNum, relTime, daysLeft,
} from '@/components/enterprise/dashboard/primitives';

/* ------------------------------------------------------------------ */
/* constants                                                            */
/* ------------------------------------------------------------------ */
const PERIODS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'year', label: 'YTD' },
];

const STATUS_META: Record<string, { label: string; color: string; tone: 'slate' | 'blue' | 'violet' | 'sky' | 'rose' }> = {
  PENDING:     { label: 'Pending',     color: '#94a3b8', tone: 'slate' },
  REVIEWING:   { label: 'Reviewing',   color: '#0063CE', tone: 'blue' },
  SHORTLISTED: { label: 'Shortlisted', color: '#7c3aed', tone: 'violet' },
  INTERVIEW:   { label: 'Interview',   color: '#0084DA', tone: 'sky' },
  REJECTED:    { label: 'Rejected',    color: '#e11d48', tone: 'rose' },
};

const EVENT_META: Record<string, { label: string; tone: 'sky' | 'blue' | 'amber' | 'slate' }> = {
  INTERVIEW: { label: 'Interview', tone: 'sky' },
  MEETING:   { label: 'Meeting',   tone: 'blue' },
  DEADLINE:  { label: 'Deadline',  tone: 'amber' },
  REMINDER:  { label: 'Reminder',  tone: 'slate' },
};

const JOB_TABS = ['ALL', 'ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT'] as const;
const AUTO_REFRESH_MS = 60_000;

type Slice<T> = { data: T; error: boolean };

/* ------------------------------------------------------------------ */
/* page                                                                 */
/* ------------------------------------------------------------------ */
export default function CompanyDashboardPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [stats, setStats] = useState<Slice<DashboardStats | null>>({ data: null, error: false });
  const [activity, setActivity] = useState<Slice<Array<{ id: string; message: string; timestamp: string }>>>({ data: [], error: false });
  const [kpis, setKpis] = useState<Slice<AnalyticsKpis | null>>({ data: null, error: false });
  const [trend, setTrend] = useState<Slice<TrendPoint[]>>({ data: [], error: false });
  const [funnel, setFunnel] = useState<Slice<FunnelStage[]>>({ data: [], error: false });
  const [jobPerf, setJobPerf] = useState<Slice<JobPerformanceRow[]>>({ data: [], error: false });
  const [statusDist, setStatusDist] = useState<Slice<StatusDistItem[]>>({ data: [], error: false });
  const [insights, setInsights] = useState<Slice<Insights | null>>({ data: null, error: false });
  const [jobs, setJobs] = useState<Slice<JobRow[]>>({ data: [], error: false });
  const [jobsSummary, setJobsSummary] = useState<Slice<JobsSummary | null>>({ data: null, error: false });
  const [candSummary, setCandSummary] = useState<Slice<CandidatesSummary | null>>({ data: null, error: false });
  const [candidates, setCandidates] = useState<Slice<CandidateRow[]>>({ data: [], error: false });
  const [names, setNames] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Slice<CalendarEvent[]>>({ data: [], error: false });

  const [jobTab, setJobTab] = useState<(typeof JOB_TABS)[number]>('ALL');
  const [jobSearch, setJobSearch] = useState('');
  const mounted = useRef(true);

  // The dashboard is a full-height workspace, so the public footer is hidden here.
  useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null;
    if (footer) footer.style.display = 'none';
    return () => { if (footer) footer.style.display = ''; };
  }, []);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);

    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(to.getDate() + 8);

    const [
      rStats, rAct, rKpis, rTrend, rFunnel, rPerf, rDist, rIns, rJobs, rJobsSum, rCandSum, rCands, rEvents,
    ] = await Promise.allSettled([
      fetchDashboardStats(),
      fetchRecentActivity(),
      fetchKpis(period),
      fetchTrend(period),
      fetchFunnel(period),
      fetchJobPerformance(),
      fetchStatusDistribution(),
      fetchInsights(),
      fetchCompanyJobs({ page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' }),
      fetchJobsSummary(),
      fetchCandidatesSummary(),
      fetchCandidates({ page: 1 }),
      fetchCalendarEvents(from, to),
    ]);
    if (!mounted.current) return;

    const slice = <T,>(r: PromiseSettledResult<T>, fallback: T): Slice<T> =>
      r.status === 'fulfilled' ? { data: r.value, error: false } : { data: fallback, error: true };

    setStats(slice(rStats, null));
    setActivity(slice(rAct, []));
    setKpis(slice(rKpis, null));
    setTrend(slice(rTrend, []));
    setFunnel(slice(rFunnel, []));
    setJobPerf(slice(rPerf, []));
    setStatusDist(slice(rDist, []));
    setInsights(slice(rIns, null));
    setJobs(rJobs.status === 'fulfilled' ? { data: rJobs.value.jobs, error: false } : { data: [], error: true });
    setJobsSummary(slice(rJobsSum, null));
    setCandSummary(slice(rCandSum, null));
    setCandidates(rCands.status === 'fulfilled' ? { data: rCands.value.candidates, error: false } : { data: [], error: true });
    setEvents(slice(rEvents, []));
    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);

    // Names for the top candidates (profiles live in the auth service).
    if (rCands.status === 'fulfilled') {
      const top = [...rCands.value.candidates]
        .sort((a, b) => scoreOf(b) - scoreOf(a))
        .slice(0, 6);
      const profiles = await Promise.allSettled(top.map(c => fetchCandidateProfile(c.seekerId)));
      if (!mounted.current) return;
      const map: Record<string, string> = {};
      profiles.forEach((p, i) => {
        if (p.status === 'fulfilled' && p.value?.profile?.fullName) map[top[i].seekerId] = p.value.profile.fullName;
      });
      setNames(map);
    }
  }, [period]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  /* ---------------- derived data ---------------- */
  const trendData = useMemo(
    () => trend.data.map(p => ({ ...p, label: new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })),
    [trend.data],
  );
  const trendTotals = useMemo(() => {
    const counts = trend.data.map(p => p.count);
    const total = counts.reduce((a, b) => a + b, 0);
    const peak = trend.data.reduce<TrendPoint | null>((m, p) => (!m || p.count > m.count ? p : m), null);
    const half = Math.floor(counts.length / 2);
    const first = counts.slice(0, half).reduce((a, b) => a + b, 0);
    const second = counts.slice(half).reduce((a, b) => a + b, 0);
    const change = first > 0 ? Math.round(((second - first) / first) * 100) : null;
    return { total, avg: counts.length ? total / counts.length : 0, peak, change };
  }, [trend.data]);

  const funnelRows = useMemo(() => {
    const rows = funnel.data;
    const top = rows[0]?.value || 0;
    return rows.map((r, i) => {
      const prev = i === 0 ? r.value : rows[i - 1].value;
      return {
        ...r,
        pctOfTop: top ? (r.value / top) * 100 : 0,
        stepConv: prev ? (r.value / prev) * 100 : 0,
        drop: i === 0 ? 0 : Math.max(prev - r.value, 0),
      };
    });
  }, [funnel.data]);

  const distTotal = statusDist.data.reduce((a, b) => a + b.count, 0);

  const jobsView = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    return jobs.data.filter(j =>
      (jobTab === 'ALL' || j.status === jobTab) &&
      (!q || j.title.toLowerCase().includes(q) || (j.location ?? '').toLowerCase().includes(q)));
  }, [jobs.data, jobTab, jobSearch]);
  const maxApps = Math.max(1, ...jobs.data.map(j => j.applicationCount));

  const attention = useMemo(() => {
    const items: Array<{ key: string; label: string; count: number; tone: 'rose' | 'amber' | 'blue' | 'sky'; href: string; hint: string }> = [];
    const todayInterviews = candSummary.data?.interviewsToday ?? stats.data?.kpis.interviewsToday ?? 0;
    items.push({ key: 'int', label: 'Interviews today', count: todayInterviews, tone: 'sky', href: '/company/calendar',
      hint: jobsSummary.data?.nextInterviewTime ? `Next at ${new Date(jobsSummary.data.nextInterviewTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Open the calendar' });
    items.push({ key: 'new', label: 'New applicants today', count: candSummary.data?.newToday ?? 0, tone: 'blue', href: '/company/candidates', hint: 'Not yet looked at' });
    items.push({ key: 'rev', label: 'Awaiting review', count: candSummary.data?.underReview ?? 0, tone: 'amber', href: '/company/candidates', hint: 'Run Smart Rank to sort them' });
    const closing = jobs.data.filter(j => j.status === 'ACTIVE' && (daysLeft(j.deadline) ?? 99) <= 7 && (daysLeft(j.deadline) ?? -1) >= 0).length;
    items.push({ key: 'close', label: 'Jobs closing within 7 days', count: closing, tone: 'rose', href: '/company/jobs', hint: 'Extend or review applicants' });
    const empty = jobs.data.filter(j => j.status === 'ACTIVE' && j.applicationCount === 0).length;
    items.push({ key: 'empty', label: 'Active jobs with no applicants', count: empty, tone: 'amber', href: '/company/jobs', hint: 'Check title, skills and salary' });
    return items;
  }, [candSummary.data, stats.data, jobs.data, jobsSummary.data]);

  const topCandidates = useMemo(
    () => [...candidates.data].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 6),
    [candidates.data],
  );

  const eventsByDay = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    [...events.data]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .forEach(e => {
        const k = new Date(e.startTime).toDateString();
        groups.set(k, [...(groups.get(k) ?? []), e]);
      });
    return Array.from(groups.entries());
  }, [events.data]);

  const sparkApps = trend.data.map(p => p.count);

  /* ---------------- export ---------------- */
  function exportCsv() {
    const lines: string[] = [];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push(`SkillSync recruitment report,${esc(new Date().toLocaleString())},Period,${period}`);
    lines.push('');
    lines.push('KPI,Value');
    if (kpis.data) Object.entries(kpis.data).forEach(([k, v]) => lines.push(`${esc(k)},${esc(v)}`));
    lines.push('');
    lines.push('Funnel stage,Candidates');
    funnel.data.forEach(f => lines.push(`${esc(f.stage)},${esc(f.value)}`));
    lines.push('');
    lines.push('Status,Count');
    statusDist.data.forEach(s => lines.push(`${esc(s.status)},${esc(s.count)}`));
    lines.push('');
    lines.push('Job,Status,Applications,Hired');
    jobPerf.data.forEach(j => lines.push(`${esc(j.title)},${esc(j.status)},${esc(j.applications)},${esc(j.hired)}`));
    lines.push('');
    lines.push('Date,Applications');
    trend.data.forEach(t => lines.push(`${esc(t.date)},${esc(t.count)}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillsync-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- render ---------------- */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      {/* ===== Toolbar ===== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{greeting} · Recruitment operations</p>
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight mt-0.5">Command centre</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className={cx('inline-block w-1.5 h-1.5 rounded-full', autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Loading live data'}
            <button onClick={() => setAutoRefresh(v => !v)} className="text-[#0063CE] font-semibold hover:underline cursor-pointer">
              {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={cx('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                  period === p.value ? 'bg-[#0063CE] text-white shadow-sm' : 'text-slate-600 hover:text-slate-800')}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="h-9 px-3 inline-flex items-center gap-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-60">
            <RefreshCw className={cx('w-3.5 h-3.5', refreshing && 'animate-spin')} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={loading}
            className="h-9 px-3 inline-flex items-center gap-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-60">
            <Download className="w-3.5 h-3.5" /> Export report
          </button>
          <Link href="/company/post-job"
            className="h-9 px-4 inline-flex items-center gap-2 text-xs font-semibold rounded-lg bg-[#0063CE] text-white hover:bg-[#0052AB] shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Post job
          </Link>
        </div>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Active jobs" icon={<Briefcase className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(stats.data?.kpis.totalActiveJobs ?? jobsSummary.data?.totalActiveJobs)}
          delta={jobsSummary.data ? { value: jobsSummary.data.newJobsThisWeek, label: 'new this week' } : null} href="/company/jobs" />
        <KpiTile label="Applications" icon={<FileText className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(stats.data?.kpis.totalApplications ?? jobsSummary.data?.totalApplications)}
          delta={jobsSummary.data ? { value: jobsSummary.data.newAppsThisWeek, label: 'new this week' } : null}
          spark={sparkApps} sparkColor="#0063CE" href="/company/candidates" />
        <KpiTile label="Interviews today" icon={<CalendarCheck className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(stats.data?.kpis.interviewsToday ?? candSummary.data?.interviewsToday)}
          hint={jobsSummary.data?.nextInterviewTime ? `Next ${new Date(jobsSummary.data.nextInterviewTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Nothing scheduled next'} href="/company/calendar" />
        <KpiTile label="Hired this month" icon={<UserCheck className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(stats.data?.kpis.hiredThisMonth)}
          delta={candSummary.data ? { value: candSummary.data.hiredThisWeek, label: 'this week' } : null} />
        <KpiTile label="Interview success" icon={<Percent className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(kpis.data?.interviewSuccessRate, 1)} unit="%" hint="Interviews that led forward" />
        <KpiTile label="Offer acceptance" icon={<Star className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(kpis.data?.offerAcceptanceRate, 1)} unit="%" hint="Offers accepted" />
        <KpiTile label="Avg time to hire" icon={<Timer className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(kpis.data?.avgTimeToHire, 1)} unit="days" hint="From application to hire" />
        <KpiTile label="Avg time to fill" icon={<Hourglass className="w-3.5 h-3.5" />} loading={loading}
          value={fmtNum(kpis.data?.avgTimeToFill, 1)} unit="days" hint="From job post to hire" />
      </div>

      {/* ===== Row: attention + trend ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-4" title="Action queue" subtitle="What needs you right now" icon={<Zap className="w-3.5 h-3.5" />} noPad>
          {loading ? <div className="p-5"><PanelSkeleton rows={5} /></div> : (
            <ul className="divide-y divide-slate-100">
              {attention.map(a => (
                <li key={a.key}>
                  <Link href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <span className={cx('w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold tabular-nums shrink-0',
                      a.count === 0 ? 'bg-slate-50 text-slate-300'
                        : a.tone === 'rose' ? 'bg-rose-50 text-rose-600'
                        : a.tone === 'amber' ? 'bg-amber-50 text-amber-700'
                        : a.tone === 'sky' ? 'bg-brand-50 text-brand-700' : 'bg-brand-50 text-brand-700')}>
                      {a.count}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-[13px] font-medium truncate', a.count === 0 ? 'text-slate-500' : 'text-slate-800')}>{a.label}</p>
                      <p className="text-xs text-slate-500 truncate">{a.count === 0 ? 'All clear' : a.hint}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="xl:col-span-8" title="Applications over time" subtitle={`Daily volume · ${PERIODS.find(p => p.value === period)?.label}`}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          actions={trendTotals.change !== null ? (
            <Pill tone={trendTotals.change >= 0 ? 'green' : 'rose'}>
              {trendTotals.change >= 0 ? '▲' : '▼'} {Math.abs(trendTotals.change)}% vs first half
            </Pill>
          ) : undefined}>
          {loading ? <PanelSkeleton rows={6} /> : trend.error ? <ErrorNote onRetry={() => load(true)} /> : trendData.length === 0 ? (
            <EmptyNote text="No applications in this period yet." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <MiniStat label="Total" value={fmtNum(trendTotals.total)} />
                <MiniStat label="Daily average" value={fmtNum(trendTotals.avg, 1)} />
                <MiniStat label="Peak day" value={trendTotals.peak ? `${trendTotals.peak.count}` : '–'}
                  sub={trendTotals.peak ? new Date(trendTotals.peak.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : undefined} />
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0063CE" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#0063CE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,.08)' }}
                      formatter={(v) => [`${v}`, 'Applications']} />
                    <Area type="monotone" dataKey="count" stroke="#0063CE" strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* ===== Row: funnel + pipeline + yield ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-5" title="Hiring funnel" subtitle="Conversion between stages" icon={<Filter className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={5} /> : funnel.error ? <ErrorNote onRetry={() => load(true)} /> : funnelRows.length === 0 ? (
            <EmptyNote text="Funnel data appears when applications arrive." />
          ) : (
            <div className="space-y-3.5">
              {funnelRows.map((r, i) => (
                <div key={r.stage}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{r.stage}</span>
                    <span className="tabular-nums text-slate-600">
                      <b className="text-slate-900 font-semibold">{fmtNum(r.value)}</b>
                      {i > 0 && <span className="ml-2 text-xs">{fmtNum(r.stepConv, 0)}% of previous</span>}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0063CE] to-[#0084DA] transition-all duration-700"
                      style={{ width: `${Math.max(r.pctOfTop, r.value > 0 ? 2 : 0)}%` }} />
                  </div>
                  {i > 0 && r.drop > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{fmtNum(r.drop)} dropped before this stage</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-3" title="Pipeline status" subtitle={`${fmtNum(distTotal)} applications in total`} icon={<Activity className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={5} /> : statusDist.error ? <ErrorNote onRetry={() => load(true)} /> : distTotal === 0 ? (
            <EmptyNote text="No applications yet." />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-[148px] h-[148px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist.data} dataKey="count" nameKey="status" innerRadius={50} outerRadius={70} paddingAngle={2} stroke="none">
                      {statusDist.data.map(s => <Cell key={s.status} fill={STATUS_META[s.status]?.color ?? '#cbd5e1'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      formatter={(v, n) => [`${v}`, STATUS_META[String(n)]?.label ?? String(n)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold text-slate-900 tabular-nums">{fmtNum(distTotal)}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                </div>
              </div>
              <ul className="w-full space-y-1.5">
                {statusDist.data.map(s => (
                  <li key={s.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[s.status]?.color ?? '#cbd5e1' }} />
                      {STATUS_META[s.status]?.label ?? s.status}
                    </span>
                    <span className="tabular-nums text-slate-600">
                      <b className="text-slate-900 font-semibold">{fmtNum(s.count)}</b>
                      <span className="ml-1.5 text-xs">{distTotal ? Math.round((s.count / distTotal) * 100) : 0}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-4" title="Hiring yield by job" subtitle="Applications and hires per posting" icon={<Trophy className="w-3.5 h-3.5" />} noPad>
          {loading ? <div className="p-5"><PanelSkeleton rows={5} /></div> : jobPerf.error ? <ErrorNote onRetry={() => load(true)} /> : jobPerf.data.length === 0 ? (
            <EmptyNote text="Post a job to start tracking yield." />
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[330px] overflow-y-auto">
              {[...jobPerf.data].sort((a, b) => b.applications - a.applications).slice(0, 8).map(j => {
                const max = Math.max(1, ...jobPerf.data.map(x => x.applications));
                const conv = j.applications ? (j.hired / j.applications) * 100 : 0;
                return (
                  <li key={j.title + j.status} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{j.title}</p>
                      <span className="text-xs tabular-nums text-slate-500 shrink-0">{j.hired} hired · {fmtNum(conv, 0)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#0063CE]" style={{ width: `${(j.applications / max) * 100}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{fmtNum(j.applications)} applications</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* ===== Row: jobs table + schedule ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Job postings" subtitle={`${jobs.data.length} postings · live from the job service`} icon={<Briefcase className="w-3.5 h-3.5" />}
          actions={<Link href="/company/jobs" className="text-xs font-semibold text-[#0063CE] hover:underline inline-flex items-center gap-1">Manage all <ArrowUpRight className="w-3 h-3" /></Link>}
          noPad>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
            <div className="flex gap-1 flex-wrap">
              {JOB_TABS.map(t => (
                <button key={t} onClick={() => setJobTab(t)}
                  className={cx('px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors',
                    jobTab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                  <span className="ml-1 opacity-60">{t === 'ALL' ? jobs.data.length : jobs.data.filter(j => j.status === t).length}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Filter by title or location"
                className="h-8 w-full sm:w-56 pl-8 pr-3 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0084DA]/25 focus:border-[#0084DA]" />
            </div>
          </div>
          {loading ? <div className="p-5"><PanelSkeleton rows={6} /></div> : jobs.error ? <ErrorNote onRetry={() => load(true)} /> : jobsView.length === 0 ? (
            <EmptyNote text="No postings match this filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70">
                    <th className="font-semibold px-5 py-2.5">Position</th>
                    <th className="font-semibold px-3 py-2.5">Status</th>
                    <th className="font-semibold px-3 py-2.5 w-44">Applicants</th>
                    <th className="font-semibold px-3 py-2.5">Deadline</th>
                    <th className="font-semibold px-5 py-2.5 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobsView.slice(0, 10).map(j => {
                    const dl = daysLeft(j.deadline);
                    return (
                      <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 text-[13px]">{j.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3" />{j.location || 'Location not set'}<span>·</span>{String(j.jobType ?? '').replace('_', ' ')}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={j.status === 'ACTIVE' ? 'green' : j.status === 'CLOSED' ? 'rose' : j.status === 'DRAFT' ? 'amber' : j.status === 'HIDDEN' ? 'rose' : 'slate'}>
                            {j.status === 'HIDDEN' ? 'Hidden by admin' : j.status.charAt(0) + j.status.slice(1).toLowerCase()}
                          </Pill>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#0063CE] to-[#0084DA]" style={{ width: `${(j.applicationCount / maxApps) * 100}%` }} />
                            </div>
                            <span className="tabular-nums font-semibold text-slate-700 w-7 text-right">{j.applicationCount}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {dl === null ? <span className="text-slate-300">–</span> : dl < 0 ? <Pill tone="slate">Ended</Pill>
                            : dl <= 3 ? <Pill tone="rose"><Clock className="w-3 h-3" />{dl}d left</Pill>
                            : dl <= 7 ? <Pill tone="amber"><Clock className="w-3 h-3" />{dl}d left</Pill>
                            : <span className="text-slate-600">{new Date(j.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/company/jobs/${j.id}/applicants`} className="text-xs font-semibold text-[#0063CE] hover:underline whitespace-nowrap">
                            Review applicants
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-4" title="Upcoming schedule" subtitle="Next 7 days" icon={<CalendarDays className="w-3.5 h-3.5" />}
          actions={<Link href="/company/calendar" className="text-xs font-semibold text-[#0063CE] hover:underline">Open calendar</Link>} noPad>
          {loading ? <div className="p-5"><PanelSkeleton rows={5} /></div> : events.error ? <ErrorNote onRetry={() => load(true)} /> : eventsByDay.length === 0 ? (
            <EmptyNote text="No interviews or events in the next 7 days." icon={<CalendarDays className="w-6 h-6" />} />
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {eventsByDay.map(([day, list]) => {
                const isToday = day === new Date().toDateString();
                return (
                  <div key={day}>
                    <p className={cx('sticky top-0 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide border-y border-slate-100',
                      isToday ? 'bg-[#0063CE]/5 text-[#0063CE]' : 'bg-slate-50 text-slate-500')}>
                      {isToday ? 'Today' : new Date(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {list.map(e => (
                        <li key={e.id} className="px-5 py-3 flex gap-3">
                          <div className="w-14 shrink-0 text-xs tabular-nums text-slate-600 leading-tight">
                            <p className="font-semibold text-slate-800">{new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p>{new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-slate-800 truncate">{e.title}</p>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <Pill tone={EVENT_META[e.eventType]?.tone ?? 'slate'}>{EVENT_META[e.eventType]?.label ?? e.eventType}</Pill>
                              {e.location && <span className="text-xs text-slate-500 truncate inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* ===== Row: top candidates + activity + insights ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Top candidates by score" subtitle="Best AI or ATS match among current applicants" icon={<Users className="w-3.5 h-3.5" />}
          actions={<Link href="/company/candidates" className="text-xs font-semibold text-[#0063CE] hover:underline inline-flex items-center gap-1">All candidates <ArrowUpRight className="w-3 h-3" /></Link>} noPad>
          {loading ? <div className="p-5"><PanelSkeleton rows={6} /></div> : candidates.error ? <ErrorNote onRetry={() => load(true)} /> : topCandidates.length === 0 ? (
            <EmptyNote text="Candidates appear here when people apply to your jobs." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70">
                    <th className="font-semibold px-5 py-2.5">Candidate</th>
                    <th className="font-semibold px-3 py-2.5">Applied for</th>
                    <th className="font-semibold px-3 py-2.5 text-center">AI</th>
                    <th className="font-semibold px-3 py-2.5 text-center">ATS</th>
                    <th className="font-semibold px-3 py-2.5">Stage</th>
                    <th className="font-semibold px-5 py-2.5">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topCandidates.map(c => {
                    const name = names[c.seekerId];
                    return (
                      <tr key={c.applicationId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0063CE] to-[#0084DA] text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {(name ?? '?').charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold text-slate-800 text-[13px]">{name ?? 'Loading name…'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{c.jobTitle}</td>
                        <td className="px-3 py-3"><div className="flex justify-center"><ScoreRing value={c.aiScore} /></div></td>
                        <td className="px-3 py-3"><div className="flex justify-center"><ScoreRing value={c.atsScore} /></div></td>
                        <td className="px-3 py-3"><Pill tone={STATUS_META[c.status]?.tone ?? 'slate'}>{STATUS_META[c.status]?.label ?? c.status}</Pill></td>
                        <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{relTime(c.appliedDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="xl:col-span-4 space-y-4">
          <Panel title="Insights" subtitle="Computed from your postings" icon={<Lightbulb className="w-3.5 h-3.5" />}>
            {loading ? <PanelSkeleton rows={3} /> : insights.error ? <ErrorNote onRetry={() => load(true)} /> : !insights.data?.topJob ? (
              <EmptyNote text="Insights appear once your jobs receive applications." />
            ) : (
              <div className="space-y-3">
                <InsightRow tone="green" label="Most applied job" title={insights.data.topJob.title} value={`${fmtNum(insights.data.topJob.applications)} applications`} />
                {insights.data.lowestJob && insights.data.lowestJob.title !== insights.data.topJob.title && (
                  <InsightRow tone="amber" label="Needs attention" title={insights.data.lowestJob.title} value={`${fmtNum(insights.data.lowestJob.applications)} applications`} />
                )}
              </div>
            )}
          </Panel>

          <Panel title="Recent activity" subtitle="Latest recruitment events" icon={<Activity className="w-3.5 h-3.5" />} noPad>
            {loading ? <div className="p-5"><PanelSkeleton rows={5} /></div> : activity.error ? <ErrorNote onRetry={() => load(true)} /> : activity.data.length === 0 ? (
              <EmptyNote text="No recent activity recorded." />
            ) : (
              <ol className="max-h-[300px] overflow-y-auto px-5 py-3">
                {activity.data.slice(0, 12).map((a, i, arr) => (
                  <li key={a.id} className="relative pl-5 pb-4 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute left-[3px] top-3 bottom-0 w-px bg-slate-200" />}
                    <span className="absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full bg-[#0084DA] ring-4 ring-brand-50" />
                    <p className="text-xs text-slate-700 leading-snug">{a.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{relTime(a.timestamp)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {(stats.error || kpis.error) && !loading && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Some figures could not be loaded. Check that the application service (port 3003) is running, then press Refresh.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* small local components                                               */
/* ------------------------------------------------------------------ */
function scoreOf(c: CandidateRow) {
  return Math.max(c.aiScore ?? -1, c.atsScore ?? -1);
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums leading-tight">{value}{sub && <span className="text-xs font-medium text-slate-500 ml-1.5">{sub}</span>}</p>
    </div>
  );
}

function InsightRow({ tone, label, title, value }: { tone: 'green' | 'amber'; label: string; title: string; value: string }) {
  return (
    <div className={cx('rounded-lg border px-3.5 py-3', tone === 'green' ? 'bg-emerald-50/60 border-emerald-100' : 'bg-amber-50/60 border-amber-100')}>
      <p className={cx('text-xs font-semibold uppercase tracking-wide', tone === 'green' ? 'text-emerald-700' : 'text-amber-700')}>{label}</p>
      <p className="text-[13px] font-semibold text-slate-800 mt-0.5 truncate">{title}</p>
      <p className="text-xs text-slate-600">{value}</p>
    </div>
  );
}
