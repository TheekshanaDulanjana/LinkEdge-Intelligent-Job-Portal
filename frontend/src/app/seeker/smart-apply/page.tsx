'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthGuard from '@/components/AuthGuard';
import api from '@/lib/api';

import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  BookOpen,
  ExternalLink,
  Loader2,
  Sparkles,
  GraduationCap,
  Award,
  AlertCircle,
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';

interface SavedResume {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedDate: string;
}

interface CourseRecommendation {
  title: string;
  platform: string;
  reason: string;
  url?: string;
}

interface JobRecommendation {
  job_id: string;
  title: string;
  location: string;
  match_score: number;
  match_reasons: string[];
}

interface AnalysisResult {
  candidate_name: string;
  extracted_skills: string[];
  extracted_experience: string;
  extracted_education: string;
  matching_skills: string[];
  missing_skills: string[];
  gap_summary: string;
  course_suggestions: CourseRecommendation[];
  recommended_jobs: JobRecommendation[];
  recommendation_summary: string;
}

type Step = 'upload' | 'analyzing' | 'results';

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SmartApplyContent() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>('upload');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [savedResume, setSavedResume] = useState<SavedResume | null>(null);
  const [useProfileCv, setUseProfileCv] = useState<boolean>(true);
  
  const [desiredRole, setDesiredRole] = useState('');
  const [additionalInputs, setAdditionalInputs] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loadingResume, setLoadingResume] = useState(false);
  const [fetchingFile, setFetchingFile] = useState(false);

  // Fetch saved profile resume on mount
  useEffect(() => {
    async function fetchSavedResume() {
      if (!isAuthenticated) return;
      setLoadingResume(true);
      try {
        const res = await api.get('/auth/resume/me').catch(() => null);
        if (res?.data?.hasResume) {
          setSavedResume(res.data.data);
          setUseProfileCv(true);
        } else {
          setSavedResume(null);
          setUseProfileCv(false);
        }
      } catch (err) {
        setSavedResume(null);
        setUseProfileCv(false);
      } finally {
        setLoadingResume(false);
      }
    }
    fetchSavedResume();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  async function handleAnalyze() {
    if (!desiredRole.trim()) {
      setError('Please enter your desired role');
      return;
    }

    setError('');
    let finalCvFile: File | null = cvFile;

    // Retrieve file blob if using profile CV
    if (useProfileCv && savedResume) {
      setFetchingFile(true);
      try {
        const response = await api.get('/auth/resume/me/file', {
          responseType: 'arraybuffer',
        });

        if (response?.data) {
          const blob = new Blob([response.data], {
            type: savedResume.mimeType || 'application/pdf',
          });

          finalCvFile = new File([blob], savedResume.originalName, {
            type: savedResume.mimeType || 'application/pdf',
          });
        }
      } catch (err: any) {
        console.error('Failed to retrieve profile CV file:', err);
        setError('Could not fetch your profile CV file. Please upload a CV manually.');
        setFetchingFile(false);
        return;
      } finally {
        setFetchingFile(false);
      }
    }

    if (!finalCvFile) {
      setError('Please upload or select a CV');
      return;
    }

    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('cv_file', finalCvFile, finalCvFile.name);
      formData.append('desired_role', desiredRole);
      formData.append('additional_inputs', additionalInputs || '');

      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8001/api/v1/ai/analyze', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      setStep('results');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Something went wrong');
      setStep('upload');
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl w-full mx-auto">

        {/* STEP 1: Upload form with Equal 50/50 Split Layout */}
        {step === 'upload' && (
          <div className="bg-white rounded-3xl border-2 border-[#0968D1] overflow-hidden shadow-2xl shadow-[#0968D1]/10 grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
            
            {/* LEFT SIDE: 50% Width Panel */}
            <div className="relative bg-[#0968D1] text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 z-0">
                <Image
                  src="/test.png"
                  alt="City background"
                  fill
                  className="object-cover object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0025B8]/60 to-transparent" />
              </div>

              {/* Top Left Back Button */}
              <div className="relative z-10">
                <Link
                  href="/seeker/dashboard"
                  className="inline-flex items-center gap-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </div>

              {/* Content Area */}
              <div className="relative z-10 mt-12 lg:mt-0 space-y-6">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-white">
                    Why analyze your CV?
                  </h2>
                  <p className="text-sky-100 text-sm leading-relaxed font-normal">
                    Discover how well your profile aligns with top job opportunities and unlock actionable AI insights to accelerate your career growth.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/20">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Precision Job Matching</p>
                      <p className="text-xs text-sky-100 leading-relaxed">Find jobs tailored specifically to your existing skill set and experience level.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Skill Gap Analysis</p>
                      <p className="text-xs text-sky-100 leading-relaxed">Identify missing core competencies for your target role and bridge them fast.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Curated Learning Paths</p>
                      <p className="text-xs text-sky-100 leading-relaxed">Get direct course suggestions from trusted learning platforms.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: 50% Width Panel */}
            <div className="p-8 lg:p-12 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0968D1]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-slate-900">Tell us about yourself</h2>
                    <p className="text-xs text-slate-500">Provide details for precise match recommendations</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* CV Selection Options */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 block">Upload or Select CV</Label>
                    
                    {loadingResume ? (
                      <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0968D1]" />
                        Checking for saved CV...
                      </div>
                    ) : (
                      <>
                        {savedResume && (
                          <div
                            onClick={() => {
                              setUseProfileCv(true);
                              setCvFile(null);
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              useProfileCv
                                ? 'border-[#0968D1] bg-sky-50/40 ring-1 ring-[#0968D1]'
                                : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-sky-100 rounded-xl text-[#0968D1] flex-shrink-0">
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
                              <CheckCircle2 className="w-4 h-4 text-[#0968D1] flex-shrink-0" />
                            )}
                          </div>
                        )}

                        <div>
                          {savedResume && (
                            <button
                              type="button"
                              onClick={() => {
                                setUseProfileCv(!useProfileCv);
                                if (useProfileCv) setCvFile(null);
                              }}
                              className="text-[11px] font-semibold text-[#0968D1] hover:underline my-2 block cursor-pointer"
                            >
                              {useProfileCv ? '+ Upload a different CV' : '← Use profile CV'}
                            </button>
                          )}

                          {(!savedResume || !useProfileCv) && (
                            <div className="mt-1 border-2 border-dashed border-[#0968D1]/30 rounded-2xl p-6 text-center bg-sky-50/20 hover:bg-sky-50/50 hover:border-[#0968D1] transition-all cursor-pointer group">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                                onChange={(e) => {
                                  setCvFile(e.target.files?.[0] || null);
                                  setUseProfileCv(false);
                                }}
                                className="hidden"
                                id="cv-upload"
                              />
                              <label htmlFor="cv-upload" className="cursor-pointer block">
                                {cvFile ? (
                                  <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-200">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs">{cvFile.name}</p>
                                    <p className="text-[11px] text-[#0968D1] mt-1 font-semibold">Click to change file</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-[#0968D1] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                      <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <p className="font-semibold text-slate-800 text-xs">Click to upload your CV</p>
                                    <p className="text-[11px] text-slate-400 mt-1">PDF, DOC, DOCX or TXT up to 10MB</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-2 block">What role are you aiming for?</Label>
                    <Input
                      placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
                      value={desiredRole}
                      onChange={(e) => setDesiredRole(e.target.value)}
                      className="h-11 border-slate-200 rounded-2xl focus-visible:ring-[#0968D1] px-4 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-2 block">Any additional skills or interests? (optional)</Label>
                    <textarea
                      rows={3}
                      placeholder="e.g. I am interested in AI and machine learning. I also know React and have built 3 projects..."
                      value={additionalInputs}
                      onChange={(e) => setAdditionalInputs(e.target.value)}
                      className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0968D1] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <Button 
                  variant="gradient" 
                  className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2" 
                  onClick={handleAnalyze}
                  disabled={fetchingFile}
                >
                  {fetchingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading CV...
                    </>
                  ) : (
                    'Analyze my CV'
                  )}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: Analyzing loading state */}
        {step === 'analyzing' && (
          <div className="bg-white rounded-3xl border-2 border-[#0968D1] p-12 md:p-16 text-center max-w-2xl mx-auto shadow-xl shadow-[#0968D1]/5">
            <Loader2 className="w-14 h-14 text-[#0968D1] animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your CV...</h2>
            <p className="text-slate-500 text-sm mb-8">Our system reading your CV and matching you to optimal roles</p>
            <div className="space-y-3 text-sm text-slate-600 max-w-sm mx-auto text-left bg-sky-50/50 p-6 rounded-2xl border border-sky-100">
              <p className="flex items-center gap-2.5 text-emerald-700 font-medium text-xs md:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Extracting skills and experience</span>
              </p>
              <p className="flex items-center gap-2.5 text-emerald-700 font-medium text-xs md:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Identifying skill gaps for your target role</span>
              </p>
              <p className="flex items-center gap-2.5 text-emerald-700 font-medium text-xs md:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Finding matched job opportunities</span>
              </p>
              <p className="flex items-center gap-2.5 text-[#0968D1] font-bold text-xs md:text-sm animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>Generating custom recommendations...</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && result && (
          <div className="space-y-6">

            {/* Candidate summary */}
            <div className="bg-white rounded-3xl border-2 border-[#0968D1] p-6 md:p-8 shadow-lg shadow-[#0968D1]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0968D1] bg-sky-50 px-3 py-1 rounded-full border border-[#0968D1]/20 inline-block mb-2">
                  Analysis Complete
                </span>
                <h2 className="font-bold text-2xl text-slate-900">
                  {result.candidate_name || 'Your CV Analysis'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Targeted position: <strong className="text-slate-800">{desiredRole}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setResult(null); }}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 self-start md:self-auto"
              >
                Analyze another CV
              </Button>
            </div>

            {/* Skills found */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#0968D1]" />
                Skills extracted from your CV
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {result.extracted_skills.map((skill, i) => (
                  <span key={i} className="px-3.5 py-1.5 bg-sky-50 border border-sky-100 text-[#0968D1] font-semibold text-xs rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex gap-3">
                  <Briefcase className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">Experience Overview</p>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed">{result.extracted_experience}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <GraduationCap className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">Education Background</p>
                    <p className="text-slate-600 text-xs md:text-sm leading-relaxed">{result.extracted_education}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill gap analysis */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0968D1]" />
                Skill Gap Analysis for {desiredRole}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">{result.gap_summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Skills you already possess
                  </p>
                  <ul className="space-y-2">
                    {result.matching_skills.map((skill, i) => (
                      <li key={i} className="text-xs md:text-sm font-medium text-emerald-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-5">
                  <p className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Recommended skills to build
                  </p>
                  <ul className="space-y-2">
                    {result.missing_skills.map((skill, i) => (
                      <li key={i} className="text-xs md:text-sm font-medium text-rose-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Course recommendations */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#0968D1]" />
                    Recommended courses to bridge the gap
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Select any course card to view learning materials</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.course_suggestions.map((course, i) => {
                  const hasUrl = course.url && course.url.startsWith('http');

                  const CardContent = () => (
                    <div className="bg-slate-50 border border-slate-200 hover:border-[#0968D1] rounded-2xl p-5 h-full transition-all duration-200 hover:shadow-md hover:bg-white group flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#0968D1] transition-colors">
                            {course.title}
                          </p>
                          {hasUrl && (
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#0968D1] flex-shrink-0 mt-0.5 transition-colors" />
                          )}
                        </div>
                        <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[#0968D1] mb-3">
                          {course.platform}
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">{course.reason}</p>
                      </div>

                      {hasUrl && (
                        <p className="text-xs font-bold text-[#0968D1] mt-4 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          Open course platform
                        </p>
                      )}
                    </div>
                  );

                  if (hasUrl) {
                    return (
                      <a
                        key={i}
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block no-underline"
                      >
                        <CardContent />
                      </a>
                    );
                  }
                  return <div key={i}><CardContent /></div>;
                })}
              </div>
            </div>

            {/* Job recommendations */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900 mb-1 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0968D1]" />
                Job matches for your profile
              </h3>
              <p className="text-xs text-slate-500 mb-6">{result.recommendation_summary}</p>

              <div className="space-y-4">
                {result.recommended_jobs.map((job, i) => (
                  <div key={i} className="border border-slate-200 hover:border-[#0968D1]/40 rounded-2xl p-5 md:p-6 transition-all hover:shadow-md bg-slate-50/40">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{job.title}</h4>
                        <p className="text-xs font-medium text-slate-500">{job.location}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        job.match_score >= 75
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : job.match_score >= 50
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {job.match_score}% Match
                      </span>
                    </div>

                    <ul className="space-y-1.5 my-4 bg-white p-3.5 rounded-xl border border-slate-100">
                      {job.match_reasons.map((reason, j) => (
                        <li key={j} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0968D1] flex-shrink-0 mt-1.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={`/jobs/${job.job_id}`} className="block mt-4">
                      <Button variant="gradient" size="sm" className="w-full">
                        View position and apply
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom action */}
            <Button
              variant="outline"
              onClick={() => { setStep('upload'); setResult(null); }}
              className="w-full h-12 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Analyze another CV
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SmartApplyPage() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <SmartApplyContent />
    </AuthGuard>
  );
}