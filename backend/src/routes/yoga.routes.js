/**
 * yoga.routes.js
 * 
 * REST API Routes for Yoga System
 * Version 2.0
 */

import express from 'express';
import {
    getCategories,
    getExercises,
    getExerciseById,
    getRecommendations,
    startSession,
    completeSession,
    getSessionHistory,
    getPostWorkoutYoga,
    updatePreferences,
    getPreferences
} from '../controllers/yoga.controller.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// =========================
// PUBLIC ROUTES (Guest Access)
// =========================

/**
 * GET /api/yoga/categories
 * Get all active yoga categories
 * @returns {Array} List of categories with exercise counts
 */
router.get('/categories', getCategories);

/**
 * GET /api/yoga/exercises
 * Get list of exercises (with optional filters)
 * @query {string} category - Filter by category ID
 * @query {string} difficulty - beginner | beginner_safe | all_levels
 * @query {string} duration - short | medium | long
 * @query {string} time_of_day - morning | evening | anytime
 * @returns {Array} List of exercises
 */
router.get('/exercises', optionalAuth, getExercises);

/**
 * GET /api/yoga/exercises/:id
 * Get full details of a specific exercise
 * @param {string} id - Exercise ID
 * @returns {Object} Complete exercise data with instructions
 */
router.get('/exercises/:id', optionalAuth, getExerciseById);

/**
 * GET /api/yoga/recommendations
 * Get personalized daily recommendation (or default for guests)
 * @returns {Object} Recommended exercise with reasoning
 */
router.get('/recommendations', optionalAuth, getRecommendations);

/**
 * GET /api/yoga/post-workout
 * Get yoga suggestions after a gym workout
 * @query {string} workout_type - upper | lower | full | cardio
 * @returns {Array} Recovery yoga suggestions
 */
router.get('/post-workout', optionalAuth, getPostWorkoutYoga);

// =========================
// PROTECTED ROUTES (Login Required)
// =========================

/**
 * POST /api/yoga/session/start
 * Start a yoga session (creates tracking record)
 * @body {string} exercise_id - ID of exercise to start
 * @body {number} mood_before - Optional mood rating 1-5
 * @returns {Object} Session ID and exercise info
 */
router.post('/session/start', authenticateToken, startSession);

/**
 * POST /api/yoga/session/complete
 * Complete/update a yoga session
 * @body {number} session_id - Session to update
 * @body {number} duration_completed_seconds - Actual duration
 * @body {boolean} completed - Whether fully completed
 * @body {string} pain_feedback - none | better | same | worse
 * @body {number} mood_after - Mood rating 1-5
 * @body {string} notes - Optional notes
 * @returns {Object} Updated session data
 */
router.post('/session/complete', authenticateToken, completeSession);

/**
 * GET /api/yoga/history
 * Get user's yoga session history
 * @query {number} limit - Results per page (default 20)
 * @query {number} offset - Offset for pagination
 * @returns {Array} Session history with pagination
 */
router.get('/history', authenticateToken, getSessionHistory);

/**
 * GET /api/yoga/preferences
 * Get user's yoga preferences
 * @returns {Object} User preferences
 */
router.get('/preferences', authenticateToken, getPreferences);

/**
 * PUT /api/yoga/preferences
 * Update user's yoga preferences
 * @body {string} preferred_difficulty - beginner | intermediate | advanced
 * @body {string} preferred_time - morning | evening | anytime
 * @body {Array} pain_areas - ['lower_back', 'knee', 'shoulder', 'neck']
 * @body {Array} goals - ['flexibility', 'stress', 'posture', 'pain_relief']
 * @body {boolean} session_reminder_enabled
 * @body {string} reminder_time - HH:MM format
 * @returns {Object} Updated preferences
 */
router.put('/preferences', authenticateToken, updatePreferences);

// =========================
// LEGACY ROUTES (Backward Compatibility)
// =========================
router.get('/sessions', optionalAuth, getExercises);
router.get('/session/:id', optionalAuth, getExerciseById);
router.get('/today', optionalAuth, getRecommendations);
router.post('/log', authenticateToken, completeSession);

export default router;
