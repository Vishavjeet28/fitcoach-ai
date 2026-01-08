import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getUserProfile,
  exportUserData,
  deleteUserData,
  updateUserPreferences,
  deactivateAccount,
  getAccountStats
} from '../controllers/user.controller.js';
import {
  updatePreferencesValidator,
  deleteUserDataValidator,
  exportUserDataValidator
} from '../validators/user.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// User profile and preferences
router.get('/profile', getUserProfile);
router.patch('/preferences', updatePreferencesValidator, validate, updateUserPreferences);
router.get('/stats', getAccountStats);

// Privacy and data management
router.get('/export-data', exportUserDataValidator, validate, exportUserData);
router.delete('/delete-data', deleteUserDataValidator, validate, deleteUserData);
router.post('/deactivate', deactivateAccount);

export default router;
