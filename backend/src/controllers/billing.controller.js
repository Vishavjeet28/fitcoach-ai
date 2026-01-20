/**
 * ============================================================================
 * BILLING CONTROLLER
 * ============================================================================
 * 
 * API endpoints for billing and subscription management.
 * 
 * Location: /backend/src/controllers/billing.controller.js
 * ============================================================================
 */

import billingService from '../services/billingService.js';
import appleStoreService from '../services/appleStoreService.js';

// ============================================================================
// GET SUBSCRIPTION STATUS
// ============================================================================

/**
 * GET /api/billing/status
 * Get user's current subscription status
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const details = await billingService.getSubscriptionDetails(userId);

    res.json(details);
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

// ============================================================================
// GET AVAILABLE PLANS
// ============================================================================

/**
 * GET /api/billing/plans
 * Get available subscription plans
 */
export const getAvailablePlans = async (req, res) => {
  try {
    const plans = Object.entries(billingService.PLAN_DETAILS).map(([id, details]) => ({
      id,
      ...details,
      price_formatted: `₹${(details.price_cents / 100).toFixed(0)}`
    }));

    res.json({
      plans,
      features: {
        free: {
          ai_requests: '5 per day',
          history: '7 days',
          adaptive_calories: false,
          plateau_detection: false,
          advanced_insights: false,
          export_data: false
        },
        paid: {
          ai_requests: 'Unlimited',
          history: 'Unlimited',
          adaptive_calories: true,
          plateau_detection: true,
          advanced_insights: true,
          export_data: true
        }
      }
    });
  } catch (error) {
    console.error('Get available plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
};

// ============================================================================
// CREATE SUBSCRIPTION (For testing / manual)
// ============================================================================

/**
 * POST /api/billing/subscribe
 * Create a subscription (called after payment verification)
 */
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_id, provider, provider_subscription_id, provider_customer_id, receipt } = req.body;

    // Validate plan
    if (!billingService.PLAN_DETAILS[plan_id]) {
      return res.status(400).json({ 
        error: 'Invalid plan',
        valid_plans: Object.keys(billingService.PLAN_DETAILS)
      });
    }

    // NOTE: In production, this endpoint should ONLY be called by:
    // 1. App Store/Play Store webhook after receipt validation
    // 2. Stripe webhook after payment confirmation
    // 
    // For now, we allow direct calls for testing/manual subscriptions.
    // In production, add: if (!receipt) return res.status(400).json({ error: 'Receipt required' });

    if (provider === 'apple' || provider === 'google') {
      // TODO: Validate receipt with Apple/Google servers
      // This is critical for production!
      console.warn(`[BILLING] Receipt validation for ${provider} not implemented!`);
    }

    const subscription = await billingService.createSubscription(userId, {
      plan_id,
      provider: provider || 'manual',
      provider_subscription_id,
      provider_customer_id
    });

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status,
        expires_at: subscription.expires_at
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
};

// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================

/**
 * POST /api/billing/cancel
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { immediate = false } = req.body;

    const subscription = await billingService.cancelSubscription(userId, immediate);

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json({
      message: immediate 
        ? 'Subscription cancelled immediately'
        : 'Subscription will cancel at end of billing period',
      subscription: {
        status: subscription.status,
        expires_at: subscription.expires_at,
        cancelled_at: subscription.cancelled_at
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// ============================================================================
// CHECK AI USAGE
// ============================================================================

/**
 * GET /api/billing/ai-usage
 * Get AI usage status
 */
export const getAIUsage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestDeviceId = req.headers['x-device-id'] || null;

    const usage = await billingService.checkAIUsage(userId, guestDeviceId);
    const tierInfo = userId ? await billingService.getUserTier(userId) : { tier: 'guest' };

    res.json({
      tier: tierInfo.tier,
      can_use_ai: usage.allowed,
      used: usage.used || 0,
      remaining: usage.remaining,
      limit: usage.limit,
      reason: usage.reason
    });
  } catch (error) {
    console.error('Get AI usage error:', error);
    res.status(500).json({ error: 'Failed to get AI usage' });
  }
};

// ============================================================================
// CHECK FEATURE ACCESS
// ============================================================================

/**
 * GET /api/billing/feature/:feature
 * Check if user has access to a specific feature
 */
export const checkFeature = async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;

    const access = await billingService.checkFeatureAccess(userId, feature);

    res.json({
      feature,
      allowed: access.allowed,
      tier: access.tier,
      reason: access.reason
    });
  } catch (error) {
    console.error('Check feature error:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
};

// ============================================================================
// WEBHOOK: Apple App Store
// ============================================================================

/**
 * POST /api/billing/webhook/apple
 * Handle Apple App Store notifications
 */
export const appleWebhook = async (req, res) => {
  try {
    console.log('[BILLING] Apple webhook received');
    
    // Process notification using AppleStoreService
    const notification = await appleStoreService.processNotification(req.body);

    if (notification) {
      console.log(`[BILLING] Syncing Apple subscription: ${notification.providerSubscriptionId} [${notification.status}]`);

      // Sync status with our database
      await billingService.syncSubscriptionFromProvider(
        notification.providerSubscriptionId,
        {
          status: notification.status,
          current_period_end: notification.current_period_end,
          cancelled_at: notification.cancelled_at
        }
      );
    } else {
      console.warn('[BILLING] Failed to process Apple notification (no valid data)');
    }

    // Always return 200 to Apple to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Apple webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ============================================================================
// WEBHOOK: Google Play Store
// ============================================================================

/**
 * POST /api/billing/webhook/google
 * Handle Google Play Store notifications
 */
export const googleWebhook = async (req, res) => {
  try {
    // TODO: Implement Google RTDN (Real-time Developer Notifications)
    // Reference: https://developer.android.com/google/play/billing/getting-ready
    
    console.log('[BILLING] Google webhook received:', JSON.stringify(req.body).slice(0, 500));

    // Placeholder response
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ============================================================================
// RESTORE PURCHASES
// ============================================================================

/**
 * POST /api/billing/restore
 * Restore purchases (for app reinstall)
 */
export const restorePurchases = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider, receipt } = req.body;

    if (!provider || !receipt) {
      return res.status(400).json({ error: 'Provider and receipt required' });
    }

    const result = await billingService.restoreSubscription(userId, provider, receipt);

    res.json({
      message: 'Purchases restored successfully',
      action: result.action,
      subscription: {
        id: result.subscription.id,
        plan_id: result.subscription.plan_id,
        status: result.subscription.status,
        expires_at: result.subscription.expires_at
      }
    });
  } catch (error) {
    console.error('Restore purchases error:', error);
    if (error.message.includes('associated with another account')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('Invalid receipt')) {
      return res.status(400).json({ error: 'Invalid receipt provided' });
    }
    res.status(500).json({ error: 'Failed to restore purchases' });
  }
};

export default {
  getSubscriptionStatus,
  getAvailablePlans,
  createSubscription,
  cancelSubscription,
  getAIUsage,
  checkFeature,
  appleWebhook,
  googleWebhook,
  restorePurchases
};
