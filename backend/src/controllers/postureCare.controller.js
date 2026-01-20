import { query } from '../config/database.js';

// ─────────────────────────────────────────────
// POSTURE & PAIN CARE CONTROLLER
// Safe, validated corrective exercise system
// ─────────────────────────────────────────────

// Get all corrective exercises from library
export const getExerciseLibrary = async (req, res) => {
    try {
        const { target_area } = req.query;

        let sql = 'SELECT * FROM corrective_exercise_library';
        const params = [];

        if (target_area) {
            sql += ' WHERE target_area = $1';
            params.push(target_area);
        }

        sql += ' ORDER BY name';

        const result = await query(sql, params);
        res.json({ exercises: result.rows });
    } catch (error) {
        console.error('Get exercise library error:', error);
        res.status(500).json({ error: 'Failed to fetch exercise library' });
    }
};

// Get user's pain preferences
export const getUserPainPreferences = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            'SELECT pain_type, severity, created_at FROM user_pain_preferences WHERE user_id = $1',
            [userId]
        );

        res.json({ preferences: result.rows });
    } catch (error) {
        console.error('Get pain preferences error:', error);
        res.status(500).json({ error: 'Failed to fetch pain preferences' });
    }
};

// Set user's pain preferences
export const setUserPainPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pain_types } = req.body; // Array of { pain_type, severity }

        // Clear existing preferences
        await query('DELETE FROM user_pain_preferences WHERE user_id = $1', [userId]);

        // Insert new preferences
        if (pain_types && pain_types.length > 0) {
            const values = pain_types.map((p, i) =>
                `($1, $${i * 2 + 2}, $${i * 2 + 3})`
            ).join(', ');

            const params = [userId];
            pain_types.forEach(p => {
                params.push(p.pain_type, p.severity || 'mild');
            });

            await query(
                `INSERT INTO user_pain_preferences (user_id, pain_type, severity) VALUES ${values}`,
                params
            );
        }

        res.json({ success: true, message: 'Pain preferences updated' });
    } catch (error) {
        console.error('Set pain preferences error:', error);
        res.status(500).json({ error: 'Failed to update pain preferences' });
    }
};

// Generate today's corrective care plan
export const getDailyCarePlan = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Check if already completed today
        const sessionCheck = await query(
            'SELECT * FROM corrective_sessions WHERE user_id = $1 AND session_date = $2',
            [userId, today]
        );

        const completedToday = sessionCheck.rows.length > 0 && sessionCheck.rows[0].completed;

        // Get user's pain preferences
        const prefsResult = await query(
            'SELECT pain_type FROM user_pain_preferences WHERE user_id = $1',
            [userId]
        );

        const painTypes = prefsResult.rows.map(r => r.pain_type);

        // Determine which areas to focus on today
        let targetAreas = ['posture']; // Always include posture

        if (painTypes.length > 0) {
            // Map pain types to target areas
            const painToArea = {
                'upper_back': 'back',
                'lower_back': 'back',
                'knee': 'knee',
                'shoulder': 'shoulder',
                'neck': 'neck'
            };

            // Rotate focus based on day of week
            const dayOfWeek = new Date().getDay();
            const mappedAreas = painTypes.map(p => painToArea[p] || p);
            const uniqueAreas = [...new Set(mappedAreas)];

            // Pick 1-2 areas based on rotation
            const focusIndex = dayOfWeek % uniqueAreas.length;
            targetAreas.push(uniqueAreas[focusIndex]);

            if (uniqueAreas.length > 1 && dayOfWeek % 2 === 0) {
                targetAreas.push(uniqueAreas[(focusIndex + 1) % uniqueAreas.length]);
            }
        }

        // Get exercises for selected areas (3-5 total, max 5 min)
        const placeholders = targetAreas.map((_, i) => `$${i + 1}`).join(', ');
        const exercisesResult = await query(
            `SELECT * FROM corrective_exercise_library 
       WHERE target_area IN (${placeholders}) 
       ORDER BY RANDOM()`,
            targetAreas
        );

        // Select 3-5 exercises, keeping total under 5 minutes
        let selectedExercises = [];
        let totalDuration = 0;
        const maxDuration = 300; // 5 minutes
        const maxExercises = 5;

        // Ensure at least one posture exercise
        const postureExercises = exercisesResult.rows.filter(e => e.target_area === 'posture');
        const otherExercises = exercisesResult.rows.filter(e => e.target_area !== 'posture');

        if (postureExercises.length > 0) {
            const postureEx = postureExercises[0];
            selectedExercises.push(postureEx);
            totalDuration += postureEx.duration_seconds + (postureEx.rest_seconds || 15);
        }

        // Add other exercises
        for (const ex of otherExercises) {
            if (selectedExercises.length >= maxExercises) break;
            const exDuration = ex.duration_seconds + (ex.rest_seconds || 15);
            if (totalDuration + exDuration <= maxDuration) {
                selectedExercises.push(ex);
                totalDuration += exDuration;
            }
        }

        // If we have room, add more posture exercises
        for (const ex of postureExercises.slice(1)) {
            if (selectedExercises.length >= maxExercises) break;
            const exDuration = ex.duration_seconds + (ex.rest_seconds || 15);
            if (totalDuration + exDuration <= maxDuration) {
                selectedExercises.push(ex);
                totalDuration += exDuration;
            }
        }

        // Get streak info
        const streakResult = await query(
            'SELECT current_streak, longest_streak, total_sessions FROM posture_care_streaks WHERE user_id = $1',
            [userId]
        );

        const streak = streakResult.rows[0] || { current_streak: 0, longest_streak: 0, total_sessions: 0 };

        // Daily posture tip
        const postureTips = [
            'Stand tall with shoulders relaxed and pulled back gently.',
            'Keep your chin tucked slightly - imagine a string pulling you up from the crown of your head.',
            'When sitting, keep both feet flat on the floor and your back supported.',
            'Take a break every 30 minutes to stand and stretch.',
            'Keep your weight evenly distributed when standing.',
            'Relax your shoulders - they should not be creeping up toward your ears.',
            'Engage your core lightly throughout the day for natural support.'
        ];

        const tipIndex = new Date().getDay();

        res.json({
            plan: {
                exercises: selectedExercises,
                totalDuration: Math.round(totalDuration / 60), // in minutes
                focusAreas: targetAreas,
                exerciseCount: selectedExercises.length
            },
            completed: completedToday,
            streak: {
                current: streak.current_streak,
                longest: streak.longest_streak,
                totalSessions: streak.total_sessions
            },
            postureTip: postureTips[tipIndex % postureTips.length],
            painAreas: painTypes,
            disclaimer: 'Stop if you feel pain. This is not a substitute for medical care.'
        });
    } catch (error) {
        console.error('Get daily care plan error:', error);
        res.status(500).json({ error: 'Failed to generate care plan' });
    }
};

