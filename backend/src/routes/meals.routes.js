import express from 'express';
import { 
    getDailyMealDistribution, 
    recalculateDistribution,
    generateDailyPlan,
    swapMeal,
    getDailyMealsWithRecommendations
} from '../controllers/meals.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Meal distribution routes (legacy)
router.get('/daily', getDailyMealDistribution);
router.post('/recalculate', recalculateDistribution);

// Meal recommendation routes (NEW)
router.post('/generate-daily-plan', generateDailyPlan);
router.post('/swap-meal', swapMeal);
router.get('/daily-with-recommendations', getDailyMealsWithRecommendations);

export default router;
