import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getMealSuggestions,
  recognizeFood,
  getInsights,
  askQuestion,
  getInsightsHistory,
  markInsightRead,
  listModels
} from '../controllers/ai.controller.js';
import {
  getMealSuggestionsValidator,
  recognizeFoodValidator,
  getInsightsValidator,
  askQuestionValidator,
  getInsightsHistoryValidator,
  markInsightReadValidator
} from '../validators/ai.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// AI features
router.post('/meal-suggestions', getMealSuggestionsValidator, validate, getMealSuggestions);
router.post('/recognize-food', recognizeFoodValidator, validate, recognizeFood);
router.get('/insights', getInsightsValidator, validate, getInsights);
router.post('/ask', askQuestionValidator, validate, askQuestion);

// Debug/helper
router.get('/models', listModels);

// Insights history
router.get('/history', getInsightsHistoryValidator, validate, getInsightsHistory);
router.patch('/insights/:id/read', markInsightReadValidator, validate, markInsightRead);

export default router;

