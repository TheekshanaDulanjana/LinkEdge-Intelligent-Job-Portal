'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Sparkles, CheckCircle2, CalendarClock, XCircle, TrendingUp,
  ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import PageHeader from '@/components/enterprise/PageHeader';
import StatusBadge from '@/components/enterprise/StatusBadge';
import EmptyState from '@/components/enterprise/EmptyState';
import InterviewScheduleModal from '@/components/enterprise/InterviewScheduleModal';
import RejectReasonModal from '@/components/enterprise/RejectReasonModal';
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
    if (score === null) return 'text-gray-300';
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-500';
  }

  return (
    <div>
      <PageHeader
        title={jobTitle ? `Applicants - ${jobTitle}` : 'Applicants'}
        description="Review candidates, run AI ranking, and manage the hiring pipeline for this role."
        actions={
          <button
            onClick={handleSmartRank}
            disabled={ranking || applicants.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {ranking ? 'Ranking Candidates...' : 'Smart Ranking'}
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 border
          ${toast.type === 'ok' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          <span className="font-bold">{toast.type === 'ok' ? '✓' : '!'}</span> {toast.msg}
        </div>
      )}

      {ranked && (
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-4">
          <TrendingUp className="w-3.5 h-3.5" /> Candidates are sorted by AI match score, highest first.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
          </div>
        ) : applicants.length === 0 ? (
          <EmptyState icon={Sparkles} title="No applicants yet" description="Applications for this job will appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Candidate</th>
                <th className="px-5 py-3 font-medium">Applied On</th>
                <th className="px-5 py-3 font-medium">AI Match Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a, i) => (
                <React.Fragment key={a.id}>
                  <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {ranked && i < 3 && a.aiScore && (
                          <span className="text-[10px] font-bold w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">Candidate #{a.seekerId.slice(0, 8)}</p>
                          <a href={a.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View CV</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${scoreColor(a.aiScore)}`}>
                          {a.aiScore !== null ? `${a.aiScore.toFixed(0)}%` : 'Not ranked'}
                        </span>
                        {a.atsBreakdown && (
                          <button
                            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                            className="text-gray-300 hover:text-gray-500"
                          >
                            {expandedId === a.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-4">
                      {a.status === 'REJECTED' ? (
                        <span className="text-xs text-gray-400">{a.rejectionReason}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {a.status !== 'SHORTLISTED' && a.status !== 'INTERVIEW' && (
                            <button onClick={() => handleShortlist(a)} title="Shortlist" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setScheduleTarget(a)} title="Schedule Interview" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600">
                            <CalendarClock className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRejectTarget(a)} title="Reject" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expandable AI insight row */}
                  {expandedId === a.id && a.atsBreakdown && (
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                          <div>
                            <p className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1.5">
                              <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                            </p>
                            <ul className="space-y-1">
                              {a.atsBreakdown.strengths.length === 0
                                ? <li className="text-xs text-gray-400">Not specified</li>
                                : a.atsBreakdown.strengths.map((s, idx) => (
                                    <li key={idx} className="text-xs text-gray-600">• {s}</li>
                                  ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-1.5">
                              <ThumbsDown className="w-3.5 h-3.5" /> Weaknesses
                            </p>
                            <ul className="space-y-1">
                              {a.atsBreakdown.weaknesses.length === 0
                                ? <li className="text-xs text-gray-400">Not specified</li>
                                : a.atsBreakdown.weaknesses.map((w, idx) => (
                                    <li key={idx} className="text-xs text-gray-600">• {w}</li>
                                  ))}
                            </ul>
                          </div>
                        </div>
                        {a.atsBreakdown.recommendation && (
                          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mt-3 max-w-3xl">
                            <strong>AI Recommendation:</strong> {a.atsBreakdown.recommendation}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

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