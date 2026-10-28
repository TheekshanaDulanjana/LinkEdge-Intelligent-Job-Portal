'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, Line, ComposedChart, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Briefcase, FileText, UserCheck, Percent, TrendingUp, Timer, Hourglass, Star, Filter, Activity, Trophy, Lightbulb, Download, RefreshCw,
} from 'lucide-react';
import {
  fetchKpis, fetchTrend, fetchFunnel, fetchJobPerformance, fetchStatusDistribution, fetchInsights,
  AnalyticsKpis, TrendPoint, FunnelStage, JobPerformanceRow, StatusDistItem, Insights,
} from '@/lib/analytics';
import {
  Panel, KpiTile, EmptyNote, ErrorNote, PanelSkeleton, Pill, cx, fmtNum,
} from '@/components/enterprise/dashboard/primitives';
import { PageHead, Segmented, JobStatusPill, useHideFooter, btnSecondary, thCls, tdCls } from '@/components/enterprise/dashboard/kit';

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: 'This year' },
];
const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: '#94a3b8' },
  REVIEWING: { label: 'Reviewing', color: '#0025B8' },
  SHORTLISTED: { label: 'Shortlisted', color: '#7c3aed' },
  INTERVIEW: { label: 'Interview', color: '#0F9DE4' },
  REJECTED: { label: 'Rejected', color: '#e11d48' },
};
const tip = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,.08)' };

type Slice<T> = { data: T; error: boolean };

