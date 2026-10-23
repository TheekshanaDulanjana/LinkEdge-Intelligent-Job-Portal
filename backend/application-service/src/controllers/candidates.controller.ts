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

// ── GET /api/v1/applications/company/candidates ───────────────────────────────
export async function getCandidates(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const { search, stage, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const jobs = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const where: any = { jobId: { in: jobIds } };
    if (stage && stage !== 'ALL') where.status = stage;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take:    parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, seekerId: true, status: true, aiScore: true, atsScore: true,
          createdAt: true, interviewDate: true, cvUrl: true,
          job: { select: { title: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        candidates: applications.map(a => ({
          applicationId: a.id,
          seekerId:      a.seekerId,
          jobTitle:      a.job.title,
          status:        a.status,
          aiScore:       a.aiScore,
          atsScore:      a.atsScore,
          appliedDate:   a.createdAt,
          interviewDate: a.interviewDate,
          cvUrl:         a.cvUrl,
        })),
        total,
        page:       parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (e) {
    console.error('[candidates]', e);
    res.status(500).json({ success: false, message: 'Failed to load candidates' });
  }
}

// ── GET /api/v1/applications/company/candidates/summary ──────────────────────
export async function getCandidatesSummary(req: any, res: Response) {
  try {
    const companyId = await getCompanyId(req);
    if (!companyId) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const now = new Date();
    const startToday    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday       = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
    const weekAgo        = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

    const jobs   = await prisma.jobPosting.findMany({ where: { companyId }, select: { id: true } });
    const jobIds = jobs.map(j => j.id);

    const [
      totalApplicants, newToday,
      underReview,
      interviewing, interviewsToday,
      hired, hiredThisWeek,
    ] = await Promise.all([
      prisma.application.count({ where: { jobId: { in: jobIds } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, createdAt: { gte: startToday, lt: endToday } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'REVIEWING' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'INTERVIEW' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'INTERVIEW', interviewDate: { gte: startToday, lt: endToday } } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED' } }),
      prisma.application.count({ where: { jobId: { in: jobIds }, status: 'SHORTLISTED', updatedAt: { gte: weekAgo } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalApplicants, newToday,
        underReview,
        interviewing, interviewsToday,
        hired, hiredThisWeek,
      },
    });
  } catch (e) {
    console.error('[candidates-summary]', e);
    res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
}

// ── PATCH /api/v1/applications/company/candidates/:id/stage ──────────────────
export async function updateCandidateStage(req: any, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value' });
      return;
    }

    const companyId = await getCompanyId(req);
    const application = await prisma.application.findUnique({
      where: { id }, include: { job: true },
    });

    if (!application || application.job.companyId !== companyId) {
      res.status(403).json({ success: false, message: 'Not authorized for this application' });
      return;
    }

    const updated = await prisma.application.update({
      where: { id }, data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[update-stage]', e);
    res.status(500).json({ success: false, message: 'Failed to update stage' });
  }
}