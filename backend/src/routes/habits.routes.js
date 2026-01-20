/**
 * Habits Routes
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import habitsController from '../controllers/habits.controller.js';

const router = express.Router();

// Get all user habits
router.get('/', authenticateToken, habitsController.getUserHabits);

// Get today's habits with status
router.get('/today', authenticateToken, habitsController.getTodayHabits);

// Create new habit
router.post('/', authenticateToken, habitsController.createHabit);

// Toggle habit completion
router.post('/:id/toggle', authenticateToken, habitsController.toggleHabit);

// Delete habit
router.delete('/:id', authenticateToken, habitsController.deleteHabit);

export default router;
