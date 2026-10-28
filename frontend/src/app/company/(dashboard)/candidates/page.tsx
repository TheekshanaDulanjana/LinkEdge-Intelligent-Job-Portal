'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search, Download, FileDown, Users, Clock, MessageSquare, CheckCircle2,
  MapPin, ExternalLink, GraduationCap, Briefcase, Award, Wrench, Eye, X,
  Globe, Globe2, Grid,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatCard from '@/components/enterprise/StatCard';
import EmptyState from '@/components/enterprise/EmptyState';
import CandidateDetailSkeleton from '@/components/enterprise/skeletons/CandidateDetailSkeleton';
import { Button } from '@/components/ui/button';
import {
  fetchCandidatesSummary, fetchCandidates, fetchCandidateProfile, updateCandidateStage,
  fetchCandidateCvFile,
  CandidatesSummary, CandidateRow, CandidateProfile,
} from '@/lib/candidates';

const STAGES = ['ALL', 'PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Pending', REVIEWING: 'Under Review', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', REJECTED: 'Rejected',
};
const STAGE_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-500 border-slate-200',
  REVIEWING: 'bg-sky-50 text-[#0025B8] border-sky-200',
  SHORTLISTED: 'bg-purple-50 text-purple-700 border-purple-200',
  INTERVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TABS = ['Overview', 'Education', 'Experience', 'Skills', 'Certifications'] as const;
type Tab = typeof TABS[number];

