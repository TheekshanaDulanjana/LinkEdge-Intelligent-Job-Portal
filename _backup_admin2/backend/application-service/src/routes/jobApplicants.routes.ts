import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { heavyActionLimiter } from '../middleware/security';
import { validateBody, validateParams, scheduleInterviewSchema, rejectSchema } from '../lib/validation';
import {
  getJobApplicants, smartRankApplicants,
  shortlistCandidate, scheduleInterview, rejectCandidate,
} from '../controllers/jobApplicants.controller';

const router = Router();

router.get('/jobs/:jobId/applicants',   authenticate, requireCompany, validateParams('jobId'), getJobApplicants);
router.post('/jobs/:jobId/smart-rank',  authenticate, requireCompany, heavyActionLimiter, validateParams('jobId'), smartRankApplicants);
router.patch('/:id/shortlist',          authenticate, requireCompany, heavyActionLimiter, validateParams('id'), shortlistCandidate);
router.patch('/:id/schedule-interview', authenticate, requireCompany, heavyActionLimiter, validateParams('id'), validateBody(scheduleInterviewSchema), scheduleInterview);
router.patch('/:id/reject',             authenticate, requireCompany, heavyActionLimiter, validateParams('id'), validateBody(rejectSchema), rejectCandidate);

export default router;
