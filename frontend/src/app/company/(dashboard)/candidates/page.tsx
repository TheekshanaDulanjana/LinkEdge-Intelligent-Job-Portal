'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Users, Clock, MessageSquare, CheckCircle2, MapPin, ExternalLink, GraduationCap,
  Briefcase, Award, Wrench, Eye, Globe, Code2, Palette, Download, CalendarClock, XCircle,
  LayoutList, Columns3, FileText, Mail,
} from 'lucide-react';
import {
  fetchCandidatesSummary, fetchCandidates, fetchCandidateProfile, updateCandidateStage,
  fetchCandidateCvFile, fetchCandidateAnalysis, CandidatesSummary, CandidateRow, CandidateProfile,
  CandidateAnalysisData,
} from '@/lib/candidates';
import { OverviewTab, ExperienceTab, EducationTab, SkillsTab } from '@/components/enterprise/CandidateAnalysis';
import InterviewScheduleModal from '@/components/enterprise/InterviewScheduleModal';
import RejectReasonModal from '@/components/enterprise/RejectReasonModal';
import {
  Panel, KpiTile, EmptyNote, ErrorNote, PanelSkeleton, ScoreRing, cx, fmtNum, relTime,
} from '@/components/enterprise/dashboard/primitives';
import {
  PageHead, Segmented, Pagination, Drawer, Modal, Toast, Avatar, StagePill, STAGE_META, useHideFooter,
  inputCls, selectCls, btnPrimary, btnSecondary, thCls, tdCls,
} from '@/components/enterprise/dashboard/kit';

