'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { jobApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import HeroSection from '@/components/jobs/HeroSection';
import SidebarFilters, { JobFilterValues } from '@/components/jobs/SidebarFilters';
import JobCard from '@/components/jobs/JobCard';
import CTAAccount from '@/components/jobs/CTAAccount';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const EMPTY_FILTERS: JobFilterValues = {
  jobType: '',
  department: '',
  experienceLevel: '',
  locationType: '',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<JobFilterValues>(EMPTY_FILTERS);
  // Wait for the ?search= value from the URL before the first fetch, and ignore stale responses.
  const [ready, setReady] = useState(false);
  const requestId = useRef(0);

  const fetchJobs = useCallback(async () => {
    const myId = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (location) params.append('location', location);
      if (filters.jobType) params.append('jobType', filters.jobType);
      if (filters.department) params.append('department', filters.department);
      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.locationType) params.append('locationType', filters.locationType);

      // Pass seekerId so backend enriches with ATS scores
      const userId = useAuthStore.getState().user?.id;
      if (userId) params.append('seekerId', userId);

      const res = await jobApi.get(`/jobs?${params.toString()}`);

      const fetchedJobs = res.data?.data?.jobs || res.data?.jobs || [];
      const fetchedTotal = res.data?.data?.total || res.data?.total || fetchedJobs.length;

      if (myId !== requestId.current) return; // a newer search is already running
      setJobs(fetchedJobs);
      setTotal(fetchedTotal);
    } catch (e) {
      console.error('API Error:', e);
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line
  }, [search, location, filters]);

  // Arriving from a career-path chip on the home page: /jobs?search=UI%2FUX%20Designer
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) setSearch(q);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) fetchJobs();
  }, [fetchJobs, ready]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans">
      <HeroSection
        search={search}
        setSearch={setSearch}
        location={location}
        setLocation={setLocation}
        handleSearch={fetchJobs}
        total={total}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 flex flex-col md:flex-row gap-8 lg:gap-10">

        {/* Left Side: Filters and CTA */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full md:w-80 flex-shrink-0 flex flex-col gap-6"
        >
          <SidebarFilters filters={filters} onChange={setFilters} />
          <CTAAccount />
        </motion.div>

        {/* Right Side: Job Grid */}
        <div className="flex-1 space-y-6">

          {/* TOP ACTION BAR: Premium Feature Banner */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/90 border border-sky-100 shadow-sm backdrop-blur-sm"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {loading ? 'Searching jobs...' : `${total} Available Jobs`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Apply automatically using your ATS matched profile
              </p>
            </div>

            <Link href="/seeker/smart-apply" className="w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto cursor-pointer bg-white border-sky-200 text-[#0025B8] hover:bg-gradient-to-r hover:from-[#0025B8] hover:to-[#0F9DE4] hover:text-white transition-all duration-200 shadow-sm font-semibold gap-2 rounded-full px-6 h-11 border-2"
                >
                  <Sparkles className="w-4 h-4 text-[#0F9DE4]" />
                  <span>Smart Apply (AI)</span>
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 bg-gradient-to-br from-slate-50 to-sky-50/40 animate-pulse rounded-3xl border border-gray-100 shadow-sm" />
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {jobs.length > 0 ? (
                jobs.map((job: any) => (
                  <motion.div
                    key={job.id}
                    variants={{
                      hidden: { opacity: 0, y: 25 },
                      show: { opacity: 1, y: 0 }
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    whileHover={{ y: -4 }}
                    className="h-full"
                  >
                    <JobCard
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
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="col-span-full py-24 text-center text-slate-500 bg-white/60 backdrop-blur-sm border-2 border-dashed border-sky-100 rounded-3xl shadow-sm"
                >
                  <p className="text-base font-semibold text-slate-700">No vacancies found matching your search.</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
                </motion.div>
              )}
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
}