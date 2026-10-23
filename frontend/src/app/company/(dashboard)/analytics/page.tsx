'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Briefcase, FileText, UserCheck, Percent, TrendingUp, Clock, Calendar as CalendarIcon,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  fetchKpis, fetchTrend, fetchFunnel, fetchJobPerformance, fetchStatusDistribution, fetchInsights,
  AnalyticsKpis, TrendPoint, FunnelStage, JobPerformanceRow, StatusDistItem, Insights,
} from '@/lib/analytics';

const PERIODS = [
  { value: '7d',  label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#94a3b8', REVIEWING: '#3b82f6', SHORTLISTED: '#8b5cf6',
  INTERVIEW: '#f59e0b', REJECTED: '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', REVIEWING: 'Reviewing', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', REJECTED: 'Rejected',
};

function ChartCard({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis]           = useState<AnalyticsKpis | null>(null);
  const [trend, setTrend]         = useState<TrendPoint[]>([]);
  const [funnel, setFunnel]       = useState<FunnelStage[]>([]);
  const [jobPerf, setJobPerf]     = useState<JobPerformanceRow[]>([]);
  const [statusDist, setStatusDist] = useState<StatusDistItem[]>([]);
  const [insights, setInsights]   = useState<Insights | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchKpis(period),
      fetchTrend(period),
      fetchFunnel(period),
      fetchJobPerformance(),
      fetchStatusDistribution(),
      fetchInsights(),
    ]).then(([k, t, f, jp, sd, ins]) => {
      setKpis(k); setTrend(t); setFunnel(f); setJobPerf(jp); setStatusDist(sd); setInsights(ins);
    }).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  const pieData = statusDist
    .filter(s => s.count > 0)
    .map(s => ({ name: STATUS_LABELS[s.status] ?? s.status, value: s.count, key: s.status }));

  const maxFunnel = funnel.length ? funnel[0].value : 1;

  return (
    <div>
      <PageHeader
        title="Analytics & Performance Reports"
        description="Track recruitment metrics, hiring efficiency, and job performance."
        actions={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white"
          >
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Applications"  value={kpis?.totalApplications ?? '—'} icon={FileText}   iconColor="indigo" />
        <StatCard label="Total Hired"          value={kpis?.totalHired ?? '—'}        icon={UserCheck}  iconColor="green" />
        <StatCard label="Interview Success"    value={kpis ? `${kpis.interviewSuccessRate}%` : '—'} icon={Percent}    iconColor="purple" />
        <StatCard label="Avg Time to Hire"     value={kpis ? `${kpis.avgTimeToHire}d` : '—'}          icon={Clock}      iconColor="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Applications trend */}
        <div className="lg:col-span-2">
          <ChartCard title="Applications Trend" subtitle="Daily applications received">
            {loading ? <div className="h-64 bg-gray-50 rounded-lg animate-pulse" /> : trend.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No data yet" description="Applications will appear here once candidates start applying." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#trendFill)" name="Applications" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Status distribution donut */}
        <ChartCard title="Application Status" subtitle="Current pipeline distribution">
          {loading ? <div className="h-64 bg-gray-50 rounded-lg animate-pulse" /> : pieData.length === 0 ? (
            <EmptyState icon={FileText} title="No applications" description="Status breakdown will show up here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Hiring funnel */}
        <ChartCard title="Hiring Funnel" subtitle={PERIODS.find(p => p.value === period)?.label}>
          {loading ? <div className="h-56 bg-gray-50 rounded-lg animate-pulse" /> : (
            <div className="space-y-3">
              {funnel.map(step => (
                <div key={step.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{step.stage}</span>
                    <span className="font-medium text-gray-700">
                      {step.value} ({maxFunnel ? Math.round((step.value / maxFunnel) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${maxFunnel ? (step.value / maxFunnel) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Job performance bar */}
        <div className="lg:col-span-2">
          <ChartCard title="Top Performing Job Posts" subtitle="Applications vs hires by job">
            {loading ? <div className="h-56 bg-gray-50 rounded-lg animate-pulse" /> : jobPerf.length === 0 ? (
              <EmptyState icon={Briefcase} title="No jobs posted" description="Post a job to see performance data here." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={jobPerf} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="title" type="category" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#a5b4fc" radius={[0, 4, 4, 0]} name="Applications" />
                  <Bar dataKey="hired" fill="#6366f1" radius={[0, 4, 4, 0]} name="Hired" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Recruitment Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top Performing Job</p>
          {insights?.topJob ? (
            <>
              <p className="text-lg font-semibold text-gray-900">{insights.topJob.title}</p>
              <p className="text-sm text-gray-500 mt-1">{insights.topJob.applications} applications received</p>
            </>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Needs Attention</p>
          {insights?.lowestJob ? (
            <>
              <p className="text-lg font-semibold text-gray-900">{insights.lowestJob.title}</p>
              <p className="text-sm text-gray-500 mt-1">Only {insights.lowestJob.applications} applications so far</p>
            </>
          ) : <p className="text-sm text-gray-400">No data available</p>}
        </div>
      </div>
    </div>
  );
}