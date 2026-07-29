import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireCompany } from '../middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

// Lazy-load axios so a missing install never crashes the routes file
async function tryBatchAtsScore(
  seekerId: string,
  jobs: Array<{ id: string; title: string; description: string; requirements: string }>
): Promise<Record<string, any>> {
  try {
    // Dynamic import — if axios missing or ATS service is down, returns empty map
    const axios = (await import('axios')).default;
    const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';
    const res = await axios.post(
      `${ATS_URL}/api/v1/ats/batch-score`,
      { candidate_id: seekerId, jobs },
      { timeout: 15000 }
    );
    return res.data?.has_resume ? (res.data.scores ?? {}) : {};
  } catch {
    // ATS service unavailable — silently return empty, job board still works
    return {};
  }
}

// ── GET /api/v1/jobs  (public job board) ───────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '10', search, location, jobType, seekerId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { title:       { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (location) where.location   = { contains: location as string, mode: 'insensitive' };
    if (jobType)  where.jobType    = jobType;

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' } }),
      prisma.jobPosting.count({ where }),
    ]);

    // Enrich with company info
    const enriched = await Promise.all(
      jobs.map(async (job) => {
        const company = await prisma.company.findFirst({
          where:  { id: job.companyId },
          select: { id: true, companyName: true, logoUrl: true },
        });
        return { ...job, company };
      })
    );

    // ATS scores — completely optional, never blocks the response
    let atsScores: Record<string, any> = {};
    if (seekerId && typeof seekerId === 'string') {
      atsScores = await tryBatchAtsScore(
        seekerId,
        enriched.map(j => ({
          id:           j.id,
          title:        j.title,
          description:  j.description,
          requirements: j.requirements,
        }))
      );
    }

    const result = enriched.map(job => ({
      ...job,
      atsScore:      atsScores[job.id]?.overall_score   ?? null,
      atsColor:      atsScores[job.id]?.score_color     ?? null,
      atsLabel:      atsScores[job.id]?.score_label     ?? null,
      matchedSkills: atsScores[job.id]?.matched_skills  ?? [],
      missingSkills: atsScores[job.id]?.missing_skills  ?? [],
    }));

    res.json({
      success: true,
      data: {
        jobs: result,
        total,
        page:        parseInt(page as string),
        totalPages:  Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (e) { next(e); }
});

// ── GET /api/v1/jobs/company/my-jobs  (company dashboard) ─────────────────
// IMPORTANT: this route must be declared BEFORE /:id to avoid being swallowed
router.get('/company/my-jobs', authenticate, requireCompany, async (req: any, res, next) => {
  try {
    const company = await prisma.company.findFirst({
      where: { userId: req.user.userId },
    });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }

    const jobs = await prisma.jobPosting.findMany({
      where:   { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        title:       true,
        location:    true,
        jobType:     true,
        status:      true,
        deadline:    true,
        salaryMin:   true,
        salaryMax:   true,
        createdAt:   true,
        _count:      { select: { applications: true } },
      },
    });

    res.json({
      success: true,
      data: jobs.map(j => ({ ...j, applicationCount: j._count.applications })),
    });
  } catch (e) { next(e); }
});

// ── GET /api/v1/jobs/:id  (single job detail) ─────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    const company = await prisma.company.findFirst({
      where:  { id: job.companyId },
      select: { id: true, companyName: true, logoUrl: true, location: true, industry: true },
    });
    res.json({ success: true, data: { ...job, company } });
  } catch (e) { next(e); }
});

// ── POST /api/v1/jobs  (create job) ───────────────────────────────────────
router.post('/', authenticate, requireCompany, async (req: any, res, next) => {
  try {
    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found' });
      return;
    }
    const job = await prisma.jobPosting.create({
      data: {
        ...req.body,
        companyId: company.id,
        deadline:  new Date(req.body.deadline),
      },
    });
    res.status(201).json({ success: true, data: job });
  } catch (e) { next(e); }
});

// ── PATCH /api/v1/jobs/:id/status  (toggle active/inactive) ───────────────
router.patch('/:id/status', authenticate, requireCompany, async (req: any, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'CLOSED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value' });
      return;
    }
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not your job posting' });
      return;
    }
    const updated = await prisma.jobPosting.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// ── DELETE /api/v1/jobs/:id ────────────────────────────────────────────────
router.delete('/:id', authenticate, requireCompany, async (req: any, res, next) => {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
    if (!company || job.companyId !== company.id) {
      res.status(403).json({ success: false, message: 'Not your job posting' });
      return;
    }
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Job deleted' });
  } catch (e) { next(e); }
});

export default router;