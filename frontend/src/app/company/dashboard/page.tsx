'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
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
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState('');

  useEffect(() => {
    jobApi.get('/jobs/company/my-jobs')
      .then((res) => setJobs(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleStatus(job: Job) {
    setTogglingId(job.id);
    const newStatus = job.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await jobApi.patch(`/jobs/${job.id}/status`, { status: newStatus });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
      );
    } catch { console.error('Toggle failed'); }
    finally { setTogglingId(''); }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Company Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/company/post-job">
              <Button>+ Post a job</Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total postings', value: jobs.length },
            { label: 'Active', value: jobs.filter((j) => j.status === 'ACTIVE').length },
            { label: 'Inactive', value: jobs.filter((j) => j.status === 'INACTIVE').length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Your job postings</h2>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 mb-4">No jobs posted yet</p>
            <Link href="/company/post-job">
              <Button>Post your first job</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {job.location} · {job.jobType.replace('_', ' ')} ·
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStatus(job)}
                      disabled={togglingId === job.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        job.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          job.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${
                      job.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {job.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Link href={`/company/jobs/${job.id}/applicants`}>
                    <Button variant="outline" size="sm">View applicants</Button>
                  </Link>
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