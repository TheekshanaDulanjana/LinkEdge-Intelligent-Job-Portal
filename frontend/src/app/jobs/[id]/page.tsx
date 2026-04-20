'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { jobApi, applicationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  deadline: string;
  createdAt: string;
  status: string;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await jobApi.get(`/jobs/${id}`);
        setJob(res.data.data);
      } catch {
        router.push('/jobs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleApply() {
    if (!cvFile) {
      setError('Please select your CV file');
      return;
    }
    setApplying(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);
      formData.append('jobId', id as string);
      if (coverLetter) formData.append('coverLetter', coverLetter);

      await applicationApi.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApplied(true);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!job) return null;

  const isPast = new Date(job.deadline) < new Date();
  const daysLeft = Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

  return (
    <div className="min-h-screen bg-gray-100 py-12 pt-32 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="p-8 pb-0">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                {/* Placeholder for Logo */}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">We are hiring</p>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Aura AI Systems</h1>
                <p className="text-xs text-gray-400 font-medium">{job.location}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">
              {new Date(job.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <hr className="border-gray-100" />
        </div>

        {/* Job Title & Badges */}
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  {job.jobType.replace('_', '-')}
                </span>
                <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  On-site
                </span>
                <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  {isPast ? 'Closed' : `Closing in ${daysLeft} days`}
                </span>
              </div>
            </div>

            {/* AI Match Score - Visual Representation */}
            <div className="flex items-center">
               <div className="flex items-center bg-[#00E699] rounded-full px-3 py-1 gap-4">
                  <span className="text-[10px] font-bold text-gray-900">AI Match Score</span>
                  <div className="w-24 h-4 bg-white/30 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-[#00E699] w-[75%]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 bg-white/40 px-2 py-0.5 rounded-full">75%</span>
               </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">About the Role</h3>
              <p className="text-sm text-gray-600 leading-relaxed text-justify">
                {job.description}
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Responsibilities</h3>
              <ul className="list-disc ml-5 space-y-2 text-sm text-gray-600">
                {job.requirements.split('\n').map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Action Area */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            {applied ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-center font-medium">
                Application submitted successfully!
              </div>
            ) : job.status === 'INACTIVE' || isPast ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-red-500 font-medium">Applications are currently closed!</p>
                <Button disabled className="mt-4 w-full bg-gray-300">Closed</Button>
              </div>
            ) : !isAuthenticated ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-gray-500 font-medium">Sign in to apply for this position</p>
                <Link href="/login" className="w-full">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#0041a3] h-12 rounded-xl text-white font-bold">
                    Sign in to apply
                  </Button>
                </Link>
              </div>
            ) : user?.role === 'SEEKER' ? (
              <>
                {!showForm ? (
                  <Button 
                    className="w-full bg-[#0052CC] hover:bg-[#0041a3] h-12 rounded-xl text-white font-bold" 
                    onClick={() => setShowForm(true)}
                  >
                    Apply Now
                  </Button>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-5">
                    <h3 className="font-bold text-gray-900">Submit Application</h3>
                    {error && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                    
                    <div>
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Upload CV</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleApply} disabled={applying} className="flex-1 bg-[#0052CC] hover:bg-[#0041a3] h-11 rounded-xl">
                        {applying ? 'Submitting...' : 'Submit Application'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 rounded-xl">Cancel</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-400 text-sm italic">Company accounts cannot apply for jobs.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}