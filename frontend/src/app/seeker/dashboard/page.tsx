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
  rejectionReason?: string;
  rejectionMessage?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewVenue?: string;
  job: { title: string; location: string; id: string };
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-green-100 text-green-700',
  INTERVIEW: 'bg-purple-100 text-purple-700',
  REJECTED: 'bg-red-100 text-red-600',
};

function SeekerDashboardContent() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceEligibility, setPracticeEligibility] = useState<Record<string, any>>({});

  useEffect(() => {
    applicationApi.get('/applications/my-applications')
      .then(async (res) => {
        const apps: Application[] = res.data.data;
        setApplications(apps);

        // Check practice eligibility for INTERVIEW-status apps
        const checks: Record<string, any> = {};
        for (const app of apps) {
          if (app.status === 'INTERVIEW') {
            try {
              const r = await fetch(
                `http://localhost:8002/api/v1/interview/can-practice/${app.id}`
              );
              checks[app.id] = await r.json();
            } catch { checks[app.id] = { can_practice: false, reason: 'Service unavailable' }; }
          }
        }
        setPracticeEligibility(checks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white p-6 mt-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">My Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/jobs"><Button>Browse jobs</Button></Link>
            <Link href="/seeker/smart-apply"><Button variant="outline">Smart Apply (AI)</Button></Link>
          </div>
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">
          My applications ({applications.length})
        </h2>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 mb-4">No applications yet</p>
            <Link href="/jobs"><Button>Browse available jobs</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const eligibility = practiceEligibility[app.id];
              return (
                <div key={app.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{app.job.title}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {app.job.location} ·
                        Applied {new Date(app.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[app.status]}`}>
                      {app.status}
                    </span>
                  </div>

                  {/* Interview details */}
                  {app.status === 'INTERVIEW' && app.interviewDate && (
                    <div className="mt-3 bg-purple-50 rounded-lg px-4 py-3 text-sm">
                      <p className="font-medium text-purple-700 mb-1">Interview scheduled</p>
                      <p className="text-purple-600 text-xs">
                        {new Date(app.interviewDate).toLocaleDateString('en-GB', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                        })} at {app.interviewTime}
                      </p>
                      <p className="text-purple-600 text-xs mt-0.5">Venue: {app.interviewVenue}</p>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {app.status === 'REJECTED' && app.rejectionReason && (
                    <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-600">
                      Reason: {app.rejectionReason} <br />
                      {app.rejectionMessage }
                    </div>
                  )}

                  {/* Practice Interview button — server-clock controlled */}
                  {app.status === 'INTERVIEW' && (
                    <div className="mt-3 pt-3 border-t">
                      {eligibility?.can_practice ? (
                        <div className="flex items-center gap-3">
                          <Link href={`/seeker/interview/${app.id}`}>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              Practice interview
                            </Button>
                          </Link>
                          {eligibility.expires_at && (
                            <p className="text-xs text-gray-400">
                              Practice available until:{' '}
                              {new Date(eligibility.expires_at).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" disabled className="opacity-40 cursor-not-allowed">
                            Practice interview
                          </Button>
                          <p className="text-xs text-gray-400">
                            {eligibility?.reason || 'Practice period has ended'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeekerDashboard() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <SeekerDashboardContent />
    </AuthGuard>
  );
}