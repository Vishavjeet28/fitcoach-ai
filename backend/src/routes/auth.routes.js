import express from 'express';
import { register, login, refresh, logout, updateProfile } from '../controllers/auth.controller.js';
import { googleAuth, appleAuth } from '../controllers/oauth.controller.js';
import { authenticateToken, authenticateRefreshToken } from '../middleware/auth.middleware.js';
import { registerValidator, loginValidator, updateProfileValidator } from '../validators/auth.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/refresh', authenticateRefreshToken, refresh);

// OAuth routes (public)
router.post('/google', googleAuth);
router.post('/apple', appleAuth);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.patch('/profile', authenticateToken, updateProfileValidator, validate, updateProfile);

export default router;
