import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as recipeController from '../controllers/recipe.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', recipeController.getRecipes);
router.post('/generate', recipeController.generateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

export default router;
