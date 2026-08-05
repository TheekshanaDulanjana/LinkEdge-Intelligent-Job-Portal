'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Download, FileDown, Users, Clock, MessageSquare, CheckCircle2,
  MapPin, ExternalLink, GraduationCap, Briefcase, Award, Wrench,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import EmptyState from '@/components/enterprise/EmptyState';
import CandidateDetailSkeleton from '@/components/enterprise/skeletons/CandidateDetailSkeleton';
import {
  fetchCandidatesSummary, fetchCandidates, fetchCandidateProfile, updateCandidateStage,
  CandidatesSummary, CandidateRow, CandidateProfile,
} from '@/lib/candidates';

const STAGES = ['ALL', 'PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Pending', REVIEWING: 'Under Review', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', REJECTED: 'Rejected',
};
const STAGE_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  REVIEWING: 'bg-blue-50 text-blue-600',
  SHORTLISTED: 'bg-purple-50 text-purple-600',
  INTERVIEW: 'bg-amber-50 text-amber-600',
  REJECTED: 'bg-red-50 text-red-500',
};

const TABS = ['Overview', 'Education', 'Experience', 'Skills', 'Certifications'] as const;
type Tab = typeof TABS[number];

export default function CandidatesPage() {
  const [summary, setSummary]       = useState<CandidatesSummary | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [stage, setStage]           = useState('ALL');

  const [selected, setSelected]     = useState<CandidateRow | null>(null);
  const [profile, setProfile]       = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('Overview');

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCandidates({ search, stage });
      setCandidates(res.candidates);
      if (!selected && res.candidates.length > 0) {
        selectCandidate(res.candidates[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line
  }, [search, stage]);

  useEffect(() => { fetchCandidatesSummary().then(setSummary).catch(console.error); }, []);
  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  async function selectCandidate(c: CandidateRow) {
    setSelected(c);
    setActiveTab('Overview');
    setProfileLoading(true);
    try {
      const p = await fetchCandidateProfile(c.seekerId);
      setProfile(p);
    } catch (e) { console.error(e); setProfile(null); }
    finally { setProfileLoading(false); }
  }

  async function handleStageChange(newStage: string) {
    if (!selected) return;
    try {
      await updateCandidateStage(selected.applicationId, newStage);
      setSelected({ ...selected, status: newStage });
      setCandidates(prev => prev.map(c => c.applicationId === selected.applicationId ? { ...c, status: newStage } : c));
    } catch (e) { console.error(e); }
  }

  return (
    <div>
      <PageHeader
        title="All Candidates"
        description="Review applicants, evaluate skills, and manage the hiring pipeline."
        actions={
          <>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <FileDown className="w-4 h-4" /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Applicants" value={summary?.totalApplicants ?? '—'} icon={Users} change={summary?.newToday} changeLabel="today" iconColor="indigo" />
        <StatCard label="Under Review"     value={summary?.underReview ?? '—'}     icon={Clock} iconColor="amber" />
        <StatCard label="Interviewing"     value={summary?.interviewing ?? '—'}    icon={MessageSquare} changeLabel={summary?.interviewsToday ? `${summary.interviewsToday} today` : undefined} iconColor="purple" />
        <StatCard label="Hired"            value={summary?.hired ?? '—'}           icon={CheckCircle2} change={summary?.hiredThisWeek} changeLabel="this week" iconColor="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Candidate list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: 720 }}>
          <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full transition-colors
                    ${stage === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {s === 'ALL' ? 'All Stage' : STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
              </div>
            ) : candidates.length === 0 ? (
              <EmptyState icon={Users} title="No candidates found" description="Try adjusting your search or stage filter." />
            ) : (
              candidates.map(c => (
                <button
                  key={c.applicationId}
                  onClick={() => selectCandidate(c)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
                    ${selected?.applicationId === c.applicationId ? 'bg-indigo-50/60' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {c.seekerId.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.jobTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(c.appliedDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[c.status]}`}>
                    {STAGE_LABELS[c.status] ?? c.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Candidate detail */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          {!selected ? (
            <EmptyState icon={Users} title="Select a candidate" description="Choose a candidate from the list to view their full profile." />
          ) : profileLoading ? (
            <CandidateDetailSkeleton />
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {profile?.profile.profileImageUrl ? (
                    <img src={profile.profile.profileImageUrl} className="w-14 h-14 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-semibold">
                      {profile?.profile.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile?.profile.fullName ?? 'Unknown candidate'}</h3>
                    <p className="text-sm text-gray-500">{selected.jobTitle}</p>
                    {profile?.profile.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {profile.profile.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
                  >
                    {STAGES.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                  <button
                    onClick={() => handleStageChange('INTERVIEW')}
                    className="text-xs font-medium bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700"
                  >
                    Schedule Interview
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0
                      ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="pt-5">
                {activeTab === 'Overview' && (
                  <div className="space-y-5">
                    {profile?.profile.professionalSummary && (
                      <p className="text-sm text-gray-600 leading-relaxed">{profile.profile.professionalSummary}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Experience Level</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {profile?.resume?.experienceYears ? `${profile.resume.experienceYears}+ Years` : 'Entry Level'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">AI / ATS Match</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {selected.atsScore ? `${selected.atsScore.toFixed(0)}%` : selected.aiScore ? `${selected.aiScore.toFixed(0)}%` : 'Not scored'}
                        </p>
                      </div>
                    </div>
                    {selected.cvUrl && (
                      <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">Resume Preview</p>
                          <p className="text-xs text-gray-400">Uploaded document on file</p>
                        </div>
                        <a href={selected.cvUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
                          Full View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Education' && (
                  <div className="space-y-3">
                    {(!profile?.resume?.education || profile.resume.education.length === 0) ? (
                      <EmptyState icon={GraduationCap} title="No education data" description="Candidate has not uploaded a parsed resume yet." />
                    ) : profile.resume.education.map((e, i) => (
                      <div key={i} className="flex gap-3 border-b border-gray-50 pb-3 last:border-0">
                        <GraduationCap className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.degree ?? 'Degree'}</p>
                          <p className="text-xs text-gray-400">{e.institution} {e.year && `· ${e.year}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Experience' && (
                  <div className="space-y-3">
                    {(!profile?.resume?.experience || profile.resume.experience.length === 0) ? (
                      <EmptyState icon={Briefcase} title="No experience data" description="Candidate has not uploaded a parsed resume yet." />
                    ) : profile.resume.experience.map((e, i) => (
                      <div key={i} className="flex gap-3 border-b border-gray-50 pb-3 last:border-0">
                        <Briefcase className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{e.title ?? 'Role'}</p>
                          <p className="text-xs text-gray-400">{e.company} {e.duration && `· ${e.duration}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Skills' && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" /> Core Technical Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(profile?.resume?.skills ?? []).length === 0
                          ? <p className="text-xs text-gray-400">No skills extracted yet.</p>
                          : profile!.resume!.skills.map(s => (
                            <span key={s} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">{s}</span>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Certifications' && (
                  <div className="flex flex-wrap gap-1.5">
                    {(profile?.resume?.certifications ?? []).length === 0
                      ? <EmptyState icon={Award} title="No certifications" description="No certifications were found on this candidate's resume." />
                      : profile!.resume!.certifications.map(c => (
                        <span key={c} className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" /> {c}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}