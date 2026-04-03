'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { applicationApi } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import AuthGuard from '@/components/AuthGuard';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  job: {
    title: string;
    location: string;
  };
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  INTERVIEW: 'bg-purple-100 text-purple-700',
};

 function SeekerDashboard() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);

  // ✅ Protect route + fetch applications
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    applicationApi
      .get('/applications/my-applications')
      .then(res => setApplications(res.data.data))
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-3 md:gap-0">
          <div>
            <h1 className="text-2xl font-semibold">Job Seeker Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back — ready to find your next role?
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* ✅ Smart Apply Button */}
            <Link href="/seeker/smart-apply">
              <Button variant="outline">Smart Apply (AI)</Button>
            </Link>

            <Link href="/jobs">
              <Button>Browse jobs</Button>
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* 🔹 User Info */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-medium">{user?.email}</p>
          <p className="text-sm text-gray-400 mt-1">
            Role: {user?.role}
          </p>
        </div>

        {/* 🔹 Applications Section */}
        <h2 className="font-semibold text-gray-700 mb-3">
          My applications ({applications.length})
        </h2>

        {applications.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 mb-4">
              You haven&apos;t applied to any jobs yet
            </p>
            <Link href="/jobs">
              <Button>Browse available jobs</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-xl border p-5 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{app.job.title}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {app.job.location} · Applied{' '}
                    {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      statusColors[app.status]
                    }`}
                  >
                    {app.status}
                  </span>

                  {/* ✅ Practice Interview Button */}
                  {(app.status === 'SHORTLISTED' || app.status === 'INTERVIEW') && (
                    <Link href={`/seeker/interview/${app.id}`}>
                      <Button size="sm" variant="outline">
                        Practice interview
                      </Button>
                    </Link>
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

export default function SeekerDashboardPage() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <SeekerDashboard />
    </AuthGuard>
  );
}