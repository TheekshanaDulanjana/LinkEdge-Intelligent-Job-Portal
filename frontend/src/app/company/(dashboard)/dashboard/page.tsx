'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, FileText, CalendarCheck, UserCheck, Upload, Plus, MoreHorizontal, ArrowUpRight, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import DashboardSkeleton from '@/components/enterprise/skeletons/DashboardSkeleton';
import { Button } from '@/components/ui/button';
import { fetchDashboardStats, fetchRecentActivity, DashboardStats } from '@/lib/dashboard';

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(true);

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
    Promise.all([fetchDashboardStats(), fetchRecentActivity()])
      .then(([s, a]) => { setStats(s); setActivity(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!stats) return <p className="text-sm text-slate-400 p-6">Unable to load dashboard.</p>;

  const funnelSteps = [
    { label: 'Applications', value: stats.funnel.applications, pct: 100 },
    { label: 'Screened',     value: stats.funnel.screened,     pct: stats.funnel.applications ? Math.round(stats.funnel.screened / stats.funnel.applications * 100) : 0 },
    { label: 'Interviews',   value: stats.funnel.interviews,   pct: stats.funnel.applications ? Math.round(stats.funnel.interviews / stats.funnel.applications * 100) : 0 },
    { label: 'Hired',        value: stats.funnel.hired,        pct: stats.funnel.applications ? Math.round(stats.funnel.hired / stats.funnel.applications * 100) : 0 },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Recruitment Dashboard"
          description="Monitor hiring performance, recruitment progress, and company activities in one place."
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-sky-200 rounded-full text-[#0025B8] bg-white hover:bg-sky-50 transition-all shadow-xs cursor-pointer">
                <Upload className="w-4 h-4 text-[#0F9DE4]" /> Export CSV
              </button>
              <Link href="/company/post-job">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="gradient" className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-full shadow-md cursor-pointer h-10">
                    <Plus className="w-4 h-4" /> Post New Job
                  </Button>
                </motion.div>
              </Link>
            </div>
          }
        />
      </motion.div>

      {/* KPI Stat Cards Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard label="Total Active Jobs"    value={stats.kpis.totalActiveJobs}    icon={Briefcase}     iconColor="indigo" />
        <StatCard label="Total Applications"  value={stats.kpis.totalApplications} icon={FileText}      iconColor="purple" />
        <StatCard label="Interviews Today"    value={stats.kpis.interviewsToday}    icon={CalendarCheck} iconColor="amber" />
        <StatCard label="Hired This Month"    value={stats.kpis.hiredThisMonth}     icon={UserCheck}     iconColor="green" />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Columns: Funnel + Active Jobs */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Hiring Funnel Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0F9DE4]" />
                  Hiring Conversion Funnel
                </h3>
                <p className="text-xs text-slate-400 font-medium">Candidate pipeline progression</p>
              </div>
              <span className="text-[11px] font-bold text-[#0025B8] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">Last 30 Days</span>
            </div>

            <div className="space-y-4">
              {funnelSteps.map((step, idx) => (
                <div key={step.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">{step.label}</span>
                    <span className="font-extrabold text-[#0025B8]">{step.value} candidates <span className="text-slate-400 font-normal">({step.pct}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-sky-50 rounded-full overflow-hidden p-0.5 border border-sky-100/60">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${step.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + (idx * 0.1) }}
                      className="h-full bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] rounded-full" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Active Jobs Table Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0F9DE4]" />
                  Active Job Openings
                </h3>
                <p className="text-xs text-slate-400 font-medium">Manage current listings & applicants</p>
              </div>
              <Link href="/company/jobs" className="text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] transition-colors flex items-center gap-1">
                View All Jobs <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-sky-100">
                    <th className="pb-3 pl-2">Position</th>
                    <th className="pb-3">Applications</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {stats.activeJobs.map(job => (
                    <tr key={job.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-4 pl-2 font-bold text-slate-800 text-xs sm:text-sm">{job.title}</td>
                      <td className="py-4 text-xs sm:text-sm font-semibold text-slate-600">{job.applicationCount} applicants</td>
                      <td className="py-4">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-xs ${
                          job.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {job.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all shadow-xs cursor-pointer">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>

        {/* Right 4 Columns: Recent Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-4 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl space-y-6 h-fit sticky top-28"
        >
          <div className="border-b border-sky-100 pb-4 space-y-0.5">
            <h3 className="font-bold text-slate-900 text-base tracking-tight">Recent Activity</h3>
            <p className="text-xs text-slate-400 font-medium">Real-time recruitment logs</p>
          </div>

          <div className="space-y-5">
            {activity.length === 0 && (
              <p className="text-xs text-slate-400 font-medium text-center py-6">No recent activity recorded.</p>
            )}
            {activity.map(item => (
              <div key={item.id} className="flex gap-3.5 items-start bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0F9DE4] mt-1.5 shrink-0 shadow-xs animate-pulse" />
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">{item.message}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}