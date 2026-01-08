import { body, query, param } from 'express-validator';

export const logFoodValidator = [
  body('foodId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Food ID must be a positive integer'),
  
  body('foodName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Food name must be between 1 and 200 characters'),
  
  body('servingSize')
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('Serving size must be between 0.1 and 10000'),
  
  body('servingUnit')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Serving unit is required'),
  
  body('calories')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Calories must be between 0 and 100000'),
  
  body('protein')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Protein must be between 0 and 1000g'),
  
  body('carbs')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Carbs must be between 0 and 10000g'),
  
  body('fats')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Fats must be between 0 and 1000g'),
  
  body('fiber')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Fiber must be between 0 and 500g'),
  
  body('mealType')
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
  
  body('loggedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const updateFoodLogValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid food log ID'),
  
  body('servingSize')
    .optional()
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('Serving size must be between 0.1 and 10000'),
  
  body('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
];

export const getFoodLogsValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Invalid meal type'),
];

export const searchFoodsValidator = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const deleteFoodLogValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid food log ID'),
];

export const getNutritionTotalsValidator = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];
