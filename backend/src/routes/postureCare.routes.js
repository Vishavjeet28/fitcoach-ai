import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
    getExerciseLibrary,
    getUserPainPreferences,
    setUserPainPreferences,
    getDailyCarePlan,
    completeSession,
    getSessionHistory,
    getPostureSummary
} from '../controllers/postureCare.controller.js';

const router = express.Router();

// ─────────────────────────────────────────────
// POSTURE & PAIN CARE ROUTES
// ─────────────────────────────────────────────

// Public: Get exercise library
router.get('/exercises', getExerciseLibrary);

// Protected routes
router.use(authenticateToken);

// Pain preferences
router.get('/pain-preferences', getUserPainPreferences);
router.post('/pain-preferences', setUserPainPreferences);

// Daily care plan
router.get('/daily-plan', getDailyCarePlan);

// Session management
router.post('/complete', completeSession);
router.get('/history', getSessionHistory);

// Summary for Today screen
router.get('/summary', getPostureSummary);

export default router;
