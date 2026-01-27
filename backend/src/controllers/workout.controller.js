/**
 * ============================================================================
 * WORKOUT CONTROLLER
 * FitCoach AI Backend - Production-Ready
 * 
 * STRICT ENGINEERING MODE REQUIREMENTS:
 * - Template-first workout recommendations
 * - MET-based calorie calculations
 * - AI tuning for personalization
 * - Session logging with exercise-level detail
 * - Personal record tracking
 * ============================================================================
 */

import WorkoutLogicEngine from '../services/workoutLogicEngine.js';
import { logError } from '../utils/logger.js';

/**
 * GET /api/workout/templates
 * Returns all available workout templates with details
 */
const getTemplates = async (req, res) => {
  try {
    const templates = WorkoutLogicEngine.getTemplates();

    return res.status(200).json({
      success: true,
      data: {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          frequency: t.frequency,
          level: t.level,
          goal_compatibility: t.goal_compatibility,
          benefits: t.benefits || []
        })),
        total: templates.length
      }
    });
  } catch (error) {
    logError('getTemplates', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch workout templates'
    });
  }
};

/**
 * GET /api/workout/templates/:templateId
 * Returns full details of a specific template
 */
const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = WorkoutLogicEngine.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: templateId,
        ...template
      }
    });
  } catch (error) {
    logError('getTemplateById', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch template details'
    });
  }
};

/**
 * POST /api/workout/recommend
 * Generates personalized workout program recommendation
 * 
 * Body: { user_id } -> Now uses req.user.id
 */
const recommendProgram = async (req, res) => {
  try {
    const user_id = req.user.id;
    // Auth middleware ensures user presence

    const recommendation = await WorkoutLogicEngine.recommendProgram(user_id);

    if (!recommendation.success) {
      return res.status(400).json({
        success: false,
        error: recommendation.error
      });
    }

    return res.status(200).json({
      success: true,
      data: recommendation.data
    });
  } catch (error) {
    logError('recommendProgram', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate workout recommendation'
    });
  }
};

/**
 * GET /api/workout/daily
 * Returns today's workout for the user
 * 
 * Query: user_id -> Now uses req.user.id
 */
const getDailyWorkout = async (req, res) => {
  try {
    const user_id = req.user.id;
    // Auth middleware ensures user presence

    const dailyWorkout = await WorkoutLogicEngine.getDailyWorkout(parseInt(user_id));

    if (!dailyWorkout.success) {
      return res.status(400).json({
        success: false,
        error: dailyWorkout.error
      });
    }

    return res.status(200).json({
      success: true,
      data: dailyWorkout.data
    });
  } catch (error) {
    logError('getDailyWorkout', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch daily workout'
    });
  }
};

/**
 * POST /api/workout/log-session
 * Logs a completed workout session
 */
const logSession = async (req, res) => {
  try {
    const sessionData = req.body;
    console.log('📝 LOG SESSION PAYLOAD:', JSON.stringify(sessionData, null, 2));

    // Force user_id from token for security
    sessionData.user_id = req.user.id;

    // Validation
    if (!sessionData.program_id) {
      return res.status(400).json({
        success: false,
        error: 'program_id is required'
      });
    }

    if (!sessionData.exercises_completed || sessionData.exercises_completed.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'exercises_completed array is required'
      });
    }

    const result = await WorkoutLogicEngine.logSession(sessionData.user_id, sessionData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logError('logSession', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to log workout session'
    });
  }
};

/**
 * GET /api/workout/history
 * Returns workout session history for a user
 */
const getHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    const pool = require('../config/database');
    const result = await pool.query(
      `SELECT 
        ws.*,
        wp.template_id,
        wp.name as program_name
      FROM workout_sessions ws
      LEFT JOIN workout_programs wp ON ws.workout_program_id = wp.id
      WHERE ws.user_id = $1
      ORDER BY ws.session_date DESC, ws.created_at DESC
      LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        sessions: result.rows,
        total: result.rowCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logError('getHistory', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch workout history'
    });
  }
};

/**
 * GET /api/workout/personal-records
 * Returns personal records for a user
 */
const getPersonalRecords = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { exercise_id } = req.query;

    const pool = require('../config/database');
    let query = `
      SELECT 
        pr.*,
        e.name as exercise_name,
        e.category,
        e.primary_muscle
      FROM personal_records pr
      LEFT JOIN exercises e ON pr.exercise_id = e.id
      WHERE pr.user_id = $1
    `;
    const params = [user_id];

    if (exercise_id) {
      query += ` AND pr.exercise_id = $2`;
      params.push(exercise_id);
    }

    query += ` ORDER BY pr.achieved_date DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: {
        records: result.rows,
        total: result.rowCount
      }
    });
  } catch (error) {
    logError('getPersonalRecords', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch personal records'
    });
  }
};

/**
 * POST /api/workout/personal-records
 * Creates or updates a personal record
 */
const createPersonalRecord = async (req, res) => {
  try {
    // Override user_id from token
    const user_id = req.user.id;
    const { exercise_id, record_type, value, weight_kg, verified = false } = req.body;

    if (!exercise_id || !record_type || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'exercise_id, record_type, and value are required'
      });
    }

    const pool = require('../config/database');

    // Check if PR already exists
    const existingPR = await pool.query(
      `SELECT * FROM personal_records 
       WHERE user_id = $1 AND exercise_id = $2 AND record_type = $3`,
      [user_id, exercise_id, record_type]
    );

    let result;
    if (existingPR.rows.length > 0) {
      // Update existing PR if new value is better
      result = await pool.query(
        `UPDATE personal_records 
         SET value = $1, weight_kg = $2, achieved_date = CURRENT_DATE, verified = $3
         WHERE user_id = $4 AND exercise_id = $5 AND record_type = $6
         RETURNING *`,
        [value, weight_kg, verified, user_id, exercise_id, record_type]
      );
    } else {
      // Insert new PR
      result = await pool.query(
        `INSERT INTO personal_records (user_id, exercise_id, record_type, value, weight_kg, verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, exercise_id, record_type, value, weight_kg, verified]
      );
    }

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logError('createPersonalRecord', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create personal record'
    });
  }
};

/**
 * GET /api/workout/analytics
 * Returns workout analytics for a user
 */
const getAnalytics = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { period = 'weekly' } = req.query;

    const pool = require('../config/database');
    const result = await pool.query(
      `SELECT * FROM workout_analytics 
       WHERE user_id = $1 AND period = $2
       ORDER BY start_date DESC
       LIMIT 12`, // Last 12 periods
      [user_id, period]
    );

    return res.status(200).json({
      success: true,
      data: {
        analytics: result.rows,
        period
      }
    });
  } catch (error) {
    logError('getAnalytics', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch workout analytics'
    });
  }
};

/**
 * PUT /api/workout/preferences
 * Updates user workout preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { experience_level, available_days, equipment_access, preferred_split, injury_notes } = req.body;

    const pool = require('../config/database');

    // Upsert preferences
    const result = await pool.query(
      `INSERT INTO workout_preferences (user_id, experience_level, available_days, equipment_access, preferred_split, injury_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         experience_level = EXCLUDED.experience_level,
         available_days = EXCLUDED.available_days,
         equipment_access = EXCLUDED.equipment_access,
         preferred_split = EXCLUDED.preferred_split,
         injury_notes = EXCLUDED.injury_notes,
         updated_at = NOW()
       RETURNING *`,
      [user_id, experience_level, available_days, equipment_access, preferred_split, injury_notes]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logError('updatePreferences', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update workout preferences'
    });
  }
};

export {
  getTemplates,
  getTemplateById,
  recommendProgram,
  getDailyWorkout,
  logSession,
  getHistory,
  getPersonalRecords,
  createPersonalRecord,
  getAnalytics,
  updatePreferences
};
