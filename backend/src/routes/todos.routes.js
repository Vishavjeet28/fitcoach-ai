/**
 * Todos Routes
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import todosController from '../controllers/todos.controller.js';

const router = express.Router();

// Get today's todos
router.get('/today', authenticateToken, todosController.getTodayTodos);

// Complete/uncomplete a todo
router.post('/:id/complete', authenticateToken, todosController.completeTodo);

export default router;
