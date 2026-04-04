'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobApi, applicationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

const REJECTION_REASONS = [
  'Insufficient experience',
  'Missing required technical skills',
  'Qualification mismatch',
  'Overqualified for the role',
  'Cultural fit concerns',
  'Position filled internally',
  'Budget constraints',
];

interface Application {
  id: string;
  seekerId: string;
  seekerName: string;
  cvUrl: string;
  status: string;
  createdAt: string;
  aiScore?: number;
  rejectionReason?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewVenue?: string;
}

interface RankedCandidate {
  application_id: string;
  seeker_id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

type ModalType = 'reject' | 'interview' | 'rank' | null;

function ApplicantsContent() {
  const { id: jobId } = useParams();
  const { user } = useAuthStore();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [rankingSummary, setRankingSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Reject modal state
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Interview modal state
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewVenue, setInterviewVenue] = useState('');
  const [interviewLoading, setInterviewLoading] = useState(false);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [jobRes, appsRes] = await Promise.all([
        jobApi.get(`/jobs/${jobId}`),
        applicationApi.get(`/applications/job/${jobId}`),
      ]);
      setJob(jobRes.data.data);
      setApplications(appsRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleRank() {
    if (!job || applications.length === 0) return;
    setRanking(true);
    try {
      const token = localStorage.getItem('jp_at');
      const res = await fetch('http://localhost:8001/api/v1/ai/rank-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: jobId,
          job_title: job.title,
          job_description: job.description,
          job_requirements: job.requirements,
          applications: applications.map((a) => ({
            id: a.id,
            seekerId: a.seekerId,
            cvUrl: a.cvUrl,
          })),
        }),
      });
      const data = await res.json();
      setRanked(data.ranked_candidates || []);
      setRankingSummary(data.ranking_summary || '');
    } finally { setRanking(false); }
  }

  async function handleReject() {
    if (!selectedApp || !rejectReason) return;
    setRejectLoading(true); setActionError('');
    try {
      await applicationApi.patch(`/applications/${selectedApp.id}/reject`, {
        reason: rejectReason,
      });
      setActionSuccess('Application rejected and candidate notified.');
      setActiveModal(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject');
    } finally { setRejectLoading(false); }
  }

  async function handleScheduleInterview() {
    if (!selectedApp || !interviewDate || !interviewTime || !interviewVenue) {
      setActionError('All interview fields are required');
      return;
    }
    setInterviewLoading(true); setActionError('');
    try {
      await applicationApi.patch(
        `/applications/${selectedApp.id}/schedule-interview`,
        { date: interviewDate, time: interviewTime, venue: interviewVenue }
      );
      setActionSuccess('Interview scheduled! Candidate notified via email and in-app.');
      setActiveModal(null);
      setInterviewDate(''); setInterviewTime(''); setInterviewVenue('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to schedule');
    } finally { setInterviewLoading(false); }
  }

  async function handleDownloadCV(app: Application) {
    try {
      const res = await applicationApi.get(`/applications/${app.id}/download-cv`);
      const cvUrl = res.data.data.cvUrl;
      const link = document.createElement('a');
      link.href = `http://localhost:3003${cvUrl}`;
      link.download = `CV_${app.seekerName.replace(/\s/g, '_')}.pdf`;
      link.target = '_blank';
      link.click();
    } catch { setActionError('Failed to download CV'); }
  }

  async function handleShortlist(appId: string) {
    await applicationApi.patch(`/applications/${appId}/status`, { status: 'SHORTLISTED' });
    setActionSuccess('Candidate shortlisted and notified.');
    await loadData();
  }

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      REVIEWING: 'bg-blue-100 text-blue-700',
      SHORTLISTED: 'bg-green-100 text-green-700',
      INTERVIEW: 'bg-purple-100 text-purple-700',
      REJECTED: 'bg-red-100 text-red-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const rankedMap: Record<string, RankedCandidate> = {};
  ranked.forEach((r) => { rankedMap[r.application_id] = r; });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/company/dashboard" className="text-sm text-purple-600 hover:underline">
              ← Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{job?.title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            onClick={handleRank}
            disabled={ranking || applications.length === 0}
          >
            {ranking ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                AI Ranking...
              </span>
            ) : 'Rank with AI'}
          </Button>
        </div>

        {/* Feedback banners */}
        {actionSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex justify-between">
            {actionSuccess}
            <button onClick={() => setActionSuccess('')} className="text-green-500">✕</button>
          </div>
        )}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex justify-between">
            {actionError}
            <button onClick={() => setActionError('')} className="text-red-400">✕</button>
          </div>
        )}

        {/* Ranking summary */}
        {rankingSummary && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-sm text-purple-700">
            <strong>AI Analysis:</strong> {rankingSummary}
          </div>
        )}

        {/* Applications list */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
            No applications received yet
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const rank = rankedMap[app.id];
              return (
                <div key={app.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{app.seekerName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Applied: {new Date(app.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {app.interviewDate && (
                        <p className="text-xs text-purple-600 mt-1">
                          Interview: {new Date(app.interviewDate).toLocaleDateString()} at {app.interviewTime} — {app.interviewVenue}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {rank && (
                        <span className={`text-lg font-bold ${
                          rank.score >= 75 ? 'text-green-600' :
                          rank.score >= 50 ? 'text-yellow-600' : 'text-red-500'
                        }`}>
                          {rank.score.toFixed(0)}/100
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  {/* AI score bar */}
                  {rank && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            rank.score >= 75 ? 'bg-green-500' :
                            rank.score >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                          }`}
                          style={{ width: `${rank.score}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-medium text-green-700 mb-1">Strengths</p>
                          {rank.strengths.map((s, i) => (
                            <p key={i} className="text-gray-500 flex gap-1">
                              <span className="text-green-500">✓</span>{s}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="font-medium text-red-600 mb-1">Gaps</p>
                          {rank.weaknesses.map((w, i) => (
                            <p key={i} className="text-gray-500 flex gap-1">
                              <span className="text-red-400">○</span>{w}
                            </p>
                          ))}
                        </div>
                      </div>
                      {rank.recommendation && (
                        <p className="text-xs text-gray-400 italic mt-2">{rank.recommendation}</p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    {/* Download CV */}
                    <button
                      onClick={() => handleDownloadCV(app)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      Download CV
                    </button>

                    {app.status !== 'SHORTLISTED' && app.status !== 'INTERVIEW' && app.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleShortlist(app.id)}
                        className="text-xs px-3 py-1.5 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
                      >
                        Shortlist
                      </button>
                    )}

                    {(app.status === 'SHORTLISTED' || app.status === 'REVIEWING') && (
                      <button
                        onClick={() => { setSelectedApp(app); setActiveModal('interview'); setActionError(''); }}
                        className="text-xs px-3 py-1.5 border border-purple-300 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        Schedule interview
                      </button>
                    )}

                    {app.status !== 'REJECTED' && app.status !== 'INTERVIEW' && (
                      <button
                        onClick={() => { setSelectedApp(app); setActiveModal('reject'); setActionError(''); }}
                        className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  {/* Rejection reason display */}
                  {app.status === 'REJECTED' && app.rejectionReason && (
                    <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600">
                      Rejected: {app.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── REJECT MODAL ── */}
      {activeModal === 'reject' && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg mb-1">Reject application</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select a rejection reason for <strong>{selectedApp.seekerName}</strong>.
              An email with a professional explanation will be sent automatically.
            </p>
            {actionError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{actionError}</div>
            )}
            <div className="space-y-2 mb-5">
              {REJECTION_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    rejectReason === r ? 'border-red-400 bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={rejectReason === r}
                    onChange={() => setRejectReason(r)}
                    className="text-red-500"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setActiveModal(null); setRejectReason(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectReason || rejectLoading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {rejectLoading ? 'Rejecting...' : 'Reject & notify'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERVIEW MODAL ── */}
      {activeModal === 'interview' && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg mb-1">Schedule interview</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set the interview details for <strong>{selectedApp.seekerName}</strong>.
              They will receive an email and in-app notification with these details.
            </p>
            {actionError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{actionError}</div>
            )}
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Interview date</label>
                <input
                  type="date"
                  min={minDate}
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Interview time</label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Venue / Link</label>
                <input
                  type="text"
                  placeholder="e.g. Office Room 3 or Google Meet link"
                  value={interviewVenue}
                  onChange={(e) => setInterviewVenue(e.target.value)}
                  className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setActiveModal(null); setInterviewDate(''); setInterviewTime(''); setInterviewVenue(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleInterview}
                disabled={interviewLoading}
                className="flex-1"
              >
                {interviewLoading ? 'Scheduling...' : 'Schedule & notify'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <ApplicantsContent />
    </AuthGuard>
  );
}