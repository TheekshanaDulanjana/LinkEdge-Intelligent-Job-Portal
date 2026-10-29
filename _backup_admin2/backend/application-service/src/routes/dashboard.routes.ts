import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboard.controller';

const router = Router();

// Routes mounted relative to /api/v1/applications/company
router.get('/dashboard-stats', authenticate, requireCompany, getDashboardStats);
router.get('/recent-activity', authenticate, requireCompany, getRecentActivity);

export default router;