import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCompanyId(req: any): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { userId: req.user.userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

function resolveDateRange(period: string, customFrom?: string, customTo?: string) {
  const now = new Date();
  if (period === 'custom' && customFrom && customTo) {
    const f = new Date(customFrom);
    const e = new Date(customTo);
    const valid = !Number.isNaN(f.getTime()) && !Number.isNaN(e.getTime()) && f <= e && e.getTime() - f.getTime() <= 731 * 86400000;
    if (valid) return { from: f, to: e };
  }
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'year' ? 365 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
}

// ── GET /api/v1/applications/company/analytics/kpis ───────────────────────────
export async function getAnalyticsKpis(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const { period = '30d', from, to } = req.query;
    const { from: dateFrom, to: dateTo } = resolveDateRange(period as string, from as string, to as string);

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true, createdAt: true } });
    const jobIds = jobs.map(j => j.id);

    const [
      totalJobs, totalApplications, totalHired, totalRejected, totalInterviewed,
      appsInRange,
    ] = await Promise.all([
      prisma.jobPosting.count({ where: { companyId } }),
      prisma.application.count({ where: { jobId: { in: jobIds } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'REJECTED' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: { in: ['INTERVIEW', 'SHORTLISTED'] } } }),
      prisma.application.findMany({
        where: { jobId: { in: jobIds }, createdAt: { gte: dateFrom, lte: dateTo } },
        select: { createdAt: true, updatedAt: true, status: true },
      }),
    ]);

    // Average time-to-hire: days between application createdAt and updatedAt for SHORTLISTED apps
    const hiredApps = appsInRange.filter(a => a.status === 'SHORTLISTED');
    const avgTimeToHire = hiredApps.length
      ? hiredApps.reduce((sum, a) => sum + (a.updatedAt.getTime() - a.createdAt.getTime()), 0) / hiredApps.length / (1000 * 60 * 60 * 24)
      : 0;

    // Average time-to-fill: days between job createdAt and first SHORTLISTED application's updatedAt, per job
    const jobsWithHire = await prisma.application.findMany({
      where: { jobId: { in: jobIds }, status: 'SHORTLISTED' },
      select: { jobId: true, updatedAt: true },
    });
    let timeToFillSum = 0, timeToFillCount = 0;
    jobsWithHire.forEach(app => {
      const job = jobs.find(j => j.id === app.jobId);
      if (job) {
        timeToFillSum += (app.updatedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        timeToFillCount++;
      }
    });
    const avgTimeToFill = timeToFillCount ? timeToFillSum / timeToFillCount : 0;

    const interviewSuccessRate = totalInterviewed > 0 ? (totalHired / totalInterviewed) * 100 : 0;
    const offerAcceptanceRate  = totalHired + totalRejected > 0 ? (totalHired / (totalHired + totalRejected)) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalJobs,
        totalApplications,
        totalHired,
        offerAcceptanceRate: Math.round(offerAcceptanceRate * 10) / 10,
        interviewSuccessRate: Math.round(interviewSuccessRate * 10) / 10,
        avgTimeToHire: Math.round(avgTimeToHire * 10) / 10,
        avgTimeToFill: Math.round(avgTimeToFill * 10) / 10,
      },
    });
  } catch (e) {
    console.error('[analytics-kpis]', e);
    res.status(500).json({ success: false, message: 'Failed to load KPIs' });
  }
}

// ── GET /api/v1/applications/company/analytics/applications-trend ─────────────
export async function getApplicationsTrend(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const { period = '30d', from, to } = req.query;
    const { from: dateFrom, to: dateTo } = resolveDateRange(period as string, from as string, to as string);

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const applications = await prisma.application.findMany({
      where: { jobId: { in: jobIds }, createdAt: { gte: dateFrom, lte: dateTo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const buckets: Record<string, number> = {};
    applications.forEach(a => {
      const key = a.createdAt.toISOString().split('T')[0];
      buckets[key] = (buckets[key] ?? 0) + 1;
    });

    const trend = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    res.json({ success: true, data: trend });
  } catch (e) {
    console.error('[applications-trend]', e);
    res.status(500).json({ success: false, message: 'Failed to load trend' });
  }
}

// ── GET /api/v1/applications/company/analytics/funnel ──────────────────────────
export async function getFunnel(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const { period = '30d', from, to } = req.query;
    const { from: dateFrom, to: dateTo } = resolveDateRange(period as string, from as string, to as string);

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);
    const baseWhere = { jobId: { in: jobIds }, createdAt: { gte: dateFrom, lte: dateTo } };

    const [applications, reviewing, shortlisted, interview, hired, rejected] = await Promise.all([
      prisma.application.count({ where: baseWhere }),
      prisma.application.count({ where: { ...baseWhere, status: 'REVIEWING' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    ]);

    res.json({
      success: true,
      data: [
        { stage: 'Applications', value: applications },
        { stage: 'Reviewing',    value: reviewing + shortlisted + interview },
        { stage: 'Interview',    value: interview },
        { stage: 'Hired',        value: hired },
      ],
    });
  } catch (e) {
    console.error('[funnel]', e);
    res.status(500).json({ success: false, message: 'Failed to load funnel' });
  }
}

// ── GET /api/v1/applications/company/analytics/job-performance ────────────────
export async function getJobPerformance(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const jobs = await prisma.jobPosting.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, status: true,
        _count: { select: { applications: true } },
      },
    });

    const jobsWithHires = await Promise.all(
      jobs.map(async (job) => {
        const hired = await prisma.application.count({ where: { jobId: job.id, status: 'SHORTLISTED' } });
        return {
          title: job.title,
          applications: job._count.applications,
          hired,
          status: job.status,
        };
      })
    );

    res.json({ success: true, data: jobsWithHires });
  } catch (e) {
    console.error('[job-performance]', e);
    res.status(500).json({ success: false, message: 'Failed to load job performance' });
  }
}

// ── GET /api/v1/applications/company/analytics/status-distribution ────────────
export async function getStatusDistribution(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const statuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
    const counts = await Promise.all(
      statuses.map(status => prisma.application.count({ where: { jobId: { in: jobIds }, status: status as any } }))
    );

    res.json({
      success: true,
      data: statuses.map((status, i) => ({ status, count: counts[i] })),
    });
  } catch (e) {
    console.error('[status-distribution]', e);
    res.status(500).json({ success: false, message: 'Failed to load distribution' });
  }
}

// ── GET /api/v1/applications/company/analytics/insights ────────────────────────
export async function getInsights(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) { res.status(404).json({ success: false, message: 'Company not found' }); return; }

    const jobs = await prisma.jobPosting.findMany({
      where: { companyId },
      select: { id: true, title: true, _count: { select: { applications: true } } },
    });

    if (jobs.length === 0) {
      res.json({ success: true, data: { topJob: null, lowestJob: null } });
      return;
    }

    const sorted = [...jobs].sort((a, b) => b._count.applications - a._count.applications);
    const topJob    = sorted[0];
    const lowestJob = sorted[sorted.length - 1];

    res.json({
      success: true,
      data: {
        topJob:    { title: topJob.title, applications: topJob._count.applications },
        lowestJob: { title: lowestJob.title, applications: lowestJob._count.applications },
      },
    });
  } catch (e) {
    console.error('[insights]', e);
    res.status(500).json({ success: false, message: 'Failed to load insights' });
  }
}