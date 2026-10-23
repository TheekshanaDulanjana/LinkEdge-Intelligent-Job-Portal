'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, FileText, CalendarCheck, UserCheck, Upload, Plus, MoreHorizontal } from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import DashboardSkeleton from '@/components/enterprise/skeletons/DashboardSkeleton';
import { fetchDashboardStats, fetchRecentActivity, DashboardStats } from '@/lib/dashboard';

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchRecentActivity()])
      .then(([s, a]) => { setStats(s); setActivity(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!stats) return <p className="text-sm text-gray-400">Unable to load dashboard.</p>;

  const funnelSteps = [
    { label: 'Applications', value: stats.funnel.applications, pct: 100 },
    { label: 'Screened',     value: stats.funnel.screened,     pct: stats.funnel.applications ? Math.round(stats.funnel.screened / stats.funnel.applications * 100) : 0 },
    { label: 'Interviews',   value: stats.funnel.interviews,   pct: stats.funnel.applications ? Math.round(stats.funnel.interviews / stats.funnel.applications * 100) : 0 },
    { label: 'Hired',        value: stats.funnel.hired,        pct: stats.funnel.applications ? Math.round(stats.funnel.hired / stats.funnel.applications * 100) : 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Monitor hiring performance, recruitment progress, and company activities in one place."
        actions={
          <>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Upload className="w-4 h-4" /> Export CSV
            </button>
            <Link href="/company/post-job" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Post New Job
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Active Jobs"   value={stats.kpis.totalActiveJobs}   icon={Briefcase}    iconColor="indigo" />
        <StatCard label="Total Applications"  value={stats.kpis.totalApplications} icon={FileText}     iconColor="purple" />
        <StatCard label="Interviews Today"    value={stats.kpis.interviewsToday}   icon={CalendarCheck} iconColor="amber" />
        <StatCard label="Hired This Month"    value={stats.kpis.hiredThisMonth}    icon={UserCheck}    iconColor="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel + Active Jobs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Hiring Funnel</h3>
              <span className="text-xs text-gray-400">Last 30 Days</span>
            </div>
            <div className="space-y-3">
              {funnelSteps.map(step => (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{step.label}</span>
                    <span className="font-medium text-gray-700">{step.value} ({step.pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${step.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Active Jobs</h3>
              <Link href="/company/jobs" className="text-xs font-medium text-indigo-600 hover:underline">View All Jobs</Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Position</th>
                  <th className="pb-2 font-medium">Applications</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.activeJobs.map(job => (
                  <tr key={job.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 font-medium text-gray-800">{job.title}</td>
                    <td className="py-3 text-gray-500">{job.applicationCount}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                        ${job.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {job.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {activity.length === 0 && <p className="text-sm text-gray-400">No recent activity.</p>}
            {activity.map(item => (
              <div key={item.id} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}