/**
 * Todos Controller
 * Manages auto-generated daily todo lists
 */

import { query } from '../config/database.js';

// Get today's todos
export const getTodayTodos = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Check if todos exist for today
        const existingTodos = await query(
            `SELECT id, todo_type, label, completed, completed_at, priority, icon
       FROM daily_todos
       WHERE user_id = $1 AND todo_date = $2
       ORDER BY priority ASC, id ASC`,
            [userId, today]
        );

        // If no todos for today, generate them
        if (existingTodos.rows.length === 0) {
            await generateTodayTodos(userId, today);

            const newTodos = await query(
                `SELECT id, todo_type, label, completed, completed_at, priority, icon
         FROM daily_todos
         WHERE user_id = $1 AND todo_date = $2
         ORDER BY priority ASC, id ASC`,
                [userId, today]
            );

            return res.json({
                success: true,
                date: today,
                data: newTodos.rows
            });
        }

        return res.json({
            success: true,
            date: today,
            data: existingTodos.rows
        });
    } catch (error) {
        console.error('Get today todos error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch todos' });
    }
};

// Complete a todo
export const completeTodo = async (req, res) => {
    try {
        const userId = req.user.id;
        const todoId = parseInt(req.params.id);
        const { completed = true } = req.body;

        const result = await query(
            `UPDATE daily_todos 
       SET completed = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
            [completed, todoId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Todo not found' });
        }

        return res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Complete todo error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update todo' });
    }
};

// Generate todos for a specific day
async function generateTodayTodos(userId, date) {
    const todos = [
        { type: 'meal_breakfast', label: 'Log breakfast', priority: 1, icon: 'food-apple' },
        { type: 'meal_lunch', label: 'Log lunch', priority: 1, icon: 'food' },
        { type: 'meal_dinner', label: 'Log dinner', priority: 1, icon: 'food-turkey' },
        { type: 'water', label: 'Drink 3L water', priority: 2, icon: 'cup-water' },
        { type: 'workout', label: 'Complete workout', priority: 2, icon: 'dumbbell' },
        { type: 'walk', label: 'Walk 10,000 steps', priority: 3, icon: 'walk' },
        { type: 'stretch', label: 'Post-workout stretch', priority: 3, icon: 'human-greeting' }
    ];

    for (const todo of todos) {
        await query(
            `INSERT INTO daily_todos (user_id, todo_date, todo_type, label, priority, icon)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, todo_date, todo_type) DO NOTHING`,
            [userId, date, todo.type, todo.label, todo.priority, todo.icon]
        );
    }
}

// Auto-complete meal todos when food is logged
export const autoCompleteMealTodo = async (userId, mealType) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todoType = `meal_${mealType}`;

        await query(
            `UPDATE daily_todos 
       SET completed = TRUE, completed_at = NOW()
       WHERE user_id = $1 AND todo_date = $2 AND todo_type = $3 AND completed = FALSE`,
            [userId, today, todoType]
        );
    } catch (error) {
        console.error('Auto-complete meal todo error:', error);
    }
};

// Auto-complete water todo when target reached
export const autoCompleteWaterTodo = async (userId, totalWaterMl, targetMl = 3000) => {
    try {
        if (totalWaterMl >= targetMl) {
            const today = new Date().toISOString().split('T')[0];

            await query(
                `UPDATE daily_todos 
         SET completed = TRUE, completed_at = NOW()
         WHERE user_id = $1 AND todo_date = $2 AND todo_type = 'water' AND completed = FALSE`,
                [userId, today]
            );
        }
    } catch (error) {
        console.error('Auto-complete water todo error:', error);
    }
};

// Auto-complete workout todo
export const autoCompleteWorkoutTodo = async (userId) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        await query(
            `UPDATE daily_todos 
       SET completed = TRUE, completed_at = NOW()
       WHERE user_id = $1 AND todo_date = $2 AND todo_type = 'workout' AND completed = FALSE`,
            [userId, today]
        );
    } catch (error) {
        console.error('Auto-complete workout todo error:', error);
    }
};

export default {
    getTodayTodos,
    completeTodo,
    autoCompleteMealTodo,
    autoCompleteWaterTodo,
    autoCompleteWorkoutTodo
};
