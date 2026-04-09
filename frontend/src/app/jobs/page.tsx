'use client';

import { useEffect, useState } from 'react';
import { jobApi } from '@/lib/api';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Company {
  id: string;
  companyName: string;
  logoUrl?: string;
  location?: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  deadline: string;
  createdAt: string;
  status: string;
  company?: Company;
}

const JOB_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: 'bg-green-100 text-green-800',
  PART_TIME: 'bg-blue-100 text-blue-800',
  CONTRACT: 'bg-purple-100 text-purple-800',
  INTERNSHIP: 'bg-yellow-100 text-yellow-800',
  REMOTE: 'bg-teal-100 text-teal-800',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');

  async function fetchJobs(s = '', l = '', t = '') {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.append('search', s);
      if (l) params.append('location', l);
      if (t) params.append('jobType', t);
      const res = await jobApi.get(`/jobs?${params.toString()}`);
      setJobs(res.data.data.jobs);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error('Failed to load jobs', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  function handleSearch() {
    fetchJobs(search, location, jobType);
  }

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Search and Filters Section */}
      <div className="bg-white border-b px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Browse Jobs</h2>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Job title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-44"
            />
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="h-10 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All types</option>
              {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'].map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
            <Button onClick={handleSearch} className="px-8">
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-6 font-medium">
          {total} {total === 1 ? 'job' : 'jobs'} found
        </p>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Finding the best roles for you...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-24 text-center text-gray-400 bg-white rounded-xl border border-dashed">
            No jobs found matching your criteria. Try adjusting your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl border hover:shadow-lg transition-all p-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Job title */}
                    <Link href={`/jobs/${job.id}`} className="block">
                      <h3 className="font-bold text-xl text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                        {job.title}
                      </h3>
                    </Link>

                    {/* Company info */}
                    {job.company && (
                      <Link
                        href={`/company/${job.company.id}/profile`}
                        className="flex items-center gap-2 mt-2 group/company w-fit"
                      >
                        {job.company.logoUrl ? (
                          <img
                            src={`http://localhost:3001${job.company.logoUrl}`}
                            alt={job.company.companyName}
                            className="w-6 h-6 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold border border-purple-200">
                            {job.company.companyName[0]}
                          </div>
                        )}
                        <span className="text-sm text-purple-600 group-hover/company:underline font-semibold">
                          {job.company.companyName}
                        </span>
                      </Link>
                    )}

                    {/* Job meta data */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      {job.salaryMin && (
                        <span className="font-medium text-gray-700">
                          LKR {job.salaryMin.toLocaleString()} – {job.salaryMax?.toLocaleString()}
                        </span>
                      )}
                      <span>
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${JOB_TYPE_COLORS[job.jobType] || 'bg-gray-100 text-gray-600'}`}>
                      {job.jobType.replace('_', ' ')}
                    </span>
                    {job.status === 'INACTIVE' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium border border-red-100">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end">
                  <Link href={`/jobs/${job.id}`}>
                    <Button size="sm" variant="outline" className="group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      View Details & Apply
                    </Button>
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