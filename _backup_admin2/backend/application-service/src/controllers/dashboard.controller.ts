import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: resolve companyId from the authenticated user
async function getCompanyId(req: any): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where:  { userId: req.user.userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

// GET /api/v1/applications/company/dashboard-stats
export async function getDashboardStats(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday    = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const last30Days    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const jobs = await prisma.jobPosting.findMany({
      where:  { companyId },
      select: { id: true },
    });
    const jobIds = jobs.map(j => j.id);

    const [
      totalActiveJobs,
      totalApplications,
      interviewsToday,
      hiredThisMonth,
      funnelApplications,
      funnelScreened,
      funnelInterviews,
      funnelHired,
    ] = await Promise.all([
      prisma.jobPosting.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.application.count({ where: { jobId: { in: jobIds } } }),
      prisma.application.count({
        where: {
          jobId: { in: jobIds },
          status: 'INTERVIEW',
          interviewDate: { gte: startOfToday, lt: endOfToday },
        },
      }),
      prisma.application.count({
        where: {
          jobId: { in: jobIds },
          status: 'SHORTLISTED',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.application.count({ where: { jobId: { in: jobIds }, createdAt: { gte: last30Days } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: { in: ['REVIEWING', 'SHORTLISTED', 'INTERVIEW'] }, createdAt: { gte: last30Days } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'INTERVIEW', createdAt: { gte: last30Days } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED', createdAt: { gte: last30Days } } }),
    ]);

    const activeJobsList = await prisma.jobPosting.findMany({
      where:   { companyId },
      orderBy: { createdAt: 'desc' },
      take:    5,
      select: {
        id: true, title: true, status: true,
        _count: { select: { applications: true } },
      },
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalActiveJobs,
          totalApplications,
          interviewsToday,
          hiredThisMonth,
        },
        funnel: {
          applications: funnelApplications,
          screened:     funnelScreened,
          interviews:   funnelInterviews,
          hired:        funnelHired,
        },
        activeJobs: activeJobsList.map(j => ({
          id: j.id,
          title: j.title,
          status: j.status,
          applicationCount: j._count.applications,
        })),
      },
    });
  } catch (e) {
    console.error('[dashboard-stats]', e);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
}

// GET /api/v1/applications/company/recent-activity
export async function getRecentActivity(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const recent = await prisma.application.findMany({
      where:   { jobId: { in: jobIds } },
      orderBy: { updatedAt: 'desc' },
      take:    10,
      select: {
        id: true, status: true, updatedAt: true, createdAt: true,
        job: { select: { title: true } },
      },
    });

    const feed = recent.map(a => ({
      id: a.id,
      message: activityMessage(a.status, a.job.title),
      timestamp: a.updatedAt,
    }));

    res.json({ success: true, data: feed });
  } catch (e) {
    console.error('[recent-activity]', e);
    res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
}

function activityMessage(status: string, jobTitle: string): string {
  const map: Record<string, string> = {
    PENDING:     `New application received for ${jobTitle}`,
    REVIEWING:   `Application under review for ${jobTitle}`,
    SHORTLISTED: `Candidate shortlisted for ${jobTitle}`,
    INTERVIEW:   `Interview scheduled for ${jobTitle}`,
    REJECTED:    `Application closed for ${jobTitle}`,
  };
  return map[status] ?? `Application updated for ${jobTitle}`;
}