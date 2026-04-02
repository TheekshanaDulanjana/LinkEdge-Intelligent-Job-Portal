'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Stage = 'intro' | 'answering' | 'submitting' | 'results';

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

export default function InterviewPage() {
  const { applicationId } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [stage, setStage] = useState<Stage>('intro');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [jobInfo, setJobInfo] = useState<{ title: string; jobId: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadApplicationInfo();
  }, [isAuthenticated]);

  async function loadApplicationInfo() {
    try {
      // Get the application to find the job details
      const res = await applicationApi.get('/applications/my-applications');
      const app = res.data.data.find(
        (a: { id: string }) => a.id === applicationId
      );
      if (app) {
        setJobInfo({ title: app.job.title, jobId: app.job.id });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStartInterview() {
    if (!jobInfo) return;
    setLoading(true);
    setError('');

    try {
      // Fetch full job details
      const token = localStorage.getItem('accessToken');
      const jobRes = await fetch(
        `http://localhost:3002/api/v1/jobs/${jobInfo.jobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const jobData = await jobRes.json();
      const job = jobData.data;

      // Start interview session
      const res = await fetch('http://localhost:8002/api/v1/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          application_id: applicationId,
          seeker_id: user?.id,
          job_id: job.id,
          job_title: job.title,
          job_description: job.description,
          job_requirements: job.requirements,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start interview');

      setSessionId(data.session_id);
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setCurrentQ(0);
      setStage('answering');
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Could not start interview');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(value: string) {
    const updated = [...answers];
    updated[currentQ] = value;
    setAnswers(updated);
  }

  function handleNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    }
  }

  function handlePrev() {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  }

  async function handleSubmit() {
    setStage('submitting');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:8002/api/v1/interview/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, answers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Evaluation failed');

      setResults(data);
      setStage('results');
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Submission failed');
      setStage('answering');
    }
  }

  function getGradeColor(grade: string) {
    const colors: Record<string, string> = {
      'Excellent': 'text-green-600',
      'Good': 'text-blue-600',
      'Satisfactory': 'text-yellow-600',
      'Needs Improvement': 'text-orange-500',
      'Poor': 'text-red-500',
    };
    return colors[grade] || 'text-gray-600';
  }

  const answeredCount = answers.filter((a) => a.trim().length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* INTRO */}
        {stage === 'intro' && (
          <div className="bg-white rounded-xl border p-10 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🎤</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Practice Interview</h1>
            <p className="text-gray-500 mb-2">
              {jobInfo?.title || 'Loading job details...'}
            </p>
            <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto">
              You will be given 7 interview questions. Answer each one in your
              own words. When done, Gemini AI will evaluate your answers and
              give you a score with detailed feedback.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Link href="/seeker/dashboard">
                <Button variant="outline">Back to dashboard</Button>
              </Link>
              <Button onClick={handleStartInterview} disabled={loading || !jobInfo}>
                {loading ? 'Preparing questions...' : 'Start practice interview'}
              </Button>
            </div>
          </div>
        )}

        {/* ANSWERING */}
        {stage === 'answering' && (
          <div>
            {/* Progress header */}
            <div className="bg-white rounded-xl border p-4 mb-4 flex items-center justify-between">
              <p className="font-medium text-sm">
                Question {currentQ + 1} of {questions.length}
              </p>
              <p className="text-sm text-gray-400">
                {answeredCount} of {questions.length} answered
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question card */}
            <div className="bg-white rounded-xl border p-8 mb-4">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-3">
                Question {currentQ + 1}
              </p>
              <p className="text-lg font-medium text-gray-800 mb-6 leading-relaxed">
                {questions[currentQ]}
              </p>
              <textarea
                rows={7}
                value={answers[currentQ]}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your answer here... Be specific and use examples from your experience."
                className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2 text-right">
                {answers[currentQ].length} characters
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentQ === 0}
              >
                ← Previous
              </Button>

              {/* Question dots */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === currentQ ? 'bg-purple-500' :
                      answers[i].trim() ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {currentQ < questions.length - 1 ? (
                <Button onClick={handleNext}>Next →</Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={answeredCount < questions.length}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Submit all answers
                </Button>
              )}
            </div>

            {currentQ === questions.length - 1 && answeredCount < questions.length && (
              <p className="text-xs text-center text-gray-400 mt-3">
                Answer all {questions.length} questions before submitting
                ({questions.length - answeredCount} remaining)
              </p>
            )}
          </div>
        )}

        {/* SUBMITTING */}
        {stage === 'submitting' && (
          <div className="bg-white rounded-xl border p-16 text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Evaluating your answers...</h2>
            <p className="text-gray-400 text-sm">
              Gemini AI is reviewing each response. This takes about 15–20 seconds.
            </p>
          </div>
        )}

        {/* RESULTS */}
        {stage === 'results' && results && (
          <div className="space-y-5">

            {/* Score card */}
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-sm text-gray-500 mb-1">Your interview score</p>
              <p className={`text-6xl font-bold mb-2 ${getGradeColor(results.grade)}`}>
                {results.total_score.toFixed(1)}
              </p>
              <p className="text-sm text-gray-400 mb-3">out of 100</p>
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                results.grade === 'Excellent' ? 'bg-green-100 text-green-700' :
                results.grade === 'Good' ? 'bg-blue-100 text-blue-700' :
                results.grade === 'Satisfactory' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-600'
              }`}>
                {results.grade}
              </span>
            </div>

            {/* Overall feedback */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-2">Overall feedback</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {results.overall_feedback}
              </p>
            </div>

            {/* Improvement tips */}
            {results.improvement_tips.length > 0 && (
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold mb-3">How to improve</h3>
                <ul className="space-y-2">
                  {results.improvement_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-3">
                      <span className="text-purple-500 font-bold flex-shrink-0">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question breakdown */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Question-by-question breakdown</h3>
              <div className="space-y-5">
                {results.evaluations.map((ev, i) => (
                  <div key={i} className="border-b pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-sm text-gray-800 flex-1 pr-4">
                        Q{i + 1}: {ev.question}
                      </p>
                      <span className={`text-lg font-bold flex-shrink-0 ${
                        ev.score >= 75 ? 'text-green-600' :
                        ev.score >= 50 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {ev.score.toFixed(0)}
                      </span>
                    </div>
                    {ev.answer && (
                      <p className="text-xs text-gray-400 mb-2 italic line-clamp-2">
                        Your answer: {ev.answer}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{ev.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/seeker/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">Back to dashboard</Button>
              </Link>
              <Button
                className="flex-1"
                onClick={() => setStage('intro')}
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