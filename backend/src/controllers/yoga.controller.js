/**
 * yoga.controller.js
 * 
 * REST API Controllers for Yoga System
 * Version 2.0 - Production Ready
 */

import { query } from '../config/database.js';
import yogaLogicEngine from '../services/yogaLogicEngine.js';

// =========================
// GET /api/yoga/categories
// =========================
export const getCategories = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, name, description, icon, image_url, display_order
             FROM yoga_categories
             WHERE is_active = TRUE
             ORDER BY display_order ASC`
        );

        // Add exercise count per category
        const categoriesWithCount = await Promise.all(
            result.rows.map(async (cat) => {
                const countResult = await query(
                    `SELECT COUNT(*) as count FROM yoga_exercises WHERE category_id = $1 AND is_active = TRUE`,
                    [cat.id]
                );
                return {
                    ...cat,
                    exercise_count: parseInt(countResult.rows[0].count)
                };
            })
        );

        res.json({
            success: true,
            data: categoriesWithCount
        });
    } catch (error) {
        console.error('Error fetching yoga categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
};

// =========================
// GET /api/yoga/exercises
// =========================
export const getExercises = async (req, res) => {
    try {
        const { category, difficulty, duration, time_of_day } = req.query;
        const userId = req.user?.id; // May be null for guest

        let sql = `
            SELECT 
                e.id, e.name, e.sanskrit_name, e.category_id, 
                e.difficulty, e.primary_purpose, e.duration_minutes,
                e.time_of_day, e.contraindication_level, e.thumbnail_url,
                c.name as category_name,
                d.benefits, d.target_areas
            FROM yoga_exercises e
            LEFT JOIN yoga_categories c ON e.category_id = c.id
            LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
            WHERE e.is_active = TRUE
        `;

        const params = [];
        let paramIdx = 1;

        // Filter by category
        if (category) {
            sql += ` AND e.category_id = $${paramIdx}`;
            params.push(category);
            paramIdx++;
        }

        // Filter by difficulty
        if (difficulty) {
            sql += ` AND e.difficulty = $${paramIdx}`;
            params.push(difficulty);
            paramIdx++;
        }

        // Filter by duration
        if (duration) {
            if (duration === 'short') {
                sql += ` AND e.duration_minutes <= 5`;
            } else if (duration === 'medium') {
                sql += ` AND e.duration_minutes > 5 AND e.duration_minutes <= 10`;
            } else if (duration === 'long') {
                sql += ` AND e.duration_minutes > 10`;
            }
        }

        // Filter by time of day
        if (time_of_day) {
            sql += ` AND (e.time_of_day = $${paramIdx} OR e.time_of_day = 'anytime')`;
            params.push(time_of_day);
            paramIdx++;
        }

        sql += ` ORDER BY c.display_order, e.duration_minutes ASC`;

        const result = await query(sql, params);

        // Add safety indicators if user is logged in
        let exercises = result.rows;
        if (userId) {
            const safeIds = await yogaLogicEngine.getSafeExercises({ userId });
            exercises = exercises.map(ex => ({
                ...ex,
                is_safe_for_user: safeIds.includes(ex.id),
                safety_badge: safeIds.includes(ex.id) ? 'Safe for you' :
                    ex.contraindication_level === 'caution' ? 'Proceed with care' : null
            }));
        }

        res.json({
            success: true,
            data: exercises,
            count: exercises.length
        });
    } catch (error) {
        console.error('Error fetching yoga exercises:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exercises'
        });
    }
};

// =========================
// GET /api/yoga/exercises/:id
// =========================
export const getExerciseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const result = await query(
            `SELECT 
                e.*,
                c.name as category_name,
                c.description as category_description,
                d.target_areas,
                d.benefits,
                d.step_by_step_instructions,
                d.common_mistakes,
                d.who_should_avoid,
                d.instructor_cues,
                d.equipment_needed,
                d.modifications
             FROM yoga_exercises e
             LEFT JOIN yoga_categories c ON e.category_id = c.id
             LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Exercise not found'
            });
        }

        const exercise = result.rows[0];

        // Add validation if user is logged in
        if (userId) {
            const validation = await yogaLogicEngine.validateExerciseForUser(id, userId);
            exercise.safety_validation = validation;
        }

        // Get related exercises from same category
        const relatedResult = await query(
            `SELECT id, name, duration_minutes, thumbnail_url
             FROM yoga_exercises
             WHERE category_id = $1 AND id != $2 AND is_active = TRUE
             LIMIT 3`,
            [exercise.category_id, id]
        );
        exercise.related_exercises = relatedResult.rows;

        res.json({
            success: true,
            data: exercise
        });
    } catch (error) {
        console.error('Error fetching exercise details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch exercise details'
        });
    }
};

// =========================
// GET /api/yoga/recommendations
// =========================
export const getRecommendations = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            // Guest user - return default recommendation
            const defaultResult = await query(
                `SELECT e.id, e.name, e.duration_minutes, e.primary_purpose, e.thumbnail_url,
                        c.name as category_name
                 FROM yoga_exercises e
                 LEFT JOIN yoga_categories c ON e.category_id = c.id
                 WHERE e.id = 'butterfly_reclined'`
            );

            return res.json({
                success: true,
                data: {
                    daily_recommendation: defaultResult.rows[0] || null,
                    recommendation_reason: 'Start your yoga journey with this calming pose',
                    is_personalized: false
                }
            });
        }

        // Get personalized recommendation
        const recommendation = await yogaLogicEngine.recommendDailyYoga(userId);

        // Get stats
        const stats = await yogaLogicEngine.getUserYogaStats(userId);

        res.json({
            success: true,
            data: {
                daily_recommendation: recommendation,
                recommendation_reason: recommendation.recommendation_reason,
                is_personalized: true,
                user_stats: {
                    total_sessions: parseInt(stats.total_sessions) || 0,
                    total_minutes: Math.round(stats.total_minutes) || 0,
                    days_this_week: parseInt(stats.days_this_week) || 0,
                    done_today: parseInt(stats.done_today) > 0
                }
            }
        });
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendations'
        });
    }
};

