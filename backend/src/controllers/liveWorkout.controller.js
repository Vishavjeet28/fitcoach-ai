/**
 * ============================================================================
 * LIVE WORKOUT CONTROLLER
 * FitCoach AI Backend - Real-Time Workout Execution System
 * 
 * STRICT ENGINEERING RULES:
 * - ALL calculations done server-side (calories, rest, fatigue)
 * - NO AI decisions on workout content
 * - Frontend is a DUMB renderer
 * - Integrates with existing workout templates + daily workout system
 * ============================================================================
 */

import { query } from '../config/database.js';
import WorkoutLogicEngine from '../services/workoutLogicEngine.js';
import { logError } from '../utils/logger.js';

// ============================================================================
// CONSTANTS - DETERMINISTIC CALCULATION PARAMETERS
// ============================================================================

// Base rest times by exercise intensity (MET-based)
const REST_TIME_RULES = {
    heavy_compound: { met_min: 5.5, base_rest: 180, fatigue_multiplier: 1.5 },
    moderate_compound: { met_min: 4.5, base_rest: 120, fatigue_multiplier: 1.3 },
    isolation: { met_min: 0, base_rest: 60, fatigue_multiplier: 1.0 }
};

// Fatigue scaling (0-10 scale)
const FATIGUE_CONFIG = {
    max_fatigue: 10.0,
    rest_increase_per_fatigue: 5, // 5 seconds extra rest per fatigue point
    fatigue_decay_per_minute: 0.1 // Natural recovery
};

// ============================================================================
// HELPER FUNCTIONS - DETERMINISTIC CALCULATIONS
// ============================================================================

/**
 * Calculate calories burned for a single set
 * Formula: (MET × weight_kg × duration_minutes) / 60
 * 
 * Set duration estimated as: (reps × 3 seconds) / 60 minutes
 */
function calculateSetCalories(met, weight_kg, reps) {
    const duration_minutes = (reps * 3) / 60; // ~3 seconds per rep
    return Math.round((met * weight_kg * duration_minutes) / 60);
}

/**
 * Calculate recommended rest time based on exercise and fatigue
 * Deterministic: Based on MET value and accumulated fatigue
 */
function calculateRestTime(met, current_fatigue, user_goal) {
    let base_rest;

    // Determine rest category by MET
    if (met >= REST_TIME_RULES.heavy_compound.met_min) {
        base_rest = REST_TIME_RULES.heavy_compound.base_rest;
    } else if (met >= REST_TIME_RULES.moderate_compound.met_min) {
        base_rest = REST_TIME_RULES.moderate_compound.base_rest;
    } else {
        base_rest = REST_TIME_RULES.isolation.base_rest;
    }

    // Adjust for fatigue (more fatigue = more rest needed)
    const fatigue_adjustment = current_fatigue * FATIGUE_CONFIG.rest_increase_per_fatigue;

    // Adjust for user goal
    let goal_multiplier = 1.0;
    if (user_goal === 'fat_loss') {
        goal_multiplier = 0.75; // Shorter rest for fat loss
    } else if (user_goal === 'muscle_gain') {
        goal_multiplier = 1.1; // Slightly longer rest for muscle gain
    }

    // Calculate final rest (capped at 300 seconds = 5 min max)
    const calculated_rest = Math.round((base_rest + fatigue_adjustment) * goal_multiplier);
    return Math.min(calculated_rest, 300);
}

/**
 * Calculate fatigue increase from a set
 * Compound exercises add more fatigue
 */
async function calculateFatigueIncrease(exercise_name, reps, weight_kg) {
    let multiplier = 1.0;

    try {
        // Check if exercise matches any fatigue patterns
        const result = await query(
            `SELECT fatigue_multiplier, is_compound FROM exercise_fatigue_map 
       WHERE LOWER($1) LIKE '%' || pattern || '%'
       ORDER BY fatigue_multiplier DESC LIMIT 1`,
            [exercise_name.toLowerCase()]
        );

        if (result.rows.length > 0) {
            multiplier = parseFloat(result.rows[0].fatigue_multiplier);
        }
    } catch (error) {
        // Fallback to default
        console.warn('Fatigue lookup failed, using default');
    }

    // Base fatigue: 0.2 per set, scaled by multiplier and weight
    const weight_factor = weight_kg ? Math.min(weight_kg / 100, 1.5) : 1.0;
    const rep_factor = Math.min(reps / 10, 1.5);

    return parseFloat((0.2 * multiplier * weight_factor * rep_factor).toFixed(2));
}