export default function AnalyticsPage() {
  useHideFooter();
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Slice<AnalyticsKpis | null>>({ data: null, error: false });
  const [trend, setTrend] = useState<Slice<TrendPoint[]>>({ data: [], error: false });
  const [funnel, setFunnel] = useState<Slice<FunnelStage[]>>({ data: [], error: false });
  const [perf, setPerf] = useState<Slice<JobPerformanceRow[]>>({ data: [], error: false });
  const [dist, setDist] = useState<Slice<StatusDistItem[]>>({ data: [], error: false });
  const [insights, setInsights] = useState<Slice<Insights | null>>({ data: null, error: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [k, t, f, p, d, i] = await Promise.allSettled([
      fetchKpis(period), fetchTrend(period), fetchFunnel(period), fetchJobPerformance(), fetchStatusDistribution(), fetchInsights(),
    ]);
    const s = <T,>(r: PromiseSettledResult<T>, fb: T): Slice<T> => (r.status === 'fulfilled' ? { data: r.value, error: false } : { data: fb, error: true });
    setKpis(s(k, null)); setTrend(s(t, [])); setFunnel(s(f, [])); setPerf(s(p, [])); setDist(s(d, [])); setInsights(s(i, null));
    setLoading(false);
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const trendData = useMemo(() => {
    const arr = trend.data;
    return arr.map((p, i) => {
      const win = arr.slice(Math.max(0, i - 6), i + 1);
      return { ...p, avg: +(win.reduce((a, b) => a + b.count, 0) / win.length).toFixed(2) };
    });
  }, [trend.data]);
  const trendStats = useMemo(() => {
    const c = trend.data.map(p => p.count);
    const total = c.reduce((a, b) => a + b, 0);
    const peak = trend.data.reduce<TrendPoint | null>((m, p) => (!m || p.count > m.count ? p : m), null);
    return { total, avg: c.length ? total / c.length : 0, peak };
  }, [trend.data]);

  const distTotal = dist.data.reduce((a, b) => a + b.count, 0);
  const top = funnel.data[0]?.value || 0;
  const funnelRows = funnel.data.map((r, i) => {
    const prev = i === 0 ? r.value : funnel.data[i - 1].value;
    return { ...r, ofTop: top ? (r.value / top) * 100 : 0, step: prev ? (r.value / prev) * 100 : 0 };
  });
  const perfSorted = useMemo(() => [...perf.data].sort((a, b) => b.applications - a.applications), [perf.data]);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const L: string[] = [`Analytics report,${esc(period)},${esc(new Date().toLocaleString())}`, '', 'KPI,Value'];
    if (kpis.data) Object.entries(kpis.data).forEach(([k, v]) => L.push(`${esc(k)},${esc(v)}`));
    L.push('', 'Funnel stage,Candidates'); funnel.data.forEach(f => L.push(`${esc(f.stage)},${esc(f.value)}`));
    L.push('', 'Status,Count'); dist.data.forEach(x => L.push(`${esc(x.status)},${esc(x.count)}`));
    L.push('', 'Job,Status,Applications,Hired'); perf.data.forEach(j => L.push(`${esc(j.title)},${esc(j.status)},${esc(j.applications)},${esc(j.hired)}`));
    L.push('', 'Date,Applications'); trend.data.forEach(x => L.push(`${esc(x.date)},${esc(x.count)}`));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const k = kpis.data;
  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        eyebrow="Insights"
        title="Analytics"
        description="Hiring volume, funnel conversion and how each posting performs. All figures come from your live applications."
        actions={<>
          <Segmented value={period} onChange={setPeriod} options={PERIODS} />
          <button onClick={load} className={btnSecondary}><RefreshCw className={cx('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh</button>
          <button onClick={exportCsv} disabled={loading} className={btnSecondary}><Download className="w-3.5 h-3.5" /> Export report</button>
        </>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiTile label="Jobs" icon={<Briefcase className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.totalJobs)} hint="Posted" />
        <KpiTile label="Applications" icon={<FileText className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.totalApplications)} hint="In period" />
        <KpiTile label="Hired" icon={<UserCheck className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.totalHired)} hint="In period" />
        <KpiTile label="Interview success" icon={<Percent className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.interviewSuccessRate, 1)} unit="%" />
        <KpiTile label="Offer acceptance" icon={<Star className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.offerAcceptanceRate, 1)} unit="%" />
        <KpiTile label="Time to hire" icon={<Timer className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.avgTimeToHire, 1)} unit="d" />
        <KpiTile label="Time to fill" icon={<Hourglass className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(k?.avgTimeToFill, 1)} unit="d" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Application volume" subtitle="Daily applications with a 7-day average" icon={<TrendingUp className="w-3.5 h-3.5" />}
          actions={<>
            <Pill tone="slate">Total {fmtNum(trendStats.total)}</Pill>
            <Pill tone="blue">Avg {fmtNum(trendStats.avg, 1)}/day</Pill>
            {trendStats.peak && trendStats.peak.count > 0 && <Pill tone="green">Peak {trendStats.peak.count}</Pill>}
          </>}>
          {loading ? <PanelSkeleton rows={7} /> : trend.error ? <ErrorNote onRetry={load} /> : trendData.length === 0 ? <EmptyNote text="No applications in this period." /> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F9DE4" stopOpacity={0.25} /><stop offset="100%" stopColor="#0F9DE4" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={28}
                    tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tip} labelFormatter={d => new Date(String(d)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="#0F9DE4" strokeWidth={1.5} fill="url(#av)" />
                  <Line type="monotone" dataKey="avg" name="7-day average" stroke="#0025B8" strokeWidth={2.2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-4" title="Pipeline status" subtitle={`${fmtNum(distTotal)} applications`} icon={<Activity className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={6} /> : dist.error ? <ErrorNote onRetry={load} /> : distTotal === 0 ? <EmptyNote text="No applications yet." /> : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-[170px] h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dist.data.filter(d => d.count > 0)} dataKey="count" nameKey="status" innerRadius={58} outerRadius={80} paddingAngle={2} stroke="none">
                      {dist.data.filter(d => d.count > 0).map(d => <Cell key={d.status} fill={STATUS_META[d.status]?.color ?? '#cbd5e1'} />)}
                    </Pie>
                    <Tooltip contentStyle={tip} formatter={(v, n) => [`${v}`, STATUS_META[String(n)]?.label ?? String(n)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-2xl font-semibold text-slate-900 tabular-nums">{fmtNum(distTotal)}</span><span className="text-[10px] uppercase tracking-wide text-slate-400">Total</span></div>
              </div>
              <ul className="w-full space-y-1.5">
                {dist.data.map(d => (
                  <li key={d.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[d.status]?.color ?? '#cbd5e1' }} />{STATUS_META[d.status]?.label ?? d.status}</span>
                    <span className="tabular-nums text-slate-500"><b className="text-slate-900">{fmtNum(d.count)}</b><span className="ml-1.5 text-[11px]">{Math.round((d.count / distTotal) * 100)}%</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-5" title="Hiring funnel" subtitle="Stage conversion" icon={<Filter className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={5} /> : funnel.error ? <ErrorNote onRetry={load} /> : funnelRows.length === 0 ? <EmptyNote text="Funnel appears when applications arrive." /> : (
            <div className="space-y-4">
              {funnelRows.map((r, i) => (
                <div key={r.stage}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{r.stage}</span>
                    <span className="tabular-nums text-slate-500"><b className="text-slate-900">{fmtNum(r.value)}</b>{i > 0 && <span className="ml-2 text-[11px]">{fmtNum(r.step, 0)}% of previous · {fmtNum(r.ofTop, 0)}% of top</span>}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] transition-all duration-700" style={{ width: `${Math.max(r.ofTop, r.value > 0 ? 2 : 0)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-7" title="Applications vs hires by job" subtitle="Top 8 postings" icon={<Trophy className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={6} /> : perf.error ? <ErrorNote onRetry={load} /> : perfSorted.length === 0 ? <EmptyNote text="Post a job to see performance." /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfSorted.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="title" type="category" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tip} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="applications" name="Applications" fill="#bae6fd" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="hired" name="Hired" fill="#0025B8" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8" title="Job performance" subtitle="Conversion from application to hire" icon={<Briefcase className="w-3.5 h-3.5" />} noPad>
          {loading ? <div className="p-5"><PanelSkeleton rows={5} /></div> : perfSorted.length === 0 ? <EmptyNote text="No jobs yet." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr><th className={thCls}>Job</th><th className={thCls}>Status</th><th className={cx(thCls, 'text-right')}>Applications</th><th className={cx(thCls, 'text-right')}>Hired</th><th className={cx(thCls, 'w-44')}>Hire rate</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {perfSorted.map(j => {
                    const rate = j.applications ? (j.hired / j.applications) * 100 : 0;
                    return (
                      <tr key={j.title + j.status} className="hover:bg-slate-50/70">
                        <td className={cx(tdCls, 'font-semibold text-slate-800 text-[13px]')}>{j.title}</td>
                        <td className={tdCls}><JobStatusPill status={j.status} /></td>
                        <td className={cx(tdCls, 'text-right tabular-nums')}>{fmtNum(j.applications)}</td>
                        <td className={cx(tdCls, 'text-right tabular-nums')}>{fmtNum(j.hired)}</td>
                        <td className={tdCls}><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(rate, 100)}%` }} /></div><span className="tabular-nums text-slate-500 w-10 text-right">{fmtNum(rate, 0)}%</span></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-4" title="Insights" subtitle="Computed from your postings" icon={<Lightbulb className="w-3.5 h-3.5" />}>
          {loading ? <PanelSkeleton rows={4} /> : insights.error ? <ErrorNote onRetry={load} /> : !insights.data?.topJob ? <EmptyNote text="Insights appear once jobs receive applications." /> : (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3.5 py-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-emerald-700">Most applied job</p><p className="text-[13px] font-semibold text-slate-800 mt-0.5">{insights.data.topJob.title}</p><p className="text-[11px] text-slate-500">{fmtNum(insights.data.topJob.applications)} applications</p></div>
              {insights.data.lowestJob && insights.data.lowestJob.title !== insights.data.topJob.title && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3.5 py-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-700">Needs attention</p><p className="text-[13px] font-semibold text-slate-800 mt-0.5">{insights.data.lowestJob.title}</p><p className="text-[11px] text-slate-500">Only {fmtNum(insights.data.lowestJob.applications)} applications. Review the title, skills and salary range.</p></div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
