/**
 * Tips Routes
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import tipsController from '../controllers/tips.controller.js';

const router = express.Router();

// Get daily tip
router.get('/daily', authenticateToken, tipsController.getDailyTip);

// Get tip history
router.get('/history', authenticateToken, tipsController.getTipHistory);

export default router;
