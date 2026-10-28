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
  const contentType = res.headers?.['content-type'] || 'application/pdf';
  return new Blob([res.data], { type: contentType });
}

export async function updateCandidateStage(applicationId: string, status: string) {
  return applicationApi.patch(`/applications/company/candidates/${applicationId}/stage`, { status });
}