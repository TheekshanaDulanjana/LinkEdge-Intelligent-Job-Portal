import { Router } from 'express';
import { z } from 'zod';
import { jobController } from '../controllers/job.controller';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const createJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  location: z.string().min(2, 'Location is required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  deadline: z.string().min(1, 'Deadline is required'),
});

// PUBLIC — anyone can browse jobs
// UPDATED: Now includes search, pagination, and company data
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const location = req.query.location as string;
    const jobType = req.query.jobType as string;
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (jobType) where.jobType = jobType;

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    const enriched = await Promise.all(
      jobs.map(async (job) => {
        const company = await prisma.company.findFirst({
          where: { id: job.companyId },
          select: {
              id: true,
              companyName: true,
              industry: true,
              website: true },
        });
        return { ...job, company };
      })
    );

    res.json({
      success: true,
      data: { jobs: enriched, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', jobController.getJobById);

// PROTECTED — must be a company
router.post('/', authenticate, requireCompany, validate(createJobSchema), jobController.createJob);
router.get('/company/my-jobs', authenticate, requireCompany, jobController.getMyJobs);
router.put('/:id', authenticate, requireCompany, jobController.updateJob);

// UPDATED: Custom delete logic with ownership check
router.delete('/:id', authenticate, requireCompany, async (req: any, res, next) => {
  try {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found' });
      return;
    }
    if (job.companyId !== req.user.userId) {
      res.status(403).json({ success: false, message: 'Not your job posting' });
      return;
    }
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/v1/jobs/:id/status — toggle active/inactive
router.patch(
  '/:id/status',
  authenticate,
  requireCompany,
  async (req, res, next) => {
    try {
      const { status } = req.body;

      if (!['ACTIVE', 'INACTIVE', 'CLOSED'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status value' });
        return;
      }

      const job = await prisma.jobPosting.findUnique({
        where: { id: req.params.id as string },
      });

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found' });
        return;
      }

      if (job.companyId !== (req as any).user.userId) {
        res.status(403).json({ success: false, message: 'Not your job posting' });
        return;
      }

      const updated = await prisma.jobPosting.update({
        where: { id: req.params.id as string },
        data: { status },
      });

      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  }
);

export default router;