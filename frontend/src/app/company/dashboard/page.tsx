'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { jobApi } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/AuthGuard';

interface Job {
  id: string;
  title: string;
  location: string;
  jobType: string;
  status: string;
  deadline: string;
  createdAt: string;
}

function CompanyDashboardContent() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const res = await jobApi.get('/jobs/company/my-jobs');
      setJobs(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(job: Job) {
    setTogglingId(job.id);
    const newStatus = job.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await jobApi.patch(`/jobs/${job.id}/status`, { status: newStatus });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
      );
    } catch (e) {
      console.error('Toggle failed', e);
    } finally {
      setTogglingId('');
    }
  }

  async function handleDelete(jobId: string) {
    setDeletingId(jobId);
    try {
      await jobApi.delete(`/jobs/${jobId}`);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setConfirmDeleteId('');
    } catch {
      alert('Failed to delete job');
    } finally {
      setDeletingId('');
    }
  }

  const filteredJobs = filterStatus === 'ALL'
    ? jobs
    : jobs.filter((j) => j.status === filterStatus);

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === 'ACTIVE').length,
    inactive: jobs.filter((j) => j.status === 'INACTIVE').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Company Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <Link href="/company/post-job">
            <Button>+ Post a job</Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total postings', value: stats.total, color: 'text-gray-800' },
            { label: 'Active', value: stats.active, color: 'text-green-600' },
            { label: 'Inactive', value: stats.inactive, color: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'ALL' ? `All (${stats.total})` : f === 'ACTIVE' ? `Active (${stats.active})` : `Inactive (${stats.inactive})`}
            </button>
          ))}
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Your job postings</h2>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 mb-4">
              {filterStatus === 'ALL' ? 'No jobs posted yet' : `No ${filterStatus.toLowerCase()} jobs`}
            </p>
            {filterStatus === 'ALL' && (
              <Link href="/company/post-job">
                <Button>Post your first job</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {job.location} · {job.jobType.replace('_', ' ')} ·
                      Deadline: {new Date(job.deadline).toLocaleDateString()} ·
                      Posted: {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${job.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`}>
                      {job.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(job)}
                      disabled={togglingId === job.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        job.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          job.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Link href={`/company/jobs/${job.id}/applicants`}>
                    <Button variant="outline" size="sm">View applicants</Button>
                  </Link>

                  {/* Delete with confirmation */}
                  {confirmDeleteId === job.id ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-red-600 font-medium">Delete permanently?</span>
                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={deletingId === job.id}
                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === job.id ? 'Deleting...' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId('')}
                        className="text-xs px-3 py-1.5 border rounded-lg text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(job.id)}
                      className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <CompanyDashboardContent />
    </AuthGuard>
  );
}