import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getFoodLogs,
  logFood,
  updateFoodLog,
  deleteFoodLog,
  searchFoods,
  getNutritionTotals
} from '../controllers/food.controller.js';
import {
  logFoodValidator,
  updateFoodLogValidator,
  getFoodLogsValidator,
  searchFoodsValidator,
  deleteFoodLogValidator,
  getNutritionTotalsValidator
} from '../validators/food.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// All food routes require authentication
router.use(authenticateToken);

// Food logging
router.get('/logs', getFoodLogsValidator, validate, getFoodLogs);
router.post('/logs', logFoodValidator, validate, logFood);
router.put('/logs/:id', updateFoodLogValidator, validate, updateFoodLog);
router.delete('/logs/:id', deleteFoodLogValidator, validate, deleteFoodLog);

// Food search
router.get('/search', searchFoodsValidator, validate, searchFoods);

// Nutrition totals
router.get('/totals', getNutritionTotalsValidator, validate, getNutritionTotals);

export default router;
