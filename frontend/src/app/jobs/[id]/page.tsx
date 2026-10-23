'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobApi, applicationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ApplicationModal from '@/components/jobs/ApplicationModal';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Award, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface Company {
  id: string;
  companyName: string;
  logoUrl?: string;
  location?: string;
  aboutUs?: string;
}

interface Job {
  id: string;
  title: string;
  department?: string;
  experienceLevel?: string;
  locationType?: string;
  description: string;
  requirements: string;
  responsibilities?: string[];
  skills?: string[];
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  deadline: string;
  createdAt: string;
  status: string;
  company?: Company;
  atsScore?: number | null;
  atsColor?: 'green' | 'yellow' | 'red' | null;
  matchedSkills?: string[];
  missingSkills?: string[];
}

function ATSScoreBadge({ score, color }: { score: number; color?: string }) {
  const selectedColor = color || (score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red');

  const colorMap = {
    green: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', fill: 'bg-emerald-500' },
    yellow: { bg: 'bg-amber-50 text-amber-700 border-amber-300', fill: 'bg-amber-500' },
    red: { bg: 'bg-rose-50 text-rose-700 border-rose-200', fill: 'bg-rose-500' },
  };

  const c = colorMap[selectedColor as keyof typeof colorMap] || colorMap.yellow;

  return (
    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs font-semibold shadow-xs ${c.bg}`}>
      <Sparkles className="w-4 h-4 text-amber-500" />
      <span>Matching Score</span>
      <div className="w-16 h-2 bg-slate-200/80 rounded-full overflow-hidden">
        <div className={`h-full ${c.fill}`} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
      </div>
      <span className="font-bold text-sm">{score.toFixed(0)}%</span>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const headerElement = document.querySelector('header');
    if (headerElement) {
      headerElement.style.display = 'none';
    }
    return () => {
      if (headerElement) {
        headerElement.style.display = '';
      }
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await jobApi.get(`/jobs/${id}`);
        const jobData = res.data.data || res.data;
        setJob(jobData);
      } catch (err) {
        console.error('Failed to load job details', err);
        router.push('/jobs');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  async function handleModalSubmit(formData: FormData) {
    setApplying(true);
    setError('');
    try {
      await applicationApi.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApplied(true);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Loading position details...
      </div>
    );
  }

  if (!job) return null;

  const isPast = new Date(job.deadline) < new Date();
  const daysLeft = Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  const currentScore = job.atsScore ?? null;

  const responsibilitiesList = (job.responsibilities && job.responsibilities.length > 0)
    ? job.responsibilities
    : (job.requirements && job.requirements.includes('\n'))
      ? job.requirements.split('\n').filter(line => line.trim().length > 0)
      : (job.requirements) 
        ? [job.requirements] 
        : [];

  return (
    <div className="min-h-screen bg-slate-50/60 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        
        <Link 
          href="/jobs" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0025B8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>

        <div className="bg-white/90 backdrop-blur-xl rounded-[24px] border border-sky-100 shadow-xl overflow-hidden">
          
          <div className="p-6 md:p-8 border-b border-sky-100 bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {job.company?.logoUrl ? (
                  <img
                    src={job.company.logoUrl.startsWith('http') ? job.company.logoUrl : `http://localhost:3001${job.company.logoUrl}`}
                    alt={job.company.companyName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 bg-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30 shadow-md">
                    {job.company?.companyName?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-200 block mb-1">
                    WE ARE HIRING
                  </span>
                  <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                    {job.company?.companyName || 'Company Name'}
                  </h1>
                  <p className="text-xs text-white/80 font-medium mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {job.location}
                  </p>
                </div>
              </div>

              <div className="text-xs text-white/90 font-medium md:text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-xs self-start md:self-auto border border-white/15">
                Posted on {new Date(job.createdAt).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 border-b border-slate-100 bg-sky-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{job.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white border border-sky-100 text-[#0025B8] rounded-full text-xs font-semibold shadow-xs">
                    {job.jobType.replace('_', '-')}
                  </span>
                  {job.locationType && (
                    <span className="px-3 py-1 bg-sky-100/70 border border-sky-200 text-[#0F9DE4] rounded-full text-xs font-semibold shadow-xs">
                      {job.locationType.replace('_', '-')}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-semibold shadow-xs">
                    {isPast ? 'Closed' : `Closes in ${daysLeft} days`}
                  </span>
                </div>
              </div>

              {currentScore !== null && (
                <div>
                  <ATSScoreBadge score={currentScore} color={job.atsColor || undefined} />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide border-l-4 border-[#0F9DE4] pl-3">
                About the Role
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-1">
                {job.description}
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide border-l-4 border-[#0F9DE4] pl-3">
                Key Responsibilities
              </h3>
              {responsibilitiesList.length > 0 ? (
                <ul className="space-y-2.5 pl-1">
                  {responsibilitiesList.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-[#0F9DE4] mt-0.5 flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic pl-1">No specific responsibilities listed for this position.</p>
              )}
            </section>

            {/* Application Action Button */}
            <div className="pt-8 border-t border-slate-100">
              {applied ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-800 text-center font-semibold text-sm shadow-sm">
                  ✓ Application submitted successfully!
                </div>
              ) : job.status === 'INACTIVE' || isPast ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                  <p className="text-rose-600 font-medium text-sm">Applications are currently closed for this post.</p>
                </div>
              ) : !isAuthenticated ? (
                <div className="flex flex-col items-center gap-3 text-center bg-sky-50/60 border border-sky-100 rounded-2xl p-6">
                  <p className="text-sm text-slate-700 font-semibold">Sign in to apply for this position</p>
                  <Link href="/login" className="w-full max-w-sm">
                    <Button variant="gradient" className="w-full h-12 rounded-full text-white font-bold shadow-md cursor-pointer">
                      Sign in to apply
                    </Button>
                  </Link>
                </div>
              ) : user?.role === 'SEEKER' ? (
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    variant="gradient"
                    className="w-full h-12 rounded-full text-white font-bold text-sm shadow-md cursor-pointer" 
                    onClick={() => setIsModalOpen(true)}
                  >
                    Apply Now
                  </Button>
                </motion.div>
              ) : (
                <p className="text-center text-slate-400 text-sm italic">Company accounts cannot apply for jobs.</p>
              )}
            </div>

          </div>

        </div>

      </motion.div>

      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={job}
        onSubmit={handleModalSubmit}
        applying={applying}
        error={error}
      />
    </div>
  );
}