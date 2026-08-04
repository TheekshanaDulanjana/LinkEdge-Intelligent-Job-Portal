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
  CheckCircle2 
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
    Good: 'text-[#0968D1]',
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
    router.push('/seeker/dashboard');
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-7xl min-h-[85vh] flex flex-col justify-center">

        {/* PERMISSIONS SCREEN */}
        {stage === 'permissions' && (
          <div className="flex items-center justify-center w-full">
            <div className="bg-white rounded-[24px] border-2 border-[#0084FF] p-8 md:p-12 max-w-lg w-full text-center shadow-xl">
              <div className="w-20 h-20 bg-[#0084FF]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Video className="w-10 h-10 text-[#0084FF]" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Interview Session</h1>
              <p className="text-[#0084FF] font-semibold text-base mb-3">{jobInfo?.title ?? 'Loading...'}</p>
              <p className="text-slate-600 text-sm mb-8 leading-relaxed">
                This interview requires access to your <strong className="text-slate-900">camera</strong> and <strong className="text-slate-900">microphone</strong>.
                Your camera shows a live feed only, nothing is recorded or uploaded.
                You will speak your answers aloud.
              </p>

              {!speechSupported && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-left flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>Speech recognition requires Google Chrome or Microsoft Edge. Please switch browsers.</span>
                </div>
              )}

              {cameraError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 text-left flex items-start gap-3">
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
                    <div key={item.label} className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#0968D1]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <Link href="/seeker/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full border-2 border-[#0084FF] text-[#0084FF] hover:bg-slate-50 cursor-pointer">
                    Cancel
                  </Button>
                </Link>
                <Button
                  onClick={handleRequestPermissions}
                  disabled={!speechSupported}
                  variant="gradient"
                  className="flex-1 cursor-pointer"
                >
                  Allow and continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* READY SCREEN */}
        {stage === 'ready' && (
          <div className="flex items-center justify-center w-full">
            <div className="bg-white rounded-[24px] border-2 border-[#0084FF] p-8 md:p-10 max-w-lg w-full text-center shadow-xl">
              <div className="relative mb-6 rounded-2xl overflow-hidden bg-slate-100 aspect-video border border-slate-200 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!isCameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
                    Camera preview
                  </div>
                )}
                {isCameraOn && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-3 py-1 shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-700">Camera on</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to begin</h2>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                You will be asked <strong className="text-slate-900">7 questions</strong>.
                Each question will be read aloud. Speak your answer clearly when the
                microphone turns on. You can re-record if needed.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 text-left">
                  {error}
                </div>
              )}

              <Button
                onClick={handleStartInterview}
                variant="gradient"
                className="w-full"
                disabled={!jobInfo}
              >
                Start interview
              </Button>
            </div>
          </div>
        )}

        {/* LOADING SCREEN */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#0968D1] animate-spin mb-4" />
            <p className="text-slate-600 font-medium text-base">Preparing your interview questions...</p>
          </div>
        )}

        {/* MAIN INTERVIEW SCREEN (LEFT & RIGHT PANELS) */}
        {(stage === 'speaking' || stage === 'listening' || stage === 'answered') && (
          <div className="w-full flex flex-col gap-4">
            
            {/* Top End Interview Bar */}
            <div className="flex justify-end items-center">
              <button
                onClick={handleEndInterview}
                className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
                End Interview
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch min-h-[650px]">
              
              {/* LEFT CONTAINER */}
              <div className="bg-white rounded-3xl border-2 border-[#0084FF] p-8 flex flex-col items-center justify-between shadow-lg shadow-[#0084FF]/5">
                
                {/* Top Job Title */}
                <div className="text-center w-full">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {jobInfo?.title ?? 'Job Title'}
                  </h2>
                </div>

                {/* Middle Live Camera Preview */}
                <div className="w-full my-6">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-200 aspect-video w-full border border-slate-300 shadow-sm">
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
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md border border-[#0968D1]/30 rounded-2xl p-3 flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 items-end h-4">
                            {[1, 2, 3, 4, 5].map((bar) => (
                              <div
                                key={bar}
                                className="w-1 bg-[#0968D1] rounded-full animate-pulse"
                                style={{
                                  height: `${[50, 100, 70, 90, 60][bar - 1]}%`,
                                  animationDelay: `${bar * 0.15}s`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-slate-700">Recording</span>
                        </div>
                        <span className="text-xs font-bold text-[#0968D1]">
                          {formatTime(recordingSeconds)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Seeker Info */}
                <div className="text-center w-full">
                  <p className="text-lg font-bold text-slate-900">{user?.email?.split('@')[0]}</p>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Candidate</p>
                </div>
              </div>

              {/* RIGHT CONTAINER */}
              <div className="bg-white rounded-3xl border-2 border-[#0968D1] p-8 flex flex-col justify-between shadow-lg shadow-[#0968D1]/5">
                
                <div className="flex-1 flex flex-col">
                  {/* Top Question Count */}
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-base font-bold text-[#0968D1]">
                      Questions {currentQ + 1} of {questions.length}
                    </p>
                    {stage === 'speaking' && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0968D1] bg-[#0968D1]/10 px-3 py-1 rounded-full">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        <span>Speaking...</span>
                      </div>
                    )}
                  </div>

                  {/* Middle Question Area */}
                  <div className="mb-6">
                    <p className="text-xl md:text-2xl font-bold text-[#0968D1] leading-snug">
                      {questions[currentQ]}
                    </p>
                  </div>

                  {/* Answer Box */}
                  <div className="bg-sky-50/60 border border-[#0968D1]/30 rounded-2xl p-6 flex-1 flex flex-col justify-start min-h-[220px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-semibold text-[#0968D1]">
                        {stage === 'listening'
                          ? 'Your answer (live transcription)'
                          : stage === 'answered'
                          ? 'Your answer (recorded)'
                          : 'Waiting for your answer...'}
                      </p>
                      {stage === 'listening' && (
                        <span className="text-xs font-bold text-[#0968D1]">
                          {formatTime(recordingSeconds)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      {stage === 'speaking' && (
                        <p className="text-slate-400 text-sm italic">
                          Microphone activates when question finishes...
                        </p>
                      )}
                      {(stage === 'listening' || stage === 'answered') && (
                        <p className={`text-sm md:text-base leading-relaxed ${
                          transcript || answers[currentQ]
                            ? 'text-slate-800 font-medium'
                            : 'text-slate-400 italic'
                        }`}>
                          {transcript || answers[currentQ] || 'Listening for your response...'}
                        </p>
                      )}
                    </div>

                    {speechError && (
                      <p className="text-xs text-rose-600 font-medium mt-2">{speechError}</p>
                    )}
                  </div>
                </div>

                {/* Bottom Control Buttons */}
                <div className="mt-6">
                  {stage === 'speaking' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopSpeech();
                        setStage('listening');
                        startListening();
                      }}
                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Skip audio, start recording
                    </Button>
                  )}

                  {stage === 'listening' && (
                    <button
                      onClick={handleStopRecording}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-full flex items-center justify-center gap-2 transition-all shadow-md active:translate-y-px"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop Recording
                    </button>
                  )}

                  {stage === 'answered' && (
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={handleReRecord}
                        className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Re-record answer
                      </Button>
                      <Button
                        onClick={handleNextQuestion}
                        variant="gradient"
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <span>
                          {currentQ < questions.length - 1
                            ? 'Next question'
                            : 'Submit all answers'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* SUBMITTING SCREEN */}
        {stage === 'submitting' && (
          <div className="flex items-center justify-center w-full py-12">
            <div className="text-center max-w-md w-full bg-white border border-[#0968D1]/30 rounded-3xl p-8 md:p-12 shadow-xl shadow-[#0968D1]/5">
              <Loader2 className="w-16 h-16 text-[#0968D1] animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Evaluating your interview...</h2>
              <p className="text-slate-600 text-sm mb-6">
                Gemini AI is reviewing all your answers. This takes about 15 to 20 seconds.
              </p>
              <div className="space-y-3 text-sm text-slate-600 text-left bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Transcripts received
                </p>
                <p className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Sending to Gemini for analysis
                </p>
                <p className="flex items-center gap-2 text-[#0968D1] font-medium animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating scores and feedback...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS SCREEN */}
        {stage === 'results' && results && (
          <div className="w-full max-w-4xl mx-auto py-8">
            <div className="bg-white rounded-3xl border border-[#0968D1]/30 p-8 md:p-12 text-center mb-8 shadow-xl shadow-[#0968D1]/5">
              <p className="text-slate-500 font-medium text-sm mb-2 uppercase tracking-wider">Interview complete</p>
              <p className={`text-7xl md:text-8xl font-black mb-2 ${gradeColor(results.grade)}`}>
                {results.total_score.toFixed(1)}
              </p>
              <p className="text-slate-400 font-medium text-sm mb-6">out of 100</p>
              <span className={`inline-block px-6 py-2 rounded-full font-bold text-sm ${
                results.grade === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                results.grade === 'Good' ? 'bg-sky-50 text-[#0968D1] border border-[#0968D1]/30' :
                results.grade === 'Satisfactory' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {results.grade}
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 mb-6 shadow-sm">
              <h3 className="font-bold text-lg mb-3 text-slate-900">Overall feedback</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {results.overall_feedback}
              </p>
            </div>

            {results.improvement_tips.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 mb-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-900">How to improve</h3>
                <ul className="space-y-3">
                  {results.improvement_tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <span className="text-[#0968D1] font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 mb-8 shadow-sm">
              <h3 className="font-bold text-lg mb-6 text-slate-900">Question breakdown</h3>
              <div className="space-y-6">
                {results.evaluations.map((ev, i) => (
                  <div key={i} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-slate-900 flex-1 pr-4 leading-relaxed">
                        Q{i + 1}: {ev.question}
                      </p>
                      <span className={`text-xl font-bold flex-shrink-0 ${
                        ev.score >= 75 ? 'text-emerald-600' :
                        ev.score >= 50 ? 'text-amber-600' :
                        'text-rose-600'
                      }`}>
                        {ev.score.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.score >= 75 ? 'bg-emerald-500' :
                          ev.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${ev.score}%` }}
                      />
                    </div>
                    {ev.answer && ev.answer !== '[No answer captured]' && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">Your spoken answer</p>
                        <p className="text-xs text-slate-700 italic leading-relaxed">
                          &quot;{ev.answer}&quot;
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">{ev.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/seeker/dashboard" className="flex-1">
                <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                  Back to dashboard
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setStage('ready');
                  setAnswers([]);
                  setCurrentQ(0);
                  setResults(null);
                  startCamera();
                }}
                variant="gradient"
                className="flex-1"
              >
                Practice again
              </Button>
            </div>
          </div>
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