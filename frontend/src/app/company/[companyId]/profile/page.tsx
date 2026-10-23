'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface CompanyJob {
  id: string;
  title: string;
  location: string;
  jobType: string;
  deadline: string;
}

interface CompanyPublicProfile {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  location?: string;
  phone?: string;
  aboutUs?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  jobs: CompanyJob[];
}

const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: 'bg-green-100 text-green-800',
  PART_TIME: 'bg-blue-100 text-blue-800',
  CONTRACT: 'bg-purple-100 text-purple-800',
  INTERNSHIP: 'bg-yellow-100 text-yellow-800',
  REMOTE: 'bg-teal-100 text-teal-800',
};

export default function PublicCompanyProfilePage() {
  const { companyId } = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/auth/company/${companyId}/public`)
      .then((res) => setCompany(res.data.data))
      .catch(() => router.push('/jobs'))
      .finally(() => setLoading(false));
  }, [companyId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover image */}
      <div className="relative h-52 bg-gradient-to-r from-purple-700 to-blue-600 overflow-hidden">
        {company.coverImageUrl && (
          <img
            src={`http://localhost:3001${company.coverImageUrl}`}
            alt="Cover"
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Logo + company name header */}
        <div className="flex items-end gap-5 -mt-14 mb-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
            {company.logoUrl ? (
              <img
                src={`http://localhost:3001${company.logoUrl}`}
                alt={company.companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-3xl">
                {company.companyName[0]}
              </div>
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-gray-900">{company.companyName}</h1>
            {company.industry && (
              <p className="text-gray-500 text-sm">{company.industry}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-5">
            {/* About */}
            {company.aboutUs && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-800 mb-3">About us</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {company.aboutUs}
                </p>
              </div>
            )}

            {/* Active jobs */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                Open positions ({company.jobs.length})
              </h2>
              {company.jobs.length === 0 ? (
                <p className="text-gray-400 text-sm">No open positions at this time</p>
              ) : (
                <div className="space-y-3">
                  {company.jobs.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all">
                        <div>
                          <p className="font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {job.location} · Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.jobType] || 'bg-gray-100 text-gray-600'}`}>
                            {job.jobType.replace('_', ' ')}
                          </span>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Company info</h3>
              <div className="space-y-3">
                {company.location && (
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    </svg>
                    <span className="text-gray-600">{company.location}</span>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
                    </svg>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline break-all"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    <span className="text-gray-600">{company.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Link href="/jobs">
              <Button variant="outline" className="w-full">← All jobs</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}