/**
 * Get MET value for exercise (from templates or DB)
 */
function getExerciseMET(exercise) {
    // First check if MET is directly on exercise
    if (exercise.met) return parseFloat(exercise.met);

    // Default moderate intensity
    return 5.0;
}

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * POST /api/workout/live/start
 * 
 * Start a new live workout session
 * - Fetches today's workout from existing system
 * - Creates live session entry
 * - Returns workout plan + first exercise
 */
export async function startLiveWorkout(req, res) {
    try {
        const userId = req.user.id;

        // 1. Check for existing active session
        const existingSession = await query(
            `SELECT id FROM live_workout_sessions WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (existingSession.rows.length > 0) {
            // Return existing session instead of creating new one
            return getLiveStatus(req, res);
        }

        // 2. Get today's workout from existing system
        const dailyWorkout = await WorkoutLogicEngine.getDailyWorkout(userId);

        if (!dailyWorkout.success || !dailyWorkout.data?.split?.exercises) {
            return res.status(400).json({
                success: false,
                error: 'No workout scheduled for today. Please generate a workout plan first.'
            });
        }

        const { program_id, split } = dailyWorkout.data;
        const exercises = split.exercises;

        // 3. Get user weight for calorie calculations
        const userResult = await query(
            `SELECT weight, goal FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = userResult.rows[0];
        const weight_kg = parseFloat(user.weight) || 70;

        // 4. Prepare exercises data with backend calculations
        const preparedExercises = exercises.map((ex, index) => ({
            index,
            name: ex.name,
            met: getExerciseMET(ex),
            target_sets: ex.selected_sets || ex.sets?.[1] || 3,
            target_reps: ex.selected_reps || ex.reps?.[1] || 10,
            rest_seconds: ex.rest_seconds || calculateRestTime(getExerciseMET(ex), 0, user.goal),
            equipment: ex.equipment || 'any',
            instructions: ex.instructions || [],
            completed_sets: 0
        }));

        // 5. Create live session
        const sessionResult = await query(
            `INSERT INTO live_workout_sessions (
        user_id, workout_program_id, split_name,
        current_exercise_index, total_exercises, exercises_data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
            [
                userId,
                program_id || null,
                split.name,
                0,
                preparedExercises.length,
                JSON.stringify(preparedExercises)
            ]
        );

        const session = sessionResult.rows[0];

        // 6. Return session data with first exercise
        return res.json({
            success: true,
            data: {
                session_id: session.id,
                started_at: session.started_at,
                split_name: session.split_name,
                total_exercises: session.total_exercises,
                current_exercise_index: 0,
                current_exercise: preparedExercises[0],
                next_exercise: preparedExercises[1] || null,
                exercises: preparedExercises,
                accumulated_calories: 0,
                accumulated_fatigue: 0,
                total_sets_completed: 0,
                is_active: true
            }
        });

    } catch (error) {
        logError('startLiveWorkout', error);
        res.status(500).json({ success: false, error: 'Failed to start workout' });
    }
}

/**
 * POST /api/workout/live/log-set
 * 
 * Log a completed set during rest period
 * - Calculates calories burned (backend)
 * - Calculates rest time recommendation (backend)
 * - Updates fatigue (backend)
 * - Determines next exercise (backend)
 */
export async function logSet(req, res) {
    try {
        const userId = req.user.id;
        const { exercise_index, reps, weight_kg } = req.body;

        // Validate input
        if (exercise_index === undefined || !reps) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: exercise_index, reps'
            });
        }

        // 1. Get active session
        const sessionResult = await query(
            `SELECT * FROM live_workout_sessions 
       WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active workout session. Start a workout first.'
            });
        }

        const session = sessionResult.rows[0];
        const exercises = session.exercises_data;
        const exercise = exercises[exercise_index];

        if (!exercise) {
            return res.status(400).json({
                success: false,
                error: 'Invalid exercise index'
            });
        }

        // 2. Get user data
        const userResult = await query(
            `SELECT weight, goal FROM users WHERE id = $1`,
            [userId]
        );
        const user = userResult.rows[0];
        const user_weight = parseFloat(user.weight) || 70;

        // 3. Get current set number for this exercise
        const setCountResult = await query(
            `SELECT COUNT(*) as count FROM live_workout_sets 
       WHERE session_id = $1 AND exercise_index = $2`,
            [session.id, exercise_index]
        );
        const set_number = parseInt(setCountResult.rows[0].count) + 1;

        // 4. BACKEND CALCULATIONS (Deterministic)
        const met = exercise.met;
        const calories_burned = calculateSetCalories(met, user_weight, reps);
        const fatigue_increase = await calculateFatigueIncrease(exercise.name, reps, weight_kg || 0);
        const new_fatigue = Math.min(
            parseFloat(session.accumulated_fatigue) + fatigue_increase,
            FATIGUE_CONFIG.max_fatigue
        );
        const rest_recommended = calculateRestTime(met, new_fatigue, user.goal);

        // 5. Insert set log
        await query(
            `INSERT INTO live_workout_sets (
        session_id, exercise_index, exercise_name, set_number,
        reps, weight_kg, calories_burned, met_value, rest_recommended_sec
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                session.id,
                exercise_index,
                exercise.name,
                set_number,
                reps,
                weight_kg || null,
                calories_burned,
                met,
                rest_recommended
            ]
        );

        // 6. Update session totals
        const new_calories = parseInt(session.accumulated_calories) + calories_burned;
        const new_sets = parseInt(session.total_sets_completed) + 1;
        const new_volume = parseFloat(session.total_volume_kg) + ((weight_kg || 0) * reps);

        // Update exercise completed sets count
        exercises[exercise_index].completed_sets = set_number;

        // Determine if exercise is complete and find next exercise
        let current_exercise_index = exercise_index;
        let next_exercise = null;

        if (set_number >= exercise.target_sets) {
            // Exercise complete - move to next
            current_exercise_index = exercise_index + 1;
            if (current_exercise_index < exercises.length) {
                next_exercise = exercises[current_exercise_index];
            }
        } else {
            // Same exercise, more sets
            next_exercise = exercises[exercise_index + 1] || null;
        }

        // Calculate rest end time
        const rest_end_at = new Date(Date.now() + rest_recommended * 1000);

        // 7. Update session
        await query(
            `UPDATE live_workout_sessions SET
        accumulated_calories = $1,
        accumulated_fatigue = $2,
        total_sets_completed = $3,
        total_volume_kg = $4,
        current_exercise_index = $5,
        exercises_data = $6,
        rest_timer_active = TRUE,
        rest_timer_end_at = $7,
        last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $8`,
            [
                new_calories,
                new_fatigue,
                new_sets,
                new_volume,
                current_exercise_index,
                JSON.stringify(exercises),
                rest_end_at,
                session.id
            ]
        );

        // 8. Return updated state (all values from backend)
        return res.json({
            success: true,
            data: {
                set_logged: {
                    exercise_name: exercise.name,
                    set_number,
                    reps,
                    weight_kg: weight_kg || null,
                    calories_burned,
                    rest_recommended_sec: rest_recommended
                },
                session_totals: {
                    accumulated_calories: new_calories,
                    accumulated_fatigue: parseFloat(new_fatigue.toFixed(2)),
                    total_sets_completed: new_sets,
                    total_volume_kg: parseFloat(new_volume.toFixed(2))
                },
                current_exercise: {
                    ...exercises[current_exercise_index],
                    sets_remaining: exercises[current_exercise_index]
                        ? exercises[current_exercise_index].target_sets - exercises[current_exercise_index].completed_sets
                        : 0
                },
                next_exercise,
                rest_timer: {
                    duration_sec: rest_recommended,
                    ends_at: rest_end_at.toISOString()
                },
                workout_progress: {
                    exercises_completed: exercises.filter(e => e.completed_sets >= e.target_sets).length,
                    total_exercises: exercises.length,
                    is_final_exercise: current_exercise_index >= exercises.length
                }
            }
        });

    } catch (error) {
        logError('logSet', error);
        res.status(500).json({ success: false, error: 'Failed to log set' });
    }
}

/**
 * GET /api/workout/live/status
 * 
 * Get current live workout status
 * - Returns current state without modification
 */
export async function getLiveStatus(req, res) {
    try {
        const userId = req.user.id;

        // Get active session
        const sessionResult = await query(
            `SELECT * FROM live_workout_sessions 
       WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (sessionResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    has_active_session: false
                }
            });
        }

        const session = sessionResult.rows[0];
        const exercises = session.exercises_data;
        const current_index = parseInt(session.current_exercise_index);

        // Get logged sets for current exercise
        const setsResult = await query(
            `SELECT * FROM live_workout_sets 
       WHERE session_id = $1 
       ORDER BY exercise_index, set_number`,
            [session.id]
        );

        // Calculate elapsed time
        const elapsed_seconds = Math.floor(
            (Date.now() - new Date(session.started_at).getTime()) / 1000
        );

        // Check rest timer
        let rest_remaining = 0;
        if (session.rest_timer_active && session.rest_timer_end_at) {
            rest_remaining = Math.max(0, Math.floor(
                (new Date(session.rest_timer_end_at).getTime() - Date.now()) / 1000
            ));
        }

        return res.json({
            success: true,
            data: {
                has_active_session: true,
                session_id: session.id,
                started_at: session.started_at,
                elapsed_seconds,
                split_name: session.split_name,
                current_exercise_index: current_index,
                current_exercise: exercises[current_index] || null,
                next_exercise: exercises[current_index + 1] || null,
                exercises,
                logged_sets: setsResult.rows,
                accumulated_calories: parseInt(session.accumulated_calories),
                accumulated_fatigue: parseFloat(session.accumulated_fatigue),
                total_sets_completed: parseInt(session.total_sets_completed),
                total_volume_kg: parseFloat(session.total_volume_kg),
                rest_timer: {
                    active: session.rest_timer_active && rest_remaining > 0,
                    remaining_sec: rest_remaining
                },
                workout_progress: {
                    exercises_completed: exercises.filter(e => e.completed_sets >= e.target_sets).length,
                    total_exercises: exercises.length
                }
            }
        });

    } catch (error) {
        logError('getLiveStatus', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
}

/**
 * POST /api/workout/live/end
 * 
 * End the current workout session
 * - Aggregates all logged sets
 * - Converts to permanent workout_sessions record
 * - Updates analytics
 * - Deletes live session data
 */
export async function endLiveWorkout(req, res) {
    try {
        const userId = req.user.id;
        const { rating, notes } = req.body; // Optional user feedback

        // 1. Get active session
        const sessionResult = await query(
            `SELECT * FROM live_workout_sessions 
       WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No active workout session to end'
            });
        }

        const session = sessionResult.rows[0];

        // 2. Get all logged sets
        const setsResult = await query(
            `SELECT * FROM live_workout_sets 
       WHERE session_id = $1 
       ORDER BY exercise_index, set_number`,
            [session.id]
        );

        // 3. Calculate final duration
        const duration_minutes = Math.ceil(
            (Date.now() - new Date(session.started_at).getTime()) / (1000 * 60)
        );

        // 4. Aggregate exercises for workout_sessions format
        const exercises = session.exercises_data;
        const exercises_completed = exercises.map((ex, index) => {
            const exerciseSets = setsResult.rows.filter(s => s.exercise_index === index);

            return {
                name: ex.name,
                met: ex.met,
                sets: exerciseSets.length,
                reps: exerciseSets.map(s => s.reps),
                weight_kg: exerciseSets.map(s => s.weight_kg),
                calories_per_set: exerciseSets.map(s => s.calories_burned),
                total_calories: exerciseSets.reduce((sum, s) => sum + s.calories_burned, 0),
                completed: exerciseSets.length >= ex.target_sets,
                duration_min: Math.ceil(exerciseSets.length * 2) // ~2 min per set
            };
        }).filter(ex => ex.sets > 0); // Only include exercises with logged sets

        // 5. Calculate final totals
        const total_calories = parseInt(session.accumulated_calories);
        const total_volume = parseFloat(session.total_volume_kg);
        const total_sets = parseInt(session.total_sets_completed);

        // 6. Save to permanent workout_sessions table (existing system)
        const savedSession = await query(
            `INSERT INTO workout_sessions (
        user_id, program_id, split_name,
        exercises_completed, duration_minutes,
        calories_burned, notes, rating, session_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
      RETURNING *`,
            [
                userId,
                session.workout_program_id,
                session.split_name,
                JSON.stringify(exercises_completed),
                duration_minutes,
                total_calories,
                notes || null,
                rating || null
            ]
        );

        // 7. Also log to exercise_logs for HistoryScreen compatibility
        const dateStr = new Date().toISOString().split('T')[0];

        for (const ex of exercises_completed) {
            await query(
                `INSERT INTO exercise_logs (
          user_id, custom_exercise_name,
          duration_minutes, sets, reps, weight_kg,
          calories_burned, workout_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    userId,
                    ex.name,
                    ex.duration_min,
                    ex.sets,
                    ex.reps.length > 0 ? Math.max(...ex.reps) : 10,
                    ex.weight_kg.length > 0 ? Math.max(...ex.weight_kg.filter(w => w)) : 0,
                    ex.total_calories,
                    dateStr
                ]
            );
        }

        // 8. Update daily calories burned in analytics
        try {
            await query(
                `INSERT INTO daily_calorie_summary (user_id, date, burned, updated_at)
         VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, date) 
         DO UPDATE SET burned = daily_calorie_summary.burned + $2, updated_at = CURRENT_TIMESTAMP`,
                [userId, total_calories]
            );
        } catch (err) {
            // Table might not exist - non-critical
            console.warn('Could not update daily_calorie_summary:', err.message);
        }

        // 9. Delete live session data
        await query(`DELETE FROM live_workout_sets WHERE session_id = $1`, [session.id]);
        await query(`DELETE FROM live_workout_sessions WHERE id = $1`, [session.id]);

        // 10. Return summary
        return res.json({
            success: true,
            data: {
                summary: {
                    session_id: savedSession.rows[0].id,
                    split_name: session.split_name,
                    duration_minutes,
                    exercises_completed: exercises_completed.length,
                    total_sets: total_sets,
                    total_calories,
                    total_volume_kg: total_volume,
                    rating,
                    notes
                },
                exercises: exercises_completed,
                message: 'Workout completed and saved! Great job! 💪'
            }
        });

    } catch (error) {
        logError('endLiveWorkout', error);
        res.status(500).json({ success: false, error: 'Failed to end workout' });
    }
}

/**
 * POST /api/workout/live/skip-exercise
 * 
 * Skip current exercise and move to next
 */
export async function skipExercise(req, res) {
    try {
        const userId = req.user.id;

        const sessionResult = await query(
            `SELECT * FROM live_workout_sessions 
       WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No active session' });
        }

        const session = sessionResult.rows[0];
        const exercises = session.exercises_data;
        let next_index = parseInt(session.current_exercise_index) + 1;

        if (next_index >= exercises.length) {
            return res.status(400).json({
                success: false,
                error: 'No more exercises. End the workout instead.'
            });
        }

        await query(
            `UPDATE live_workout_sessions SET 
        current_exercise_index = $1,
        last_activity_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
            [next_index, session.id]
        );

        return res.json({
            success: true,
            data: {
                skipped_exercise: exercises[next_index - 1].name,
                current_exercise: exercises[next_index],
                next_exercise: exercises[next_index + 1] || null,
                exercises_remaining: exercises.length - next_index
            }
        });

    } catch (error) {
        logError('skipExercise', error);
        res.status(500).json({ success: false, error: 'Failed to skip exercise' });
    }
}

/**
 * POST /api/workout/live/cancel
 * 
 * Cancel workout without saving
 */
export async function cancelLiveWorkout(req, res) {
    try {
        const userId = req.user.id;

        const sessionResult = await query(
            `SELECT id FROM live_workout_sessions WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        if (sessionResult.rows.length === 0) {
            return res.json({ success: true, message: 'No active session to cancel' });
        }

        const session_id = sessionResult.rows[0].id;

        // Delete without saving
        await query(`DELETE FROM live_workout_sets WHERE session_id = $1`, [session_id]);
        await query(`DELETE FROM live_workout_sessions WHERE id = $1`, [session_id]);

        return res.json({
            success: true,
            message: 'Workout cancelled. Progress was not saved.'
        });

    } catch (error) {
        logError('cancelLiveWorkout', error);
        res.status(500).json({ success: false, error: 'Failed to cancel workout' });
    }
}

export default {
    startLiveWorkout,
    logSet,
    getLiveStatus,
    endLiveWorkout,
    skipExercise,
    cancelLiveWorkout
};
