'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Banknote, CalendarDays, Clock, Eye, Filter, EyeOff, MapPin, Search, ShieldAlert, Trash2, Undo2, Users } from 'lucide-react';
import { adminGet, adminSend, AdminJobRow, errMsg, fmtDate } from '@/lib/admin';
import {
  Btn, Card, Empty, ErrorBox, JobStatusPill, Modal, Pagination, ReasonDialog, Spinner, inputCls, td, th, useDebounced, useToast,
} from '@/components/admin/ui';
import { cn } from '@/lib/utils';

interface Resp { jobs: AdminJobRow[]; total: number; page: number; totalPages: number }
interface JobDetail {
  id: string; title: string; status: string; description: string; requirements: string; location: string; locationType: string; jobType: string;
  salaryMin: number | null; salaryMax: number | null; deadline: string; createdAt: string; applicationCount: number;
  moderationReason: string | null; moderatedAt: string | null; skills: string[];
  history?: { action: string; reason?: string | null; createdAt: string }[];
  company: { companyName: string; user: { email: string } } | null;
}
const money = (n: number | null) => (n == null ? '?' : n.toLocaleString('en-LK'));
const label = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Tile({ icon: Icon, name, value }: { icon: React.ComponentType<{ className?: string }>; name: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon className="w-3.5 h-3.5 text-brand-600" />{name}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function JobPreview({ job }: { job: JobDetail }) {
  const name = job.company?.companyName ?? 'Unknown company';
  const salary = job.salaryMin || job.salaryMax ? `${money(job.salaryMin)} – ${money(job.salaryMax)}` : 'Not shown';
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-brand-50 text-brand-700 font-bold text-lg flex items-center justify-center">{name[0]?.toUpperCase()}</div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 leading-snug">{job.title}</h3>
          <p className="text-slate-600 mt-0.5">{name}{job.company?.user?.email ? <span className="text-slate-400"> · {job.company.user.email}</span> : null}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <JobStatusPill status={job.status} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-600"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
            <span className="text-xs text-slate-500">· {label(job.locationType)} · {label(job.jobType)}</span>
          </div>
        </div>
      </div>

      {job.status === 'HIDDEN' && (
        <div className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-900">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div><p className="font-semibold">Hidden by admin{job.moderatedAt ? ` on ${fmtDate(job.moderatedAt)}` : ''}</p><p className="mt-0.5">{job.moderationReason}</p></div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Tile icon={Users} name="Applicants" value={job.applicationCount} />
        <Tile icon={Banknote} name="Salary" value={salary} />
        <Tile icon={CalendarDays} name="Posted" value={fmtDate(job.createdAt, false)} />
        <Tile icon={Clock} name="Deadline" value={fmtDate(job.deadline, false)} />
      </div>

      {job.skills?.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Skills</h4>
          <div className="flex flex-wrap gap-1.5">{job.skills.map((k) => <span key={k} className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">{k}</span>)}</div>
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Description</h4>
        <div className="rounded-xl border border-slate-200 px-4 py-3 whitespace-pre-line leading-relaxed text-slate-800 max-h-56 overflow-y-auto">{job.description}</div>
      </section>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Requirements</h4>
        <div className="rounded-xl border border-slate-200 px-4 py-3 whitespace-pre-line leading-relaxed text-slate-800 max-h-56 overflow-y-auto">{job.requirements}</div>
      </section>

      {job.history && job.history.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Moderation history</h4>
          <ol className="border-l-2 border-slate-200 ml-1.5 space-y-2.5">
            {job.history.map((h, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-600" />
                <p className="font-medium text-slate-800">{label(h.action)}</p>
                <p className="text-xs text-slate-500">{fmtDate(h.createdAt)}{h.reason ? ` · ${h.reason}` : ''}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

const STATUSES = ['', 'ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT', 'HIDDEN'];

function JobsList() {
  const toast = useToast();
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [company, setCompany] = useState(sp.get('companyId') ?? '');
  const [companies, setCompanies] = useState<{ id: string; name: string; jobs: number }[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<JobDetail | null>(null);
  const [act, setAct] = useState<{ kind: 'hide' | 'restore' | 'delete'; job: AdminJobRow } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await adminGet<Resp>('/jobs', { status: status || undefined, companyId: company || undefined, q: dq || undefined, page, limit: 20 })); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [status, company, dq, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, company, dq]);
  useEffect(() => { adminGet<typeof companies>('/jobs/companies').then(setCompanies).catch(() => {}); }, []);

  async function open(j: AdminJobRow) {
    try { setView(await adminGet<JobDetail>(`/jobs/${j.id}`)); } catch (e) { toast('error', errMsg(e)); }
  }

  const done = (r: { inApp: boolean; emailSent: boolean }, what: string) => {
    toast(r.emailSent ? 'ok' : 'error', r.emailSent ? `${what}. The company was notified in the app and by email.` : `${what}. The company was notified in the app, but the email could not be sent.`);
    setAct(null); void load();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Job posts</h1>
        <p className="text-sm text-slate-600 mt-1">Review every job post. Hide or delete posts that break the rules; the company is told why.</p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputCls, 'w-auto')} aria-label="Status">
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Any status'}</option>)}
          </select>
          <select value={company} onChange={(e) => setCompany(e.target.value)} className={cn(inputCls, 'w-auto max-w-[240px]')} aria-label="Company">
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.jobs})</option>)}
          </select>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job title or company" className={cn(inputCls, 'pl-9')} aria-label="Search jobs" />
          </div>
        </div>

        {error ? <div className="p-4"><ErrorBox message={error} onRetry={load} /></div>
          : loading && !data ? <Spinner />
          : !data || data.jobs.length === 0 ? <Empty>No job posts match these filters.</Empty>
          : (
            <>
              <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
                <table className="w-full min-w-[860px]">
                  <thead><tr>
                    <th className={th}>Job</th><th className={th}>Company</th><th className={th}>Status</th>
                    <th className={th}>Applicants</th><th className={th}>Posted</th><th className={cn(th, 'text-right')}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {data.jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className={td}>
                          <button onClick={() => open(j)} className="text-left font-medium text-slate-900 hover:text-brand-600 cursor-pointer truncate max-w-[280px] block">{j.title}</button>
                          <span className="text-xs text-slate-500">{j.location}</span>
                          {j.status === 'HIDDEN' && j.moderationReason && <span className="block text-xs text-rose-700 truncate max-w-[280px]" title={j.moderationReason}>Reason: {j.moderationReason}</span>}
                        </td>
                        <td className={td}>
                          <div className="flex items-center gap-1.5">
                            {j.companyUserId ? <Link href={`/admin/users/${j.companyUserId}`} className="hover:text-brand-600">{j.companyName}</Link> : j.companyName}
                            {j.companyId && company !== j.companyId && (
                              <button onClick={() => setCompany(j.companyId!)} title={`Show only ${j.companyName}`} aria-label={`Filter by ${j.companyName}`} className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer"><Filter className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                        <td className={td}><JobStatusPill status={j.status} /></td>
                        <td className={cn(td, 'tabular-nums')}>{j.applicationCount}</td>
                        <td className={cn(td, 'whitespace-nowrap')}>{fmtDate(j.createdAt, false)}</td>
                        <td className={td}>
                          <div className="flex justify-end gap-1.5">
                            <Btn size="sm" onClick={() => open(j)} aria-label="View job"><Eye className="w-3.5 h-3.5" />View</Btn>
                            {j.status === 'HIDDEN'
                              ? <Btn size="sm" onClick={() => setAct({ kind: 'restore', job: j })}><Undo2 className="w-3.5 h-3.5" />Restore</Btn>
                              : <Btn size="sm" onClick={() => setAct({ kind: 'hide', job: j })}><EyeOff className="w-3.5 h-3.5" />Hide</Btn>}
                            <Btn size="sm" variant="danger" onClick={() => setAct({ kind: 'delete', job: j })} aria-label="Delete job"><Trash2 className="w-3.5 h-3.5" /></Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
            </>
          )}
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title="Job preview" wide
        footer={<Btn onClick={() => setView(null)}>Close</Btn>}>
        {view && <JobPreview job={view} />}
      </Modal>

      <ReasonDialog
        open={act?.kind === 'hide'} onClose={() => setAct(null)}
        title="Hide this job post?" confirmLabel="Hide job post"
        description={<>“{act?.job.title}” disappears from the job board and nobody can apply. The company sees it as hidden with your reason and cannot re-activate it.</>}
        notice="The reason is emailed to the company, shown in their notifications and saved in the audit log."
        onConfirm={async (reason) => done(await adminSend('post', `/jobs/${act!.job.id}/hide`, { reason }), 'Job post hidden')}
      />
      <ReasonDialog
        open={act?.kind === 'restore'} onClose={() => setAct(null)}
        title="Restore this job post?" confirmLabel="Restore job post"
        description={<>“{act?.job.title}” goes back to the status it had before it was hidden.</>}
        notice="The company is told that the post was restored."
        onConfirm={async (reason) => done(await adminSend('post', `/jobs/${act!.job.id}/restore`, { reason }), 'Job post restored')}
      />
      <ReasonDialog
        open={act?.kind === 'delete'} onClose={() => setAct(null)} danger
        title="Delete this job post permanently?" confirmLabel="Delete job post"
        description={<>“{act?.job.title}” and its {act?.job.applicationCount ?? 0} application(s) are removed for good. <b>This cannot be undone.</b> Consider hiding it instead if you may need it again.</>}
        notice="The reason is emailed to the company, shown in their notifications and saved in the audit log."
        onConfirm={async (reason) => done(await adminSend('delete', `/jobs/${act!.job.id}`, { reason }), 'Job post deleted')}
      />
    </div>
  );
}

export default function JobsPage() {
  return <Suspense fallback={<Spinner />}><JobsList /></Suspense>;
}
