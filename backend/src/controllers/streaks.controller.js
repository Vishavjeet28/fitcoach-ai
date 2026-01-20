/**
 * Streaks Controller
 * Manages user streaks and consistency tracking
 */

import { query } from '../config/database.js';

// Get all streaks for a user
export const getUserStreaks = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create streaks
        const result = await query(
            `SELECT streak_type, current_streak, longest_streak, last_activity_date, streak_start_date
       FROM user_streaks
       WHERE user_id = $1`,
            [userId]
        );

        // If no streaks exist, create defaults
        if (result.rows.length === 0) {
            await initializeUserStreaks(userId);

            const newResult = await query(
                `SELECT streak_type, current_streak, longest_streak, last_activity_date, streak_start_date
         FROM user_streaks
         WHERE user_id = $1`,
                [userId]
            );

            return res.json({
                success: true,
                data: formatStreaksResponse(newResult.rows)
            });
        }

        // Check if streaks need updating (if last activity was not yesterday, may be broken)
        const updatedStreaks = await checkAndUpdateStreaks(userId, result.rows);

        return res.json({
            success: true,
            data: formatStreaksResponse(updatedStreaks)
        });
    } catch (error) {
        console.error('Get streaks error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch streaks' });
    }
};

// Initialize default streaks for new user
async function initializeUserStreaks(userId) {
    const streakTypes = ['logging', 'workout', 'water', 'overall'];

    for (const type of streakTypes) {
        await query(
            `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak)
       VALUES ($1, $2, 0, 0)
       ON CONFLICT (user_id, streak_type) DO NOTHING`,
            [userId, type]
        );
    }
}

// Check and update streaks based on current date
async function checkAndUpdateStreaks(userId, streaks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const updatedStreaks = [];

    for (const streak of streaks) {
        const lastActivity = streak.last_activity_date ? new Date(streak.last_activity_date) : null;

        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);

            // If last activity was before yesterday, streak is broken
            if (lastActivity < yesterday) {
                await query(
                    `UPDATE user_streaks 
           SET current_streak = 0, updated_at = NOW()
           WHERE user_id = $1 AND streak_type = $2`,
                    [userId, streak.streak_type]
                );
                streak.current_streak = 0;
            }
        }

        updatedStreaks.push(streak);
    }

    return updatedStreaks;
}

// Format streaks for API response
function formatStreaksResponse(streaks) {
    const formatted = {
        logging: { current: 0, longest: 0, lastActivity: null },
        workout: { current: 0, longest: 0, lastActivity: null },
        water: { current: 0, longest: 0, lastActivity: null },
        overall: { current: 0, longest: 0, lastActivity: null }
    };

    for (const streak of streaks) {
        if (formatted[streak.streak_type]) {
            formatted[streak.streak_type] = {
                current: streak.current_streak,
                longest: streak.longest_streak,
                lastActivity: streak.last_activity_date
            };
        }
    }

    return formatted;
}

// Update streak (called after logging activity)
export const updateStreak = async (userId, streakType) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Get current streak
        const current = await query(
            `SELECT current_streak, longest_streak, last_activity_date 
       FROM user_streaks 
       WHERE user_id = $1 AND streak_type = $2`,
            [userId, streakType]
        );

        if (current.rows.length === 0) {
            // Create new streak
            await query(
                `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_start_date)
         VALUES ($1, $2, 1, 1, $3, $3)`,
                [userId, streakType, today]
            );
            return 1;
        }

        const streak = current.rows[0];
        const lastActivity = streak.last_activity_date;

        // Check if already logged today
        if (lastActivity && lastActivity.toISOString().split('T')[0] === today) {
            return streak.current_streak; // No change
        }

        // Check if consecutive
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak;
        if (lastActivity && lastActivity.toISOString().split('T')[0] === yesterdayStr) {
            // Consecutive day - increment streak
            newStreak = streak.current_streak + 1;
        } else {
            // Streak broken or first day
            newStreak = 1;
        }

        const newLongest = Math.max(streak.longest_streak, newStreak);

        await query(
            `UPDATE user_streaks 
       SET current_streak = $1, longest_streak = $2, last_activity_date = $3, 
           streak_start_date = CASE WHEN $1 = 1 THEN $3 ELSE streak_start_date END,
           updated_at = NOW()
       WHERE user_id = $4 AND streak_type = $5`,
            [newStreak, newLongest, today, userId, streakType]
        );

        return newStreak;
    } catch (error) {
        console.error('Update streak error:', error);
        return 0;
    }
};

// Get streak summary for home screen
export const getStreakSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT 
         COALESCE(MAX(CASE WHEN streak_type = 'logging' THEN current_streak END), 0) as logging_streak,
         COALESCE(MAX(CASE WHEN streak_type = 'overall' THEN current_streak END), 0) as overall_streak,
         COALESCE(MAX(longest_streak), 0) as longest_ever
       FROM user_streaks
       WHERE user_id = $1`,
            [userId]
        );

        return res.json({
            success: true,
            data: {
                current: result.rows[0]?.logging_streak || 0,
                overall: result.rows[0]?.overall_streak || 0,
                longest: result.rows[0]?.longest_ever || 0
            }
        });
    } catch (error) {
        console.error('Get streak summary error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch streak summary' });
    }
};

export default {
    getUserStreaks,
    updateStreak,
    getStreakSummary
};
