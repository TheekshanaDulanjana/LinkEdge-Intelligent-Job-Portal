'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  REVIEWING: { label: 'Reviewing', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SHORTLISTED: { label: 'Shortlisted', className: 'bg-green-100 text-green-700 border-green-200' },
  INTERVIEW: { label: 'Invited', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-600 border-red-200' },
};

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
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

type ModalType = 'reject' | 'interview' | 'detail' | null;

function ApplicantsContent() {
  const { id: jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [rankingSummary, setRankingSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewVenue, setInterviewVenue] = useState('');
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [jobRes, appsRes] = await Promise.all([
        jobApi.get(`/jobs/${jobId}`),
        applicationApi.get(`/applications/job/${jobId}`),
      ]);
      setJob(jobRes.data.data);
      setApplications(appsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRank() {
    if (!job || applications.length === 0) return;
    setRanking(true);
    try {
      const token = localStorage.getItem('jp_at');
      const res = await fetch('http://localhost:8001/api/v1/ai/rank-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          job_id: jobId,
          job_title: job.title,
          job_description: job.description,
          job_requirements: job.requirements,
          applications: applications.map((a) => ({ id: a.id, seekerId: a.seekerId, cvUrl: a.cvUrl })),
        }),
      });
      const data = await res.json();
      setRanked(data.ranked_candidates || []);
      setRankingSummary(data.ranking_summary || '');
    } finally {
      setRanking(false);
    }
  }

  async function handleReject() {
    if (!selectedApp || !rejectReason) return;
    setRejectLoading(true); setActionErr('');
    try {
      await applicationApi.patch(`/applications/${selectedApp.id}/reject`, { reason: rejectReason });
      setActionMsg(`${selectedApp.seekerName} has been notified of the rejection.`);
      setActiveModal(null);
      setRejectReason('');
      await loadData();
    } catch (e: any) {
      setActionErr(e.message || 'Failed to reject');
    } finally {
      setRejectLoading(false);
    }
  }

  async function handleInterview() {
    if (!selectedApp || !interviewDate || !interviewTime || !interviewVenue) {
      setActionErr('All fields are required'); return;
    }
    setInterviewLoading(true); setActionErr('');
    try {
      await applicationApi.patch(
        `/applications/${selectedApp.id}/schedule-interview`,
        { date: interviewDate, time: interviewTime, venue: interviewVenue }
      );
      setActionMsg('Interview scheduled. Candidate notified by email and in-app.');
      setActiveModal(null);
      setInterviewDate(''); setInterviewTime(''); setInterviewVenue('');
      await loadData();
    } catch (e: any) {
      setActionErr(e.message || 'Failed to schedule');
    } finally {
      setInterviewLoading(false);
    }
  }

  async function handleShortlist(appId: string) {
    try {
      await applicationApi.patch(`/applications/${appId}/status`, { status: 'SHORTLISTED' });
      setActionMsg('Candidate shortlisted and notified.');
      await loadData();
    } catch { setActionErr('Failed to shortlist'); }
  }

  async function handleDownloadCV(app: Application) {
    try {
      const res = await applicationApi.get(`/applications/${app.id}/download-cv`);
      const cvUrl = res.data.data.cvUrl;
      const a = document.createElement('a');
      a.href = `http://localhost:3003${cvUrl}`;
      a.download = `CV_${app.seekerName.replace(/\s/g, '_')}.pdf`;
      a.target = '_blank';
      a.click();
    } catch { setActionErr('Failed to download CV'); }
  }

  const rankedMap: Record<string, RankedCandidate> = {};
  ranked.forEach((r) => { rankedMap[r.application_id] = r; });

  let displayed = filterStatus === 'ALL'
    ? [...applications]
    : applications.filter((a) => a.status === filterStatus);

  if (sortBy === 'score') {
    displayed.sort((a, b) => (rankedMap[b.id]?.score || 0) - (rankedMap[a.id]?.score || 0));
  } else if (sortBy === 'name') {
    displayed.sort((a, b) => a.seekerName.localeCompare(b.seekerName));
  } else {
    displayed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/company/dashboard" className="text-sm text-purple-600 hover:underline">← Dashboard</Link>
            <div>
              <h1 className="text-xl font-semibold">{job?.title}</h1>
              <p className="text-sm text-gray-400">{applications.length} total applicants</p>
            </div>
          </div>
          <Button onClick={handleRank} disabled={ranking || applications.length === 0}>
            {ranking ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ranking...
              </span>
            ) : 'AI Rank all'}
          </Button>
        </div>

        {/* Feedback banners */}
        {actionMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex justify-between">
            {actionMsg}
            <button onClick={() => setActionMsg('')} className="text-green-400">✕</button>
          </div>
        )}
        {actionErr && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between">
            {actionErr}
            <button onClick={() => setActionErr('')} className="text-red-400">✕</button>
          </div>
        )}
        {rankingSummary && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
            <strong>AI Analysis:</strong> {rankingSummary}
          </div>
        )}

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === 'ALL' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            All ({applications.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            statusCounts[status] ? (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === status ? `${cfg.className}` : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {cfg.label} ({statusCounts[status]})
              </button>
            ) : null
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{displayed.length} applicants shown</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            {['date', 'name', 'score'].map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s as any)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${sortBy === s ? 'bg-purple-50 border-purple-300 text-purple-600 font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {s === 'date' ? 'Date' : s === 'name' ? 'Name' : 'AI Score'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">Candidate</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">Applied</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">AI Score</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">Interview</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No applicants in this category</td>
                </tr>
              ) : (
                displayed.map((app, idx) => {
                  const rank = rankedMap[app.id];
                  const statusCfg = STATUS_CONFIG[app.status] || { label: app.status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
                  return (
                    <tr key={app.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold flex-shrink-0">
                            {app.seekerName?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{app.seekerName}</p>
                            {rank && <p className="text-xs text-gray-400 truncate max-w-[160px]">{rank.recommendation}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{new Date(app.createdAt).toLocaleDateString('en-GB')}</p>
                        <p className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {rank ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${rank.score >= 75 ? 'bg-green-500' : rank.score >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                style={{ width: `${rank.score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${rank.score >= 75 ? 'text-green-600' : rank.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {rank.score.toFixed(0)}
                            </span>
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {app.status === 'INTERVIEW' && app.interviewDate ? (
                          <div>
                            <p className="text-xs font-medium text-purple-700">{new Date(app.interviewDate).toLocaleDateString('en-GB')}</p>
                            <p className="text-xs text-gray-400">{app.interviewTime}</p>
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleDownloadCV(app)} title="Download CV" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          </button>
                          {rank && (
                            <button onClick={() => { setSelectedApp(app); setActiveModal('detail'); }} title="AI Analysis" className="p-1.5 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                            </button>
                          )}
                          {!['SHORTLISTED', 'INTERVIEW', 'REJECTED'].includes(app.status) && (
                            <button onClick={() => handleShortlist(app.id)} title="Shortlist" className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            </button>
                          )}
                          {['SHORTLISTED', 'REVIEWING'].includes(app.status) && (
                            <button onClick={() => { setSelectedApp(app); setActiveModal('interview'); setActionErr(''); }} title="Schedule Interview" className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            </button>
                          )}
                          {!['REJECTED', 'INTERVIEW'].includes(app.status) && (
                            <button onClick={() => { setSelectedApp(app); setActiveModal('reject'); setActionErr(''); }} title="Reject" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {activeModal === 'detail' && selectedApp && rankedMap[selectedApp.id] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-lg">AI Analysis — {selectedApp.seekerName}</h2>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="text-center mb-6">
              <span className={`text-5xl font-bold ${rankedMap[selectedApp.id].score >= 75 ? 'text-green-600' : rankedMap[selectedApp.id].score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                {rankedMap[selectedApp.id].score.toFixed(1)}
              </span>
              <span className="text-gray-400 text-lg ml-1">/100</span>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-bold text-green-700 mb-3 uppercase tracking-wider">Strengths</p>
                {rankedMap[selectedApp.id].strengths.map((s, i) => (
                  <p key={i} className="text-sm text-gray-600 flex gap-2 mb-2"><span className="text-green-500">✓</span>{s}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-red-600 mb-3 uppercase tracking-wider">Gaps</p>
                {rankedMap[selectedApp.id].weaknesses.map((w, i) => (
                  <p key={i} className="text-sm text-gray-600 flex gap-2 mb-2"><span className="text-red-400">○</span>{w}</p>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 italic leading-relaxed border">
              {rankedMap[selectedApp.id].recommendation}
            </div>
            <Button onClick={() => setActiveModal(null)} className="w-full mt-6" variant="outline">Close Analysis</Button>
          </div>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {activeModal === 'reject' && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg mb-1">Reject Application</h2>
            <p className="text-sm text-gray-500 mb-4">Select a reason for <strong>{selectedApp.seekerName}</strong>.</p>
            {actionErr && <div className="mb-3 p-2 bg-red-50 rounded text-sm text-red-600 border border-red-100">{actionErr}</div>}
            <div className="space-y-2 mb-6">
              {REJECTION_REASONS.map((r) => (
                <label key={r} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${rejectReason === r ? 'border-red-400 bg-red-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="reason" value={r} checked={rejectReason === r} onChange={() => setRejectReason(r)} className="text-red-500" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setActiveModal(null); setRejectReason(''); }} className="flex-1">Cancel</Button>
              <Button onClick={handleReject} disabled={!rejectReason || rejectLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {rejectLoading ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERVIEW MODAL ── */}
      {activeModal === 'interview' && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-lg mb-1">Schedule Interview</h2>
            <p className="text-sm text-gray-500 mb-4">Candidate: <strong>{selectedApp.seekerName}</strong></p>
            {actionErr && <div className="mb-3 p-2 bg-red-50 rounded text-sm text-red-600">{actionErr}</div>}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                <input type="date" min={minDateStr} value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-full h-10 border rounded-lg px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Time</label>
                <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="w-full h-10 border rounded-lg px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Venue / Link</label>
                <input type="text" placeholder="Office Room or Meeting Link" value={interviewVenue} onChange={(e) => setInterviewVenue(e.target.value)} className="w-full h-10 border rounded-lg px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleInterview} disabled={interviewLoading} className="flex-1">
                {interviewLoading ? 'Scheduling...' : 'Schedule & Notify'}
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