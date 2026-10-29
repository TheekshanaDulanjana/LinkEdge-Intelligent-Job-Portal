/** Shapes returned by /admin/analytics/*. Kept loose where the server may return null. */
export interface Kpi { total: number; current: number; previous: number; change: number; changePct: number | null }
export interface SeriesPoint { day: string; seekers: number; companies: number; jobs: number; applications: number }
export interface Summary {
  days: number;
  kpis: { seekers: Kpi; companies: Kpi; jobs: Kpi & { active: number }; applications: Kpi };
  users: { seekers: number; companies: number; unverified: number; disabled: number; active1: number; active7: number; active30: number; verifiedRate: number };
  jobs: Record<string, number> & { total: number };
  applications: Record<string, number> & { total: number; perJob: number };
  series: SeriesPoint[];
  attention: { unverifiedOld: number; expiring: number; zeroApps: number; hiddenJobs: number; lockedAdmins: number; failedLogins24: number; pendingApplications: number };
  recentUsers: Array<{ id: string; email: string; role: 'SEEKER' | 'COMPANY'; createdAt: string; verified: boolean; status: string; name: string; image: string | null }>;
  recentJobs: Array<{ id: string; title: string; status: string; createdAt: string; location: string; company: string; applications: number }>;
  recentAudit: Array<{ id: string; actorEmail: string; action: string; targetLabel: string | null; createdAt: string }>;
}
export interface NameCount { k: string; n: number }
export interface Growth {
  cumulative: Array<{ day: string; seekers: number; companies: number }>;
  providers: Array<{ provider: string; n: number }>;
  verification: Array<{ role: string; verified: number; total: number }>;
  funnels: {
    seeker: { registered: number; verified: number; resume: number; applied: number };
    company: { registered: number; verified: number; profile: number; posted: number; received: number };
  };
  cohorts: Array<{ week: string; signups: number; returned: number; returnRate: number }>;
  applicationsByWeekday: Array<{ day: number; count: number }>;
  applicationsByHour: Array<{ hour: number; count: number }>;
}
export interface Marketplace {
  skillGap: Array<{ skill: string; demand: number; supply: number }>;
  topDemand: Array<{ skill: string; n: number }>; topSupply: Array<{ skill: string; n: number }>;
  jobType: NameCount[]; locationType: NameCount[]; experienceLevel: NameCount[]; departments: NameCount[]; industries: NameCount[];
  jobLocations: NameCount[]; seekerLocations: NameCount[]; workStatus: NameCount[]; interestAreas: NameCount[];
  salary: { jobs: number; avg_min: number | null; avg_max: number | null; median: number | null };
  salaryByType: Array<{ k: string; avg_min: number; avg_max: number; n: number }>;
  topCompanies: Array<{ id: string; name: string; jobs: number; active: number; applications: number; responded: number; responseRate: number }>;
  topJobs: Array<{ id: string; title: string; company: string; status: string; applications: number; avg_ats: number | null }>;
  perType: Array<{ k: string; jobs: number; applications: number; perJob: number }>;
}
export interface Hiring {
  funnel: Record<string, number>;
  conversion: { shortlistRate: number; interviewRate: number; rejectRate: number; autoRejectRate: number; overrideRate: number; responseRate: number };
  screening: { total: number; scored: number; avgAts: number | null; avgAi: number | null; autoRejected: number; overridden: number; interviews: number };
  atsDistribution: Array<{ label: string; count: number }>;
  dimensions: { technical: number | null; experience: number | null; education: number | null; certification: number | null; keyword: number | null; overall: number | null; n: number } | null;
  matchedSkills: Array<{ skill: string; n: number }>; missingSkills: Array<{ skill: string; n: number }>;
  rejectionReasons: NameCount[];
  avgResponseHours: number | null;
  perDay: Array<{ day: string; count: number }>;
  companyResponsiveness: Array<{ name: string; applications: number; responded: number; hours: number | null; responseRate: number }>;
  resumes: { total: number; parsed: number; failed: number; avg_years: number | null; parseRate: number };
  calendar: { events: number; upcoming: number };
}
export interface Engagement {
  activity: Array<{ role: string; d1: number; d7: number; d30: number; never: number; total: number }>;
  notifications: { total: number; read: number; readRate: number; byType: NameCount[] };
  seekerProfileCompleteness: Array<{ label: string; count: number }>;
  companyProfileCompleteness: Array<{ label: string; count: number }>;
  dormant: Array<{ id: string; email: string; role: string; last: string | null; created: string }>;
}
export interface SystemInfo {
  services: Array<{ name: string; status: 'up' | 'down' | 'degraded'; latencyMs: number | null; httpStatus: number | null }>;
  database: { ok: boolean; latencyMs: number | null; sizeBytes: number | null; tables: Array<{ name: string; rows: number }> };
  process: { uptimeSeconds: number; rssMb: number; heapMb: number; node: string };
  security: { logins24: number; failed24: number; blocked24: number; lockedAdmins: number; admins: Array<{ id: string; email: string; adminLevel: string | null; status: string; lastLoginAt: string | null; passwordChangedAt: string | null; mustChangePassword: boolean }> };
  auditByAction: Array<{ action: string; n: number }>;
  auditPerDay: Array<{ day: string; count: number }>;
}
