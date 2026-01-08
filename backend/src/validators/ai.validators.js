import { body, query, param } from 'express-validator';

export const getMealSuggestionsValidator = [
  query('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'all'])
    .withMessage('Meal type must be breakfast, lunch, dinner, snack, or all'),
  
  query('calorieTarget')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('Calorie target must be between 100 and 10000'),
];

export const recognizeFoodValidator = [
  body('description')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Food description must be between 3 and 500 characters'),
];

export const getInsightsValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Days must be between 1 and 90'),
];

export const askQuestionValidator = [
  body('question')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question must be between 1 and 500 characters'),
  
  body('context')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Context must not exceed 2000 characters'),
];

export const markInsightReadValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid insight ID'),
];

export const getInsightsHistoryValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('type')
    .optional()
    .isIn(['meal_suggestion', 'insight', 'answer'])
    .withMessage('Invalid insight type'),
];
