'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, CalendarClock, XCircle, TrendingUp,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatusBadge from '@/components/enterprise/StatusBadge';
import EmptyState from '@/components/enterprise/EmptyState';
import InterviewScheduleModal from '@/components/enterprise/InterviewScheduleModal';
import RejectReasonModal from '@/components/enterprise/RejectReasonModal';
import { Button } from '@/components/ui/button';
import { fetchJobApplicants, smartRank, shortlist, Applicant } from '@/lib/jobApplicants';

export default function JobApplicantsPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const [jobTitle, setJobTitle]     = useState('');
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [ranking, setRanking]       = useState(false);
  const [ranked, setRanked]         = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Applicant | null>(null);
  const [rejectTarget, setRejectTarget]     = useState<Applicant | null>(null);

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

  function flash(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJobApplicants(jobId);
      setJobTitle(res.job.title);
      setApplicants(res.applicants);
      setRanked(res.applicants.some(a => a.aiScore !== null));
    } catch (e) {
      console.error(e);
      flash('err', 'Failed to load applicants.');
    } finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  async function handleSmartRank() {
    setRanking(true);
    try {
      const res = await smartRank(jobId);
      setApplicants(res.applicants);
      setRanked(true);
      flash('ok', `Ranked ${res.ranked} candidate${res.ranked === 1 ? '' : 's'} successfully.`);
    } catch (e) {
      console.error(e);
      flash('err', 'Smart ranking failed. Please try again.');
    } finally { setRanking(false); }
  }

  async function handleShortlist(a: Applicant) {
    try {
      await shortlist(a.id);
      setApplicants(prev => prev.map(x => x.id === a.id ? { ...x, status: 'SHORTLISTED' } : x));
      flash('ok', 'Candidate shortlisted. Notification email sent.');
    } catch (e) {
      console.error(e);
      flash('err', 'Failed to shortlist candidate.');
    }
  }

  function scoreColor(score: number | null) {
    if (score === null) return 'text-slate-300';
    if (score >= 75) return 'text-emerald-600 font-extrabold';
    if (score >= 50) return 'text-amber-600 font-extrabold';
    return 'text-rose-500 font-extrabold';
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
          title={jobTitle ? `Applicants - ${jobTitle}` : 'Applicants'}
          description="Review candidates, run AI ranking, and manage the hiring pipeline for this role."
          actions={
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSmartRank}
                disabled={ranking || applicants.length === 0}
                variant="gradient"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-full shadow-md disabled:opacity-50 cursor-pointer h-10"
              >
                <Sparkles className="w-4 h-4" />
                {ranking ? 'Ranking Candidates...' : 'Smart Ranking'}
              </Button>
            </motion.div>
          }
        />
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 text-xs font-semibold px-4 py-3 rounded-2xl border shadow-sm ${
              toast.type === 'ok' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span className="font-bold text-sm">{toast.type === 'ok' ? '✓' : '!'}</span> 
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranked Banner */}
      {ranked && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 text-xs font-bold text-[#0025B8] bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 shadow-xs"
        >
          <TrendingUp className="w-4 h-4 text-[#0F9DE4]" /> 
          <span>Candidates are sorted by AI match score, highest first.</span>
        </motion.div>
      )}

      {/* Main Table Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 overflow-hidden shadow-xl"
      >
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-sky-50/60 rounded-2xl" />)}
          </div>
        ) : applicants.length === 0 ? (
          <EmptyState icon={Sparkles} title="No applicants yet" description="Applications for this job will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-sky-100 bg-sky-50/40">
                  <th className="px-6 py-3.5 font-bold">Candidate</th>
                  <th className="px-6 py-3.5 font-bold">Applied On</th>
                  <th className="px-6 py-3.5 font-bold">Matching Score</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {applicants.map((a, i) => (
                  <React.Fragment key={a.id}>
                    <tr className="hover:bg-sky-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {ranked && i < 3 && a.aiScore && (
                            <span className="text-[10px] font-extrabold w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-xs">
                              {i + 1}
                            </span>
                          )}
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">Candidate #{a.seekerId.slice(0, 8)}</p>
                            <a href={a.cvUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0025B8] hover:text-[#0F9DE4] hover:underline">
                              View CV Document ↗
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs sm:text-sm text-slate-500 font-medium">
                        {new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs sm:text-sm ${scoreColor(a.aiScore)}`}>
                            {a.aiScore !== null ? `${a.aiScore.toFixed(0)}%` : 'Not ranked'}
                          </span>
                          {a.atsBreakdown && (
                            <button
                              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                            >
                              {expandedId === a.id ? <ChevronUp className="w-4 h-4 text-[#0F9DE4]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                      <td className="px-6 py-4 text-right">
                        {a.status === 'REJECTED' ? (
                          <span className="text-xs text-slate-400 font-medium">{a.rejectionReason}</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {a.status !== 'SHORTLISTED' && a.status !== 'INTERVIEW' && (
                              <button onClick={() => handleShortlist(a)} title="Shortlist" className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-xs cursor-pointer">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setScheduleTarget(a)} title="Schedule Interview" className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors shadow-xs cursor-pointer">
                              <CalendarClock className="w-4 h-4" />
                            </button>
                            <button onClick={() => setRejectTarget(a)} title="Reject" className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-xs cursor-pointer">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable AI Insight Row */}
                    {expandedId === a.id && a.atsBreakdown && (
                      <tr className="bg-sky-50/40 border-b border-sky-100">
                        <td colSpan={5} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
                            <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs space-y-2">
                              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                <ThumbsUp className="w-4 h-4" /> Key Strengths
                              </p>
                              <ul className="space-y-1">
                                {a.atsBreakdown.strengths.length === 0
                                  ? <li className="text-xs text-slate-400 font-medium">Not specified</li>
                                  : a.atsBreakdown.strengths.map((s, idx) => (
                                      <li key={idx} className="text-xs text-slate-600 font-medium">• {s}</li>
                                    ))}
                              </ul>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs space-y-2">
                              <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                                <ThumbsDown className="w-4 h-4" /> Identified Weaknesses
                              </p>
                              <ul className="space-y-1">
                                {a.atsBreakdown.weaknesses.length === 0
                                  ? <li className="text-xs text-slate-400 font-medium">Not specified</li>
                                  : a.atsBreakdown.weaknesses.map((w, idx) => (
                                      <li key={idx} className="text-xs text-slate-600 font-medium">• {w}</li>
                                    ))}
                              </ul>
                            </div>
                          </div>
                          {a.atsBreakdown.recommendation && (
                            <div className="mt-4 text-xs text-[#0025B8] bg-sky-100/70 border border-sky-200 rounded-2xl p-4 max-w-4xl font-medium leading-relaxed shadow-xs">
                              <strong className="font-bold text-[#0025B8]">AI Recommendation:</strong> {a.atsBreakdown.recommendation}
                            </div>
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
      </motion.div>

      {scheduleTarget && (
        <InterviewScheduleModal
          applicationId={scheduleTarget.id}
          candidateName={`Candidate #${scheduleTarget.seekerId.slice(0, 8)}`}
          onClose={() => setScheduleTarget(null)}
          onScheduled={() => { load(); flash('ok', 'Interview scheduled. Invite email sent to candidate.'); }}
        />
      )}
      {rejectTarget && (
        <RejectReasonModal
          applicationId={rejectTarget.id}
          candidateName={`Candidate #${rejectTarget.seekerId.slice(0, 8)}`}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { load(); flash('ok', 'Candidate rejected. Notification email sent.'); }}
        />
      )}
    </div>
  );
}