import { applicationApi } from '@/lib/api';

export interface AtsBreakdown {
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  rankedAt: string;
}

export interface Applicant {
  id: string;
  seekerId: string;
  status: 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'INTERVIEW' | 'REJECTED';
  aiScore: number | null;
  atsScore: number | null;
  atsBreakdown: AtsBreakdown | null;
  createdAt: string;
  interviewDate: string | null;
  interviewTime: string | null;
  interviewVenue: string | null;
  rejectionReason: string | null;
  rejectionMessage: string | null;
  cvUrl: string;
}

export interface JobApplicantsResponse {
  job: { id: string; title: string; description: string; requirements: string };
  applicants: Applicant[];
}

export async function fetchJobApplicants(jobId: string): Promise<JobApplicantsResponse> {
  const res = await applicationApi.get(`/applications/jobs/${jobId}/applicants`);
  return res.data.data;
}

export async function smartRank(jobId: string) {
  const res = await applicationApi.post(`/applications/jobs/${jobId}/smart-rank`);
  return res.data.data as { ranked: number; applicants: Applicant[] };
}

export async function shortlist(applicationId: string) {
  const res = await applicationApi.patch(`/applications/${applicationId}/shortlist`);
  return res.data.data as Applicant;
}

export async function scheduleInterview(applicationId: string, payload: {
  interviewDate: string; interviewTime: string; interviewVenue: string;
}) {
  const res = await applicationApi.patch(`/applications/${applicationId}/schedule-interview`, payload);
  return res.data.data as Applicant;
}

export async function rejectCandidate(applicationId: string, reasonTitle: string) {
  const res = await applicationApi.patch(`/applications/${applicationId}/reject`, { reasonTitle });
  return res.data.data as Applicant;
}