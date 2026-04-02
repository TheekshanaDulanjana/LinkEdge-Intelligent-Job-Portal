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
    if (!cvFile) { setError('Please select your CV file'); return; }
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!job) return null;

  const isPast = new Date(job.deadline) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">← Back to jobs</Link>
        {!isAuthenticated && (
          <div className="flex gap-3">
            <Link href="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Register</Button></Link>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              <p className="text-gray-500 mt-1">{job.location} · {job.jobType.replace('_', ' ')}</p>
              {job.salaryMin && (
                <p className="text-green-600 font-medium mt-1">
                  LKR {job.salaryMin.toLocaleString()} – {job.salaryMax?.toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Deadline</p>
              <p className={`font-medium ${isPast ? 'text-red-500' : 'text-gray-700'}`}>
                {new Date(job.deadline).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-2">Job description</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          <div className="mb-8">
            <h2 className="font-semibold text-gray-700 mb-2">Requirements</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
          </div>

          {/* Apply section */}
          {applied ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center">
              Application submitted successfully! We will be in touch.
            </div>
          ) : isPast ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">
              This job is no longer accepting applications
            </div>
          ) : !isAuthenticated ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-700 mb-3">Sign in to apply for this job</p>
              <Link href="/login"><Button>Sign in to apply</Button></Link>
            </div>
          ) : user?.role === 'SEEKER' ? (
            <>
              {!showForm ? (
                <Button className="w-full" onClick={() => setShowForm(true)}>
                  Apply for this job
                </Button>
              ) : (
                <div className="border rounded-lg p-5 space-y-4">
                  <h3 className="font-semibold">Submit your application</h3>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Upload your CV (PDF or Word, max 5MB)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      title="Upload your CV file"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Cover letter (optional)
                    </label>
                    <textarea
                      rows={4}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell the company why you're a great fit..."
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleApply} disabled={applying} className="flex-1">
                      {applying ? 'Submitting...' : 'Submit application'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-center text-sm">Companies cannot apply to jobs</p>
          )}
        </div>
      </div>
    </div>
  );
}