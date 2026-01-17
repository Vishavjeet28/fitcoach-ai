/**
 * ============================================================================
 * BILLING ROUTES
 * ============================================================================
 * 
 * API routes for billing and subscription management.
 * 
 * Location: /backend/src/routes/billing.routes.js
 * ============================================================================
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getSubscriptionStatus,
  getAvailablePlans,
  createSubscription,
  cancelSubscription,
  getAIUsage,
  checkFeature,
  appleWebhook,
  googleWebhook,
  restorePurchases
} from '../controllers/billing.controller.js';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (No auth required)
// ============================================================================

// GET /api/billing/plans - Get available plans (public)
router.get('/plans', getAvailablePlans);

// Webhooks (no auth - validated by provider signature)
router.post('/webhook/apple', appleWebhook);
router.post('/webhook/google', googleWebhook);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

// GET /api/billing/status - Get subscription status
router.get('/status', authenticateToken, getSubscriptionStatus);

// POST /api/billing/subscribe - Create subscription
router.post('/subscribe', authenticateToken, createSubscription);

// POST /api/billing/cancel - Cancel subscription
router.post('/cancel', authenticateToken, cancelSubscription);

// GET /api/billing/ai-usage - Get AI usage stats
router.get('/ai-usage', authenticateToken, getAIUsage);

// GET /api/billing/feature/:feature - Check feature access
router.get('/feature/:feature', authenticateToken, checkFeature);

// POST /api/billing/restore - Restore purchases
router.post('/restore', authenticateToken, restorePurchases);

export default router;
