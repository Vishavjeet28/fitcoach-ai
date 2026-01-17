/**
 * ============================================================================
 * WORKOUT ROUTES
 * FitCoach AI Backend
 * ============================================================================
 */

import express from 'express';
import * as workoutController from '../controllers/workout.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// All workout routes require authentication
router.use(authenticateToken);

// Template routes
router.get('/templates', workoutController.getTemplates);
router.get('/templates/:templateId', workoutController.getTemplateById);

// Program routes
router.post('/recommend', workoutController.recommendProgram);
router.get('/daily', workoutController.getDailyWorkout);

// Session routes
router.post('/log-session', workoutController.logSession);
router.get('/history', workoutController.getHistory);

// Personal records
router.get('/personal-records', workoutController.getPersonalRecords);
router.post('/personal-records', workoutController.createPersonalRecord);

// Analytics
router.get('/analytics', workoutController.getAnalytics);

// Preferences
router.put('/preferences', workoutController.updatePreferences);

export default router;
