/**
 * Exercise Estimation Controller
 * Premium calorie calculation and progressive overload logic
 */

import { query } from '../config/database.js';

// MET Values for common exercises (Metabolic Equivalent of Task)
const MET_VALUES = {
    // Strength exercises
    'bench press': 6.0,
    'squats': 6.0,
    'deadlift': 6.0,
    'shoulder press': 5.0,
    'bicep curls': 4.0,
    'tricep dips': 4.0,
    'lat pulldown': 5.0,
    'leg press': 5.5,
    'lunges': 5.0,
    'plank': 3.5,
    'push-ups': 8.0,
    'pull-ups': 8.0,
    'rows': 5.0,

    // Cardio exercises
    'running': 9.8,
    'cycling': 7.5,
    'swimming': 8.0,
    'rowing': 7.0,
    'jump rope': 11.0,
    'elliptical': 5.0,
    'stair climbing': 9.0,
    'walking': 4.3,
    'hiit': 12.0,
    'spinning': 8.5,
};

// Default MET by intensity
const INTENSITY_MET = {
    light: 3.0,
    moderate: 5.0,
    vigorous: 8.0,
};

// Recommended rest times by muscle group (seconds)
const REST_TIMES = {
    'chest': 90,
    'back': 90,
    'legs': 120,
    'shoulders': 90,
    'arms': 60,
    'core': 45,
    'full body': 90,
    'default': 60,
};

/**
 * POST /api/exercise/estimate
 * Real-time calorie estimation without logging
 * 
 * Body: {
 *   exerciseName: string,
 *   exerciseType: 'strength' | 'cardio',
 *   sets?: number,
 *   reps?: number,
 *   weightKg?: number,
 *   durationMinutes?: number,
 *   intensity?: 'light' | 'moderate' | 'vigorous',
 *   muscleGroup?: string
 * }
 */
export const estimateCalories = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            exerciseName,
            exerciseType,
            sets,
            reps,
            weightKg,
            durationMinutes,
            intensity = 'moderate',
            muscleGroup = 'default',
        } = req.body;

        // Get user weight
        const userResult = await query(
            'SELECT weight FROM users WHERE id = $1',
            [userId]
        );
        const userWeight = userResult.rows[0]?.weight || 70;

        // Get MET value
        const exerciseKey = exerciseName?.toLowerCase() || '';
        let met = MET_VALUES[exerciseKey] || INTENSITY_MET[intensity] || 5.0;

        // Calculate duration
        let durationHours = 0;

        if (exerciseType === 'strength') {
            // Estimate: sets × reps × 3 seconds per rep + rest between sets
            const restSeconds = REST_TIMES[muscleGroup?.toLowerCase()] || REST_TIMES.default;
            const totalSeconds = (sets * reps * 3) + ((sets - 1) * restSeconds);
            durationHours = totalSeconds / 3600;
        } else {
            durationHours = (durationMinutes || 0) / 60;
            // Adjust MET for intensity
            if (intensity === 'light') met *= 0.7;
            if (intensity === 'vigorous') met *= 1.3;
        }

        // Calories = MET × weight(kg) × time(hours)
        const caloriesBurned = Math.round(met * userWeight * durationHours);

        // Get rest recommendation
        const restSeconds = REST_TIMES[muscleGroup?.toLowerCase()] || REST_TIMES.default;

        // Get last session data for progressive overload
        let lastSession = null;
        let suggestion = null;

        if (exerciseName) {
            const lastResult = await query(
                `SELECT weight_kg, sets, reps, logged_at 
         FROM exercise_logs 
         WHERE user_id = $1 
           AND (custom_exercise_name ILIKE $2 OR exercise_id IN 
                (SELECT id FROM exercises WHERE name ILIKE $2))
         ORDER BY logged_at DESC 
         LIMIT 1`,
                [userId, `%${exerciseName}%`]
            );

            if (lastResult.rows.length > 0) {
                lastSession = lastResult.rows[0];

                // Progressive overload suggestion
                if (exerciseType === 'strength' && lastSession.weight_kg) {
                    const currentVolume = (sets || 0) * (reps || 0) * (weightKg || 0);
                    const lastVolume = (lastSession.sets || 0) * (lastSession.reps || 0) * (lastSession.weight_kg || 0);

                    if (currentVolume > lastVolume) {
                        suggestion = '🔥 New volume PR! Great progress!';
                    } else {
                        const nextWeight = Math.round(lastSession.weight_kg * 1.025 * 2) / 2; // 2.5% increase, round to 0.5kg
                        suggestion = `Try ${nextWeight}kg next time for progressive overload`;
                    }
                }
            }
        }

        res.json({
            estimation: {
                caloriesBurned,
                restSeconds,
                muscleGroup: muscleGroup || 'Full Body',
                met,
                durationMinutes: Math.round(durationHours * 60),
            },
            lastSession: lastSession ? {
                weightKg: lastSession.weight_kg,
                sets: lastSession.sets,
                reps: lastSession.reps,
                date: lastSession.logged_at,
            } : null,
            suggestion,
        });
    } catch (error) {
        console.error('Estimate calories error:', error);
        res.status(500).json({ error: 'Failed to estimate calories' });
    }
};

