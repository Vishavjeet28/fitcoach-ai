import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getExerciseLogs,
  logExercise,
  updateExerciseLog,
  deleteExerciseLog,
  searchExercises,
  getExerciseTotals
} from '../controllers/exercise.controller.js';
import {
  logExerciseValidator,
  updateExerciseLogValidator,
  getExerciseLogsValidator,
  searchExercisesValidator,
  deleteExerciseLogValidator,
  getExerciseTotalsValidator
} from '../validators/exercise.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Exercise logging
router.get('/logs', getExerciseLogsValidator, validate, getExerciseLogs);
router.post('/logs', logExerciseValidator, validate, logExercise);
router.put('/logs/:id', updateExerciseLogValidator, validate, updateExerciseLog);
router.delete('/logs/:id', deleteExerciseLogValidator, validate, deleteExerciseLog);

// Exercise search
router.get('/search', searchExercisesValidator, validate, searchExercises);

// Exercise totals
router.get('/totals', getExerciseTotalsValidator, validate, getExerciseTotals);

export default router;
