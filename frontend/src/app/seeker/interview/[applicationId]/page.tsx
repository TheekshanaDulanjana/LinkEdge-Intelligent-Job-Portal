'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useCamera } from '@/hooks/useCamera';
import AuthGuard from '@/components/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Video, 
  Mic, 
  Volume2, 
  AlertCircle, 
  Loader2, 
  Square, 
  RotateCcw, 
  ArrowRight, 
  X, 
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Radio,
  BrainCircuit,
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react';

type Stage =
  | 'permissions'
  | 'ready'
  | 'loading'
  | 'speaking'
  | 'listening'
  | 'answered'
  | 'submitting'
  | 'results';

interface Evaluation {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  model_answer?: string;
}

interface Results {
  total_score: number;
  grade: string;
  overall_feedback: string;
  improvement_tips: string[];
  evaluations: Evaluation[];
}

function gradeColor(grade: string) {
  const map: Record<string, string> = {
    Excellent: 'text-emerald-600',
    Good: 'text-[#0F9DE4]',
    Satisfactory: 'text-amber-600',
    'Needs Improvement': 'text-orange-500',
    Poor: 'text-rose-600',
  };
  return map[grade] ?? 'text-slate-600';
}

function InterviewPage() {
  const { applicationId } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const { speak, stop: stopSpeech, isSpeaking } = useTextToSpeech();
  const {
    transcript,
    isListening,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: speechError,
  } = useSpeechRecognition();
  const { videoRef, isCameraOn, cameraError, startCamera, stopCamera } = useCamera();

  const [stage, setStage] = useState<Stage>('permissions');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [jobInfo, setJobInfo] = useState<{
    title: string;
    jobId: string;
    description: string;
    requirements: string;
  } | null>(null);
  const [error, setError] = useState('');

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); }
  }, [isAuthenticated, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await applicationApi.get('/applications/my-applications');
        const app = res.data.data.find(
          (a: { id: string }) => a.id === applicationId
        );
        if (!app) return;

        const token = localStorage.getItem('accessToken');
        const jobRes = await fetch(
          `http://localhost:3002/api/v1/jobs/${app.job.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const jobData = await jobRes.json();
        setJobInfo({
          title: jobData.data.title,
          jobId: jobData.data.id,
          description: jobData.data.description,
          requirements: jobData.data.requirements,
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (isAuthenticated) load();
  }, [isAuthenticated, applicationId]);

  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  async function handleRequestPermissions() {
    await startCamera();
    setStage('ready');
  }

  async function handleStartInterview() {
    if (!jobInfo) return;
    setStage('loading');
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        'http://localhost:8002/api/v1/interview/start',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            application_id: applicationId,
            seeker_id: user?.id ?? '',
            job_id: jobInfo.jobId,
            job_title: jobInfo.title,
            job_description: jobInfo.description,
            job_requirements: jobInfo.requirements,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Failed to start');

      setSessionId(data.session_id);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setCurrentQ(0);

      speakQuestion(data.questions[0]);
    } catch (e: unknown) {
      setError((e as Error).message);
      setStage('ready');
    }
  }

  function speakQuestion(text: string) {
    setStage('speaking');
    resetTranscript();

    const prefix =
      currentQ === 0
        ? `Welcome to your interview. Question 1. `
        : `Question ${currentQ + 1}. `;

    speak(prefix + text, () => {
      setStage('listening');
      startListening();
    });
  }

  function handleStopRecording() {
    stopListening();

    const answer = transcript.trim() || '[No answer captured]';
    const updated = [...answers];
    updated[currentQ] = answer;
    setAnswers(updated);
    setStage('answered');
  }

  function handleNextQuestion() {
    const next = currentQ + 1;
    if (next < questions.length) {
      setCurrentQ(next);
      speakQuestion(questions[next]);
    } else {
      handleSubmitAll();
    }
  }

  function handleReRecord() {
    resetTranscript();
    const updated = [...answers];
    updated[currentQ] = '';
    setAnswers(updated);
    speakQuestion(questions[currentQ]);
  }

  async function handleSubmitAll() {
    stopSpeech();
    stopCamera();
    setStage('submitting');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        'http://localhost:8002/api/v1/interview/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            answers,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Evaluation failed');

      setResults(data);
      setStage('results');
    } catch (e: unknown) {
      setError((e as Error).message);
      setStage('answered');
    }
  }

  function handleEndInterview() {
    stopSpeech();
    stopCamera();
    router.push('/seeker/profile');
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex items-center justify-center p-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-7xl min-h-[85vh] flex flex-col justify-center">

        {/* PERMISSIONS SCREEN */}
        {stage === 'permissions' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center w-full"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 sm:p-12 max-w-lg w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-[#0025B8] to-[#0F9DE4] rounded-3xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-sky-500/20">
                <Video className="w-10 h-10" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">AI Interview Session</h1>
              <p className="text-[#0F9DE4] font-bold text-sm mb-4">{jobInfo?.title ?? 'Loading position...'}</p>
              <p className="text-slate-600 text-xs sm:text-sm mb-8 leading-relaxed font-medium">
                This interview requires access to your <strong className="text-slate-900 font-bold">camera</strong> and <strong className="text-slate-900 font-bold">microphone</strong>.
                Your camera shows a live feed only, nothing is recorded or uploaded.
                You will speak your answers aloud.
              </p>

              {!speechSupported && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-left flex items-start gap-3 font-medium">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Speech recognition requires Google Chrome or Microsoft Edge. Please switch browsers.</span>
                </div>
              )}

              {cameraError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 text-left flex items-start gap-3 font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="space-y-3 mb-8 text-left">
                {[
                  { icon: Video, label: 'Camera', desc: 'Live video feed, not recorded' },
                  { icon: Mic, label: 'Microphone', desc: 'Converts your speech to text' },
                  { icon: Volume2, label: 'Speaker', desc: 'Questions read aloud to you' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4 shadow-xs">
                      <div className="w-10 h-10 bg-white border border-sky-100 rounded-xl flex items-center justify-center text-[#0F9DE4] shadow-xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.label}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Link href="/seeker/profile" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full h-12 border-sky-200 text-[#0025B8] hover:bg-sky-50 font-semibold text-xs cursor-pointer shadow-xs">
                    Cancel
                  </Button>
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    onClick={handleRequestPermissions}
                    disabled={!speechSupported}
                    variant="gradient"
                    className="w-full rounded-full h-12 text-xs font-bold shadow-md cursor-pointer"
                  >
                    Allow and continue
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* READY SCREEN */}
        {stage === 'ready' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center w-full"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 sm:p-12 max-w-lg w-full text-center shadow-2xl">
              <div className="relative mb-6 rounded-2xl overflow-hidden bg-slate-900 aspect-video w-full border border-sky-100 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">
                    Camera preview
                  </div>
                )}
                {isCameraOn && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-700">Camera active</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Ready to begin</h2>
              <p className="text-slate-600 text-xs sm:text-sm mb-8 leading-relaxed font-medium">
                You will be asked <strong className="text-slate-900 font-bold">7 questions</strong>.
                Each question will be read aloud. Speak your answer clearly when the
                microphone turns on. You can re-record if needed.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 text-left font-medium">
                  {error}
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleStartInterview}
                  variant="gradient"
                  className="w-full rounded-full h-12 text-sm font-bold shadow-md cursor-pointer"
                  disabled={!jobInfo}
                >
                  Start interview
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* LOADING SCREEN */}
        {stage === 'loading' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Loader2 className="w-12 h-12 text-[#0F9DE4] animate-spin mb-4" />
            <p className="text-slate-700 font-bold text-base">Preparing your interview questions...</p>
          </motion.div>
        )}

        {/* MAIN INTERVIEW SCREEN (LEFT & RIGHT PANELS) */}
        {(stage === 'speaking' || stage === 'listening' || stage === 'answered') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-4"
          >
            
            {/* Top End Interview Bar */}
            <div className="flex justify-end items-center">
              <button
                onClick={handleEndInterview}
                className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-5 py-2.5 rounded-full transition-all shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
                End Interview
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-[640px]">
              
              {/* LEFT CONTAINER */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 flex flex-col items-center justify-between shadow-xl">
                
                {/* Top Job Title */}
                <div className="text-center w-full">
                  <span className="inline-block text-[10px] font-bold tracking-widest text-[#0F9DE4] uppercase bg-sky-50 px-3 py-1 rounded-full border border-sky-100 mb-2">
                    ACTIVE INTERVIEW
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {jobInfo?.title ?? 'Job Title'}
                  </h2>
                </div>

                {/* Middle Live Camera Preview */}
                <div className="w-full my-6">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video w-full border border-sky-100 shadow-md">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1 border border-slate-200 shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">LIVE</span>
                    </div>

                    {isListening && (
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 items-end h-4">
                            {[1, 2, 3, 4, 5].map((bar) => (
                              <div
                                key={bar}
                                className="w-1 bg-[#0F9DE4] rounded-full animate-pulse"
                                style={{
                                  height: `${[50, 100, 70, 90, 60][bar - 1]}%`,
                                  animationDelay: `${bar * 0.15}s`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-700">Recording</span>
                        </div>
                        <span className="text-xs font-extrabold text-[#0025B8]">
                          {formatTime(recordingSeconds)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Seeker Info */}
                <div className="text-center w-full pt-4 border-t border-sky-50">
                  <p className="text-sm font-bold text-slate-900">{user?.email?.split('@')[0] || 'Candidate'}</p>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Verified Candidate</p>
                </div>
              </div>

              {/* RIGHT CONTAINER */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 flex flex-col justify-between shadow-xl">
                
                <div className="flex-1 flex flex-col">
                  {/* Top Question Count */}
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-extrabold text-[#0025B8] uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                      Question {currentQ + 1} of {questions.length}
                    </p>
                    {stage === 'speaking' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F9DE4] bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        <span>Speaking question...</span>
                      </div>
                    )}
                  </div>

                  {/* Middle Question Area */}
                  <div className="mb-6">
                    <p className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {questions[currentQ]}
                    </p>
                  </div>

                  {/* Answer Box */}
                  <div className="bg-slate-50/80 border border-sky-100 rounded-2xl p-6 flex-1 flex flex-col justify-start min-h-[220px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-slate-500">
                        {stage === 'listening'
                          ? 'Your answer (live transcription)'
                          : stage === 'answered'
                          ? 'Your answer (recorded)'
                          : 'Waiting for your answer...'}
                      </p>
                      {stage === 'listening' && (
                        <span className="text-xs font-bold text-[#0F9DE4]">
                          {formatTime(recordingSeconds)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      {stage === 'speaking' && (
                        <p className="text-slate-400 text-xs italic font-medium">
                          Microphone will activate automatically when the question finishes...
                        </p>
                      )}
                      {(stage === 'listening' || stage === 'answered') && (
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          transcript || answers[currentQ]
                            ? 'text-slate-800 font-semibold'
                            : 'text-slate-400 italic'
                        }`}>
                          {transcript || answers[currentQ] || 'Listening for your response...'}
                        </p>
                      )}
                    </div>

                    {speechError && (
                      <p className="text-xs text-rose-600 font-semibold mt-2">{speechError}</p>
                    )}
                  </div>
                </div>

                {/* Bottom Control Buttons */}
                <div className="mt-6 pt-4 border-t border-sky-50">
                  {stage === 'speaking' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopSpeech();
                        setStage('listening');
                        startListening();
                      }}
                      className="w-full rounded-full h-12 border border-sky-200 text-[#0025B8] hover:bg-sky-50 font-semibold text-xs cursor-pointer shadow-xs"
                    >
                      Skip audio, start recording
                    </Button>
                  )}

                  {stage === 'listening' && (
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <button
                        onClick={handleStopRecording}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-full flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        Stop Recording
                      </button>
                    </motion.div>
                  )}

                  {stage === 'answered' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleReRecord}
                        className="flex-1 rounded-full h-12 border border-sky-200 text-[#0025B8] hover:bg-sky-50 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Re-record answer
                      </Button>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button
                          onClick={handleNextQuestion}
                          variant="gradient"
                          className="w-full rounded-full h-12 text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                        >
                          <span>
                            {currentQ < questions.length - 1
                              ? 'Next question'
                              : 'Submit all answers'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* SUBMITTING SCREEN (Smart AI Workflow Layout) */}
        {stage === 'submitting' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center w-full py-12"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-sky-100 rounded-[36px] p-8 md:p-12 max-w-xl w-full text-center shadow-2xl space-y-8">
              
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-sky-100 animate-ping opacity-75" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-[#0025B8] to-[#0F9DE4] rounded-3xl flex items-center justify-center text-white shadow-xl">
                  <BrainCircuit className="w-10 h-10 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Evaluating your interview...
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed max-w-md mx-auto">
                  Our advanced neural engine is analyzing your spoken transcripts, semantic clarity, and role alignment.
                </p>
              </div>

              <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-5 text-left space-y-3.5">
                <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-emerald-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Audio transcripts successfully compiled</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm font-medium text-emerald-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Semantic evaluation model initialized</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-[#0025B8]">
                  <div className="w-6 h-6 rounded-full bg-sky-200/70 flex items-center justify-center text-[#0F9DE4] shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="animate-pulse">Synthesizing final scores & actionable feedback...</span>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* RESULTS SCREEN (Clean Organized Summary Dashboard with Framer Motion Animations) */}
        {stage === 'results' && results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl mx-auto py-8 space-y-6"
          >
            {/* Top Score Dashboard Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-gradient-to-br from-white via-sky-50/40 to-blue-50/30 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 md:p-10 text-center shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0F9DE4]/10 rounded-full blur-3xl pointer-events-none" />
              
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#0025B8] uppercase bg-sky-100/70 px-4 py-1.5 rounded-full border border-sky-200 mb-3 shadow-xs">
                <Award className="w-4 h-4 text-[#0F9DE4]" />
                Assessment Report Summary
              </span>

              <div className="flex flex-col items-center justify-center my-2">
                <p className={`text-6xl md:text-7xl font-bold tracking-tight ${gradeColor(results.grade)} drop-shadow-sm`}>
                  {results.total_score.toFixed(1)}
                </p>
                <p className="text-slate-400 font-semibold text-xs mt-1 uppercase tracking-wider">Out of 100 Overall Score</p>
              </div>

              <div className="inline-block mt-2">
                <span className={`px-5 py-1.5 rounded-full font-semibold text-xs shadow-xs border uppercase tracking-wider ${
                  results.grade === 'Excellent' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  results.grade === 'Good' ? 'bg-sky-50 text-[#0025B8] border-sky-200' :
                  results.grade === 'Satisfactory' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {results.grade} Performance
                </span>
              </div>
            </motion.div>

            {/* 2-Column Grid for Executive AI Evaluation & Recommended Growth Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Executive AI Evaluation */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-lg flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0F9DE4] flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">Executive AI Evaluation</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                    {results.overall_feedback}
                  </p>
                </div>
              </motion.div>

              {/* Recommended Growth Actions */}
              {results.improvement_tips.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-sky-100 p-6 sm:p-8 shadow-lg flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0F9DE4] flex items-center justify-center shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 tracking-tight">Recommended Growth Actions</h3>
                    <ul className="space-y-2">
                      {results.improvement_tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="w-5 h-5 rounded-full bg-[#0025B8] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                          <span className="leading-snug">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

            </div>

            {/* Detailed Question Breakdown (Organized Row and Column Layout) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-sky-100 p-8 shadow-lg space-y-6"
            >
              <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0F9DE4] flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                Detailed Question-by-Question Breakdown
              </h3>

              <div className="grid grid-cols-1 gap-6">
                {results.evaluations.map((ev, i) => (
                  <div key={i} className="bg-slate-50/80 border border-sky-100 rounded-2xl p-6 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Question & Score Badge */}
                    <div className="lg:col-span-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#0F9DE4] uppercase tracking-wider">Question 0{i + 1}</span>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-xs ${
                          ev.score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ev.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {ev.score.toFixed(0)} / 100
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {ev.question}
                      </h4>
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden pt-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            ev.score >= 75 ? 'bg-emerald-500' :
                            ev.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${ev.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Right Column: Spoken Transcript & AI Feedback */}
                    <div className="lg:col-span-7 space-y-3 pt-2 lg:pt-0 lg:border-l lg:border-sky-100 lg:pl-6">
                      <div className="bg-white border border-sky-100 rounded-xl p-3.5 shadow-xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your answer</p>
                        <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                          {ev.answer && ev.answer !== '[No answer captured]' ? <>&ldquo;{ev.answer}&rdquo;</> : 'No answer captured'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-[#0025B8] uppercase tracking-wider">AI Assessment Feedback</p>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                          {ev.feedback}
                        </p>
                      </div>
                      {ev.model_answer && (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 shadow-xs">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Best answer (model response)</p>
                          <p className="text-xs sm:text-sm text-emerald-900 font-medium leading-relaxed">
                            {ev.model_answer}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/seeker/profile" className="flex-1">
                <Button variant="outline" className="w-full rounded-full h-12 border border-sky-200 text-[#0025B8] hover:bg-sky-50 font-semibold text-xs cursor-pointer shadow-xs">
                  Back to profile
                </Button>
              </Link>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  onClick={() => {
                    setStage('ready');
                    setQuestions([]);
                    setSessionId('');
                    setError('');
                    setAnswers([]);
                    setCurrentQ(0);
                    setResults(null);
                    startCamera();
                  }}
                  variant="gradient"
                  className="w-full rounded-full h-12 text-xs font-bold shadow-md cursor-pointer"
                >
                  Practice again
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

export default function InteractiveInterviewPage() {
  return (
    <AuthGuard requiredRole="SEEKER">
      <InterviewPage />
    </AuthGuard>
  );
}