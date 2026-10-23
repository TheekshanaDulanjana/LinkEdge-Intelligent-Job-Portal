import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { getCandidates, getCandidatesSummary, updateCandidateStage } from '../controllers/candidates.controller';

const router = Router();

router.get('/company/candidates',           authenticate, requireCompany, getCandidates);
router.get('/company/candidates/summary',   authenticate, requireCompany, getCandidatesSummary);
router.patch('/company/candidates/:id/stage', authenticate, requireCompany, updateCandidateStage);

export default router;