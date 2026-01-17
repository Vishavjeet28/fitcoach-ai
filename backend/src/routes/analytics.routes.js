import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getDailySummary,
  getWeeklyTrends,
  getMonthlyStats,
  getProgressOverview,
  getAnalyticsData,
  syncAnalytics
} from '../controllers/analytics.controller.js';

const router = express.Router();

router.use(authenticateToken);

// New Analytics System (Strict)
router.get('/chart-data', getAnalyticsData);
router.post('/sync', syncAnalytics);

// Legacy/Specific endpoints
router.get('/daily', getDailySummary);
router.get('/weekly', getWeeklyTrends);
router.get('/monthly', getMonthlyStats);
router.get('/progress', getProgressOverview);

export default router;
