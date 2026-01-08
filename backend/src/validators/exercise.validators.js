import { body, query, param } from 'express-validator';

export const logExerciseValidator = [
  body('exerciseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Exercise ID must be a positive integer'),
  
  body('exerciseName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Exercise name must be between 1 and 200 characters'),
  
  body('duration')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  
  body('intensity')
    .optional()
    .isIn(['light', 'moderate', 'vigorous'])
    .withMessage('Intensity must be light, moderate, or vigorous'),
  
  body('caloriesBurned')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Calories burned must be between 0 and 10000'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  
  body('loggedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const updateExerciseLogValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid exercise log ID'),
  
  body('duration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  
  body('intensity')
    .optional()
    .isIn(['light', 'moderate', 'vigorous'])
    .withMessage('Intensity must be light, moderate, or vigorous'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

export const getExerciseLogsValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('type')
    .optional()
    .isIn(['cardio', 'strength', 'flexibility', 'sports'])
    .withMessage('Invalid exercise type'),
];

export const searchExercisesValidator = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  
  query('type')
    .optional()
    .isIn(['cardio', 'strength', 'flexibility', 'sports'])
    .withMessage('Invalid exercise type'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const deleteExerciseLogValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid exercise log ID'),
];

export const getExerciseTotalsValidator = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];
