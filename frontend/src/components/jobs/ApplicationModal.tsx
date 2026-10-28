'use client';

import { assetUrl } from '@/lib/assetUrl';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_EXT = /\.(pdf|docx?)$/i;
const COVER_MAX = 3000;

function validateCv(file: File): string {
  if (!CV_EXT.test(file.name)) return 'CV must be a PDF or Word file (.pdf, .doc, .docx).';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_CV_BYTES) return 'CV must be 5 MB or smaller.';
  return '';
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
  const [coverLetter, setCoverLetter] = useState('');

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
        setFullName(String((user?.profile as Record<string, unknown> | undefined)?.fullName ?? ''));

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

    if (useProfileCv && savedResume) {
      const response = await api.get('/auth/resume/me/file', { responseType: 'blob' }).catch(() => null);
      if (!response?.data) {
        setFormError('Could not load your profile CV. Upload the file again or try later.');
        return;
      }
      finalCvFile = new File([response.data], savedResume.originalName, {
        type: savedResume.mimeType || 'application/pdf',
      });
    }

    if (!finalCvFile) {
      setFormError('Please select or upload a CV file');
      return;
    }
    const cvProblem = validateCv(finalCvFile);
    if (cvProblem) {
      setFormError(cvProblem);
      return;
    }
    if (!/^\p{L}[\p{L}\p{M} .'’-]{1,79}$/u.test(fullName.trim())) {
      setFormError('Enter your full name using letters only.');
      return;
    }
    if (!/^\+?[0-9][0-9 ()-]{5,19}$/.test(phone.trim()) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
      setFormError('Enter a valid phone number (7 to 15 digits).');
      return;
    }

    setFormError('');

    const formData = new FormData();
    formData.append('jobId', job.id);
    formData.append('cv', finalCvFile);
    if (coverLetter.trim()) formData.append('coverLetter', coverLetter.trim());

    await onSubmit(formData);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-2xl w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden relative p-6 sm:p-8 border border-sky-100"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-sky-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Company Header */}
          <div className="flex items-center gap-4 mb-6 pr-8">
            {job.company?.logoUrl ? (
              <img
                src={assetUrl(job.company.logoUrl)}
                alt={job.company.companyName}
                className="w-14 h-14 rounded-2xl object-cover border border-sky-100 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white font-bold text-xl shadow-md">
                {job.company?.companyName?.[0]?.toUpperCase() || 'C'}
              </div>
            )}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {job.company?.companyName || 'Company Name'}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Posted on {new Date(job.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          <hr className="border-sky-100 my-4" />

          {/* Job Title & Badges */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">{job.title}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="px-3.5 py-1 bg-sky-50 text-[#0025B8] border border-sky-100 rounded-full text-xs font-semibold">
                {job.jobType.replace('_', '-')}
              </span>
              {job.locationType && (
                <span className="px-3.5 py-1 bg-sky-50 text-[#0F9DE4] border border-sky-100 rounded-full text-xs font-semibold">
                  {job.locationType.replace('_', '-')}
                </span>
              )}
              <span className="px-3.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
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
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium"
            >
              {error || formError}
            </motion.div>
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
                  maxLength={80}
                  autoComplete="name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value.replace(/[^\p{L}\p{M} .'’-]/gu, ''))}
                  disabled={loadingUserData}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] transition-all disabled:opacity-50"
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
                  maxLength={254}
                  autoComplete="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingUserData}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] transition-all disabled:opacity-50"
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
                  inputMode="tel"
                  maxLength={20}
                  autoComplete="tel"
                  placeholder="+94 7X XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ()-]/g, ''))}
                  disabled={loadingUserData}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="cover-letter" className="text-xs font-semibold text-slate-700">Cover letter <span className="font-normal text-slate-400">(optional)</span></label>
                <span className={`text-[10px] ${coverLetter.length > COVER_MAX - 100 ? 'text-amber-600' : 'text-slate-400'}`}>{coverLetter.length}/{COVER_MAX}</span>
              </div>
              <textarea
                id="cover-letter"
                rows={3}
                maxLength={COVER_MAX}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the company why you are a good fit."
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] transition-all resize-none"
              />
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
                      ? 'border-[#0F9DE4] bg-sky-50/60 ring-1 ring-[#0F9DE4]'
                      : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-sky-100 rounded-xl text-[#0F9DE4] flex-shrink-0">
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
                    <CheckCircle2 className="w-4 h-4 text-[#0F9DE4] flex-shrink-0" />
                  )}
                </div>
              )}

              <div>
                {savedResume && (
                  <button
                    type="button"
                    onClick={() => setUseProfileCv(!useProfileCv)}
                    className="text-[11px] font-semibold text-[#0F9DE4] hover:underline mb-2 block cursor-pointer"
                  >
                    {useProfileCv ? '+ Upload a different CV' : '← Use profile CV'}
                  </button>
                )}

                {(!savedResume || !useProfileCv) && (
                  <label className="border-2 border-dashed border-sky-200 bg-sky-50/30 hover:bg-sky-50/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-5 h-5 text-[#0F9DE4] mb-1.5" />
                    <span className="text-[11px] text-slate-700 font-medium text-center">
                      {customCvFile ? customCvFile.name : 'Drag and drop or Browse your files'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 text-center">
                      Maximum file size 5 MB. PDF, DOC or DOCX
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        const problem = f ? validateCv(f) : '';
                        if (problem) { setFormError(problem); setCustomCvFile(null); e.target.value = ''; return; }
                        setFormError('');
                        setCustomCvFile(f);
                        setUseProfileCv(false);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                variant="gradient"
                disabled={applying || loadingUserData}
                className="w-full text-white font-bold py-3.5 rounded-full shadow-lg transition-all text-xs tracking-wider uppercase mt-4 cursor-pointer h-12"
              >
                {applying ? 'SUBMITTING...' : 'APPLY NOW'}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}