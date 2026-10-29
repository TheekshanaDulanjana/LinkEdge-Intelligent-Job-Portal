'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Trophy, CalendarClock, CheckCircle2, PauseCircle, PlayCircle, Lock, Trash2, ExternalLink,
  MapPin, Banknote, Layers, Building2, Sparkles, ListChecks, ClipboardList, Wrench, Clock,
} from 'lucide-react';
import { jobApi } from '@/lib/api';
import { toggleJobStatus, deleteJob } from '@/lib/jobs';
import { fetchJobApplicants, Applicant } from '@/lib/jobApplicants';
import { fetchCandidateProfile } from '@/lib/candidates';
import {
  Panel, KpiTile, EmptyNote, ErrorNote, PanelSkeleton, ScoreRing, cx, fmtNum, relTime, daysLeft,
} from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, ConfirmDialog, Toast, Avatar, StagePill, JobStatusPill, STAGE_META, useHideFooter,
  btnPrimary, btnSecondary,
} from '@/components/enterprise/dashboard/kit';

function ScreeningPanel({ jobId, initialOn, initialMin, onSaved, onError }: {
  jobId: string; initialOn: boolean; initialMin: number; onSaved: () => void; onError: (m: string) => void;
}) {
  const [on, setOn] = useState(initialOn);
  const [min, setMin] = useState(initialMin);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({ on: initialOn, min: initialMin });
  const dirty = on !== saved.on || min !== saved.min;

  async function save() {
    setSaving(true);
    try {
      await jobApi.patch(`/jobs/${jobId}/screening`, { autoScreen: on, minMatchScore: min });
      setSaved({ on, min });
      onSaved();
    } catch (e: unknown) {
      onError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save the screening settings.');
    } finally { setSaving(false); }
  }

  return (
    <Panel title="Auto-screening" subtitle="Applies to new applications" icon={<Sparkles className="w-3.5 h-3.5" />}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0063CE]" />
        <span className="text-xs text-slate-600 leading-relaxed">Reject applicants below the minimum match automatically. They are told why, and you can still interview or shortlist them.</span>
      </label>
      <div className={cx('mt-4 transition-opacity', !on && 'opacity-40 pointer-events-none')}>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="min-match" className="text-xs font-semibold text-slate-700">Minimum match</label>
          <span className="text-xs font-semibold text-[#0063CE] tabular-nums">{min}%</span>
        </div>
        <input id="min-match" type="range" min={0} max={90} step={5} value={min} onChange={e => setMin(Number(e.target.value))} className="w-full accent-[#0063CE]" />
      </div>
      <button onClick={save} disabled={!dirty || saving} className={cx(btnPrimary, 'mt-4 w-full justify-center', (!dirty || saving) && 'opacity-50')}>{saving ? 'Saving…' : 'Save settings'}</button>
    </Panel>
  );
}

interface Job {
  id: string;
  title: string;
  department?: string | null;
  experienceLevel?: string | null;
  description: string;
  requirements: string;
  requirementsList?: string[];
  autoScreen?: boolean;
  minMatchScore?: number;
  responsibilities?: string[];
  skills?: string[];
  locationType: string;
  location: string;
  jobType: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  deadline: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
}

const nice = (s?: string | null) => (s ? s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : '–');

