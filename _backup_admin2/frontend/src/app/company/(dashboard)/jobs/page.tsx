'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, ArrowUpDown, Trash2, Briefcase, FileText, CalendarClock, Users, Eye,
  PauseCircle, PlayCircle, MapPin, Clock, Download, ArrowUp, ArrowDown, ExternalLink,
} from 'lucide-react';
import {
  fetchJobsSummary, fetchCompanyJobs, deleteJob, toggleJobStatus, JobsSummary, JobRow,
} from '@/lib/jobs';
import {
  Panel, KpiTile, EmptyNote, ErrorNote, PanelSkeleton, Pill, cx, fmtNum, daysLeft,
} from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Segmented, Pagination, ConfirmDialog, Toast, JobStatusPill, useHideFooter,
  inputCls, selectCls, btnPrimary, btnSecondary, iconBtn, thCls, tdCls,
} from '@/components/enterprise/dashboard/kit';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'HIDDEN', label: 'Hidden' },
];
const TYPE_OPTIONS = ['ALL', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];
const PAGE_SIZE = 10;

const typeLabel = (t: string) => t.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

export default function JobsPage() {
  useHideFooter();

  const [summary, setSummary] = useState<JobsSummary | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<JobRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Header search sends the user here with ?q=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setSearchInput(q); setSearch(q); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadSummary = useCallback(() => { fetchJobsSummary().then(setSummary).catch(() => {}); }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchCompanyJobs({
        page, limit: PAGE_SIZE, search, status: statusFilter, jobType: typeFilter, sortBy, sortOrder,
      });
      setJobs(res.jobs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, typeFilter, sortBy, sortOrder]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  function toggleSort(field: string) {
    if (sortBy === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteJob(deleteTarget.id);
      flash('ok', `“${deleteTarget.title}” deleted.`);
      setDeleteTarget(null);
      loadJobs(); loadSummary();
    } catch (e) { console.error(e); flash('err', 'Could not delete this job.'); }
    finally { setDeleting(false); }
  }

  async function handleToggle(job: JobRow) {
    const next = job.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusyId(job.id);
    try {
      await toggleJobStatus(job.id, next);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: next } : j)));
      flash('ok', next === 'ACTIVE' ? 'Job is live again.' : 'Job paused. It is hidden from seekers.');
      loadSummary();
    } catch (e) { console.error(e); flash('err', 'Status change failed.'); }
    finally { setBusyId(null); }
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Title', 'Type', 'Location', 'Status', 'Applicants', 'Posted', 'Deadline', 'Salary min', 'Salary max']];
    jobs.forEach(j => rows.push([j.title, j.jobType, j.location, j.status, String(j.applicationCount),
      new Date(j.createdAt).toISOString().slice(0, 10), new Date(j.deadline).toISOString().slice(0, 10),
      String(j.salaryMin ?? ''), String(j.salaryMax ?? '')]));
    const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const maxApps = useMemo(() => Math.max(1, ...jobs.map(j => j.applicationCount)), [jobs]);
  const avgPerJob = summary && summary.totalActiveJobs ? summary.totalApplications / summary.totalActiveJobs : null;
  const salaryLabel = (min: number | null, max: number | null) =>
    min || max ? `${min ? min.toLocaleString() : '–'} – ${max ? max.toLocaleString() : '–'}` : 'Not disclosed';

  const SortHead = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer uppercase tracking-wide">
      {children}
      {sortBy === field
        ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0063CE]" /> : <ArrowDown className="w-3 h-3 text-[#0063CE]" />)
        : <ArrowUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        eyebrow="Recruitment"
        title="Jobs"
        description="Every posting in one place. Track applicants, pause or reopen roles, and watch deadlines."
        actions={<>
          <button onClick={exportCsv} disabled={jobs.length === 0} className={btnSecondary}><Download className="w-3.5 h-3.5" /> Export view</button>
          <Link href="/company/post-job" className={btnPrimary}><Plus className="w-3.5 h-3.5" /> Post a job</Link>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Active jobs" icon={<Briefcase className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.totalActiveJobs)} delta={summary ? { value: summary.newJobsThisWeek, label: 'new this week' } : null} />
        <KpiTile label="Applications" icon={<FileText className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.totalApplications)} delta={summary ? { value: summary.newAppsThisWeek, label: 'new this week' } : null} />
        <KpiTile label="Interviews today" icon={<CalendarClock className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.interviewsToday)}
          hint={summary?.nextInterviewTime ? `Next ${summary.nextInterviewTime}` : 'None scheduled next'} href="/company/calendar" />
        <KpiTile label="Avg applicants per job" icon={<Users className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(avgPerJob, 1)} hint="Across active postings" />
      </div>

      <Panel title="All postings" subtitle={loading ? 'Loading…' : `${total} result${total === 1 ? '' : 's'}`} icon={<Briefcase className="w-3.5 h-3.5" />} noPad>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <Segmented value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} options={STATUS_OPTIONS} />
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search title or location"
                className={cx(inputCls, 'pl-9 sm:w-64')} />
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={cx(selectCls, 'sm:w-40')}>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All types' : typeLabel(t)}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="p-5"><PanelSkeleton rows={6} /></div>
          : error ? <ErrorNote text="Could not load postings. Is the job service (port 3002) running?" onRetry={loadJobs} />
          : jobs.length === 0 ? (
            <div className="py-6">
              <EmptyNote text="No postings match these filters." icon={<Briefcase className="w-6 h-6" />} />
              <div className="text-center"><Link href="/company/post-job" className="text-xs font-semibold text-[#0063CE] hover:underline">Post your first job</Link></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={thCls}><SortHead field="title">Position</SortHead></th>
                    <th className={thCls}>Salary (LKR)</th>
                    <th className={cx(thCls, 'w-48')}>Applicants</th>
                    <th className={thCls}><SortHead field="createdAt">Posted</SortHead></th>
                    <th className={thCls}>Deadline</th>
                    <th className={thCls}>Status</th>
                    <th className={cx(thCls, 'text-right')}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map(job => {
                    const dl = daysLeft(job.deadline);
                    const live = job.status === 'ACTIVE';
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={tdCls}>
                          <Link href={`/company/jobs/${job.id}`} className="text-[13px] font-semibold text-slate-900 hover:text-[#0063CE]">{job.title}</Link>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{typeLabel(job.jobType)}</span><span>·</span>
                            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                            <span>·</span><span className="font-mono">#{job.id.slice(0, 8)}</span>
                          </p>
                        </td>
                        <td className={cx(tdCls, 'text-slate-600 whitespace-nowrap tabular-nums')}>{salaryLabel(job.salaryMin, job.salaryMax)}</td>
                        <td className={tdCls}>
                          <Link href={`/company/jobs/${job.id}/applicants`} className="flex items-center gap-2 group">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#0063CE] to-[#0084DA]" style={{ width: `${(job.applicationCount / maxApps) * 100}%` }} />
                            </div>
                            <span className="tabular-nums font-semibold text-slate-700 group-hover:text-[#0063CE] w-8 text-right">{job.applicationCount}</span>
                          </Link>
                        </td>
                        <td className={cx(tdCls, 'text-slate-600 whitespace-nowrap')}>
                          {new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className={cx(tdCls, 'whitespace-nowrap')}>
                          {dl === null ? <span className="text-slate-300">–</span>
                            : dl < 0 ? <Pill tone="slate">Ended</Pill>
                            : dl <= 3 ? <Pill tone="rose"><Clock className="w-3 h-3" />{dl}d left</Pill>
                            : dl <= 7 ? <Pill tone="amber"><Clock className="w-3 h-3" />{dl}d left</Pill>
                            : <span className="text-slate-600">{new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                        </td>
                        <td className={tdCls}><JobStatusPill status={job.status === 'INACTIVE' ? 'INACTIVE' : job.status} /></td>
                        <td className={tdCls}>
                          <div className="flex items-center justify-end gap-0.5">
                            <Link href={`/company/jobs/${job.id}`} className={iconBtn} title="Open job"><ExternalLink className="w-4 h-4" /></Link>
                            <Link href={`/company/jobs/${job.id}/applicants`} className={iconBtn} title="Review applicants"><Eye className="w-4 h-4" /></Link>
                            {(live || job.status === 'INACTIVE') && (
                              <button onClick={() => handleToggle(job)} disabled={busyId === job.id} className={cx(iconBtn, 'disabled:opacity-40')}
                                title={live ? 'Pause posting' : 'Resume posting'}>
                                {live ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                              </button>
                            )}
                            <button onClick={() => setDeleteTarget(job)} className={cx(iconBtn, 'hover:!bg-rose-50 hover:!text-rose-600')} title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {!loading && !error && <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />}
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this job posting?"
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        message={deleteTarget && (
          <>“<b className="text-slate-900">{deleteTarget.title}</b>” and its <b className="text-slate-900">{deleteTarget.applicationCount} application{deleteTarget.applicationCount === 1 ? '' : 's'}</b> will be removed for good. This cannot be undone.</>
        )}
      />
      <Toast toast={toast} />
    </div>
  );
}
