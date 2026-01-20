/**
 * Habits Controller
 * Manages user habits and daily habit tracking
 */

import { query } from '../config/database.js';

// Get all habits for a user
export const getUserHabits = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT id, habit_name, icon, color, is_active, sort_order, created_at
       FROM habits
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY sort_order ASC, created_at ASC`,
            [userId]
        );

        return res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get habits error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch habits' });
    }
};

// Get today's habits with completion status
export const getTodayHabits = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Get habits with today's completion status
        const result = await query(
            `SELECT 
         h.id,
         h.habit_name,
         h.icon,
         h.color,
         COALESCE(hl.completed, FALSE) as completed,
         hl.completed_at
       FROM habits h
       LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.log_date = $2
       WHERE h.user_id = $1 AND h.is_active = TRUE
       ORDER BY h.sort_order ASC`,
            [userId, today]
        );

        return res.json({
            success: true,
            date: today,
            data: result.rows
        });
    } catch (error) {
        console.error('Get today habits error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch today habits' });
    }
};

// Create a new habit
export const createHabit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { habit_name, icon = 'checkbox-marked-circle', color = '#26D9BB' } = req.body;

        if (!habit_name) {
            return res.status(400).json({ success: false, error: 'Habit name is required' });
        }

        // Get max sort order
        const maxOrder = await query(
            `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM habits WHERE user_id = $1`,
            [userId]
        );

        const result = await query(
            `INSERT INTO habits (user_id, habit_name, icon, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [userId, habit_name, icon, color, maxOrder.rows[0].next_order]
        );

        return res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, error: 'Habit already exists' });
        }
        console.error('Create habit error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create habit' });
    }
};

// Toggle habit completion for today
export const toggleHabit = async (req, res) => {
    try {
        const userId = req.user.id;
        const habitId = parseInt(req.params.id);
        const today = new Date().toISOString().split('T')[0];

        // Check if habit exists and belongs to user
        const habitCheck = await query(
            `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
            [habitId, userId]
        );

        if (habitCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Habit not found' });
        }

        // Check current status
        const currentLog = await query(
            `SELECT id, completed FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date = $3`,
            [habitId, userId, today]
        );

        let result;
        if (currentLog.rows.length === 0) {
            // Create new log as completed
            result = await query(
                `INSERT INTO habit_logs (user_id, habit_id, log_date, completed, completed_at)
         VALUES ($1, $2, $3, TRUE, NOW())
         RETURNING *`,
                [userId, habitId, today]
            );
        } else {
            // Toggle existing
            const newStatus = !currentLog.rows[0].completed;
            result = await query(
                `UPDATE habit_logs 
         SET completed = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END
         WHERE id = $2
         RETURNING *`,
                [newStatus, currentLog.rows[0].id]
            );
        }

        return res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Toggle habit error:', error);
        return res.status(500).json({ success: false, error: 'Failed to toggle habit' });
    }
};

// Delete a habit
export const deleteHabit = async (req, res) => {
    try {
        const userId = req.user.id;
        const habitId = parseInt(req.params.id);

        const result = await query(
            `UPDATE habits SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id`,
            [habitId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Habit not found' });
        }

        return res.json({ success: true, message: 'Habit deleted' });
    } catch (error) {
        console.error('Delete habit error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete habit' });
    }
};

// Create default habits for new user
export const createDefaultHabits = async (userId) => {
    try {
        const defaults = [
            { name: 'Morning stretch', icon: 'human-greeting', order: 1 },
            { name: 'Drink water', icon: 'cup-water', order: 2 },
            { name: 'Take vitamins', icon: 'pill', order: 3 },
            { name: 'Walk 10 mins', icon: 'walk', order: 4 },
            { name: 'Mindful breathing', icon: 'meditation', order: 5 }
        ];

        for (const habit of defaults) {
            await query(
                `INSERT INTO habits (user_id, habit_name, icon, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, habit_name) DO NOTHING`,
                [userId, habit.name, habit.icon, habit.order]
            );
        }

        return true;
    } catch (error) {
        console.error('Create default habits error:', error);
        return false;
    }
};

export default {
    getUserHabits,
    getTodayHabits,
    createHabit,
    toggleHabit,
    deleteHabit,
    createDefaultHabits
};
