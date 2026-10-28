'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  PENDING: '#94a3b8', REVIEWING: '#0025B8', SHORTLISTED: '#8b5cf6',
  INTERVIEW: '#0F9DE4', REJECTED: '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', REVIEWING: 'Reviewing', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', REJECTED: 'Rejected',
};

function ChartCard({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-7 shadow-xl space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-base tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis]            = useState<AnalyticsKpis | null>(null);
  const [trend, setTrend]          = useState<TrendPoint[]>([]);
  const [funnel, setFunnel]        = useState<FunnelStage[]>([]);
  const [jobPerf, setJobPerf]      = useState<JobPerformanceRow[]>([]);
  const [statusDist, setStatusDist] = useState<StatusDistItem[]>([]);
  const [insights, setInsights]   = useState<Insights | null>(null);

  // Footer eka hide kirima me page ekedi
  useEffect(() => {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
      footerElement.style.display = 'none';
    }
    return () => {
      if (footerElement) {
        footerElement.style.display = '';
      }
    };
  }, []);

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
    <div className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Analytics & Performance Reports"
          description="Track recruitment metrics, hiring efficiency, and job performance."
          actions={
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-xs font-bold border border-sky-200 rounded-2xl px-4 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer shadow-xs"
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          }
        />
      </motion.div>

      {/* KPI Cards Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard label="Total Applications"  value={kpis?.totalApplications ?? '—'} icon={FileText}    iconColor="indigo" />
        <StatCard label="Total Hired"          value={kpis?.totalHired ?? '—'}         icon={UserCheck}   iconColor="green" />
        <StatCard label="Interview Success"    value={kpis ? `${kpis.interviewSuccessRate}%` : '—'} icon={Percent}    iconColor="purple" />
        <StatCard label="Avg Time to Hire"     value={kpis ? `${kpis.avgTimeToHire}d` : '—'}          icon={Clock}      iconColor="amber" />
      </motion.div>

      {/* Trend & Distribution Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Applications trend (8 Columns) */}
        <div className="lg:col-span-8">
          <ChartCard title="Applications Trend" subtitle="Daily applications received">
            {loading ? <div className="h-64 bg-sky-50/60 rounded-2xl animate-pulse" /> : trend.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No data yet" description="Applications will appear here once candidates start applying." />
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F9DE4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#0025B8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#0025B8" strokeWidth={2.5} fill="url(#trendFill)" name="Applications" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Status distribution donut (4 Columns) */}
        <div className="lg:col-span-4">
          <ChartCard title="Application Status" subtitle="Current pipeline distribution">
            {loading ? <div className="h-64 bg-sky-50/60 rounded-2xl animate-pulse" /> : pieData.length === 0 ? (
              <EmptyState icon={FileText} title="No applications" description="Status breakdown will show up here." />
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#0F9DE4'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </motion.div>

      {/* Funnel & Job Performance Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Hiring funnel (4 Columns) */}
        <div className="lg:col-span-4">
          <ChartCard title="Hiring Funnel" subtitle={PERIODS.find(p => p.value === period)?.label}>
            {loading ? <div className="h-56 bg-sky-50/60 rounded-2xl animate-pulse" /> : (
              <div className="space-y-4 pt-2">
                {funnel.map((step, idx) => (
                  <div key={step.stage} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">{step.stage}</span>
                      <span className="font-extrabold text-[#0025B8]">
                        {step.value} <span className="text-slate-400 font-normal">({maxFunnel ? Math.round((step.value / maxFunnel) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-sky-50 rounded-full overflow-hidden p-0.5 border border-sky-100/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${maxFunnel ? (step.value / maxFunnel) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * idx }}
                        className="h-full bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Job performance bar (8 Columns) */}
        <div className="lg:col-span-8">
          <ChartCard title="Top Performing Job Posts" subtitle="Applications vs hires by job">
            {loading ? <div className="h-56 bg-sky-50/60 rounded-2xl animate-pulse" /> : jobPerf.length === 0 ? (
              <EmptyState icon={Briefcase} title="No jobs posted" description="Post a job to see performance data here." />
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={jobPerf} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <YAxis dataKey="title" type="category" width={130} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bae6fd', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: '8px' }} />
                    <Bar dataKey="applications" fill="#bae6fd" radius={[0, 8, 8, 0]} name="Applications" barSize={12} />
                    <Bar dataKey="hired" fill="#0025B8" radius={[0, 8, 8, 0]} name="Hired" barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </motion.div>

      {/* Recruitment Insights Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-xl space-y-2">
          <p className="text-[10px] font-bold text-[#0F9DE4] uppercase tracking-wider">Top Performing Job</p>
          {insights?.topJob ? (
            <>
              <p className="text-base font-bold text-slate-900">{insights.topJob.title}</p>
              <p className="text-xs text-slate-500 font-medium">{insights.topJob.applications} total applications received</p>
            </>
          ) : <p className="text-xs text-slate-400 font-medium">No data available</p>}
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-xl space-y-2">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Needs Attention</p>
          {insights?.lowestJob ? (
            <>
              <p className="text-base font-bold text-slate-900">{insights.lowestJob.title}</p>
              <p className="text-xs text-slate-500 font-medium">Only {insights.lowestJob.applications} applications so far</p>
            </>
          ) : <p className="text-xs text-slate-400 font-medium">No data available</p>}
        </div>
      </motion.div>

    </div>
  );
}