export default function JobDetailPage() {
  useHideFooter();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [names, setNames] = useState<Record<string, { name: string; img?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [j, a] = await Promise.allSettled([jobApi.get(`/jobs/${id}`), fetchJobApplicants(id)]);
      if (j.status === 'rejected') throw j.reason;
      setJob((j.value.data.data ?? j.value.data) as Job);
      if (a.status === 'fulfilled') {
        setApplicants(a.value.applicants);
        const top = [...a.value.applicants].sort((x, y) => (y.aiScore ?? -1) - (x.aiScore ?? -1)).slice(0, 5);
        top.forEach(t => fetchCandidateProfile(t.seekerId)
          .then(p => setNames(prev => ({ ...prev, [t.seekerId]: { name: p.profile.fullName, img: assetUrl(p.profile.profileImageUrl) } })))
          .catch(() => {}));
      }
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(next: 'ACTIVE' | 'INACTIVE' | 'CLOSED') {
    if (!job) return;
    setBusy(true);
    try {
      await toggleJobStatus(job.id, next);
      setJob({ ...job, status: next });
      flash('ok', next === 'ACTIVE' ? 'Job is live.' : next === 'INACTIVE' ? 'Job paused.' : 'Job closed.');
    } catch (e) { console.error(e); flash('err', 'Status change failed.'); }
    finally { setBusy(false); setConfirmClose(false); }
  }

  async function remove() {
    if (!job) return;
    setBusy(true);
    try { await deleteJob(job.id); router.push('/company/jobs'); }
    catch (e) { console.error(e); flash('err', 'Could not delete this job.'); setBusy(false); }
  }

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = {};
    applicants.forEach(a => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [applicants]);

  const scored = applicants.filter(a => a.aiScore !== null);
  const avg = scored.length ? scored.reduce((s, a) => s + (a.aiScore ?? 0), 0) / scored.length : null;
  const dl = job ? daysLeft(job.deadline) : null;
  const top = [...applicants].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1)).slice(0, 5);
  const reqs = job?.requirementsList?.length ? job.requirementsList : job?.requirements ? job.requirements.split(/\.\s+/).filter(Boolean) : [];

  if (error) return <div className="pt-16"><ErrorNote text="Could not load this job. It may have been deleted." onRetry={load} /><div className="text-center mt-2"><Link href="/company/jobs" className="text-xs font-semibold text-[#0063CE] hover:underline">Back to jobs</Link></div></div>;

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        breadcrumb={<Link href="/company/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0063CE] mb-1"><ArrowLeft className="w-3 h-3" /> All jobs</Link>}
        eyebrow={job ? `${nice(job.jobType)} · ${nice(job.locationType)}` : 'Job'}
        title={job?.title ?? 'Loading…'}
        description={job ? `Posted ${new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · #${job.id.slice(0, 8)}` : undefined}
        actions={job && <>
          <JobStatusPill status={job.status} />
          <Link href={`/jobs/${job.id}`} target="_blank" className={btnSecondary}><ExternalLink className="w-3.5 h-3.5" /> Public page</Link>
          {job.status === 'ACTIVE' && <button disabled={busy} onClick={() => setStatus('INACTIVE')} className={btnSecondary}><PauseCircle className="w-3.5 h-3.5" /> Pause</button>}
          {job.status === 'INACTIVE' && <button disabled={busy} onClick={() => setStatus('ACTIVE')} className={btnSecondary}><PlayCircle className="w-3.5 h-3.5" /> Resume</button>}
          {job.status !== 'CLOSED' && job.status !== 'DRAFT' && <button disabled={busy} onClick={() => setConfirmClose(true)} className={btnSecondary}><Lock className="w-3.5 h-3.5" /> Close</button>}
          {job.status === 'CLOSED' && <button disabled={busy} onClick={() => setStatus('ACTIVE')} className={btnSecondary}><PlayCircle className="w-3.5 h-3.5" /> Reopen</button>}
          <Link href={`/company/jobs/${job.id}/applicants`} className={btnPrimary}><Users className="w-3.5 h-3.5" /> Review applicants</Link>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Applicants" icon={<Users className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(applicants.length)} hint="Total received" />
        <KpiTile label="Average match" icon={<Trophy className="w-3.5 h-3.5" />} loading={loading} value={avg === null ? '–' : fmtNum(avg, 0)} unit={avg === null ? undefined : '%'} hint={scored.length ? `${scored.length} ranked` : 'Not ranked yet'} />
        <KpiTile label="Shortlisted" icon={<CheckCircle2 className="w-3.5 h-3.5" />} loading={loading} value={fmtNum((stageCounts.SHORTLISTED ?? 0) + (stageCounts.INTERVIEW ?? 0))} hint={`${stageCounts.INTERVIEW ?? 0} in interview`} />
        <KpiTile label="Deadline" icon={<CalendarClock className="w-3.5 h-3.5" />} loading={loading}
          value={dl === null ? '–' : dl < 0 ? 'Ended' : `${dl}`} unit={dl !== null && dl >= 0 ? 'days' : undefined}
          hint={job ? new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          <Panel title="Pipeline" subtitle="Where applicants are right now" icon={<Layers className="w-3.5 h-3.5" />}>
            {loading ? <PanelSkeleton rows={5} /> : applicants.length === 0 ? <EmptyNote text="No applications yet. Share the public page to attract candidates." /> : (
              <div className="space-y-3">
                {(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'] as const).map(s => {
                  const n = stageCounts[s] ?? 0;
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-600">{STAGE_META[s].label}</span><span className="tabular-nums text-slate-600"><b className="text-slate-900">{n}</b> · {Math.round((n / applicants.length) * 100)}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(n / applicants.length) * 100}%`, background: STAGE_META[s].color }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Role description" icon={<ClipboardList className="w-3.5 h-3.5" />}>
            {loading ? <PanelSkeleton rows={6} /> : (
              <div className="space-y-6">
                <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{job?.description}</p>
                {!!job?.responsibilities?.length && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-2"><ListChecks className="w-3.5 h-3.5 text-[#0084DA]" /> Responsibilities</p>
                    <ul className="space-y-1.5">{job.responsibilities.map((r, i) => <li key={i} className="text-[13px] text-slate-600 flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0084DA] mt-2 shrink-0" />{r}</li>)}</ul>
                  </div>
                )}
                {reqs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0084DA]" /> Requirements</p>
                    <ul className="space-y-1.5">{reqs.map((r, i) => <li key={i} className="text-[13px] text-slate-600 flex gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />{r}</li>)}</ul>
                  </div>
                )}
                {!!job?.skills?.length && (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-2"><Wrench className="w-3.5 h-3.5 text-[#0084DA]" /> Required skills</p>
                    <div className="flex flex-wrap gap-1.5">{job.skills.map(s => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">{s}</span>)}</div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <Panel title="Top applicants" subtitle="By AI match score" icon={<Sparkles className="w-3.5 h-3.5" />} noPad
            actions={<Link href={`/company/jobs/${id}/applicants`} className="text-xs font-semibold text-[#0063CE] hover:underline">See all</Link>}>
            {loading ? <div className="p-5"><PanelSkeleton rows={4} /></div> : top.length === 0 ? <EmptyNote text="Nobody has applied yet." /> : (
              <ul className="divide-y divide-slate-100">
                {top.map(a => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <Avatar name={names[a.seekerId]?.name} src={names[a.seekerId]?.img} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-900 truncate">{names[a.seekerId]?.name ?? `Candidate ${a.seekerId.slice(0, 6)}`}</p>
                      <div className="flex items-center gap-2 mt-0.5"><StagePill status={a.status} /><span className="text-xs text-slate-500">{relTime(a.createdAt)}</span></div>
                    </div>
                    <ScoreRing value={a.aiScore} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {job && (
            <ScreeningPanel key={job.id} jobId={job.id} initialOn={job.autoScreen ?? true} initialMin={job.minMatchScore ?? 35}
              onSaved={() => flash('ok', 'Screening settings saved.')} onError={m => flash('err', m)} />
          )}

          <Panel title="Job details" icon={<Building2 className="w-3.5 h-3.5" />}>
            {loading ? <PanelSkeleton rows={5} /> : (
              <dl className="space-y-3 text-xs">
                {[
                  { k: 'Department', v: job?.department || '–', i: <Building2 className="w-3.5 h-3.5" /> },
                  { k: 'Experience', v: job?.experienceLevel || '–', i: <Trophy className="w-3.5 h-3.5" /> },
                  { k: 'Location', v: `${job?.location} (${nice(job?.locationType)})`, i: <MapPin className="w-3.5 h-3.5" /> },
                  { k: 'Salary (LKR / month)', v: job?.salaryMin || job?.salaryMax ? `${job?.salaryMin?.toLocaleString() ?? '–'} – ${job?.salaryMax?.toLocaleString() ?? '–'}` : 'Not disclosed', i: <Banknote className="w-3.5 h-3.5" /> },
                  { k: 'Last updated', v: job ? relTime(job.updatedAt) : '–', i: <Clock className="w-3.5 h-3.5" /> },
                ].map(r => (
                  <div key={r.k} className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">{r.i}</span>
                    <div className="min-w-0"><dt className="text-slate-500">{r.k}</dt><dd className="font-semibold text-slate-800 mt-0.5">{r.v}</dd></div>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Danger zone" icon={<Trash2 className="w-3.5 h-3.5" />}>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">Deleting removes this job and every application attached to it.</p>
            <button onClick={() => setConfirmDel(true)} className={cx(btnSecondary, 'text-rose-600 hover:!text-rose-700 hover:!bg-rose-50 border-rose-200')}><Trash2 className="w-3.5 h-3.5" /> Delete job</button>
          </Panel>
        </div>
      </div>

      <ConfirmDialog open={confirmDel} title="Delete this job posting?" confirmLabel="Delete permanently" busy={busy} onConfirm={remove} onCancel={() => setConfirmDel(false)}
        message={<>“<b className="text-slate-900">{job?.title}</b>” and its <b className="text-slate-900">{applicants.length} application{applicants.length === 1 ? '' : 's'}</b> will be removed. This cannot be undone.</>} />
      <ConfirmDialog open={confirmClose} title="Close this job?" confirmLabel="Close job" busy={busy} onConfirm={() => setStatus('CLOSED')} onCancel={() => setConfirmClose(false)}
        message="New applications will stop. You can reopen the job later." />
      <Toast toast={toast} />
    </div>
  );
}
