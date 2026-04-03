'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import AuthGuard from '@/components/AuthGuard';

interface CourseRecommendation {
  title: string;
  platform: string;
  reason: string;
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

function SmartApplyContent() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>('upload');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [desiredRole, setDesiredRole] = useState('');
  const [additionalInputs, setAdditionalInputs] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  async function handleAnalyze() {
    if (!cvFile) { setError('Please upload your CV'); return; }
    if (!desiredRole.trim()) { setError('Please enter your desired role'); return; }

    setError('');
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('cv_file', cvFile);
      formData.append('desired_role', desiredRole);
      formData.append('additional_inputs', additionalInputs);

      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8001/api/v1/ai/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seeker/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
          <div>
            <h1 className="text-2xl font-semibold">Smart Apply</h1>
            <p className="text-gray-500 text-sm">Upload your CV and get AI-powered job recommendations</p>
          </div>
        </div>

        {/* STEP 1: Upload form */}
        {step === 'upload' && (
          <div className="bg-white rounded-xl border p-8 max-w-xl">
            <h2 className="font-semibold text-lg mb-6">Tell us about yourself</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <Label>Upload your CV</Label>
                <div className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="cv-upload"
                  />
                  <label htmlFor="cv-upload" className="cursor-pointer">
                    {cvFile ? (
                      <div>
                        <p className="font-medium text-green-600">{cvFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">Click to change</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500">Click to upload your CV</p>
                        <p className="text-xs text-gray-400 mt-1">PDF or Word document, max 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <Label>What role are you aiming for?</Label>
                <Input
                  placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
                  value={desiredRole}
                  onChange={(e) => setDesiredRole(e.target.value)}
                />
              </div>

              <div>
                <Label>Any additional skills or interests? (optional)</Label>
                <textarea
                  rows={3}
                  placeholder="e.g. I'm interested in AI and machine learning. I also know React and have built 3 projects..."
                  value={additionalInputs}
                  onChange={(e) => setAdditionalInputs(e.target.value)}
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button className="w-full" onClick={handleAnalyze}>
                Analyze my CV
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Analyzing loading state */}
        {step === 'analyzing' && (
          <div className="bg-white rounded-xl border p-16 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Analyzing your CV...</h2>
            <p className="text-gray-500 text-sm mb-6">Our AI agents are reading your CV and matching you to jobs</p>
            <div className="space-y-2 text-sm text-gray-400 max-w-xs mx-auto text-left">
              <p>✓ Extracting skills and experience</p>
              <p>✓ Identifying skill gaps for your desired role</p>
              <p>✓ Finding the best matching jobs</p>
              <p className="text-blue-500 animate-pulse">⟳ Generating recommendations...</p>
            </div>
          </div>
        )}

        {/* STEP 3: Results */}
        {step === 'results' && result && (
          <div className="space-y-6">

            {/* Candidate summary */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-lg mb-1">
                {result.candidate_name || 'Your CV Analysis'}
              </h2>
              <p className="text-gray-500 text-sm">Desired role: {desiredRole}</p>
            </div>

            {/* Skills found */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3">Skills found in your CV</h3>
              <div className="flex flex-wrap gap-2">
                {result.extracted_skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600 mb-1">Experience</p>
                  <p className="text-gray-500">{result.extracted_experience}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600 mb-1">Education</p>
                  <p className="text-gray-500">{result.extracted_education}</p>
                </div>
              </div>
            </div>

            {/* Skill gap analysis */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3">Skill gap analysis for: {desiredRole}</h3>
              <p className="text-gray-600 text-sm mb-4">{result.gap_summary}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-2">Skills you already have</p>
                  <ul className="space-y-1">
                    {result.matching_skills.map((skill, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-green-500">✓</span>{skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">Skills to develop</p>
                  <ul className="space-y-1">
                    {result.missing_skills.map((skill, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-red-400">○</span>{skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Course recommendations */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Recommended courses to bridge the gap</h3>
              <div className="grid grid-cols-2 gap-4">
                {result.course_suggestions.map((course, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-blue-600 mt-1">{course.platform}</p>
                    <p className="text-xs text-gray-500 mt-2">{course.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Job recommendations */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-1">Jobs that match your profile</h3>
              <p className="text-sm text-gray-500 mb-4">{result.recommendation_summary}</p>
              <div className="space-y-3">
                {result.recommended_jobs.map((job, i) => (
                  <div key={i} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-gray-400">{job.location}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${
                          job.match_score >= 75 ? 'text-green-600' :
                          job.match_score >= 50 ? 'text-yellow-600' : 'text-gray-400'
                        }`}>
                          {job.match_score}% match
                        </span>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {job.match_reasons.map((reason, j) => (
                        <li key={j} className="text-xs text-gray-500 flex gap-2">
                          <span className="text-blue-400">•</span>{reason}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/jobs/${job.job_id}`}>
                      <Button size="sm" className="mt-3 w-full">
                        View and apply
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Start over */}
            <Button variant="outline" onClick={() => { setStep('upload'); setResult(null); }} className="w-full">
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