/**
 * ============================================================================
 * FITNESS ROUTES
 * ============================================================================
 * 
 * API routes for the Fitness Logic Engine.
 * 
 * Location: /backend/src/routes/fitness.routes.js
 * ============================================================================
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getUserTargets,
  recalculateTargets,
  setGoal,
  getActiveGoal,
  logWeight,
  getWeightHistory,
  getDailyDecision,
  checkPlateau,
  applyPlateauAdjustment
} from '../controllers/fitness.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// TARGETS
// ============================================================================

// GET /api/fitness/targets - Get user's current targets
router.get('/targets', getUserTargets);

// POST /api/fitness/targets/recalculate - Force recalculation
router.post('/targets/recalculate', recalculateTargets);

// ============================================================================
// GOALS
// ============================================================================

// POST /api/fitness/goals - Create/update goal
router.post('/goals', setGoal);

// GET /api/fitness/goals/active - Get active goal
router.get('/goals/active', getActiveGoal);

// ============================================================================
// WEIGHT TRACKING
// ============================================================================

// POST /api/fitness/weight - Log weight
router.post('/weight', logWeight);

// GET /api/fitness/weight - Get weight history
router.get('/weight', getWeightHistory);

// ============================================================================
// DAILY DECISION ENGINE
// ============================================================================

// GET /api/fitness/daily-decision - Get today's decision
router.get('/daily-decision', getDailyDecision);

// ============================================================================
// PLATEAU DETECTION (Premium)
// ============================================================================

// GET /api/fitness/plateau-check - Check for plateau
router.get('/plateau-check', checkPlateau);

// POST /api/fitness/plateau/:id/apply - Apply adjustment
router.post('/plateau/:id/apply', applyPlateauAdjustment);

export default router;
