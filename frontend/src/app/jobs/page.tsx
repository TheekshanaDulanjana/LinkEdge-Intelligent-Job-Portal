'use client';

import { useEffect, useState } from 'react';
import { jobApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import HeroSection from '@/components/jobs/HeroSection';
import SidebarFilters from '@/components/jobs/SidebarFilters';
import JobCard from '@/components/jobs/JobCard';
import CTAAccount from '@/components/jobs/CTAAccount';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [total, setTotal] = useState(0);

  async function fetchJobs(s = search, l = location, t = '') {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.append('search', s);
      if (l) params.append('location', l);
      if (t) params.append('jobType', t);

      // Pass seekerId so backend enriches with ATS scores
      const userId = useAuthStore.getState().user?.id;
      if (userId) params.append('seekerId', userId);

      const res = await jobApi.get(`/jobs?${params.toString()}`);
      
      const fetchedJobs = res.data?.data?.jobs || res.data?.jobs || [];
      const fetchedTotal = res.data?.data?.total || res.data?.total || fetchedJobs.length;

      setJobs(fetchedJobs);
      setTotal(fetchedTotal);
    } catch (e) {
      console.error('API Error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-20">
      <HeroSection 
        search={search} 
        setSearch={setSearch} 
        location={location} 
        setLocation={setLocation} 
        handleSearch={() => fetchJobs(search, location)} 
      />

      <div className="max-w-7xl mx-auto px-6 mt-12 flex flex-col md:flex-row gap-10">
        {/* Left Side: Filters and CTA */}
        <div className="w-full md:w-80 flex-shrink-0">
          <SidebarFilters />
          <CTAAccount />
        </div>

        {/* Right Side: Job Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-2xl border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.length > 0 ? (
                jobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    id={job.id}
                    title={job.title}
                    company={job.company}
                    location={job.location}
                    jobType={job.jobType}
                    deadline={job.deadline}
                    salaryMin={job.salaryMin}
                    salaryMax={job.salaryMax}
                    atsScore={job.atsScore}
                    atsColor={job.atsColor}
                    atsLabel={job.atsLabel}
                    matchedSkills={job.matchedSkills}
                    missingSkills={job.missingSkills}
                    job={job}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-400 border border-dashed rounded-2xl">
                  No vacancies found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}