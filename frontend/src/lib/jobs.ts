import { jobApi } from '@/lib/api';

export interface JobRow {
  id: string;
  title: string;
  location: string;
  jobType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'DRAFT';
  deadline: string;
  createdAt: string;
  salaryMin: number | null;
  salaryMax: number | null;
  applicationCount: number;
}

export interface JobsSummary {
  totalActiveJobs: number;
  newJobsThisWeek: number;
  totalApplications: number;
  newAppsThisWeek: number;
  interviewsToday: number;
  nextInterviewTime: string | null;
}

export interface JobsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchJobsSummary(): Promise<JobsSummary> {
  const res = await jobApi.get('/jobs/company/summary');
  return res.data.data;
}

export async function fetchCompanyJobs(query: JobsQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.append(k, String(v));
  });
  const res = await jobApi.get(`/jobs/company/all?${params.toString()}`);
  return res.data.data as {
    jobs: JobRow[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export async function toggleJobStatus(jobId: string, status: string) {
  return jobApi.patch(`/jobs/${jobId}/status`, { status });
}

export async function deleteJob(jobId: string) {
  return jobApi.delete(`/jobs/${jobId}`);
}