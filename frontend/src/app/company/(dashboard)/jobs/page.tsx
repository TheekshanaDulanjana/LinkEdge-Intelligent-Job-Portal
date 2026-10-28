'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, ArrowUpDown, Pencil, Trash2,
  Briefcase, FileText, CalendarClock, ChevronLeft, ChevronRight, Eye,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import StatusBadge from '@/components/enterprise/StatusBadge';
import EmptyState from '@/components/enterprise/EmptyState';
import { Button } from '@/components/ui/button';
import {
  fetchJobsSummary, fetchCompanyJobs, deleteJob,
  JobsSummary, JobRow,
} from '@/lib/jobs';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT'];
const TYPE_FILTERS   = ['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];

export default function JobsPage() {
  const [summary, setSummary] = useState<JobsSummary | null>(null);
  const [jobs, setJobs]        = useState<JobRow[]>([]);
  const [total, setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy]         = useState('createdAt');
  const [sortOrder, setSortOrder]   = useState<'asc' | 'desc'>('desc');
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<JobRow | null>(null);
  const [deleting, setDeleting]     = useState(false);

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

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompanyJobs({
        page, limit: 10, search,
        status: statusFilter, jobType: typeFilter,
        sortBy, sortOrder,
      });
      setJobs(res.jobs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter, sortBy, sortOrder]);

  useEffect(() => { fetchJobsSummary().then(setSummary).catch(console.error); }, []);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  function toggleSort(field: string) {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteJob(deleteTarget.id);
      setDeleteTarget(null);
      loadJobs();
    } catch (e) { console.error(e); }
    finally { setDeleting(false); }
  }

  const salaryLabel = (min: number | null, max: number | null) =>
    min || max ? `LKR ${min?.toLocaleString() ?? '—'} – ${max?.toLocaleString() ?? '—'}` : '—';

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="Open Opportunities"
          description="Manage every job posting, track applications, and monitor hiring status."
          actions={
            <Link href="/company/post-job">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="gradient" className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-full shadow-md cursor-pointer h-10">
                  <Plus className="w-4 h-4" /> Post New Job
                </Button>
              </motion.div>
            </Link>
          }
        />
      </motion.div>

      {/* Summary Stat Cards Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard
          label="Total Active Jobs"
          value={summary?.totalActiveJobs ?? '—'}
          icon={Briefcase}
          change={summary?.newJobsThisWeek}
          changeLabel="this week"
          iconColor="indigo"
        />
        <StatCard
          label="Total Applications"
          value={summary?.totalApplications ?? '—'}
          icon={FileText}
          change={summary?.newAppsThisWeek}
          changeLabel="this week"
          iconColor="purple"
        />
        <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-xl flex flex-col justify-between">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 shadow-xs">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{summary?.interviewsToday ?? '—'}</p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Interviews Today
              {summary?.nextInterviewTime && ` · Next ${summary.nextInterviewTime}`}
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] rounded-[28px] p-6 flex flex-col justify-between text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-bold tracking-wider uppercase text-cyan-200">Ready for a new role?</p>
          <Link href="/company/post-job" className="mt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#0025B8] text-xs font-bold rounded-full py-2.5 hover:bg-sky-50 transition-all shadow-md cursor-pointer">
                <Plus className="w-4 h-4" /> Post New Job
              </button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Filters Bar Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-5 shadow-xl flex flex-col md:flex-row gap-3.5 md:items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or location..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-sky-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 focus:border-[#0F9DE4] text-slate-800 shadow-xs transition-all"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs font-semibold border border-sky-100 rounded-2xl px-4 py-2.5 text-slate-700 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer shadow-xs"
          >
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs font-semibold border border-sky-100 rounded-2xl px-4 py-2.5 text-slate-700 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer shadow-xs"
          >
            {TYPE_FILTERS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Main Table Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 overflow-hidden shadow-xl"
      >
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-sky-50/60 rounded-2xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description="Try adjusting your filters, or post your first job to get started."
            action={
              <Link href="/company/post-job" className="text-xs font-bold text-[#0025B8] hover:underline">
                Post New Job →
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-sky-100 bg-sky-50/40">
                    <th className="px-6 py-3.5">
                      <button onClick={() => toggleSort('title')} className="flex items-center gap-1.5 hover:text-slate-700 cursor-pointer">
                        Job Position <ArrowUpDown className="w-3 h-3 text-[#0F9DE4]" />
                      </button>
                    </th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Salary Range</th>
                    <th className="px-6 py-3.5">Applications</th>
                    <th className="px-6 py-3.5">
                      <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1.5 hover:text-slate-700 cursor-pointer">
                        Date Posted <ArrowUpDown className="w-3 h-3 text-[#0F9DE4]" />
                      </button>
                    </th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{job.title}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{job.jobType.replace('_', ' ')} · #{job.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4 text-xs sm:text-sm text-slate-600 font-medium">{job.location}</td>
                      <td className="px-6 py-4 text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">{salaryLabel(job.salaryMin, job.salaryMax)}</td>
                      <td className="px-6 py-4">
                        <Link href={`/company/jobs/${job.id}/applicants`} className="text-xs sm:text-sm font-bold text-[#0025B8] hover:text-[#0F9DE4] transition-colors hover:underline">
                          {job.applicationCount} applicants
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-xs sm:text-sm text-slate-500 font-medium">{new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/company/jobs/${job.id}/applicants`} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-sky-50 hover:text-[#0F9DE4] transition-colors shadow-xs" title="View Applicants">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link href={`/company/jobs/${job.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-xs" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setDeleteTarget(job)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-xs cursor-pointer" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-sky-100 bg-sky-50/20">
              <p className="text-xs text-slate-400 font-medium">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} postings
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-sky-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-sky-200 text-slate-600 disabled:opacity-40 hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/95 backdrop-blur-2xl rounded-[28px] shadow-2xl w-full max-w-md p-6 sm:p-8 border border-sky-100 space-y-5"
            >
              <div className="flex items-center gap-3.5 pb-3 border-b border-sky-100">
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">Delete job posting?</h3>
                  <p className="text-xs text-rose-600 font-medium">Irreversible action</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                &ldquo;{deleteTarget.title}&rdquo; and all <strong className="text-slate-900">{deleteTarget.applicationCount} associated applications</strong> will be permanently removed.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-xs font-bold rounded-full border border-sky-200 text-slate-700 hover:bg-sky-50 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="w-full py-2.5 text-xs font-bold rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-md cursor-pointer"
                  >
                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}