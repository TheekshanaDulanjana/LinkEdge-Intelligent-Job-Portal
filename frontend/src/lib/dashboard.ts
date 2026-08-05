import { applicationApi } from '@/lib/api';   // ← was: import api from '@/lib/api'

export interface DashboardStats {
  kpis: {
    totalActiveJobs: number;
    totalApplications: number;
    interviewsToday: number;
    hiredThisMonth: number;
  };
  funnel: {
    applications: number;
    screened: number;
    interviews: number;
    hired: number;
  };
  activeJobs: Array<{
    id: string;
    title: string;
 
    status: string;
    applicationCount: number;
  }>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await applicationApi.get('/applications/company/dashboard-stats');
  return res.data.data;
}

export async function fetchRecentActivity() {
  const res = await applicationApi.get('/applications/company/recent-activity');
  return res.data.data as Array<{ id: string; message: string; timestamp: string }>;
}