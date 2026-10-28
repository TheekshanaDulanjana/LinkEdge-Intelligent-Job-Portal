import express from 'express';
import cors from 'cors';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticate, requireCompany } from './middleware/authenticate';

const router = Router();
const prisma = new PrismaClient();

const ATS_URL = process.env.ATS_SERVICE_URL || 'http://localhost:8003';



// ─── GET /api/v1/jobs/portal-stats — Hero section stats (public) ─────────────
// MUST be declared before /:id, otherwise "portal-stats" is treated as a job id
router.get('/portal-stats', async (_req, res, next) => {
  try {
    const [activeJobs, topCompanies, candidates] = await Promise.all([
      prisma.jobPosting.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count(),
      prisma.user.count({ where: { role: 'SEEKER' } }),
    ]);

    res.json({
      success: true,
      data: { activeJobs, topCompanies, candidates },
    });
  } catch (e) { next(e); }
});



// ─── GET /api/v1/jobs — Public job board, enriched with ATS scores ────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1, limit = 10, search, location, jobType, seekerId,
      department, experienceLevel, locationType,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { title:       { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (location)        where.location        = { contains: location as string, mode: 'insensitive' };
    if (jobType)          where.jobType          = jobType;
    if (department)       where.department       = department;
    if (experienceLevel)  where.experienceLevel  = experienceLevel;
    if (locationType)     where.locationType     = locationType;

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
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

    // ATS scores — optional, never blocks the response
    let atsScores: Record<string, any> = {};
    if (seekerId && typeof seekerId === 'string') {
      try {
        const atsRes = await axios.post(
          `${ATS_URL}/api/v1/ats/batch-score`,
          {
            candidate_id: seekerId,
            jobs: enriched.map((j) => ({
              id:           j.id,
              title:        j.title,
              description:  j.description,
              requirements: j.requirements,
            })),
          },
          { timeout: 15000 }
        );
        if (atsRes.data?.has_resume) {
          atsScores = atsRes.data.scores || {};
        }
      } catch (e: any) {
        console.warn('ATS batch score failed (non-critical):', e.message);
      }
    }

    const result = enriched.map((job) => ({
      ...job,
      atsScore:      atsScores[job.id]?.overall_score  ?? null,
      atsColor:      atsScores[job.id]?.score_color    ?? null,
      atsLabel:      atsScores[job.id]?.score_label    ?? null,
      matchedSkills: atsScores[job.id]?.matched_skills ?? [],
      missingSkills: atsScores[job.id]?.missing_skills ?? [],
    }));

    res.json({
      success: true,
      data: {
        jobs:       result,
        total,
        page:       Number(page),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (e) { next(e); }
});

// ─── GET /api/v1/jobs/company/summary — KPI cards for Jobs page ───────────────
// MUST be declared before /:id so Express doesn't treat "company" as a job id
router.get(
  '/company/summary',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
    try {
      const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found' });
        return;
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endToday    = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

      const jobs = await prisma.jobPosting.findMany({
        where: { companyId: company.id }, select: { id: true },
      });
      const jobIds = jobs.map(j => j.id);

      const [
        totalActiveJobs, newJobsThisWeek,
        totalApplications, newAppsThisWeek,
        interviewsToday, nextInterview,
      ] = await Promise.all([
        prisma.jobPosting.count({ where: { companyId: company.id, status: 'ACTIVE' } }),
        prisma.jobPosting.count({ where: { companyId: company.id, createdAt: { gte: weekAgo } } }),
        prisma.application.count({ where: { jobId: { in: jobIds } } }),
        prisma.application.count({ where: { jobId: { in: jobIds }, createdAt: { gte: weekAgo } } }),
        prisma.application.count({
          where: { jobId: { in: jobIds }, status: 'INTERVIEW', interviewDate: { gte: startToday, lt: endToday } },
        }),
        prisma.application.findFirst({
          where: { jobId: { in: jobIds }, status: 'INTERVIEW', interviewDate: { gte: now } },
          orderBy: { interviewDate: 'asc' },
          select: { interviewDate: true, interviewTime: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalActiveJobs,
          newJobsThisWeek,
          totalApplications,
          newAppsThisWeek,
          interviewsToday,
          nextInterviewTime: nextInterview?.interviewTime ?? null,
        },
      });
    } catch (e) { next(e); }
  }
);

// ─── GET /api/v1/jobs/company/all — Full Jobs table (search/sort/filter/paginate) ──
router.get(
  '/company/all',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
    try {
      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
      });
      if (!company) {
        res.status(404).json({ success: false, message: 'Company profile not found' });
        return;
      }

      const {
        page = '1', limit = '10', search, status, jobType,
        sortBy = 'createdAt', sortOrder = 'desc',
      } = req.query;

      const where: any = { companyId: company.id };

      if (search) {
        where.OR = [
          { title:    { contains: search as string, mode: 'insensitive' } },
          { location: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      if (status && status !== 'ALL')  where.status  = status;
      if (jobType && jobType !== 'ALL') where.jobType = jobType;

      const validSortFields = ['createdAt', 'title', 'deadline', 'status'];
      const orderField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [jobs, total] = await Promise.all([
        prisma.jobPosting.findMany({
          where,
          skip,
          take:    parseInt(limit as string),
          orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
          select: {
            id: true, title: true, location: true, jobType: true,
            status: true, deadline: true, createdAt: true, salaryMin: true, salaryMax: true,
            _count: { select: { applications: true } },
          },
        }),
        prisma.jobPosting.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          jobs: jobs.map(j => ({
            id: j.id,
            title: j.title,
            location: j.location,
            jobType: j.jobType,
            status: j.status,
            deadline: j.deadline,
            createdAt: j.createdAt,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            applicationCount: j._count.applications,
          })),
          total,
          page: parseInt(page as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (e) { next(e); }
  }
);

// ─── GET /api/v1/jobs/company/my-jobs ─────────────────────────────────────
router.get(
  '/company/my-jobs',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
    try {
      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
        select: { id: true, companyName: true },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company profile not found. Please complete your company profile first.',
        });
        return;
      }

      const jobs = await prisma.jobPosting.findMany({
        where:   { companyId: company.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          title:     true,
          location:  true,
          jobType:   true,
          status:    true,
          deadline:  true,
          salaryMin: true,
          salaryMax: true,
          createdAt: true,
        },
      });

      res.json({ success: true, data: jobs });
    } catch (e: any) {
      console.error('[/company/my-jobs] Error:', e?.message ?? e);
      next(e);
    }
  }
);

// ─── GET /api/v1/jobs/:id — Single job detail ────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id }       = req.params;
    const { seekerId } = req.query;

    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    const company = await prisma.company.findFirst({
      where: { id: job.companyId },
    });

    let atsData: any = null;
    if (seekerId && typeof seekerId === 'string') {
      try {
        const atsRes = await axios.post(
          `${ATS_URL}/api/v1/ats/score`,
          {
            candidate_id:     seekerId,
            job_id:           job.id,
            job_title:        job.title,
            job_description:  job.description,
            job_requirements: job.requirements,
          },
          { timeout: 20000 }
        );
        atsData = atsRes.data;
      } catch (e: any) {
        console.warn('Single job ATS score failed (non-critical):', e.message);
      }
    }

    res.json({ success: true, data: { ...job, company, atsData } });
  } catch (e) { next(e); }
});

// ─── POST /api/v1/jobs — Create job posting ──────────────────────────────────
router.post(
  '/',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
    try {
      const {
        title,
        description,
        requirements,       // legacy flat text (optional now — auto-derived below if missing)
        requirementsList,   // NEW: array of requirement lines from the form
        location,
        jobType,
        salaryMin,
        salaryMax,
        deadline,
        department,
        experienceLevel,
        locationType,
        responsibilities,
        skills,
      } = req.body;

      // Find company ID using the authenticated user ID
      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
      });

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company profile not found. Please complete your profile first.',
        });
        return;
      }

      const cleanRequirementsList = Array.isArray(requirementsList)
        ? requirementsList.filter((r: string) => r && r.trim() !== '')
        : [];

      // Keep the legacy flat `requirements` string populated too — ats-service
      // still reads this field for matching, so we derive it from the new list
      // when the frontend sends requirementsList instead of a flat string.
      const flatRequirements = cleanRequirementsList.length > 0
        ? cleanRequirementsList.join('. ')
        : (requirements || '');

      const newJob = await prisma.jobPosting.create({
        data: {
          companyId: company.id,
          title,
          description,
          requirements:      flatRequirements,
          requirementsList:  cleanRequirementsList,
          location,
          jobType,
          salaryMin: salaryMin ? Number(salaryMin) : null,
          salaryMax: salaryMax ? Number(salaryMax) : null,
          deadline: new Date(deadline),
          department:        department ?? null,
          experienceLevel:   experienceLevel ?? null,
          locationType:      locationType ?? 'REMOTE',
          responsibilities:  Array.isArray(responsibilities) ? responsibilities : [],
          skills:            Array.isArray(skills) ? skills : [],
        },
      });

      res.status(201).json({ success: true, data: newJob });
    } catch (e) {
      next(e);
    }
  }
);

