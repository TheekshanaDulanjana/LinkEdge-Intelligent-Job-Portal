import express from 'express';
import cors from 'cors';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authenticate, requireCompany } from './middleware/authenticate';
import { jobSchema, statusSchema, screeningSchema, validateBody, validateParams, paging, searchTerm, isUuid } from './lib/validation';

/** The screening threshold is a company-only setting; never send it to candidates. */
function publicJob<T extends Record<string, any>>(job: T) {
  const { autoScreen, minMatchScore, ...rest } = job;
  return rest;
}

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
    const { location, jobType, seekerId, department, experienceLevel, locationType } = req.query;
    const search = searchTerm(req.query.search);
    const { page, limit, skip } = paging(req.query, 10, 50);

    const where: any = { status: 'ACTIVE' };
    if (search) {
      // Match the whole phrase, or every word of it (so "UI/UX Designer" finds "UX Designer" posts)
      const phrase = String(search).trim();
      const words = phrase.split(/[\s/,&-]+/).filter(w => w.length > 1);
      const fields = (w: string) => [
        { title:       { contains: w, mode: 'insensitive' } },
        { description: { contains: w, mode: 'insensitive' } },
        { department:  { contains: w, mode: 'insensitive' } },
      ];
      where.OR = [
        ...fields(phrase),
        ...(words.length > 1 ? [{ AND: words.map(w => ({ OR: fields(w) })) }] : []),
      ];
    }
    if (location)        where.location        = { contains: searchTerm(location), mode: 'insensitive' };
    const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'];
    const LOC_TYPES = ['REMOTE', 'ON_SITE', 'HYBRID'];
    if (typeof jobType === 'string' && JOB_TYPES.includes(jobType)) where.jobType = jobType;
    if (typeof locationType === 'string' && LOC_TYPES.includes(locationType)) where.locationType = locationType;
    if (typeof department === 'string' && department) where.department = searchTerm(department);
    if (typeof experienceLevel === 'string' && experienceLevel) where.experienceLevel = searchTerm(experienceLevel);

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take:    limit,
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
    if (isUuid(seekerId)) {
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
      ...publicJob(job),
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
        page,
        totalPages: Math.ceil(total / limit),
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

      const { status, jobType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const search = searchTerm(req.query.search);
      const { page, limit, skip } = paging(req.query, 10, 50);

      const where: any = { companyId: company.id };

      if (search) {
        where.OR = [
          { title:    { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (typeof status === 'string' && ['ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT'].includes(status)) where.status = status;
      if (typeof jobType === 'string' && ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'].includes(jobType)) where.jobType = jobType;

      const validSortFields = ['createdAt', 'title', 'deadline', 'status'];
      const orderField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';

      const [jobs, total] = await Promise.all([
        prisma.jobPosting.findMany({
          where,
          skip,
          take:    limit,
          orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
          select: {
            id: true, title: true, location: true, jobType: true,
            status: true, deadline: true, createdAt: true, salaryMin: true, salaryMax: true,
            autoScreen: true, minMatchScore: true,
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
            autoScreen: j.autoScreen,
            minMatchScore: j.minMatchScore,
          })),
          total,
          page,
          totalPages: Math.ceil(total / limit),
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
        take:    500,
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
router.get('/:id', validateParams('id'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { seekerId } = req.query;

    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    // Optional sign-in: the owning company sees drafts and its screening settings; everyone else does not.
    let isOwner = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const me = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/v1/auth/me`, {
          headers: { Authorization: authHeader }, timeout: 5000,
        });
        const u = me.data?.data;
        if (u?.role === 'COMPANY') {
          const own = await prisma.company.findFirst({ where: { userId: u.id }, select: { id: true } });
          isOwner = own?.id === job.companyId;
        }
      } catch { /* treated as anonymous */ }
    }
    if (job.status === 'DRAFT' && !isOwner) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }

    const company = await prisma.company.findFirst({
      where: { id: job.companyId },
      select: { id: true, companyName: true, logoUrl: true, coverImageUrl: true, industry: true, website: true, location: true, aboutUs: true },
    });

    let atsData: any = null;
    if (isUuid(seekerId)) {
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

    res.json({ success: true, data: { ...(isOwner ? job : publicJob(job)), company, atsData } });
  } catch (e) { next(e); }
});

// ─── POST /api/v1/jobs — Create job posting ──────────────────────────────────
router.post(
  '/',
  authenticate,
  requireCompany,
  validateBody(jobSchema),
  async (req: any, res, next) => {
    try {
      const d = req.body; // validated + cleaned by jobSchema

      const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Company profile not found. Please complete your profile first.',
        });
        return;
      }

      // Cap how many open postings one company can create per day (spam / runaway script guard)
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const recent = await prisma.jobPosting.count({ where: { companyId: company.id, createdAt: { gte: since } } });
      if (recent >= 50) {
        res.status(429).json({ success: false, message: 'Daily job posting limit reached. Try again tomorrow.' });
        return;
      }

      const requirementsList: string[] = d.requirementsList ?? [];
      // ats-service reads the flat `requirements` text, so derive it from the list.
      const flatRequirements = requirementsList.length > 0 ? requirementsList.join('. ') : (d.requirements ?? '');

      const newJob = await prisma.jobPosting.create({
        data: {
          companyId:        company.id,
          title:            d.title,
          description:      d.description,
          requirements:     flatRequirements,
          requirementsList,
          location:         d.location,
          jobType:          d.jobType,
          salaryMin:        d.salaryMin ?? null,
          salaryMax:        d.salaryMax ?? null,
          deadline:         new Date(d.deadline),
          department:       d.department ?? null,
          experienceLevel:  d.experienceLevel ?? null,
          locationType:     d.locationType ?? 'REMOTE',
          responsibilities: d.responsibilities ?? [],
          skills:           d.skills ?? [],
          status:           d.status ?? 'ACTIVE',   // "Save draft" really saves a draft
          autoScreen:       d.autoScreen ?? true,
          minMatchScore:    d.minMatchScore ?? 35,
        },
      });

      res.status(201).json({ success: true, data: newJob });
    } catch (e) { next(e); }
  }
);

// ─── PATCH /api/v1/jobs/:id/status — Toggle Active / Inactive ────────────────
router.patch(
  '/:id/status',
  authenticate,
  requireCompany,
  validateParams('id'),
  validateBody(statusSchema),
  async (req: any, res, next) => {
    try {
      const { status } = req.body;

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

      // Re-opening a job whose deadline already passed would accept nothing; make that explicit.
      if (status === 'ACTIVE' && job.deadline.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'The deadline has passed. Post a new job or extend the deadline first.' });
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

// ─── PATCH /api/v1/jobs/:id/screening — auto-screening settings (owner only) ───
router.patch(
  '/:id/screening',
  authenticate,
  requireCompany,
  validateParams('id'),
  validateBody(screeningSchema),
  async (req: any, res, next) => {
    try {
      const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
      if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
      const company = await prisma.company.findFirst({ where: { userId: req.user.userId } });
      if (!company || job.companyId !== company.id) {
        res.status(403).json({ success: false, message: 'Not your job posting' });
        return;
      }
      const updated = await prisma.jobPosting.update({
        where: { id: job.id },
        data: { autoScreen: req.body.autoScreen, minMatchScore: req.body.minMatchScore },
        select: { id: true, autoScreen: true, minMatchScore: true },
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
  validateParams('id'),
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

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error(`CORS: origin ${origin} not allowed`))),
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

const limitHandler = (_req: express.Request, res: express.Response) =>
  res.status(429).json({ success: false, message: 'Too many requests. Please slow down and try again shortly.' });
// Public browsing: generous. Anything that writes: tighter (limiter is keyed by IP).
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, handler: limitHandler }));
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, handler: limitHandler });
app.use('/api/v1/jobs', (req, res, next) => (req.method === 'GET' ? next() : writeLimiter(req, res, next)));

// Mount the jobs router
app.use('/api/v1/jobs', router);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') { res.status(400).json({ success: false, message: 'Malformed JSON body.' }); return; }
  if (err?.type === 'entity.too.large') { res.status(413).json({ success: false, message: 'Request body too large.' }); return; }
  console.error('Unhandled Error:', err);
  // Never leak internals for unexpected errors
  const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
  res.status(status).json({ success: false, message: status === 500 ? 'Internal Server Error' : err.message });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Job Service is running on port ${PORT}`);
});

export default app;