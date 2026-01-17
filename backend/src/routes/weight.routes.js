
import express from 'express';
import { getWeightData, logWeight } from '../controllers/weight.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get weight history, stats, trends
router.get('/', authenticateToken, getWeightData);

// Log weight entry
router.post('/log', authenticateToken, logWeight);

export default router;
