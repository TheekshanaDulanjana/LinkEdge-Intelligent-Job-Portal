import { applicationApi, authApi } from '@/lib/api';

export interface AnalyticsKpis {
  totalJobs: number;
  totalApplications: number;
  totalHired: number;
  offerAcceptanceRate: number;
  interviewSuccessRate: number;
  avgTimeToHire: number;
  avgTimeToFill: number;
}

export interface TrendPoint { date: string; count: number; }
export interface FunnelStage { stage: string; value: number; }
export interface JobPerformanceRow { title: string; applications: number; hired: number; status: string; }
export interface StatusDistItem { status: string; count: number; }
export interface Insights { topJob: { title: string; applications: number } | null; lowestJob: { title: string; applications: number } | null; }

export async function fetchKpis(period: string) {
  const res = await applicationApi.get(`/applications/company/analytics/kpis?period=${period}`);
  return res.data.data as AnalyticsKpis;
}
export async function fetchTrend(period: string) {
  const res = await applicationApi.get(`/applications/company/analytics/applications-trend?period=${period}`);
  return res.data.data as TrendPoint[];
}
export async function fetchFunnel(period: string) {
  const res = await applicationApi.get(`/applications/company/analytics/funnel?period=${period}`);
  return res.data.data as FunnelStage[];
}
export async function fetchJobPerformance() {
  const res = await applicationApi.get('/applications/company/analytics/job-performance');
  return res.data.data as JobPerformanceRow[];
}
export async function fetchStatusDistribution() {
  const res = await applicationApi.get('/applications/company/analytics/status-distribution');
  return res.data.data as StatusDistItem[];
}
export async function fetchInsights() {
  const res = await applicationApi.get('/applications/company/analytics/insights');
  return res.data.data as Insights;
}