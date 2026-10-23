import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/authenticate';
import {
  getAnalyticsKpis, getApplicationsTrend, getFunnel,
  getJobPerformance, getStatusDistribution, getInsights,
} from '../controllers/analytics.controller';

const router = Router();

router.get('/company/analytics/kpis',                authenticate, requireCompany, getAnalyticsKpis);
router.get('/company/analytics/applications-trend',  authenticate, requireCompany, getApplicationsTrend);
router.get('/company/analytics/funnel',               authenticate, requireCompany, getFunnel);
router.get('/company/analytics/job-performance',      authenticate, requireCompany, getJobPerformance);
router.get('/company/analytics/status-distribution',  authenticate, requireCompany, getStatusDistribution);
router.get('/company/analytics/insights',              authenticate, requireCompany, getInsights);

export default router;