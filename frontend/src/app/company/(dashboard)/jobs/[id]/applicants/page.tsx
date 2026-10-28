'use client';

import { assetUrl } from '@/lib/assetUrl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Sparkles, CheckCircle2, CalendarClock, XCircle, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight,
  Users, ArrowLeft, FileText, Trophy, Lightbulb, Download,
} from 'lucide-react';
import InterviewScheduleModal from '@/components/enterprise/InterviewScheduleModal';
import RejectReasonModal from '@/components/enterprise/RejectReasonModal';
import { fetchJobApplicants, smartRank, shortlist, Applicant } from '@/lib/jobApplicants';
import { fetchCandidateProfile } from '@/lib/candidates';
import {
  Panel, KpiTile, EmptyNote, ErrorNote, PanelSkeleton, ScoreRing, cx, fmtNum, relTime,
} from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Segmented, Toast, Avatar, StagePill, STAGE_META, useHideFooter,
  btnPrimary, btnSecondary, iconBtn, thCls, tdCls, selectCls,
} from '@/components/enterprise/dashboard/kit';

type Person = { name: string; img?: string | null };

export default function JobApplicantsPage() {
  useHideFooter();
  const { id: jobId } = useParams<{ id: string }>();

  const [jobTitle, setJobTitle] = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState<'score' | 'recent'>('score');
  const [people, setPeople] = useState<Record<string, Person>>({});

  const [scheduleTarget, setScheduleTarget] = useState<Applicant | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Applicant | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const loadNames = useCallback((list: Applicant[]) => {
    Array.from(new Set(list.map(a => a.seekerId))).forEach(id => {
      fetchCandidateProfile(id)
        .then(p => setPeople(prev => ({ ...prev, [id]: { name: p.profile.fullName, img: assetUrl(p.profile.profileImageUrl) } })))
        .catch(() => {});
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchJobApplicants(jobId);
      setJobTitle(res.job.title);
      setApplicants(res.applicants);
      loadNames(res.applicants);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  }, [jobId, loadNames]);

  useEffect(() => { load(); }, [load]);

  async function handleSmartRank() {
    setRanking(true);
    try {
      const res = await smartRank(jobId);
      setApplicants(res.applicants);
      setSort('score');
      flash('ok', `Ranked ${res.ranked} candidate${res.ranked === 1 ? '' : 's'}.`);
    } catch (e) { console.error(e); flash('err', 'Smart ranking failed. Please try again.'); }
    finally { setRanking(false); }
  }

  async function handleShortlist(a: Applicant) {
    try {
      await shortlist(a.id);
      setApplicants(prev => prev.map(x => (x.id === a.id
        ? { ...x, status: 'SHORTLISTED', ...(x.autoRejected ? { autoRejected: false, companyOverride: true, rejectionReason: null, rejectionMessage: null } : {}) }
        : x)));
      flash('ok', a.autoRejected ? 'Moved forward despite the low match. Notification email sent.' : 'Shortlisted. Notification email sent.');
    } catch (e: any) { console.error(e); flash('err', e?.response?.data?.message || 'Could not shortlist this candidate.'); }
  }

  const nameOf = (a: Applicant) => people[a.seekerId]?.name ?? `Candidate ${a.seekerId.slice(0, 6)}`;
  const ranked = applicants.some(a => a.aiScore !== null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: applicants.length };
    applicants.forEach(a => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [applicants]);

  const view = useMemo(() => {
    const list = filter === 'ALL' ? applicants : applicants.filter(a => a.status === filter);
    return [...list].sort((a, b) => sort === 'score'
      ? (b.aiScore ?? -1) - (a.aiScore ?? -1)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applicants, filter, sort]);

  const autoCount = applicants.filter(a => a.autoRejected).length;
  const scored = applicants.filter(a => a.aiScore !== null);
  const avgScore = scored.length ? scored.reduce((s, a) => s + (a.aiScore ?? 0), 0) / scored.length : null;
  const strong = scored.filter(a => (a.aiScore ?? 0) >= 75).length;
  const bands = [
    { label: '75–100', test: (s: number) => s >= 75, color: '#059669' },
    { label: '50–74', test: (s: number) => s >= 50 && s < 75, color: '#d97706' },
    { label: '0–49', test: (s: number) => s < 50, color: '#e11d48' },
  ].map(b => ({ ...b, n: scored.filter(a => b.test(a.aiScore ?? 0)).length }));

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const out = [['Rank', 'Name', 'Status', 'AI score', 'ATS score', 'Applied']];
    view.forEach((a, i) => out.push([String(i + 1), nameOf(a), a.status, a.aiScore?.toFixed(0) ?? '', a.atsScore?.toFixed(0) ?? '', new Date(a.createdAt).toISOString().slice(0, 10)]));
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([out.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }));
    el.download = `applicants-${jobTitle.replace(/\W+/g, '-').toLowerCase() || 'job'}.csv`;
    el.click();
    URL.revokeObjectURL(el.href);
  }

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        breadcrumb={<Link href={`/company/jobs/${jobId}`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#0025B8] mb-1"><ArrowLeft className="w-3 h-3" /> Back to job</Link>}
        eyebrow="Applicants"
        title={jobTitle || 'Applicants'}
        description="Rank applicants against this job, shortlist the best matches and schedule interviews."
        actions={<>
          <button onClick={exportCsv} disabled={view.length === 0} className={btnSecondary}><Download className="w-3.5 h-3.5" /> Export</button>
          <button onClick={handleSmartRank} disabled={ranking || applicants.length === 0} className={btnPrimary}>
            <Sparkles className={cx('w-3.5 h-3.5', ranking && 'animate-pulse')} /> {ranking ? 'Ranking…' : ranked ? 'Re-run Smart Rank' : 'Run Smart Rank'}
          </button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Applicants" icon={<Users className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(applicants.length)} hint="For this job" />
        <KpiTile label="Average match" icon={<Trophy className="w-3.5 h-3.5" />} loading={loading} value={avgScore === null ? '–' : fmtNum(avgScore, 0)} unit={avgScore === null ? undefined : '%'} hint={scored.length ? `${scored.length} ranked` : 'Not ranked yet'} />
        <KpiTile label="Strong matches" icon={<ThumbsUp className="w-3.5 h-3.5" />} loading={loading} value={fmtNum(strong)} hint="Score 75% or higher" />
        <KpiTile label="Shortlisted / interview" icon={<CheckCircle2 className="w-3.5 h-3.5" />} loading={loading} value={fmtNum((counts.SHORTLISTED ?? 0) + (counts.INTERVIEW ?? 0))} hint={`${counts.REJECTED ?? 0} rejected${autoCount ? ` (${autoCount} by system)` : ''}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <Panel className="xl:col-span-9" title="Ranked applicants" subtitle={ranked ? 'Sorted by AI match score' : 'Run Smart Rank to score everyone against the job'} icon={<FileText className="w-3.5 h-3.5" />} noPad>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
            <div className="overflow-x-auto">
              <Segmented value={filter} onChange={setFilter} options={[
                { value: 'ALL', label: 'All', count: counts.ALL },
                ...(['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'] as const).map(s => ({ value: s, label: STAGE_META[s].label, count: counts[s] ?? 0 })),
              ]} />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as 'score' | 'recent')} className={cx(selectCls, 'md:w-40')}>
              <option value="score">Highest score</option>
              <option value="recent">Most recent</option>
            </select>
          </div>

          {loading ? <div className="p-5"><PanelSkeleton rows={6} /></div>
            : error ? <ErrorNote text="Could not load applicants." onRetry={load} />
            : view.length === 0 ? <EmptyNote text={applicants.length === 0 ? 'Applications for this job will appear here.' : 'No applicants in this stage.'} icon={<Users className="w-6 h-6" />} />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className={cx(thCls, 'w-10')}>#</th>
                      <th className={thCls}>Candidate</th>
                      <th className={cx(thCls, 'text-center')}>AI match</th>
                      <th className={cx(thCls, 'text-center')}>ATS</th>
                      <th className={thCls}>Stage</th>
                      <th className={thCls}>Applied</th>
                      <th className={cx(thCls, 'text-right')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {view.map((a, i) => (
                      <React.Fragment key={a.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className={cx(tdCls, 'text-slate-400 tabular-nums')}>
                            {sort === 'score' && ranked && a.aiScore !== null && i < 3
                              ? <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                              : i + 1}
                          </td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={people[a.seekerId]?.name} src={people[a.seekerId]?.img} size={32} />
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-900 truncate">{nameOf(a)}
                                  {a.autoRejected && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">System rejected</span>}
                                  {a.companyOverride && !a.autoRejected && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">Override</span>}
                                </p>
                                <a href={a.cvUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#0025B8] hover:underline">Open CV ↗</a>
                              </div>
                            </div>
                          </td>
                          <td className={tdCls}>
                            <div className="flex items-center justify-center gap-1.5">
                              <ScoreRing value={a.aiScore} />
                              {a.atsBreakdown && (
                                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className={iconBtn} aria-label="Show AI insight">
                                  {expanded === a.id ? <ChevronDown className="w-4 h-4 text-[#0F9DE4]" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={tdCls}><div className="flex justify-center"><ScoreRing value={a.atsScore} /></div></td>
                          <td className={tdCls}><StagePill status={a.status} /></td>
                          <td className={cx(tdCls, 'text-slate-500 whitespace-nowrap')}>{relTime(a.createdAt)}</td>
                          <td className={tdCls}>
                            {a.status === 'REJECTED' && !a.autoRejected ? (
                              <p className="text-right text-[11px] text-slate-400 max-w-[180px] ml-auto truncate" title={a.rejectionReason ?? ''}>{a.rejectionReason}</p>
                            ) : (
                              <div className="flex items-center justify-end gap-0.5">
                                {a.status !== 'SHORTLISTED' && a.status !== 'INTERVIEW' && (
                                  <button onClick={() => handleShortlist(a)} title={a.autoRejected ? 'Shortlist anyway' : 'Shortlist'} className={cx(iconBtn, 'hover:!bg-violet-50 hover:!text-violet-700')}><CheckCircle2 className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => setScheduleTarget(a)} title={a.autoRejected ? 'Interview anyway' : 'Schedule interview'} className={cx(iconBtn, 'hover:!bg-sky-50 hover:!text-sky-700')}><CalendarClock className="w-4 h-4" /></button>
                                {!a.autoRejected && <button onClick={() => setRejectTarget(a)} title="Reject" className={cx(iconBtn, 'hover:!bg-rose-50 hover:!text-rose-600')}><XCircle className="w-4 h-4" /></button>}
                              </div>
                            )}
                          </td>
                        </tr>
                        {expanded === a.id && a.atsBreakdown && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={7} className="px-6 py-4">
                              {a.autoRejected && (
                                <div className="mb-3 max-w-4xl rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 leading-relaxed">
                                  <b>Rejected by the system.</b>{' '}
                                  {a.atsBreakdown.screening
                                    ? `Match ${Math.round(a.atsBreakdown.screening.score)}% is below this job's minimum of ${a.atsBreakdown.screening.threshold}%.`
                                    : (a.rejectionReason ?? '')}{' '}
                                  You can still shortlist or interview this candidate with the buttons on the right.
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mb-2"><ThumbsUp className="w-3.5 h-3.5" /> Strengths</p>
                                  <ul className="space-y-1">{(a.atsBreakdown.strengths ?? []).length === 0 ? <li className="text-xs text-slate-400">Not specified</li> : (a.atsBreakdown.strengths ?? []).map((s, k) => <li key={k} className="text-xs text-slate-600 flex gap-2"><span className="text-emerald-500">•</span>{s}</li>)}</ul>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 mb-2"><ThumbsDown className="w-3.5 h-3.5" /> Gaps</p>
                                  <ul className="space-y-1">{(a.atsBreakdown.weaknesses ?? []).length === 0 ? <li className="text-xs text-slate-400">Not specified</li> : (a.atsBreakdown.weaknesses ?? []).map((w, k) => <li key={k} className="text-xs text-slate-600 flex gap-2"><span className="text-rose-400">•</span>{w}</li>)}</ul>
                                </div>
                              </div>
                              {a.atsBreakdown.recommendation && (
                                <p className="mt-3 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3.5 max-w-4xl leading-relaxed">
                                  <b className="text-slate-900 inline-flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Recommendation:</b> {a.atsBreakdown.recommendation}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Panel>

        <div className="xl:col-span-3 space-y-4">
          <Panel title="Score distribution" subtitle="Ranked applicants" icon={<Trophy className="w-3.5 h-3.5" />}>
            {scored.length === 0 ? <EmptyNote text="No scores yet. Run Smart Rank." /> : (
              <ul className="space-y-3">
                {bands.map(b => (
                  <li key={b.label}>
                    <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-600">{b.label}%</span><span className="tabular-nums text-slate-500"><b className="text-slate-900">{b.n}</b></span></div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(b.n / scored.length) * 100}%`, background: b.color }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="How ranking works" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <p className="text-xs text-slate-500 leading-relaxed">Smart Rank compares each CV with this job’s description and requirements. The same CV and job always give the same score. Treat it as a first filter, then review profiles yourself.</p>
          </Panel>
        </div>
      </div>

      {scheduleTarget && (
        <InterviewScheduleModal applicationId={scheduleTarget.id} candidateName={nameOf(scheduleTarget)}
          onClose={() => setScheduleTarget(null)}
          onScheduled={() => { load(); flash('ok', 'Interview scheduled. Invite email sent.'); }} />
      )}
      {rejectTarget && (
        <RejectReasonModal applicationId={rejectTarget.id} candidateName={nameOf(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { load(); flash('ok', 'Candidate rejected. Notification email sent.'); }} />
      )}
      <Toast toast={toast} />
    </div>
  );
}