const STAGES = ['ALL', 'PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
const BOARD_COLUMNS = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
const MOVABLE = ['PENDING', 'REVIEWING', 'SHORTLISTED'];
const TABS = ['Overview', 'Experience', 'Education', 'Skills'] as const;
type Tab = (typeof TABS)[number];
const PAGE_SIZE = 20;

const best = (c: CandidateRow) => Math.max(c.aiScore ?? -1, c.atsScore ?? -1);

export default function CandidatesPage() {
  useHideFooter();

  const [summary, setSummary] = useState<CandidatesSummary | null>(null);
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('ALL');
  const [view, setView] = useState<'table' | 'board'>('table');
  const [sort, setSort] = useState<'recent' | 'score'>('recent');

  // Names live in the auth service, so they are fetched per row and cached.
  const [names, setNames] = useState<Record<string, { name: string; img?: string | null; location?: string | null }>>({});
  const nameCache = useRef<Set<string>>(new Set());

  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CandidateAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [tab, setTab] = useState<Tab>('Overview');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setSearchInput(q); setSearch(q); }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadSummary = useCallback(() => { fetchCandidatesSummary().then(setSummary).catch(() => {}); }, []);

  const loadNames = useCallback((list: CandidateRow[]) => {
    const todo = Array.from(new Set(list.map(c => c.seekerId))).filter(id => !nameCache.current.has(id));
    todo.forEach(id => nameCache.current.add(id));
    todo.forEach(id => {
      fetchCandidateProfile(id)
        .then(p => setNames(prev => ({ ...prev, [id]: { name: p.profile.fullName, img: assetUrl(p.profile.profileImageUrl), location: p.profile.location } })))
        .catch(() => nameCache.current.delete(id));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchCandidates({ search, stage, page });
      setRows(res.candidates);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      loadNames(res.candidates);
    } catch (e) { console.error(e); setError(true); }
    finally { setLoading(false); }
  }, [search, stage, page, loadNames]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { load(); }, [load]);

  const view_rows = useMemo(
    () => (sort === 'score' ? [...rows].sort((a, b) => best(b) - best(a)) : rows),
    [rows, sort],
  );

  async function openCandidate(c: CandidateRow) {
    setSelected(c);
    setTab('Overview');
    setProfile(null);
    setAnalysis(null);
    setAnalysisError(false);
    setProfileLoading(true);
    setAnalysisLoading(true);

    fetchCandidateProfile(c.seekerId)
      .then(setProfile)
      .catch(e => console.error(e))
      .finally(() => setProfileLoading(false));

    // Full CV analysis: parsed CV, ATS breakdown and AI match for this job.
    fetchCandidateAnalysis(c.applicationId)
      .then(res => {
        setAnalysis(res);
        if (res.hasResume) {
          const ai = res.aiMatch.score;
          const ats = res.ats.overall_score;
          setRows(rs => rs.map(x => (x.applicationId === c.applicationId ? { ...x, aiScore: ai, atsScore: ats } : x)));
          setSelected(cur => (cur && cur.applicationId === c.applicationId ? { ...cur, aiScore: ai, atsScore: ats } : cur));
        }
      })
      .catch(e => { console.error(e); setAnalysisError(true); })
      .finally(() => setAnalysisLoading(false));
  }

  async function moveStage(c: CandidateRow, next: string) {
    if (c.status === next) return;
    const prev = c.status;
    const lift = c.autoRejected ? { autoRejected: false, companyOverride: true, rejectionReason: null } : {};
    setRows(r => r.map(x => (x.applicationId === c.applicationId ? { ...x, status: next, ...lift } : x)));
    if (selected?.applicationId === c.applicationId) setSelected({ ...c, status: next, ...lift });
    try {
      await updateCandidateStage(c.applicationId, next);
      flash('ok', `Moved to ${STAGE_META[next]?.label ?? next}.`);
      loadSummary();
    } catch (e) {
      console.error(e);
      setRows(r => r.map(x => (x.applicationId === c.applicationId ? { ...x, status: prev, autoRejected: c.autoRejected, companyOverride: c.companyOverride } : x)));
      if (selected?.applicationId === c.applicationId) setSelected({ ...c, status: prev });
      flash('err', (e as any)?.response?.data?.message || 'Could not change the stage.');
    }
  }

  async function openCv() {
    if (!selected) return;
    setCvOpen(true);
    setCvLoading(true);
    try { setCvUrl(URL.createObjectURL(await fetchCandidateCvFile(selected.seekerId))); }
    catch (e) { console.error(e); }
    finally { setCvLoading(false); }
  }
  function closeCv() {
    setCvOpen(false);
    if (cvUrl) { URL.revokeObjectURL(cvUrl); setCvUrl(null); }
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const out = [['Name', 'Applied for', 'Stage', 'AI score', 'ATS score', 'Applied', 'Interview']];
    view_rows.forEach(c => out.push([
      names[c.seekerId]?.name ?? c.seekerId, c.jobTitle, STAGE_META[c.status]?.label ?? c.status,
      c.aiScore != null ? c.aiScore.toFixed(0) : '', c.atsScore != null ? c.atsScore.toFixed(0) : '',
      new Date(c.appliedDate).toISOString().slice(0, 10), c.interviewDate ? new Date(c.interviewDate).toISOString().slice(0, 10) : '',
    ]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const nameOf = (c: CandidateRow) => names[c.seekerId]?.name ?? `Candidate ${c.seekerId.slice(0, 6)}`;
  const p = profile?.profile;
  const r = profile?.resume;
  const ana = analysis && analysis.hasResume ? analysis : null;

  const Link_ = ({ href, icon, label }: { href?: string | null; icon: React.ReactNode; label: string }) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#0084DA] hover:text-[#0063CE] transition-colors">
        {icon}{label}<ExternalLink className="w-3 h-3 text-slate-300" />
      </a>
    ) : (
      <span className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-dashed border-slate-200 text-xs text-slate-300">{icon}{label} not added</span>
    );

  return (
    <div className="space-y-5 pb-10 text-slate-800">
      <PageHead
        eyebrow="Recruitment"
        title="Candidates"
        description="Everyone who applied to your jobs. Review profiles, compare AI and ATS scores, and move people through the pipeline."
        actions={<button onClick={exportCsv} disabled={rows.length === 0} className={btnSecondary}><Download className="w-3.5 h-3.5" /> Export view</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total applicants" icon={<Users className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.totalApplicants)} delta={summary ? { value: summary.newToday, label: 'new today' } : null} />
        <KpiTile label="Under review" icon={<Clock className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.underReview)} hint="Waiting for a decision" />
        <KpiTile label="Interviewing" icon={<MessageSquare className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.interviewing)} hint={summary?.interviewsToday ? `${summary.interviewsToday} today` : 'None today'} />
        <KpiTile label="Hired" icon={<CheckCircle2 className="w-3.5 h-3.5" />} loading={!summary}
          value={fmtNum(summary?.hired)} delta={summary ? { value: summary.hiredThisWeek, label: 'this week' } : null} />
      </div>

      <Panel title="Pipeline" subtitle={loading ? 'Loading…' : `${total} candidate${total === 1 ? '' : 's'}`} icon={<Users className="w-3.5 h-3.5" />}
        actions={<Segmented size="sm" value={view} onChange={setView} options={[
          { value: 'table', label: <span className="inline-flex items-center gap-1.5"><LayoutList className="w-3.5 h-3.5" />Table</span> },
          { value: 'board', label: <span className="inline-flex items-center gap-1.5"><Columns3 className="w-3.5 h-3.5" />Board</span> },
        ]} />} noPad>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div className="overflow-x-auto">
            <Segmented value={stage} onChange={v => { setStage(v); setPage(1); }}
              options={STAGES.map(s => ({ value: s, label: s === 'ALL' ? 'All stages' : STAGE_META[s].label }))} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search candidates" className={cx(inputCls, 'pl-9 sm:w-64')} />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as 'recent' | 'score')} className={cx(selectCls, 'sm:w-40')}>
              <option value="recent">Most recent</option>
              <option value="score">Highest score</option>
            </select>
          </div>
        </div>

        {loading ? <div className="p-5"><PanelSkeleton rows={7} /></div>
          : error ? <ErrorNote text="Could not load candidates. Is the application service (port 3003) running?" onRetry={load} />
          : rows.length === 0 ? <EmptyNote text="No candidates match this view." icon={<Users className="w-6 h-6" />} />
          : view === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={thCls}>Candidate</th>
                    <th className={thCls}>Applied for</th>
                    <th className={cx(thCls, 'text-center')} title="AI match: how well this person fits the role">AI match</th>
                    <th className={cx(thCls, 'text-center')} title="ATS score: how well the CV matches the requirements">ATS</th>
                    <th className={thCls}>Stage</th>
                    <th className={thCls}>Applied</th>
                    <th className={thCls}>Interview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view_rows.map(c => (
                    <tr key={c.applicationId} onClick={() => openCandidate(c)}
                      className={cx('cursor-pointer hover:bg-slate-50/80 transition-colors', selected?.applicationId === c.applicationId && 'bg-brand-50/60')}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={names[c.seekerId]?.name} src={names[c.seekerId]?.img} size={32} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 truncate">{nameOf(c)}
                              {c.autoRejected && <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">System rejected</span>}
                              {c.companyOverride && !c.autoRejected && <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">Override</span>}
                            </p>
                            {names[c.seekerId]?.location && <p className="text-xs text-slate-500 truncate">{names[c.seekerId]?.location}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={cx(tdCls, 'text-slate-600')}>{c.jobTitle}</td>
                      <td className={tdCls}><div className="flex justify-center"><ScoreRing value={c.aiScore} /></div></td>
                      <td className={tdCls}><div className="flex justify-center"><ScoreRing value={c.atsScore} /></div></td>
                      <td className={tdCls}><StagePill status={c.status} /></td>
                      <td className={cx(tdCls, 'text-slate-600 whitespace-nowrap')}>{relTime(c.appliedDate)}</td>
                      <td className={cx(tdCls, 'text-slate-600 whitespace-nowrap')}>
                        {c.interviewDate ? new Date(c.interviewDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : <span className="text-slate-300">–</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 overflow-x-auto">
              <div className="grid grid-flow-col auto-cols-[260px] gap-3 min-w-max">
                {BOARD_COLUMNS.map(col => {
                  const items = view_rows.filter(c => c.status === col);
                  return (
                    <div key={col} className="bg-slate-50 rounded-lg border border-slate-200 flex flex-col max-h-[640px]">
                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <span className="w-2 h-2 rounded-full" style={{ background: STAGE_META[col].color }} />{STAGE_META[col].label}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 tabular-nums">{items.length}</span>
                      </div>
                      <div className="p-2 space-y-2 overflow-y-auto">
                        {items.length === 0 && <p className="text-xs text-slate-300 text-center py-6">Empty</p>}
                        {items.map(c => (
                          <div key={c.applicationId} className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:shadow-sm transition-all">
                            <button onClick={() => openCandidate(c)} className="w-full text-left cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Avatar name={names[c.seekerId]?.name} src={names[c.seekerId]?.img} size={26} />
                                <p className="text-xs font-semibold text-slate-900 truncate">{nameOf(c)}</p>
                              </div>
                              <p className="text-xs text-slate-600 mt-1.5 truncate">{c.jobTitle}</p>
                            </button>
                            <div className="flex items-center justify-between mt-2.5">
                              <div className="flex items-center gap-1.5"><ScoreRing value={c.aiScore} size={30} /><ScoreRing value={c.atsScore} size={30} /></div>
                              {MOVABLE.includes(c.status) && (
                                <select value={c.status} onChange={e => moveStage(c, e.target.value)} onClick={e => e.stopPropagation()}
                                  className="h-7 text-xs rounded-md border border-slate-200 bg-white px-1.5 text-slate-600 cursor-pointer focus:outline-none">
                                  {MOVABLE.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {stage === 'ALL' && total > rows.length && <p className="text-xs text-slate-500 mt-3">Showing this page only. Use the pager below for more.</p>}
            </div>
          )}
        {!loading && !error && <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />}
      </Panel>

      {/* ---------------- Candidate drawer ---------------- */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? nameOf(selected) : ''} subtitle={selected?.jobTitle} width="max-w-2xl">
        {selected && (
          <div>
            <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start gap-4">
                <Avatar name={p?.fullName ?? names[selected.seekerId]?.name} src={assetUrl(p?.profileImageUrl)} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900">{p?.fullName ?? nameOf(selected)}</h3>
                    <StagePill status={selected.status} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">Applied for <b className="text-slate-700">{selected.jobTitle}</b> · {relTime(selected.appliedDate)}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                    {p?.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>}
                    {p?.phone && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{p.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5"><ScoreRing value={selected.aiScore} size={40} /><div><p className="text-xs uppercase tracking-wide font-semibold text-slate-500">AI match</p><p className="text-xs font-semibold text-slate-800">{selected.aiScore != null ? `${selected.aiScore.toFixed(0)}%` : analysisLoading ? 'Scoring…' : 'No CV'}</p></div></div>
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5"><ScoreRing value={selected.atsScore} size={40} /><div><p className="text-xs uppercase tracking-wide font-semibold text-slate-500">ATS score</p><p className="text-xs font-semibold text-slate-800">{selected.atsScore != null ? `${selected.atsScore.toFixed(0)}%` : analysisLoading ? 'Scoring…' : 'No CV'}</p></div></div>
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5"><ScoreRing value={ana?.analysis.cv_health.score} size={40} /><div><p className="text-xs uppercase tracking-wide font-semibold text-slate-500">CV quality</p><p className="text-xs font-semibold text-slate-800">{ana ? `${ana.analysis.cv_health.score}%` : analysisLoading ? 'Reading…' : '–'}</p></div></div>
                <div className="bg-white rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Experience</p><p className="text-sm font-semibold text-slate-800 mt-1">{ana ? (ana.analysis.experience_years > 0 ? `${ana.analysis.experience_years} yrs` : 'Entry level') : r?.experienceYears ? `${r.experienceYears}+ yrs` : '–'}</p></div>
              </div>

              {selected.status === 'REJECTED' && selected.autoRejected && (
                <p className="mt-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3 leading-relaxed">
                  <b>Rejected by the system.</b> This CV scored below the minimum match for the job. The candidate was told why. If you think they are worth meeting, you can still interview or shortlist them.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {MOVABLE.includes(selected.status) && (
                  <select value={selected.status} onChange={e => moveStage(selected, e.target.value)} className={cx(selectCls, 'w-40')}>
                    {MOVABLE.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                  </select>
                )}
                {selected.status === 'REJECTED' && selected.autoRejected && (
                  <>
                    <button onClick={() => setScheduleOpen(true)} className={btnPrimary}><CalendarClock className="w-3.5 h-3.5" /> Interview anyway</button>
                    <button onClick={() => moveStage(selected, 'SHORTLISTED')} className={btnSecondary}><CheckCircle2 className="w-3.5 h-3.5" /> Shortlist anyway</button>
                  </>
                )}
                {selected.status !== 'REJECTED' && (
                  <>
                    <button onClick={() => setScheduleOpen(true)} className={btnPrimary}><CalendarClock className="w-3.5 h-3.5" /> Schedule interview</button>
                    <button onClick={() => setRejectOpen(true)} className={cx(btnSecondary, 'hover:!text-rose-600 hover:!border-rose-200')}><XCircle className="w-3.5 h-3.5" /> Reject</button>
                  </>
                )}
                <button onClick={openCv} disabled={!r} className={btnSecondary}><Eye className="w-3.5 h-3.5" /> View CV</button>
              </div>
            </div>

            <div className="flex gap-1 px-5 border-b border-slate-100 overflow-x-auto">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cx('px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap',
                    tab === t ? 'border-[#0063CE] text-[#0063CE]' : 'border-transparent text-slate-500 hover:text-slate-700')}>{t}</button>
              ))}
            </div>

            <div className="p-5">
              {analysisLoading && !ana ? <PanelSkeleton rows={8} /> : ana ? (
                <>
                  {tab === 'Overview' && <OverviewTab d={ana} profile={profile} onOpenCv={openCv} />}
                  {tab === 'Experience' && <ExperienceTab d={ana} />}
                  {tab === 'Education' && <EducationTab d={ana} />}
                  {tab === 'Skills' && <SkillsTab d={ana} />}
                </>
              ) : profileLoading ? <PanelSkeleton rows={6} /> : (
                <>
                  {analysisError && <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Detailed CV analysis is unavailable (is the ATS service on port 8003 running?). Showing the saved profile instead.</p>}
                  {analysis && !analysis.hasResume && <p className="mb-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">This candidate has no parsed CV yet, so there is no AI or ATS score.</p>}
                  {tab === 'Overview' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Professional summary</p>
                        <p className="text-[13px] text-slate-600 leading-relaxed">{p?.professionalSummary || <span className="text-slate-300">No summary added.</span>}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 p-3"><p className="text-slate-500">Work status</p><p className="font-semibold text-slate-800 mt-0.5">{p?.workStatus?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) || '–'}</p></div>
                        <div className="rounded-lg border border-slate-200 p-3"><p className="text-slate-500">Interest area</p><p className="font-semibold text-slate-800 mt-0.5">{p?.interestArea || '–'}</p></div>
                        {selected.interviewDate && <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 col-span-2"><p className="text-brand-700">Interview scheduled</p><p className="font-semibold text-slate-800 mt-0.5">{new Date(selected.interviewDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Links</p>
                        <div className="flex flex-wrap gap-2">
                          <Link_ href={p?.websiteUrl} icon={<Globe className="w-3.5 h-3.5 text-[#0084DA]" />} label="Website" />
                          <Link_ href={p?.githubUrl} icon={<Code2 className="w-3.5 h-3.5 text-[#0084DA]" />} label="GitHub" />
                          <Link_ href={p?.behanceUrl} icon={<Palette className="w-3.5 h-3.5 text-[#0084DA]" />} label="Behance" />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4" /></span>
                          <div><p className="text-xs font-semibold text-slate-800">{r?.originalName ?? 'No resume uploaded'}</p>{r && <p className="text-xs text-slate-500">{(r.fileSize / 1024).toFixed(0)} KB · {r.isParsed ? 'Parsed' : 'Not parsed yet'}</p>}</div></div>
                        <button onClick={openCv} disabled={!r} className={btnSecondary}>Preview</button>
                      </div>
                    </div>
                  )}
                  {tab === 'Experience' && (!r?.experience?.length
                    ? <EmptyNote text="No experience found on the parsed resume." icon={<Briefcase className="w-6 h-6" />} />
                    : <ol className="relative border-l border-slate-200 ml-2 space-y-5">
                        {r.experience.map((e, i) => (
                          <li key={i} className="pl-5 relative">
                            <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0084DA] ring-4 ring-white" />
                            <p className="text-[13px] font-semibold text-slate-900">{e.title ?? 'Role'}</p>
                            <p className="text-xs text-slate-600">{[e.company, e.duration].filter(Boolean).join(' · ')}</p>
                            {e.description && <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{e.description}</p>}
                          </li>
                        ))}
                      </ol>)}
                  {tab === 'Education' && (!r?.education?.length
                    ? <EmptyNote text="No education found on the parsed resume." icon={<GraduationCap className="w-6 h-6" />} />
                    : <ul className="space-y-3">{r.education.map((e, i) => (
                        <li key={i} className="flex gap-3 rounded-lg border border-slate-200 p-3.5">
                          <span className="w-9 h-9 rounded-lg bg-slate-50 text-[#0063CE] flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4" /></span>
                          <div><p className="text-[13px] font-semibold text-slate-900">{e.degree ?? 'Degree'}</p><p className="text-xs text-slate-600">{[e.institution, e.year].filter(Boolean).join(' · ')}</p></div>
                        </li>))}</ul>)}
                  {tab === 'Skills' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> Skills</p>
                        {r?.skills?.length ? <div className="flex flex-wrap gap-1.5">{r.skills.map(s => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">{s}</span>)}</div> : <p className="text-xs text-slate-300">No skills extracted.</p>}
                      </div>
                      {!!r?.technologies?.length && <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Technologies</p>
                        <div className="flex flex-wrap gap-1.5">{r.technologies.map(s => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-md bg-brand-50 text-brand-700">{s}</span>)}</div>
                      </div>}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Certifications</p>
                        {r?.certifications?.length ? <div className="flex flex-wrap gap-1.5">{r.certifications.map(c => <span key={c} className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-800">{c}</span>)}</div> : <p className="text-xs text-slate-300">None listed.</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {selected && scheduleOpen && (
        <InterviewScheduleModal applicationId={selected.applicationId} candidateName={nameOf(selected)}
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => { setScheduleOpen(false); setSelected(null); load(); loadSummary(); flash('ok', 'Interview scheduled. Invite email sent.'); }} />
      )}
      {selected && rejectOpen && (
        <RejectReasonModal applicationId={selected.applicationId} candidateName={nameOf(selected)}
          onClose={() => setRejectOpen(false)}
          onRejected={() => { setRejectOpen(false); setSelected(null); load(); loadSummary(); flash('ok', 'Candidate rejected. Notification sent.'); }} />
      )}

      <Modal open={cvOpen} onClose={closeCv} title={`${p?.fullName ?? 'Candidate'} · CV`} width="max-w-4xl">
        <div className="h-[70vh] bg-slate-100 rounded-lg overflow-hidden">
          {cvLoading ? <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading CV…</div>
            : cvUrl ? <iframe src={cvUrl} title="CV preview" className="w-full h-full bg-white" />
            : <div className="h-full flex items-center justify-center text-xs text-slate-500">Could not load the CV.</div>}
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
