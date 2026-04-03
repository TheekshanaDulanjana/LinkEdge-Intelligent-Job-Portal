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
  status: string;
  deadline: string;
}

function CompanyDashboard() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);

  // ✅ Protect route + fetch jobs
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    jobApi.get('/jobs/company/my-jobs')
      .then(res => setJobs(res.data.data))
      .catch(console.error);
  }, [isAuthenticated, router]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">

        {/* 🔹 Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Company Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Manage your job postings and candidates
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/company/post-job">
              <Button>+ Post a job</Button>
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* 🔹 User Info Card (existing UI preserved) */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-medium">{user?.email}</p>
          <p className="text-sm text-gray-400 mt-1">
            Role: {user?.role}
          </p>
        </div>

        {/* 🔹 Jobs Section (new feature) */}
        <h2 className="font-semibold text-gray-700 mb-3">
          Your job postings ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 mb-4">No jobs posted yet</p>
            <Link href="/company/post-job">
              <Button>Post your first job</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                className="bg-white rounded-xl border p-5 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {job.location} · Deadline:{' '}
                    {new Date(job.deadline).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      job.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {job.status}
                  </span>

                  <Link href={`/company/jobs/${job.id}/applicants`}>
                    <Button variant="outline" size="sm">
                      View applicants
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🔹 Existing Footer Note (kept) */}
        <p className="text-gray-400 text-sm mt-6">
          Job posting and applicant ranking features coming in Phase 2.
        </p>

      </div>
    </div>
  );
}

export default function CompanyDashboardPage() {
  return (
    <AuthGuard requiredRole="COMPANY">
      <CompanyDashboard />
    </AuthGuard>
  );
}