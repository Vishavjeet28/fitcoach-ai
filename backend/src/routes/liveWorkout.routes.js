/**
 * ============================================================================
 * LIVE WORKOUT ROUTES
 * FitCoach AI Backend - Real-Time Workout Execution API
 * 
 * All endpoints require authentication
 * ============================================================================
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
    startLiveWorkout,
    logSet,
    getLiveStatus,
    endLiveWorkout,
    skipExercise,
    cancelLiveWorkout
} from '../controllers/liveWorkout.controller.js';

const router = express.Router();

// ============================================================================
// LIVE WORKOUT ENDPOINTS
// ============================================================================

/**
 * POST /api/workout/live/start
 * Start a new live workout session based on today's scheduled workout
 */
router.post('/start', authenticateToken, startLiveWorkout);

/**
 * POST /api/workout/live/log-set
 * Log a completed set during rest period
 * Body: { exercise_index, reps, weight_kg? }
 */
router.post('/log-set', authenticateToken, logSet);

/**
 * GET /api/workout/live/status
 * Get current live workout status (for resuming/checking state)
 */
router.get('/status', authenticateToken, getLiveStatus);

/**
 * POST /api/workout/live/end
 * End workout and save to permanent records
 * Body: { rating?, notes? }
 */
router.post('/end', authenticateToken, endLiveWorkout);

/**
 * POST /api/workout/live/skip-exercise
 * Skip current exercise and move to next
 */
router.post('/skip-exercise', authenticateToken, skipExercise);

/**
 * POST /api/workout/live/cancel
 * Cancel workout without saving progress
 */
router.post('/cancel', authenticateToken, cancelLiveWorkout);

export default router;
