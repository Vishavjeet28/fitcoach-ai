import { body, query, param } from 'express-validator';

export const logWaterValidator = [
  body('amount')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Water amount must be between 1 and 10000 ml'),
  
  body('loggedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const getWaterLogsValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];

export const deleteWaterLogValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid water log ID'),
];

export const getWaterTotalsValidator = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

export const getWaterHistoryValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
];
