import { applicationApi, authApi } from '@/lib/api';

export interface CandidateRow {
  applicationId: string;
  seekerId: string;
  jobTitle: string;
  status: string;
  aiScore: number | null;
  atsScore: number | null;
  appliedDate: string;
  interviewDate: string | null;
  cvUrl: string;
  autoRejected?: boolean;      // rejected by the system's auto-screening
  companyOverride?: boolean;   // company moved a system-rejected candidate forward
  rejectionReason?: string | null;
}

export interface CandidatesSummary {
  totalApplicants: number;
  newToday: number;
  underReview: number;
  interviewing: number;
  interviewsToday: number;
  hired: number;
  hiredThisWeek: number;
}

export interface CandidateProfile {
  profile: {
    fullName: string;
    phone: string | null;
    location: string | null;
    profileImageUrl: string | null;
    interestArea: string | null;
    workStatus: string;
    professionalSummary: string | null;
    websiteUrl?: string | null;
    githubUrl?: string | null;
    behanceUrl?: string | null;
    workStyle?: string | null;
  };
  resume: {
    originalName: string;
    fileSize: number;
    mimeType: string;
    skills: string[];
    technologies: string[];
    certifications: string[];
    experienceYears: number | null;
    experience: Array<{ title?: string; company?: string; duration?: string; description?: string }>;
    education: Array<{ degree?: string; institution?: string; year?: string }>;
    jobTitle: string | null;
    isParsed: boolean;
  } | null;
}

export async function fetchCandidatesSummary(): Promise<CandidatesSummary> {
  const res = await applicationApi.get('/applications/company/candidates/summary');
  return res.data.data;
}

export async function fetchCandidates(params: { search?: string; stage?: string; page?: number }) {
  const q = new URLSearchParams();
  if (params.search) q.append('search', params.search);
  if (params.stage)  q.append('stage', params.stage);
  q.append('page', String(params.page ?? 1));
  q.append('limit', '20');
  const res = await applicationApi.get(`/applications/company/candidates?${q.toString()}`);
  return res.data.data as { candidates: CandidateRow[]; total: number; totalPages: number };
}

export async function fetchCandidateProfile(seekerId: string): Promise<CandidateProfile> {
  const res = await authApi.get(`/auth/candidate/${seekerId}/profile`);
  return res.data.data;
}

// NEW — fetches the candidate's actual CV file as a Blob, for inline preview
export async function fetchCandidateCvFile(seekerId: string): Promise<Blob> {
  const res = await authApi.get(`/auth/candidate/${seekerId}/resume/file`, {
    responseType: 'arraybuffer',
  });
  const contentType = String(res.headers?.['content-type'] || 'application/pdf');
  return new Blob([res.data as BlobPart], { type: contentType });
}

export async function updateCandidateStage(applicationId: string, status: string) {
  return applicationApi.patch(`/applications/company/candidates/${applicationId}/stage`, { status });
}

/* ───────────── Full CV analysis (parser + ATS + AI match) ───────────── */

export interface CvExperience {
  title: string; company: string; location: string; employment_type: string;
  start: string; end: string; current: boolean; months: number;
  duration: string; duration_label: string;
  bullets: string[]; description: string; skills: string[];
}
export interface CvEducation {
  degree: string; degree_title: string; field: string; institution: string;
  year: string; start_year: string; grade: string; notes: string; in_progress: boolean;
}
export interface CvHealthCheck { id: string; label: string; weight: number; passed: boolean; detail: string }

export interface CvAnalysis {
  name: string; headline: string; location: string;
  contact: { email: string; phone: string; linkedin: string; github: string; links: string[] };
  summary: string; seniority: string; experience_years: number;
  experience: CvExperience[]; education: CvEducation[];
  skills: string[]; skill_items: Array<{ name: string; in_experience: number }>;
  skills_by_category: Record<string, string[]>;
  additional_skills: string[]; soft_skills: string[];
  certifications: Array<{ name: string; issuer: string; year: string }>;
  projects: Array<{ name: string; description: string; bullets: string[]; skills: string[]; link: string }>;
  languages: string[]; sections_found: string[];
  cv_health: { score: number; checks: CvHealthCheck[]; words: number; quantified_bullets: number };
  parse_confidence: number;
}

export interface AtsResult {
  overall_score: number; score_label: string; score_color: string;
  breakdown: {
    technical_score: number; experience_score: number; education_score: number;
    certification_score: number; keyword_score: number;
    matched_skills: string[]; missing_skills: string[];
    explanation: Record<string, string>;
  };
}

export interface AiMatchResult {
  score: number; label: string; color: string; recommendation: string;
  components: { skills: number; role: number; experience: number; evidence: number };
  matched_skills: string[]; missing_skills: string[];
  related_skills: Array<{ required: string; has: string }>;
  strengths: string[]; gaps: string[];
}

export type CandidateAnalysisData =
  | { hasResume: false }
  | {
      hasResume: true;
      analysis: CvAnalysis;
      ats: AtsResult;
      aiMatch: AiMatchResult;
      job: { required_skills: string[]; preferred_skills: string[]; experience_required: number; education_required: string; seniority_level: string };
    };

export async function fetchCandidateAnalysis(applicationId: string): Promise<CandidateAnalysisData> {
  const res = await applicationApi.get(`/applications/company/candidates/${applicationId}/analysis`);
  return res.data.data;
}