// =========================
// POST /api/yoga/session/start
// =========================
export const startSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { exercise_id, mood_before } = req.body;

        if (!exercise_id) {
            return res.status(400).json({
                success: false,
                error: 'exercise_id is required'
            });
        }

        // Validate exercise exists
        const exerciseResult = await query(
            `SELECT id, name FROM yoga_exercises WHERE id = $1 AND is_active = TRUE`,
            [exercise_id]
        );

        if (exerciseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Exercise not found'
            });
        }

        // Validate exercise is safe for user
        const validation = await yogaLogicEngine.validateExerciseForUser(exercise_id, userId);

        // Create session record
        const sessionResult = await query(
            `INSERT INTO yoga_user_sessions 
                (user_id, exercise_id, session_date, mood_before, started_at)
             VALUES ($1, $2, CURRENT_DATE, $3, NOW())
             RETURNING *`,
            [userId, exercise_id, mood_before || null]
        );

        res.json({
            success: true,
            data: {
                session_id: sessionResult.rows[0].id,
                exercise: exerciseResult.rows[0],
                safety_info: validation,
                started_at: sessionResult.rows[0].started_at
            }
        });
    } catch (error) {
        console.error('Error starting yoga session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session'
        });
    }
};

// =========================
// POST /api/yoga/session/complete
// =========================
export const completeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            session_id,
            duration_completed_seconds,
            completed,
            pain_feedback,
            mood_after,
            notes
        } = req.body;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                error: 'session_id is required'
            });
        }

        // Validate session belongs to user
        const sessionCheck = await query(
            `SELECT * FROM yoga_user_sessions WHERE id = $1 AND user_id = $2`,
            [session_id, userId]
        );

        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Update session
        const updateResult = await query(
            `UPDATE yoga_user_sessions SET
                duration_completed_seconds = $1,
                completed = $2,
                pain_feedback = $3,
                mood_after = $4,
                notes = $5,
                finished_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [
                duration_completed_seconds || 0,
                completed || false,
                pain_feedback || 'none',
                mood_after || null,
                notes || null,
                session_id
            ]
        );

        // If completed, we could update streaks here
        // (Integrate with existing streaks system if applicable)

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: completed ? 'Great job! Session completed. 🧘' : 'Session saved.'
        });
    } catch (error) {
        console.error('Error completing yoga session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete session'
        });
    }
};

// =========================
// GET /api/yoga/history
// =========================
export const getSessionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const result = await query(
            `SELECT 
                s.id, s.session_date, s.duration_completed_seconds, 
                s.completed, s.pain_feedback, s.mood_before, s.mood_after,
                e.id as exercise_id, e.name as exercise_name, 
                e.thumbnail_url, e.duration_minutes as target_duration,
                c.name as category_name
             FROM yoga_user_sessions s
             LEFT JOIN yoga_exercises e ON s.exercise_id = e.id
             LEFT JOIN yoga_categories c ON e.category_id = c.id
             WHERE s.user_id = $1
             ORDER BY s.started_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM yoga_user_sessions WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching session history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch history'
        });
    }
};

// =========================
// GET /api/yoga/post-workout
// =========================
export const getPostWorkoutYoga = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { workout_type = 'full' } = req.query;

        const recommendations = await yogaLogicEngine.getPostWorkoutYoga(workout_type, userId);

        res.json({
            success: true,
            data: {
                workout_type,
                recommendations,
                message: 'Suggested yoga to help your recovery'
            }
        });
    } catch (error) {
        console.error('Error getting post-workout yoga:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendations'
        });
    }
};

// =========================
// PUT /api/yoga/preferences
// =========================
export const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            preferred_difficulty,
            preferred_time,
            pain_areas,
            goals,
            session_reminder_enabled,
            reminder_time
        } = req.body;

        // Upsert preferences
        const result = await query(
            `INSERT INTO yoga_user_preferences 
                (user_id, preferred_difficulty, preferred_time, pain_areas, goals, 
                 session_reminder_enabled, reminder_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id) DO UPDATE SET
                preferred_difficulty = COALESCE($2, yoga_user_preferences.preferred_difficulty),
                preferred_time = COALESCE($3, yoga_user_preferences.preferred_time),
                pain_areas = COALESCE($4, yoga_user_preferences.pain_areas),
                goals = COALESCE($5, yoga_user_preferences.goals),
                session_reminder_enabled = COALESCE($6, yoga_user_preferences.session_reminder_enabled),
                reminder_time = COALESCE($7, yoga_user_preferences.reminder_time),
                updated_at = NOW()
             RETURNING *`,
            [
                userId,
                preferred_difficulty || 'beginner',
                preferred_time || 'anytime',
                pain_areas || [],
                goals || [],
                session_reminder_enabled || false,
                reminder_time || null
            ]
        );

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Error updating yoga preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
};

// =========================
// GET /api/yoga/preferences
// =========================
export const getPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT * FROM yoga_user_preferences WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            return res.json({
                success: true,
                data: {
                    preferred_difficulty: 'beginner',
                    preferred_time: 'anytime',
                    pain_areas: [],
                    goals: [],
                    session_reminder_enabled: false,
                    reminder_time: null
                }
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching yoga preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch preferences'
        });
    }
};

// Legacy exports for backward compatibility
export const getSessions = getExercises;
export const getSessionById = getExerciseById;
export const logSession = completeSession;
export const getTodaySuggestion = getRecommendations;

export default {
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
};
