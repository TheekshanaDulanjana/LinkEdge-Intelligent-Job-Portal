import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import {
  getJobApplicants, smartRankApplicants,
  shortlistCandidate, scheduleInterview, rejectCandidate,
} from '../controllers/jobApplicants.controller';

const router = Router();

router.get('/jobs/:jobId/applicants',        authenticate, requireCompany, getJobApplicants);
router.post('/jobs/:jobId/smart-rank',        authenticate, requireCompany, smartRankApplicants);
router.patch('/:id/shortlist',                authenticate, requireCompany, shortlistCandidate);
router.patch('/:id/schedule-interview',       authenticate, requireCompany, scheduleInterview);
router.patch('/:id/reject',                   authenticate, requireCompany, rejectCandidate);

export default router;