/**
 * GET /api/exercise/library
 * Get exercise library with categories
 */
export const getExerciseLibrary = async (req, res) => {
    try {
        const { category } = req.query;

        let exercises;

        if (category) {
            const result = await query(
                `SELECT id, name, category, muscle_groups, met_value, difficulty_level
         FROM exercises 
         WHERE category = $1
         ORDER BY name ASC`,
                [category]
            );
            exercises = result.rows;
        } else {
            const result = await query(
                `SELECT id, name, category, muscle_groups, met_value, difficulty_level
         FROM exercises 
         ORDER BY category, name ASC`
            );
            exercises = result.rows;
        }

        // Group by category
        const grouped = {
            strength: exercises.filter(e => e.category === 'strength'),
            cardio: exercises.filter(e => e.category === 'cardio'),
            flexibility: exercises.filter(e => e.category === 'flexibility'),
        };

        res.json({
            exercises: grouped,
            totalCount: exercises.length,
        });
    } catch (error) {
        console.error('Get exercise library error:', error);
        res.status(500).json({ error: 'Failed to fetch exercise library' });
    }
};

/**
 * GET /api/exercise/personal-records
 * Get user's personal records for exercises
 */
export const getPersonalRecords = async (req, res) => {
    try {
        const userId = req.user.id;
        const { exerciseName } = req.query;

        let queryText = `
      SELECT 
        custom_exercise_name as exercise_name,
        MAX(weight_kg) as max_weight,
        MAX(sets * reps * COALESCE(weight_kg, 1)) as max_volume,
        MAX(duration_minutes) as max_duration,
        COUNT(*) as total_sessions
      FROM exercise_logs
      WHERE user_id = $1
    `;
        const values = [userId];

        if (exerciseName) {
            queryText += ` AND custom_exercise_name ILIKE $2`;
            values.push(`%${exerciseName}%`);
        }

        queryText += ` GROUP BY custom_exercise_name ORDER BY total_sessions DESC LIMIT 20`;

        const result = await query(queryText, values);

        res.json({
            records: result.rows.map(r => ({
                exerciseName: r.exercise_name,
                maxWeight: r.max_weight,
                maxVolume: r.max_volume,
                maxDuration: r.max_duration,
                totalSessions: parseInt(r.total_sessions),
            })),
        });
    } catch (error) {
        console.error('Get personal records error:', error);
        res.status(500).json({ error: 'Failed to fetch personal records' });
    }
};

export default {
    estimateCalories,
    getExerciseLibrary,
    getPersonalRecords,
};
