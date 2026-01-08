import { body, query } from 'express-validator';

export const updatePreferencesValidator = [
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),
  
  body('dietaryRestrictions.*')
    .optional()
    .isIn(['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'keto', 'paleo', 'low_carb', 'low_fat'])
    .withMessage('Invalid dietary restriction'),
  
  body('favoriteCuisines')
    .optional()
    .isArray()
    .withMessage('Favorite cuisines must be an array'),
  
  body('favoriteCuisines.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cuisine name must be between 2 and 50 characters'),
  
  body('dislikedFoods')
    .optional()
    .isArray()
    .withMessage('Disliked foods must be an array'),
  
  body('dislikedFoods.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Food name must be between 2 and 100 characters'),
  
  body('waterGoal')
    .optional()
    .isInt({ min: 500, max: 10000 })
    .withMessage('Water goal must be between 500 and 10000 ml'),
  
  body('calorieGoal')
    .optional()
    .isInt({ min: 1000, max: 10000 })
    .withMessage('Calorie goal must be between 1000 and 10000'),
  
  body('proteinGoal')
    .optional()
    .isFloat({ min: 20, max: 500 })
    .withMessage('Protein goal must be between 20 and 500g'),
  
  body('carbsGoal')
    .optional()
    .isFloat({ min: 50, max: 1000 })
    .withMessage('Carbs goal must be between 50 and 1000g'),
  
  body('fatsGoal')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('Fats goal must be between 20 and 300g'),
];

export const deleteUserDataValidator = [
  body('confirmation')
    .equals('DELETE_MY_DATA')
    .withMessage('Confirmation must be exactly "DELETE_MY_DATA"'),
];

export const exportUserDataValidator = [
  query('format')
    .optional()
    .isIn(['json'])
    .withMessage('Only JSON format is supported'),
];
