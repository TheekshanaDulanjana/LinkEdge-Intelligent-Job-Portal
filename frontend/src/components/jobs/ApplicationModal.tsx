'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Mail, Phone, User, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Company {
  id: string;
  companyName: string;
  logoUrl?: string;
}

interface Job {
  id: string;
  title: string;
  jobType: string;
  locationType?: string;
  deadline: string;
  createdAt: string;
  company?: Company;
}

interface SavedResume {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedDate: string;
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onSubmit: (formData: FormData) => Promise<void>;
  applying: boolean;
  error?: string;
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicationModal({
  isOpen,
  onClose,
  job,
  onSubmit,
  applying,
  error,
}: ApplicationModalProps) {
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [savedResume, setSavedResume] = useState<SavedResume | null>(null);
  const [useProfileCv, setUseProfileCv] = useState<boolean>(true);
  const [customCvFile, setCustomCvFile] = useState<File | null>(null);

  const [formError, setFormError] = useState('');
  const [loadingUserData, setLoadingUserData] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchUserData() {
      if (!user) return;

      setLoadingUserData(true);
      try {
        setEmail(user?.email || '');
        setFullName(user?.name || '');

        // Fetch user's saved resume metadata
        const resumeRes = await api.get('/auth/resume/me').catch(() => null);
        if (resumeRes?.data?.hasResume) {
          setSavedResume(resumeRes.data.data);
          setUseProfileCv(true);
        } else {
          setSavedResume(null);
          setUseProfileCv(false);
        }
      } catch (err) {
        if (user?.email) setEmail(user.email);
        setUseProfileCv(false);
      } finally {
        setLoadingUserData(false);
      }
    }

    fetchUserData();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const daysLeft = Math.ceil(
    (new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalCvFile: File | null = customCvFile;

    // If using profile CV, fetch file blob using standard resume endpoint
    if (useProfileCv && savedResume) {
      try {
        const response = await api.get('/auth/resume/me/file', {
          responseType: 'blob',
        }).catch(() => null);

        if (response?.data) {
          finalCvFile = new File([response.data], savedResume.originalName, {
            type: savedResume.mimeType || 'application/pdf',
          });
        }
      } catch (err) {
        console.error('Failed to retrieve profile CV blob:', err);
      }
    }

    if (!finalCvFile && !useProfileCv) {
      setFormError('Please select or upload a CV file');
      return;
    }

    setFormError('');

    const formData = new FormData();
    formData.append('jobId', job.id);

    // Send the file if present
    if (finalCvFile) {
      formData.append('cv', finalCvFile);
    } else if (useProfileCv && savedResume) {
      formData.append('useProfileCv', 'true');
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Company Header */}
        <div className="flex items-center gap-4 mb-6">
          {job.company?.logoUrl ? (
            <img
              src={
                job.company.logoUrl.startsWith('http')
                  ? job.company.logoUrl
                  : `http://localhost:3001${job.company.logoUrl}`
              }
              alt={job.company.companyName}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {job.company?.companyName?.[0]?.toUpperCase() || 'C'}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {job.company?.companyName || 'Company Name'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {new Date(job.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>

        <hr className="border-slate-100 my-4" />

        {/* Job Title & Badges */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{job.title}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-1.5 bg-sky-500 text-white rounded-full text-xs font-semibold">
              {job.jobType.replace('_', '-')}
            </span>
            {job.locationType && (
              <span className="px-4 py-1.5 bg-sky-500 text-white rounded-full text-xs font-semibold">
                {job.locationType.replace('_', '-')}
              </span>
            )}
            <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-xs font-semibold">
              {daysLeft > 0 ? `Closing in ${daysLeft} days` : 'Closed'}
            </span>
          </div>
        </div>

        {/* Form Section Header */}
        <div className="mb-5">
          <h4 className="text-base font-bold text-slate-900">Apply for this position</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Fill the following fields and we will get back to you soon.
          </p>
        </div>

        {(error || formError) && (
          <div className="mb-4 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
            {error || formError}
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loadingUserData}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              E-Mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadingUserData}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="+94 7X XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loadingUserData}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* CV Selection Options */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Resume / CV
            </label>

            {savedResume && (
              <div
                onClick={() => setUseProfileCv(true)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  useProfileCv
                    ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-500'
                    : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-sky-100 rounded-xl text-sky-600 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {savedResume.originalName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Profile CV • {formatSize(savedResume.fileSize)}
                    </p>
                  </div>
                </div>
                {useProfileCv && (
                  <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                )}
              </div>
            )}

            <div>
              {savedResume && (
                <button
                  type="button"
                  onClick={() => setUseProfileCv(!useProfileCv)}
                  className="text-[11px] font-semibold text-sky-600 hover:underline mb-2 block cursor-pointer"
                >
                  {useProfileCv ? '+ Upload a different CV' : '← Use profile CV'}
                </button>
              )}

              {(!savedResume || !useProfileCv) && (
                <label className="border-2 border-dashed border-sky-200 bg-sky-50/30 hover:bg-sky-50/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-5 h-5 text-sky-500 mb-1.5" />
                  <span className="text-[11px] text-sky-500 font-medium text-center">
                    {customCvFile ? customCvFile.name : 'Drag and drop or Browse your files'}
                  </span>
                  <span className="text-[10px] text-sky-400 mt-0.5 text-center">
                    Maximum file size 10 MB. Supports: PDF, DOCS
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      setCustomCvFile(e.target.files?.[0] || null);
                      setUseProfileCv(false);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={applying || loadingUserData}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs tracking-wider uppercase mt-4 cursor-pointer"
          >
            {applying ? 'SUBMITTING...' : 'APPLY NOW'}
          </Button>
        </form>

      </div>
    </div>
  );
}