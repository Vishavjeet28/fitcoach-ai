/**
 * ============================================================================
 * MEAL RECOMMENDATION ROUTES
 * FitCoach AI Backend
 * ============================================================================
 */

import express from 'express';
import * as mealController from '../controllers/mealRecommendation.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// All meal recommendation routes require authentication
router.use(authenticateToken);

// Recommendation routes
router.post('/recommend', mealController.recommendMeal);

// Swap routes
router.post('/swap', mealController.executeMacroSwap);
router.get('/swap-status', mealController.getSwapStatus);

// Remaining macros
router.get('/remaining', mealController.getRemainingMacros);

export default router;
