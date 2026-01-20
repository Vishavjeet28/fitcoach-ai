/**
 * Streaks Routes
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import streaksController from '../controllers/streaks.controller.js';

const router = express.Router();

// Get all streaks
router.get('/', authenticateToken, streaksController.getUserStreaks);

// Get streak summary for home screen
router.get('/summary', authenticateToken, streaksController.getStreakSummary);

export default router;
