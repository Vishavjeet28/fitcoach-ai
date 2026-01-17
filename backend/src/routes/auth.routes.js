import express from 'express';
import { register, login, firebaseLogin, refresh, logout, updateProfile, getCurrentUser } from '../controllers/auth.controller.js';
import { authenticateToken, authenticateRefreshToken } from '../middleware/auth.middleware.js';
import { registerValidator, loginValidator, updateProfileValidator } from '../validators/auth.validators.js';
import { validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/firebase-login', firebaseLogin); // New strict auth route
router.post('/refresh', authenticateRefreshToken, refresh);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser); // CRITICAL: Get current user with profile_completed flag
router.post('/logout', authenticateToken, logout);
router.patch('/profile', authenticateToken, updateProfileValidator, validate, updateProfile);

export default router;
