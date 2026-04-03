'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobApi, applicationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import AuthGuard from '@/components/AuthGuard';

interface Candidate {
  application_id: string;
  seeker_id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

interface Application {
  id: string;
  seekerId: string;
  cvUrl: string;
  status: string;
  createdAt: string;
}

 function ApplicantsPageContent() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [job, setJob] = useState<{ title: string; description: string; requirements: string } | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [ranked, setRanked] = useState<Candidate[]>([]);
  const [rankingSummary, setRankingSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadData();
  }, [isAuthenticated]);

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

  async function handleRankCandidates() {
    if (!job || applications.length === 0) return;
    setRanking(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        'http://localhost:8001/api/v1/ai/rank-candidates',
        {
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
        }
      );
      const data = await response.json();
      setRanked(data.ranked_candidates || []);
      setRankingSummary(data.ranking_summary || '');
    } catch (e) {
      console.error('Ranking failed:', e);
    } finally {
      setRanking(false);
    }
  }

  async function handleStatusUpdate(appId: string, status: string) {
    setUpdatingId(appId);
    try {
      await applicationApi.patch(`/applications/${appId}/status`, { status });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId('');
    }
  }

  function getScoreColor(score: number) {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-500';
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Loading...
    </div>
  );

  // Map application ID to status for easy lookup
  const appStatusMap: Record<string, string> = {};
  applications.forEach((a) => { appStatusMap[a.id] = a.status; });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/company/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">{job?.title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {applications.length} applications received
              </p>
            </div>
          </div>
          <Button
            onClick={handleRankCandidates}
            disabled={ranking || applications.length === 0}
          >
            {ranking ? 'AI Ranking in progress...' : 'Rank candidates with AI'}
          </Button>
        </div>

        {/* Ranking summary */}
        {rankingSummary && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
            {rankingSummary}
          </div>
        )}

        {/* Ranked results */}
        {ranked.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-gray-700 mb-3">
              AI Ranked Candidates
            </h2>
            <div className="space-y-4">
              {ranked.map((candidate, index) => {
                const currentStatus = appStatusMap[candidate.application_id];
                return (
                  <div
                    key={candidate.application_id}
                    className="bg-white rounded-xl border p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Candidate {index + 1}</p>
                          <p className="text-xs text-gray-400">
                            App ID: {candidate.application_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(candidate.score)}`}>
                          {candidate.score.toFixed(1)}
                          <span className="text-sm font-normal text-gray-400">/100</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">AI Score</p>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                      <div
                        className={`h-2 rounded-full ${
                          candidate.score >= 75 ? 'bg-green-500' :
                          candidate.score >= 50 ? 'bg-yellow-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {candidate.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                              <span className="text-green-500 flex-shrink-0">✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-2">Gaps</p>
                        <ul className="space-y-1">
                          {candidate.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-2">
                              <span className="text-red-400 flex-shrink-0">○</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 italic mb-4">
                      {candidate.recommendation}
                    </p>

                    {/* Status actions */}
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        currentStatus === 'SHORTLISTED' ? 'bg-green-100 text-green-700' :
                        currentStatus === 'REJECTED' ? 'bg-red-100 text-red-600' :
                        currentStatus === 'INTERVIEW' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {currentStatus}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === candidate.application_id}
                        onClick={() => handleStatusUpdate(candidate.application_id, 'SHORTLISTED')}
                      >
                        Shortlist
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === candidate.application_id}
                        onClick={() => handleStatusUpdate(candidate.application_id, 'INTERVIEW')}
                      >
                        Invite to interview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === candidate.application_id}
                        onClick={() => handleStatusUpdate(candidate.application_id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Raw applications list (before ranking) */}
        {ranked.length === 0 && (
          <div>
            <h2 className="font-semibold text-gray-700 mb-3">All Applications</h2>
            {applications.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                No applications yet
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl border p-5 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Application {app.id.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      app.status === 'SHORTLISTED' ? 'bg-green-100 text-green-700' :
                      app.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {applications.length > 0 && (
              <p className="text-sm text-gray-400 mt-4 text-center">
                Click &quot;Rank candidates with AI&quot; to see AI-powered scoring and analysis
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <ApplicantsPageContent />
    </AuthGuard>
  );
}