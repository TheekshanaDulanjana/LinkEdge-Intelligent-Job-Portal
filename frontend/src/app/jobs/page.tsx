'use client';

import { useEffect, useState } from 'react';
import { jobApi } from '@/lib/api';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Job {
  id: string;
  title: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  deadline: string;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');

  async function fetchJobs(s = '', l = '') {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.append('search', s);
      if (l) params.append('location', l);
      const res = await jobApi.get(`/jobs?${params.toString()}`);
      setJobs(res.data.data.jobs);
      setTotal(res.data.data.total);
    } catch {
      console.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, []);

  function handleSearch() { fetchJobs(search, location); }

  const jobTypeColors: Record<string, string> = {
    FULL_TIME: 'bg-green-100 text-green-800',
    PART_TIME: 'bg-blue-100 text-blue-800',
    CONTRACT: 'bg-purple-100 text-purple-800',
    INTERNSHIP: 'bg-yellow-100 text-yellow-800',
    REMOTE: 'bg-teal-100 text-teal-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Job Board</h1>
        <div className="flex gap-3">
          <Link href="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
          <Link href="/register"><Button size="sm">Register</Button></Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="bg-white rounded-xl border p-4 mb-6 flex gap-3">
          <Input
            placeholder="Search job title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Input
            placeholder="Location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-48"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <p className="text-sm text-gray-500 mb-4">{total} jobs found</p>

        {/* Job list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No jobs found</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <div className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-semibold text-lg text-gray-900">{job.title}</h2>
                      <p className="text-gray-500 text-sm mt-1">{job.location}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${jobTypeColors[job.jobType] || 'bg-gray-100 text-gray-600'}`}>
                      {job.jobType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm text-gray-400">
                    {job.salaryMin && (
                      <span>LKR {job.salaryMin.toLocaleString()} – {job.salaryMax?.toLocaleString()}</span>
                    )}
                    <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}