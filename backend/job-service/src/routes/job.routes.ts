import { Router } from 'express';
import { z } from 'zod';
import { jobController } from '../controllers/job.controller';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

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

// PUBLIC — anyone can browse jobs (no login needed)
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// PROTECTED — must be a company
router.post('/', authenticate, requireCompany, validate(createJobSchema), jobController.createJob);
router.get('/company/my-jobs', authenticate, requireCompany, jobController.getMyJobs);
router.put('/:id', authenticate, requireCompany, jobController.updateJob);
router.delete('/:id', authenticate, requireCompany, jobController.deleteJob);

export default router;