// ─── PATCH /api/v1/jobs/:id/status — Toggle Active / Inactive ────────────────
router.patch(
  '/:id/status',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
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

      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
      });
      if (!company || job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Not your job posting' });
        return;
      }

      const updated = await prisma.jobPosting.update({
        where: { id: req.params.id },
        data:  { status },
      });
      res.json({ success: true, data: updated });
    } catch (e) { next(e); }
  }
);

// ─── DELETE /api/v1/jobs/:id — Delete job posting ────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requireCompany,
  async (req: any, res, next) => {
    try {
      const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found' });
        return;
      }

      const company = await prisma.company.findFirst({
        where: { userId: req.user.userId },
      });
      if (!company || job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Not your job posting' });
        return;
      }

      // Applications reference this job via a foreign key — delete them first,
      // then delete the job, in a single transaction so it's all-or-nothing.
      await prisma.$transaction([
        prisma.application.deleteMany({ where: { jobId: req.params.id } }),
        prisma.jobPosting.delete({ where: { id: req.params.id } }),
      ]);

      res.json({ success: true, message: 'Job and all its applications deleted successfully' });
    } catch (e) { next(e); }
  }
);

// ─── Express App Setup & Listener ───────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

// Mount the jobs router
app.use('/api/v1/jobs', router);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Job Service is running on port ${PORT}`);
});

export default app;