// Complete a corrective session
export const completeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { duration_seconds, exercises_completed, feedback } = req.body;
        const today = new Date().toISOString().split('T')[0];

        // Upsert session
        await query(
            `INSERT INTO corrective_sessions (user_id, session_date, duration_seconds, exercises_completed, completed, feedback)
       VALUES ($1, $2, $3, $4, true, $5)
       ON CONFLICT (user_id, session_date) 
       DO UPDATE SET duration_seconds = $3, exercises_completed = $4, completed = true, feedback = $5`,
            [userId, today, duration_seconds, exercises_completed, feedback]
        );

        // Update streak
        const streakResult = await query(
            'SELECT * FROM posture_care_streaks WHERE user_id = $1',
            [userId]
        );

        let currentStreak = 1;
        let longestStreak = 1;
        let totalSessions = 1;

        if (streakResult.rows.length > 0) {
            const streak = streakResult.rows[0];
            const lastDate = streak.last_completed_date;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === today) {
                // Already completed today, no change
                currentStreak = streak.current_streak;
            } else if (lastDate === yesterdayStr) {
                // Consecutive day!
                currentStreak = streak.current_streak + 1;
            } else {
                // Streak broken
                currentStreak = 1;
            }

            longestStreak = Math.max(streak.longest_streak, currentStreak);
            totalSessions = streak.total_sessions + (lastDate === today ? 0 : 1);

            await query(
                `UPDATE posture_care_streaks 
         SET current_streak = $2, longest_streak = $3, last_completed_date = $4, total_sessions = $5, updated_at = NOW()
         WHERE user_id = $1`,
                [userId, currentStreak, longestStreak, today, totalSessions]
            );
        } else {
            await query(
                `INSERT INTO posture_care_streaks (user_id, current_streak, longest_streak, last_completed_date, total_sessions)
         VALUES ($1, 1, 1, $2, 1)`,
                [userId, today]
            );
        }

        // Encouraging messages
        const messages = [
            "Nice work! Your body thanks you. 🙌",
            "Great job showing up for yourself today!",
            "Small actions lead to big changes. Well done!",
            "You're building healthy habits. Keep it up!",
            "Consistency is key. You're doing amazing!"
        ];

        res.json({
            success: true,
            message: messages[Math.floor(Math.random() * messages.length)],
            streak: {
                current: currentStreak,
                longest: longestStreak,
                totalSessions
            }
        });
    } catch (error) {
        console.error('Complete session error:', error);
        res.status(500).json({ error: 'Failed to complete session' });
    }
};

// Get session history
export const getSessionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query;

        const result = await query(
            `SELECT session_date, duration_seconds, exercises_completed, feedback, created_at
       FROM corrective_sessions 
       WHERE user_id = $1 AND completed = true
       ORDER BY session_date DESC
       LIMIT $2`,
            [userId, parseInt(days)]
        );

        res.json({ sessions: result.rows });
    } catch (error) {
        console.error('Get session history error:', error);
        res.status(500).json({ error: 'Failed to fetch session history' });
    }
};

// Get posture care summary for Today screen
export const getPostureSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Check if completed today
        const sessionResult = await query(
            'SELECT completed FROM corrective_sessions WHERE user_id = $1 AND session_date = $2',
            [userId, today]
        );

        const completedToday = sessionResult.rows.length > 0 && sessionResult.rows[0].completed;

        // Get streak
        const streakResult = await query(
            'SELECT current_streak FROM posture_care_streaks WHERE user_id = $1',
            [userId]
        );

        const currentStreak = streakResult.rows[0]?.current_streak || 0;

        // Estimate duration (simplified)
        const prefsResult = await query(
            'SELECT COUNT(*) as count FROM user_pain_preferences WHERE user_id = $1',
            [userId]
        );

        const hasPainAreas = parseInt(prefsResult.rows[0].count) > 0;
        const estimatedMinutes = hasPainAreas ? 4 : 3;

        res.json({
            recommended: true,
            completedToday,
            estimatedMinutes,
            currentStreak,
            label: completedToday ? 'Completed ✓' : 'Recommended today'
        });
    } catch (error) {
        console.error('Get posture summary error:', error);
        res.status(500).json({ error: 'Failed to fetch posture summary' });
    }
};