export default function CandidatesPage() {
  const [summary, setSummary]        = useState<CandidatesSummary | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading]        = useState(true);
  const [search, setSearch]          = useState('');
  const [stage, setStage]            = useState('ALL');

  const [selected, setSelected]      = useState<CandidateRow | null>(null);
  const [profile, setProfile]        = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab]    = useState<Tab>('Overview');

  // CV Preview modal state
  const [cvPreviewOpen, setCvPreviewOpen]       = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl]         = useState<string | null>(null);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);

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

  async function handleOpenCvPreview() {
    if (!selected) return;
    setCvPreviewOpen(true);
    setCvPreviewLoading(true);
    try {
      const blob = await fetchCandidateCvFile(selected.seekerId);
      setCvPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error('CV preview failed', e);
    } finally {
      setCvPreviewLoading(false);
    }
  }

  function handleCloseCvPreview() {
    setCvPreviewOpen(false);
    if (cvPreviewUrl) { URL.revokeObjectURL(cvPreviewUrl); setCvPreviewUrl(null); }
  }

  return (
    <div className="space-y-8 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title="All Candidates"
          description="Review applicants, evaluate skills, and manage the hiring pipeline."
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-sky-200 rounded-full text-[#0025B8] bg-white hover:bg-sky-50 transition-all shadow-xs cursor-pointer">
                <FileDown className="w-4 h-4 text-[#0F9DE4]" /> Export CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-sky-200 rounded-full text-[#0025B8] bg-white hover:bg-sky-50 transition-all shadow-xs cursor-pointer">
                <Download className="w-4 h-4 text-[#0F9DE4]" /> Export PDF
              </button>
            </div>
          }
        />
      </motion.div>

      {/* Stat Cards Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <StatCard label="Total Applicants" value={summary?.totalApplicants ?? '—'} icon={Users} change={summary?.newToday} changeLabel="today" iconColor="indigo" />
        <StatCard label="Under Review"     value={summary?.underReview ?? '—'}     icon={Clock} iconColor="amber" />
        <StatCard label="Interviewing"     value={summary?.interviewing ?? '—'}    icon={MessageSquare} changeLabel={summary?.interviewsToday ? `${summary.interviewsToday} today` : undefined} iconColor="purple" />
        <StatCard label="Hired"            value={summary?.hired ?? '—'}            icon={CheckCircle2} change={summary?.hiredThisWeek} changeLabel="this week" iconColor="green" />
      </motion.div>

      {/* Main Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Candidate List (5 Columns) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 overflow-hidden flex flex-col shadow-xl" 
          style={{ maxHeight: 740 }}
        >
          <div className="p-4 border-b border-sky-100 space-y-3.5 flex-shrink-0 bg-sky-50/30">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border border-sky-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 focus:border-[#0F9DE4] text-slate-800 shadow-xs transition-all"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer border shadow-xs ${
                    stage === s 
                      ? 'bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white border-transparent shadow-sm' 
                      : 'bg-white text-slate-600 border-sky-100 hover:bg-sky-50'
                  }`}
                >
                  {s === 'ALL' ? 'All Stages' : STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-sky-50">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-sky-50/60 rounded-2xl" />)}
              </div>
            ) : candidates.length === 0 ? (
              <EmptyState icon={Users} title="No candidates found" description="Try adjusting your search or stage filter." />
            ) : (
              candidates.map(c => (
                <button
                  key={c.applicationId}
                  onClick={() => selectCandidate(c)}
                  className={`w-full text-left flex items-center gap-3.5 px-5 py-4 hover:bg-sky-50/50 transition-colors cursor-pointer ${
                    selected?.applicationId === c.applicationId ? 'bg-sky-50/80 border-l-4 border-[#0F9DE4]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 text-[#0025B8] flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-xs">
                    {c.seekerId.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{c.jobTitle}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Applied {new Date(c.appliedDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 shadow-xs ${STAGE_COLORS[c.status]}`}>
                    {STAGE_LABELS[c.status] ?? c.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* RIGHT: Candidate Detail (7 Columns) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-7 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-xl"
        >
          {!selected ? (
            <EmptyState icon={Users} title="Select a candidate" description="Choose a candidate from the list to view their full profile." />
          ) : profileLoading ? (
            <CandidateDetailSkeleton />
          ) : (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sky-100">
                <div className="flex items-center gap-4">
                  {profile?.profile.profileImageUrl ? (
                    <img src={profile.profile.profileImageUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" alt="" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white flex items-center justify-center text-xl font-extrabold shadow-md">
                      {profile?.profile.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{profile?.profile.fullName ?? 'Unknown candidate'}</h3>
                    <p className="text-xs font-semibold text-[#0F9DE4]">{selected.jobTitle}</p>
                    {profile?.profile.location && (
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {profile.profile.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="text-xs font-bold border border-sky-200 rounded-2xl px-3.5 py-2.5 text-slate-700 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4]/20 cursor-pointer shadow-xs"
                  >
                    {STAGES.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => handleStageChange('INTERVIEW')}
                      variant="gradient"
                      className="text-xs font-bold rounded-full h-10 px-4 shadow-md cursor-pointer"
                    >
                      Schedule Interview
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1.5 border-b border-sky-100 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex-shrink-0 cursor-pointer ${
                      activeTab === tab 
                        ? 'border-[#0F9DE4] text-[#0025B8]' 
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="pt-2">
                {activeTab === 'Overview' && (
                  <div className="space-y-6">
                    {profile?.profile.professionalSummary && (
                      <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100">
                        <p className="text-[10px] font-bold text-[#0F9DE4] uppercase tracking-wider mb-1">Professional Summary</p>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{profile.profile.professionalSummary}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-sky-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Experience Level</p>
                        <p className="text-sm font-extrabold text-slate-900">
                          {profile?.resume?.experienceYears ? `${profile.resume.experienceYears}+ Years` : 'Entry Level'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-sky-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ATS Match</p>
                        <p className="text-sm font-extrabold text-[#0025B8]">
                          {selected.atsScore != null ? `${selected.atsScore.toFixed(0)}%` : 'Not scored'}
                        </p>
                      </div>
                    </div>

                    {/* Portfolio links with fallback debug chips */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portfolio & Links</p>
                      <div className="flex flex-wrap gap-2.5">
                        {profile?.profile?.websiteUrl ? (
                          <a href={profile.profile.websiteUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0025B8] bg-white border border-sky-100 px-3.5 py-2 rounded-xl flex items-center gap-2 hover:border-[#0F9DE4] hover:bg-sky-50 transition-colors shadow-xs">
                            <Globe className="w-3.5 h-3.5 text-[#0F9DE4]" />
                            Personal Website
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-slate-300" /> Website - not added
                          </span>
                        )}

                        {profile?.profile?.githubUrl ? (
                          <a href={profile.profile.githubUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0025B8] bg-white border border-sky-100 px-3.5 py-2 rounded-xl flex items-center gap-2 hover:border-[#0F9DE4] hover:bg-sky-50 transition-colors shadow-xs">
                            <Globe2 className="w-3.5 h-3.5 text-[#0F9DE4]" />
                            GitHub
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-2">
                            <Globe2 className="w-3.5 h-3.5 text-slate-300" /> GitHub - not added
                          </span>
                        )}

                        {profile?.profile?.behanceUrl ? (
                          <a href={profile.profile.behanceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0025B8] bg-white border border-sky-100 px-3.5 py-2 rounded-xl flex items-center gap-2 hover:border-[#0F9DE4] hover:bg-sky-50 transition-colors shadow-xs">
                            <Grid className="w-3.5 h-3.5 text-[#0F9DE4]" />
                            Behance
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-2">
                            <Grid className="w-3.5 h-3.5 text-slate-300" /> Behance - not added
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border border-sky-100 bg-white rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Resume Preview</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {profile?.resume ? 'Uploaded document available on file' : 'No resume uploaded yet'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenCvPreview}
                        disabled={!profile?.resume}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Preview CV <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'Education' && (
                  <div className="space-y-4">
                    {(!profile?.resume?.education || profile.resume.education.length === 0) ? (
                      <EmptyState icon={GraduationCap} title="No education data" description="Candidate has not uploaded a parsed resume yet." />
                    ) : profile.resume.education.map((e, i) => (
                      <div key={i} className="flex gap-4 bg-slate-50 p-4 rounded-2xl border border-sky-50 items-start">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0025B8] flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-900">{e.degree ?? 'Degree'}</p>
                          <p className="text-xs text-slate-500 font-medium">{e.institution} {e.year && `· ${e.year}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Experience' && (
                  <div className="space-y-4">
                    {(!profile?.resume?.experience || profile.resume.experience.length === 0) ? (
                      <EmptyState icon={Briefcase} title="No experience data" description="Candidate has not uploaded a parsed resume yet." />
                    ) : profile.resume.experience.map((e, i) => (
                      <div key={i} className="flex gap-4 bg-slate-50 p-4 rounded-2xl border border-sky-50 items-start">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0025B8] flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900">{e.title ?? 'Role'}</p>
                          <p className="text-xs text-slate-500 font-medium">{e.company} {e.duration && `· ${e.duration}`}</p>
                          {e.description && (
                            <p className="text-xs text-slate-500 font-medium leading-relaxed pt-1">{e.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'Skills' && (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-sky-100">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-[#0F9DE4]" /> Core Technical Competencies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(profile?.resume?.skills ?? []).length === 0
                        ? <p className="text-xs text-slate-400 font-medium">No skills extracted yet.</p>
                        : profile!.resume!.skills.map(s => (
                            <span key={s} className="text-xs font-bold bg-white text-[#0025B8] px-3 py-1.5 rounded-xl border border-sky-100 shadow-xs">{s}</span>
                          ))}
                    </div>
                  </div>
                )}

                {activeTab === 'Certifications' && (
                  <div className="flex flex-wrap gap-2">
                    {(profile?.resume?.certifications ?? []).length === 0
                      ? <EmptyState icon={Award} title="No certifications" description="No certifications were found on this candidate's resume." />
                      : profile!.resume!.certifications.map(c => (
                          <span key={c} className="text-xs font-bold bg-amber-50 text-amber-800 px-3.5 py-2 rounded-2xl border border-amber-200 flex items-center gap-2 shadow-xs">
                            <Award className="w-4 h-4 text-amber-600" /> {c}
                          </span>
                        ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </motion.div>

      </div>

      {/* CV Preview Modal */}
      {cvPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-sm">
                {profile?.profile.fullName ?? 'Candidate'}&apos;s CV
              </h3>
              <button onClick={handleCloseCvPreview} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100/60 p-4 overflow-hidden relative">
              {cvPreviewLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-white rounded-xl border border-slate-200">
                  <span className="w-6 h-6 border-2 border-[#0F9DE4] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading CV...</p>
                </div>
              ) : cvPreviewUrl ? (
                <iframe src={cvPreviewUrl} className="w-full h-full rounded-xl border border-slate-200/80 bg-white shadow-inner" title="Candidate CV Preview" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                  Could not load CV preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}