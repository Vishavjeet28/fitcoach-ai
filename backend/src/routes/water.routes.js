import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getWaterLogs,
  logWater,
  deleteWaterLog,
  getWaterTotals,
  getWaterHistory
} from '../controllers/water.controller.js';
import {
  logWaterValidator,
  getWaterLogsValidator,
  deleteWaterLogValidator,
  getWaterTotalsValidator,
  getWaterHistoryValidator
} from '../validators/water.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Water logging
router.get('/logs', getWaterLogsValidator, validate, getWaterLogs);
router.post('/logs', logWaterValidator, validate, logWater);
router.delete('/logs/:id', deleteWaterLogValidator, validate, deleteWaterLog);

// Water totals and history
router.get('/totals', getWaterTotalsValidator, validate, getWaterTotals);
router.get('/history', getWaterHistoryValidator, validate, getWaterHistory);

export default router;
