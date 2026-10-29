'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
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
  TrendingUp,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart,
  Activity,
  CheckSquare,
  ShieldCheck,
  Cpu
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

  // State for skills show more / less toggle
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Analyzing Step Status Index for dynamic minimal ticker
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const analysisPhases = [
    "Parsing document structure & formatting...",
    "Extracting technical core competencies...",
    "Evaluating experience against industry criteria...",
    "Synthesizing customized AI recommendations..."
  ];

  useEffect(() => {
    if (step !== 'analyzing') return;
    const interval = setInterval(() => {
      setAnalysisPhase((prev) => (prev + 1) % analysisPhases.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [step]);

  // Global Header eka hide kirima me page ekedi
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

  // The AuthGuard around this page sends a signed-out user to the login page
  if (!isAuthenticated) return null;

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

  // Calculate skill match percentage for charts
  const totalSkillsEvaluated = (result?.matching_skills.length || 0) + (result?.missing_skills.length || 0);
  const matchPercentage = totalSkillsEvaluated > 0 
    ? Math.round(((result?.matching_skills.length || 0) / totalSkillsEvaluated) * 100) 
    : 75;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl w-full mx-auto">

        {/* STEP 1: Upload form with Equal 50/50 Split Layout */}
        {step === 'upload' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2 min-h-[640px]"
          >
            
            {/* LEFT SIDE: 50% Width Panel */}
            <div className="relative bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
                <Image
                  src="/test.png"
                  alt="City background"
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0025B8]/80 via-transparent to-transparent z-0" />

              {/* Top Left Back Button */}
              <div className="relative z-10">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 transition-all shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </div>

              {/* Content Area */}
              <div className="relative z-10 mt-12 lg:mt-0 space-y-6">
                <div>
                  <span className="inline-block text-[10px] font-bold tracking-widest text-cyan-200 uppercase bg-white/10 px-3 py-1 rounded-full border border-white/15 mb-3 shadow-sm">
                    AI POWERED INSIGHTS
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3 text-white">
                    Why analyze your CV?
                  </h2>
                  <p className="text-white/80 text-sm leading-relaxed font-medium">
                    Discover how well your profile aligns with top job opportunities and unlock actionable AI insights to accelerate your career growth.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/15">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/15 shadow-sm">
                      <Target className="w-4 h-4 text-cyan-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Precision Job Matching</p>
                      <p className="text-xs text-white/70 leading-relaxed">Find jobs tailored specifically to your existing skill set and experience level.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/15 shadow-sm">
                      <Zap className="w-4 h-4 text-cyan-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Skill Gap Analysis</p>
                      <p className="text-xs text-white/70 leading-relaxed">Identify missing core competencies for your target role and bridge them fast.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/15 shadow-sm">
                      <TrendingUp className="w-4 h-4 text-cyan-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Curated Learning Paths</p>
                      <p className="text-xs text-white/70 leading-relaxed">Get direct course suggestions from trusted learning platforms.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: 50% Width Panel */}
            <div className="p-8 lg:p-12 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center gap-3 mb-6 border-b border-sky-100 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0F9DE4] border border-sky-100 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-slate-900 tracking-tight">Tell us about yourself</h2>
                    <p className="text-xs text-slate-500 font-medium">Provide details for precise match recommendations</p>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 font-medium shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-6">
                  {/* CV Selection Options */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 block">Upload or Select CV</Label>
                    
                    {loadingResume ? (
                      <div className="p-4 border border-sky-100 rounded-2xl bg-sky-50/40 text-xs text-slate-500 flex items-center gap-2 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0F9DE4]" />
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
                                <p className="text-[10px] text-slate-400 font-medium">
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
                              onClick={() => {
                                setUseProfileCv(!useProfileCv);
                                if (useProfileCv) setCvFile(null);
                              }}
                              className="text-[11px] font-bold text-[#0F9DE4] hover:underline my-2 block cursor-pointer"
                            >
                              {useProfileCv ? '+ Upload a different CV' : '← Use profile CV'}
                            </button>
                          )}

                          {(!savedResume || !useProfileCv) && (
                            <div className="mt-1 border-2 border-dashed border-sky-200 rounded-2xl p-6 text-center bg-sky-50/30 hover:bg-sky-50/60 hover:border-[#0F9DE4] transition-all cursor-pointer group shadow-sm">
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
                                    <p className="text-[11px] text-[#0F9DE4] mt-1 font-semibold">Click to change file</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0F9DE4] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
                                      <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <p className="font-bold text-slate-800 text-xs">Click to upload your CV</p>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">PDF, DOC, DOCX or TXT up to 10MB</p>
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
                      className="h-12 border-sky-100 bg-slate-50/50 rounded-2xl focus-visible:ring-[#0F9DE4] px-4 text-xs font-medium text-slate-800 shadow-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-2 block">Any additional skills or interests? (optional)</Label>
                    <textarea
                      rows={3}
                      placeholder="e.g. I am interested in AI and machine learning. I also know React and have built 3 projects..."
                      value={additionalInputs}
                      onChange={(e) => setAdditionalInputs(e.target.value)}
                      className="w-full border border-sky-100 bg-slate-50/50 rounded-2xl p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F9DE4] transition-all resize-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button 
                    variant="gradient" 
                    className="w-full h-12 text-sm font-bold flex items-center justify-center gap-2 rounded-full shadow-md cursor-pointer" 
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
                </motion.div>
              </div>
            </div>

          </motion.div>
        )}

        {/* STEP 2: MINIMALISTIC & ATTRACTIVE ANALYZING STATE */}
        {step === 'analyzing' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white/90 backdrop-blur-2xl rounded-[36px] border border-sky-100 p-10 sm:p-16 text-center max-w-xl mx-auto shadow-2xl relative overflow-hidden"
          >
            {/* Subtle background glow effect */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#0F9DE4]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#0025B8]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Central Minimalistic Radar / Spinner Animation */}
            <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-sky-100 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#0F9DE4] animate-spin" style={{ animationDuration: '10s' }} />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] flex items-center justify-center text-white shadow-lg s">
                <Cpu className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <span className="inline-block text-[10px] font-extrabold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3.5 py-1 rounded-full border border-sky-100 mb-3 shadow-sm">
              AI SCANNING
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Processing Your Profile
            </h2>

            {/* Dynamic Animated Status Text Ticker */}
            <div className="h-8 flex items-center justify-center mb-8">
              <AnimatePresence mode="wait">
                <motion.p
                  key={analysisPhase}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide"
                >
                  {analysisPhases[analysisPhase]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Clean Progress Indicator Bar */}
            <div className="max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] h-full rounded-full"
                initial={{ width: "15%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 6, ease: "easeInOut" }}
              />
            </div>
            
            <p className="text-[11px] text-slate-400 font-medium mt-4">
              This will only take a few seconds...
            </p>
          </motion.div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 pb-16"
          >
            {/* Top Hero Banner matching main Hero section style with moving grid */}
            <div className="relative w-full rounded-[32px] bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] p-8 md:p-12 text-white overflow-hidden shadow-lg">
              <motion.div
                animate={{
                  backgroundPosition: ["0px 0px", "64px 64px"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 opacity-35 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #0F9DE4 1px, transparent 1px),
                    linear-gradient(to bottom, #0F9DE4 1px, transparent 1px)
                  `,
                  backgroundSize: "32px 32px",
                  maskImage: "linear-gradient(to bottom, #0F9DE4, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, white, transparent)",
                }}
              />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold border border-white/20 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>AI Profile Optimization Complete</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                    Hello, {result.candidate_name || 'Professional'}!
                  </h1>
                  <p className="text-white/90 text-sm md:text-base max-w-xl leading-relaxed">
                    Here is your complete AI breakdown for <strong className="text-white underline decoration-cyan-300 underline-offset-4">{desiredRole}</strong>. Review your matching skills and recommended paths below.
                  </p>
                </div>

                <div className="flex items-center self-start md:self-auto">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-2 text-xs font-bold text-white bg-white/10 hover:bg-white/25 backdrop-blur-md px-5 py-3 rounded-full border border-white/30 transition-all shadow-md cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Jobs
                  </Link>
                </div>
              </div>
            </div>

            {/* NEW: VISUAL ANALYTICS & STATS DASHBOARD ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat Card 1: Match Score Gauge Visual */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Match Accuracy</span>
                  <Activity className="w-4 h-4 text-[#0F9DE4]" />
                </div>
                <div className="flex items-center gap-4 my-2">
                  <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-sky-50 border-4 border-[#0F9DE4]">
                    <span className="text-xl font-extrabold text-[#0025B8]">{matchPercentage}%</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Role Compatibility</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Based on your skill density vs requirement.</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-gradient-to-r from-[#0025B8] to-[#0F9DE4] h-full rounded-full" style={{ width: `${matchPercentage}%` }} />
                </div>
              </div>

              {/* Stat Card 2: Skill Inventory Breakdown */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Skill Portfolio</span>
                  <PieChart className="w-4 h-4 text-[#0F9DE4]" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Acquired ({result.matching_skills.length})</span>
                      <span className="text-emerald-600">{Math.round((result.matching_skills.length / (totalSkillsEvaluated || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(result.matching_skills.length / (totalSkillsEvaluated || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Missing Gaps ({result.missing_skills.length})</span>
                      <span className="text-rose-600">{Math.round((result.missing_skills.length / (totalSkillsEvaluated || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(result.missing_skills.length / (totalSkillsEvaluated || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">Evaluated across industry benchmarks.</p>
              </div>

              {/* Stat Card 3: Growth Velocity / Action Index */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Action Readiness</span>
                  <BarChart3 className="w-4 h-4 text-[#0F9DE4]" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>{result.course_suggestions.length} Learning Courses Suggested</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-[#0F9DE4]" />
                    <span>{result.recommended_jobs.length} Active Positions Ready</span>
                  </div>
                </div>
                <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-[11px] text-[#0025B8] font-semibold mt-2">
                  High potential for quick interview conversion.
                </div>
              </div>
            </div>

            {/* SECTION 1: Skills & Profile Overview (Modern Card Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Extracted Skills with View More/Less */}
              <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 md:p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shadow-sm">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 tracking-tight">Extracted Core Competencies</h3>
                      <p className="text-xs text-slate-500 font-medium">Skills automatically identified from your documents</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {(showAllSkills ? result.extracted_skills : result.extracted_skills.slice(0, 15)).map((skill, i) => (
                      <span key={i} className="px-4 py-2 bg-sky-50/80 border border-sky-100 text-[#0033ff] font-medium text-xs rounded-xl shadow-xs hover:bg-sky-100/50 transition-colors">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {result.extracted_skills.length > 15 && (
                    <button
                      onClick={() => setShowAllSkills(!showAllSkills)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F9DE4] hover:underline mb-6 cursor-pointer"
                    >
                      {showAllSkills ? (
                        <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                      ) : (
                        <>View More ({result.extracted_skills.length - 15} more) <ChevronDown className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <Briefcase className="w-4 h-4 text-[#0F9DE4]" />
                      <span>Experience</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{result.extracted_experience}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4 text-[#0F9DE4]" />
                      <span>Education</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{result.extracted_education}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Status / Match Overview */}
              <div className="bg-gradient-to-br from-sky-50/80 via-blue-50/40 to-white backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 md:p-8 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-[#0025B8] text-white flex items-center justify-center shadow-md">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 tracking-tight">Readiness Summary</h3>
                      <p className="text-xs text-slate-500 font-medium">Target: {desiredRole}</p>
                    </div>
                  </div>

                  <p className="text-slate-700 text-sm leading-relaxed bg-white/80 p-4 rounded-2xl border border-sky-100 shadow-xs mb-6">
                    {result.gap_summary}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white px-4 py-3 rounded-xl border border-sky-100 shadow-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Matched Skills
                    </span>
                    <span className="text-emerald-700 font-extrabold text-sm">{result.matching_skills.length} Found</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white px-4 py-3 rounded-xl border border-sky-100 shadow-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Skills to Acquire
                    </span>
                    <span className="text-rose-700 font-extrabold text-sm">{result.missing_skills.length} Gaps</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Skill Match Breakdown (Possess vs Gaps) */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900 tracking-tight">Skill Match Breakdown</h3>
                  <p className="text-xs text-slate-500 font-medium">Detailed comparison against requirements for {desiredRole}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Possessed Skills */}
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                    <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Skills You Already Possess
                    </h4>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {result.matching_skills.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.matching_skills.map((skill, i) => (
                      <span key={i} className="px-3.5 py-1.5 bg-white border border-emerald-200/80 text-emerald-900 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing/Recommended Skills */}
                <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-100">
                    <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      Recommended Skills to Build
                    </h4>
                    <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {result.missing_skills.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.map((skill, i) => (
                      <span key={i} className="px-3.5 py-1.5 bg-white border border-rose-200/80 text-rose-900 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Recommended Courses */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 md:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900 tracking-tight">Recommended Learning Paths</h3>
                    <p className="text-xs text-slate-500 font-medium">Curated courses to bridge your skill gaps instantly</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.course_suggestions.map((course, i) => {
                  const hasUrl = course.url && course.url.startsWith('http');

                  const CardContent = () => (
                    <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 border border-slate-200 hover:border-[#0F9DE4] rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-xl hover:bg-white group flex flex-col justify-between shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-sky-100/70 text-[#0025B8] shadow-xs">
                            {course.platform}
                          </span>
                          {hasUrl && (
                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#0F9DE4] flex-shrink-0 transition-colors" />
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-base leading-snug group-hover:text-[#0F9DE4] transition-colors">
                          {course.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{course.reason}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#0F9DE4]">
                        <span>Explore Program</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );

                  if (hasUrl) {
                    return (
                      <a
                        key={i}
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block no-underline h-full"
                      >
                        <CardContent />
                      </a>
                    );
                  }
                  return <div key={i} className="h-full"><CardContent /></div>;
                })}
              </div>
            </div>

            {/* SECTION 4: Job Matches */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 md:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F9DE4] shadow-sm">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900 tracking-tight">Top Matched Job Openings</h3>
                  <p className="text-xs text-slate-500 font-medium">{result.recommendation_summary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.recommended_jobs.map((job, i) => (
                  <div key={i} className="bg-gradient-to-br from-white to-sky-50/20 border border-slate-200 hover:border-[#0F9DE4]/50 rounded-2xl p-6 transition-all hover:shadow-xl shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg tracking-tight">{job.title}</h4>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">{job.location}</p>
                        </div>
                        <span className={`text-xs font-extrabold px-4 py-1.5 rounded-full border shadow-xs ${
                          job.match_score >= 75
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : job.match_score >= 50
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {job.match_score}% Match
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Why you are a strong fit:</p>
                        <ul className="space-y-1.5">
                          {job.match_reasons.map((reason, j) => (
                            <li key={j} className="text-xs text-slate-700 font-medium flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0F9DE4] flex-shrink-0 mt-1.5" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Link href={`/jobs/${job.job_id}`} className="block mt-6">
                      <Button variant="gradient" className="w-full h-11 rounded-full font-bold shadow-md cursor-pointer">
                        View Position & Apply Now
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
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