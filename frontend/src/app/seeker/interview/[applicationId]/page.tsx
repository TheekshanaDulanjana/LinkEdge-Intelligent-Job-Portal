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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Stage =
  | 'permissions'   // Asking for camera + mic permission
  | 'ready'         // Permissions granted, ready to start
  | 'loading'       // Fetching questions from backend
  | 'speaking'      // TTS is reading the question aloud
  | 'listening'     // Recording the seeker's spoken answer
  | 'answered'      // Answer captured, ready for next question
  | 'submitting'    // Sending answers to Gemini for evaluation
  | 'results';      // Showing the scored results

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

// ─────────────────────────────────────────────
// Helper: grade colour
// ─────────────────────────────────────────────
function gradeColor(grade: string) {
  const map: Record<string, string> = {
    Excellent: 'text-green-600',
    Good: 'text-blue-600',
    Satisfactory: 'text-yellow-600',
    'Needs Improvement': 'text-orange-500',
    Poor: 'text-red-500',
  };
  return map[grade] ?? 'text-gray-600';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function InteractiveInterviewPage() {
  const { applicationId } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Hooks
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

  // Interview state
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

  // Timer for recording
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Auth guard ───
  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); }
  }, [isAuthenticated, router]);

  // ─── Load application/job info ───
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

  // ─── Recording timer ───
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

  // ─── Step 1: Request permissions ───
  async function handleRequestPermissions() {
    await startCamera();
    setStage('ready');
  }

  // ─── Step 2: Start the interview ───
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

      // Speak the first question
      speakQuestion(data.questions[0]);
    } catch (e: unknown) {
      setError((e as Error).message);
      setStage('ready');
    }
  }

  // ─── Speak a question via TTS ───
  function speakQuestion(text: string) {
    setStage('speaking');
    resetTranscript();

    // Add a small intro prefix so it sounds natural
    const prefix =
      currentQ === 0
        ? `Welcome to your interview. Question 1. `
        : `Question ${currentQ + 1}. `;

    speak(prefix + text, () => {
      // Auto-start recording when TTS finishes
      setStage('listening');
      startListening();
    });
  }

  // ─── Stop recording and save the answer ───
  function handleStopRecording() {
    stopListening();

    const answer = transcript.trim() || '[No answer captured]';
    const updated = [...answers];
    updated[currentQ] = answer;
    setAnswers(updated);
    setStage('answered');
  }

  // ─── Move to next question or submit ───
  function handleNextQuestion() {
    const next = currentQ + 1;
    if (next < questions.length) {
      setCurrentQ(next);
      speakQuestion(questions[next]);
    } else {
      handleSubmitAll();
    }
  }

  // ─── Re-record the current answer ───
  function handleReRecord() {
    resetTranscript();
    const updated = [...answers];
    updated[currentQ] = '';
    setAnswers(updated);
    speakQuestion(questions[currentQ]);
  }

  // ─── Submit all answers ───
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

  // ─── Format timer ───
  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const answeredCount = answers.filter((a) => a.trim().length > 0).length;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── PERMISSIONS SCREEN ── */}
      {stage === 'permissions' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-2">AI Interview Session</h1>
            <p className="text-gray-400 text-sm mb-2">{jobInfo?.title ?? 'Loading...'}</p>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              This interview requires access to your <strong className="text-gray-300">camera</strong> and <strong className="text-gray-300">microphone</strong>.
              Your camera shows a live feed only — nothing is recorded or uploaded.
              You will speak your answers aloud.
            </p>

            {!speechSupported && (
              <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 rounded-lg text-sm text-yellow-300">
                Speech recognition requires Google Chrome or Microsoft Edge. Please switch browsers.
              </div>
            )}

            {cameraError && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-sm text-red-300">
                {cameraError}
              </div>
            )}

            <div className="space-y-3 mb-8 text-left">
              {[
                { icon: '📹', label: 'Camera', desc: 'Live video feed — not recorded' },
                { icon: '🎤', label: 'Microphone', desc: 'Converts your speech to text' },
                { icon: '🔊', label: 'Speaker', desc: 'Questions read aloud to you' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link href="/seeker/dashboard" className="flex-1">
                <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleRequestPermissions}
                disabled={!speechSupported}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Allow and continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── READY SCREEN ── */}
      {stage === 'ready' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 max-w-md w-full text-center">

            {/* Live camera preview */}
            <div className="relative mb-6 rounded-xl overflow-hidden bg-gray-800 aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                  Camera preview
                </div>
              )}
              {isCameraOn && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black bg-opacity-60 rounded-full px-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">Camera on</span>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold mb-2">Ready to begin</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              You will be asked <strong className="text-white">7 questions</strong>.
              Each question will be read aloud. Speak your answer clearly when the
              microphone turns on. You can re-record if needed.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-sm text-red-300">
                {error}
              </div>
            )}

            <Button
              onClick={handleStartInterview}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3 text-base"
              disabled={!jobInfo}
            >
              Start interview
            </Button>
          </div>
        </div>
      )}

      {/* ── LOADING QUESTIONS ── */}
      {stage === 'loading' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Preparing your interview questions...</p>
          </div>
        </div>
      )}

      {/* ── MAIN INTERVIEW SCREEN (speaking + listening + answered) ── */}
      {(stage === 'speaking' || stage === 'listening' || stage === 'answered') && (
        <div className="min-h-screen flex flex-col">

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <p className="text-sm text-gray-400">{jobInfo?.title}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {answeredCount} / {questions.length} answered
              </span>
              {/* Question progress dots */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentQ
                        ? 'bg-purple-400'
                        : answers[i]?.trim()
                        ? 'bg-green-500'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex gap-6 p-6">

            {/* Left: Camera feed */}
            <div className="w-72 flex-shrink-0">
              <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Live indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black bg-opacity-70 rounded-full px-2 py-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400">LIVE</span>
                </div>
                {/* Listening indicator overlay */}
                {isListening && (
                  <div className="absolute bottom-3 left-3 right-3 bg-purple-900 bg-opacity-90 rounded-lg px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-0.5 items-end h-5">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className="w-1 bg-purple-400 rounded-full animate-pulse"
                          style={{
                            height: `${[60, 100, 80, 100, 60][bar - 1]}%`,
                            animationDelay: `${bar * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-purple-300">
                      Recording {formatTime(recordingSeconds)}
                    </span>
                  </div>
                )}
              </div>

              {/* Seeker name */}
              <div className="bg-gray-900 rounded-lg px-3 py-2 text-center">
                <p className="text-sm font-medium">{user?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500">Candidate</p>
              </div>
            </div>

            {/* Right: Question + answer area */}
            <div className="flex-1 flex flex-col">

              {/* Question number badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-purple-400 uppercase tracking-widest">
                  Question {currentQ + 1} of {questions.length}
                </span>
                {stage === 'speaking' && (
                  <span className="flex items-center gap-1 text-xs text-blue-400">
                    <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                    Speaking...
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="bg-gray-900 rounded-2xl p-6 mb-4 flex-shrink-0">
                <p className="text-lg leading-relaxed font-medium text-white">
                  {questions[currentQ]}
                </p>
              </div>

              {/* Transcript / answer area */}
              <div className="bg-gray-900 rounded-2xl p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">
                    {stage === 'listening'
                      ? 'Your answer (live transcription)'
                      : stage === 'answered'
                      ? 'Your answer (recorded)'
                      : 'Waiting for your answer...'}
                  </p>
                  {stage === 'listening' && (
                    <span className="text-xs text-purple-400">
                      {formatTime(recordingSeconds)}
                    </span>
                  )}
                </div>

                <div className="flex-1 relative">
                  {stage === 'speaking' && (
                    <p className="text-gray-600 text-sm italic">
                      Microphone activates when question finishes...
                    </p>
                  )}
                  {(stage === 'listening' || stage === 'answered') && (
                    <p className={`text-sm leading-relaxed ${
                      transcript || answers[currentQ]
                        ? 'text-gray-200'
                        : 'text-gray-600 italic'
                    }`}>
                      {transcript || answers[currentQ] || 'Listening for your response...'}
                    </p>
                  )}
                </div>

                {speechError && (
                  <p className="text-xs text-red-400 mt-2">{speechError}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-3">
                {stage === 'speaking' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      stopSpeech();
                      setStage('listening');
                      startListening();
                    }}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Skip audio, start recording
                  </Button>
                )}

                {stage === 'listening' && (
                  <Button
                    onClick={handleStopRecording}
                    className="flex-1 bg-red-600 hover:bg-red-700 py-3"
                  >
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-3 h-3 rounded-sm bg-white" />
                      Stop recording
                    </span>
                  </Button>
                )}

                {stage === 'answered' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleReRecord}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      Re-record answer
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {currentQ < questions.length - 1
                        ? `Next question →`
                        : 'Submit all answers'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMITTING ── */}
      {stage === 'submitting' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Evaluating your interview...</h2>
            <p className="text-gray-400 text-sm mb-6">
              Gemini AI is reviewing all your answers. This takes about 15–20 seconds.
            </p>
            <div className="space-y-2 text-sm text-gray-600 text-left bg-gray-900 rounded-xl p-4">
              <p>✓ Transcripts received</p>
              <p>✓ Sending to Gemini for analysis</p>
              <p className="text-purple-400 animate-pulse">⟳ Generating scores and feedback...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {stage === 'results' && results && (
        <div className="min-h-screen p-6">
          <div className="max-w-3xl mx-auto">

            {/* Score hero */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center mb-6">
              <p className="text-gray-400 text-sm mb-2">Interview complete</p>
              <p className={`text-7xl font-bold mb-2 ${gradeColor(results.grade)}`}>
                {results.total_score.toFixed(1)}
              </p>
              <p className="text-gray-500 text-sm mb-4">out of 100</p>
              <span className={`inline-block px-5 py-1.5 rounded-full font-semibold text-sm ${
                results.grade === 'Excellent' ? 'bg-green-900 text-green-400' :
                results.grade === 'Good' ? 'bg-blue-900 text-blue-400' :
                results.grade === 'Satisfactory' ? 'bg-yellow-900 text-yellow-400' :
                'bg-red-900 text-red-400'
              }`}>
                {results.grade}
              </span>
            </div>

            {/* Overall feedback */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-4">
              <h3 className="font-semibold mb-3 text-gray-200">Overall feedback</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {results.overall_feedback}
              </p>
            </div>

            {/* Improvement tips */}
            {results.improvement_tips.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-4">
                <h3 className="font-semibold mb-4 text-gray-200">How to improve</h3>
                <ul className="space-y-3">
                  {results.improvement_tips.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-400">
                      <span className="text-purple-400 font-bold flex-shrink-0">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question breakdown */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
              <h3 className="font-semibold mb-5 text-gray-200">Question breakdown</h3>
              <div className="space-y-6">
                {results.evaluations.map((ev, i) => (
                  <div key={i} className="border-b border-gray-800 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-200 flex-1 pr-4 leading-relaxed">
                        Q{i + 1}: {ev.question}
                      </p>
                      <span className={`text-xl font-bold flex-shrink-0 ${
                        ev.score >= 75 ? 'text-green-400' :
                        ev.score >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {ev.score.toFixed(0)}
                      </span>
                    </div>
                    {/* Score bar */}
                    <div className="w-full bg-gray-800 rounded-full h-1 mb-3">
                      <div
                        className={`h-1 rounded-full ${
                          ev.score >= 75 ? 'bg-green-500' :
                          ev.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${ev.score}%` }}
                      />
                    </div>
                    {ev.answer && ev.answer !== '[No answer captured]' && (
                      <div className="bg-gray-800 rounded-lg px-4 py-3 mb-3">
                        <p className="text-xs text-gray-500 mb-1">Your spoken answer</p>
                        <p className="text-xs text-gray-300 italic leading-relaxed">
                          "{ev.answer}"
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-gray-400 leading-relaxed">{ev.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/seeker/dashboard" className="flex-1">
                <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800">
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
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Practice again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}