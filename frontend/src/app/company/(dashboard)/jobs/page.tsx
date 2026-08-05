'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Plus, ArrowUpDown, Pencil, Trash2,
  Briefcase, FileText, CalendarClock, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import StatusBadge from '@/components/enterprise/StatusBadge';
import EmptyState from '@/components/enterprise/EmptyState';
import {
  fetchJobsSummary, fetchCompanyJobs, deleteJob,
  JobsSummary, JobRow,
} from '@/lib/jobs';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT'];
const TYPE_FILTERS   = ['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];

export default function JobsPage() {
  const [summary, setSummary] = useState<JobsSummary | null>(null);
  const [jobs, setJobs]       = useState<JobRow[]>([]);
  const [total, setTotal]     = useState(0);
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
    <div>
      <PageHeader
        title="Open Opportunities"
        description="Manage every job posting, track applications, and monitor hiring status."
        actions={
          <Link href="/company/post-job" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <CalendarClock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.interviewsToday ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">
            Interviews Today
            {summary?.nextInterviewTime && ` · Next ${summary.nextInterviewTime}`}
          </p>
        </div>
        <div className="bg-indigo-600 rounded-xl p-5 flex flex-col justify-between text-white">
          <p className="text-sm font-medium opacity-90">Ready for a new role?</p>
          <Link href="/company/post-job" className="mt-3 inline-flex items-center justify-center gap-1.5 bg-white text-indigo-600 text-sm font-semibold rounded-lg py-2 hover:bg-indigo-50 transition-colors">
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title or location..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white"
        >
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white"
        >
          {TYPE_FILTERS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description="Try adjusting your filters, or post your first job to get started."
            action={
              <Link href="/company/post-job" className="text-sm font-medium text-indigo-600 hover:underline">
                Post New Job →
              </Link>
            }
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 font-medium">
                    <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-gray-600">
                      Job Position <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Salary Range</th>
                  <th className="px-5 py-3 font-medium">Applications</th>
                  <th className="px-5 py-3 font-medium">
                    <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-gray-600">
                      Date Posted <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">{job.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{job.jobType.replace('_', ' ')} · #{job.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{job.location}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{salaryLabel(job.salaryMin, job.salaryMax)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/company/jobs/${job.id}/applicants`} className="text-indigo-600 font-medium hover:underline">
                        {job.applicationCount}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/company/jobs/${job.id}/applicants`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="View Applicants">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/company/jobs/${job.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteTarget(job)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} postings
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Delete this job posting?</h3>
            <p className="text-sm text-gray-500 mb-5">
              "{deleteTarget.title}" and all {deleteTarget.applicationCount} associated applications will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}