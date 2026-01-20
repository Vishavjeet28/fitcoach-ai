/**
 * ============================================================================
 * BILLING SERVICE
 * ============================================================================
 * 
 * Backend-enforced billing logic for FitCoach AI.
 * This service is the SINGLE SOURCE OF TRUTH for subscription status.
 * 
 * NO client-side code should bypass these checks.
 * 
 * Location: /backend/src/services/billingService.js
 * ============================================================================
 */

import { query } from '../config/database.js';
import { validateReceipt } from './receiptValidationService.js';

// ============================================================================
// TIER LIMITS (NON-NEGOTIABLE)
// ============================================================================

export const TIER_LIMITS = {
  guest: {
    ai_requests_total: 5,      // TOTAL, not per day
    history_days: 0,           // No history persistence
    adaptive_calories: false,
    plateau_detection: false,
    advanced_insights: false,
    export_data: false
  },
  free: {
    ai_requests_per_day: 5,
    history_days: 7,
    adaptive_calories: false,
    plateau_detection: false,
    advanced_insights: false,
    export_data: false
  },
  paid: {
    ai_requests_per_day: Infinity,
    history_days: Infinity,
    adaptive_calories: true,
    plateau_detection: true,
    advanced_insights: true,
    export_data: true
  }
};

export const PLAN_DETAILS = {
  weekly: {
    name: 'Weekly Pro',
    price_cents: 2900,
    currency: 'INR',
    duration_days: 7
  },
  monthly: {
    name: 'Monthly Pro',
    price_cents: 9900,
    currency: 'INR',
    duration_days: 30
  },
  yearly: {
    name: 'Yearly Pro',
    price_cents: 79900,
    currency: 'INR',
    duration_days: 365
  }
};

// ============================================================================
// GET USER TIER
// ============================================================================

/**
 * Get user's current subscription tier
 * @param {number} userId - User ID
 * @returns {Object} Tier info with limits
 */
export const getUserTier = async (userId) => {
  try {
    if (!userId || userId === 0) {
      return { tier: 'guest', limits: TIER_LIMITS.guest, is_authenticated: false };
    }

    // Check for active subscription
    const subResult = await query(
      `SELECT tier, plan_id, status, expires_at, current_period_end
       FROM subscriptions
       WHERE user_id = $1 
         AND status IN ('active', 'trial')
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      return {
        tier: sub.tier,
        plan_id: sub.plan_id,
        status: sub.status,
        expires_at: sub.expires_at || sub.current_period_end,
        limits: TIER_LIMITS[sub.tier] || TIER_LIMITS.free,
        is_authenticated: true
      };
    }

    // Check legacy subscription_status field on users table
    const userResult = await query(
      `SELECT subscription_status FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length > 0) {
      const status = userResult.rows[0].subscription_status;
      const isPaid = ['pro', 'premium', 'weekly', 'monthly', 'yearly'].includes(status);
      
      return {
        tier: isPaid ? 'paid' : 'free',
        plan_id: isPaid ? status : null,
        status: isPaid ? 'active' : null,
        expires_at: null,
        limits: isPaid ? TIER_LIMITS.paid : TIER_LIMITS.free,
        is_authenticated: true
      };
    }

    return { tier: 'free', limits: TIER_LIMITS.free, is_authenticated: true };
  } catch (error) {
    console.error('Get user tier error:', error);
    return { tier: 'free', limits: TIER_LIMITS.free, is_authenticated: true };
  }
};

// ============================================================================
// CHECK AI USAGE LIMITS
// ============================================================================

/**
 * Check if user can make AI request
 * @param {number|null} userId - User ID (null for guests)
 * @param {string|null} guestDeviceId - Device ID for guest tracking
 * @returns {Object} { allowed, remaining, limit, reason }
 */
export const checkAIUsage = async (userId, guestDeviceId = null) => {
  try {
    const tierInfo = await getUserTier(userId);
    const today = new Date().toISOString().split('T')[0];

    if (tierInfo.tier === 'paid') {
      return { allowed: true, remaining: Infinity, limit: Infinity };
    }

    if (tierInfo.tier === 'guest' || !userId) {
      // Guest: Check TOTAL usage (not per day)
      const guestResult = await query(
        `SELECT COALESCE(SUM(request_count), 0) as total_requests
         FROM ai_usage
         WHERE guest_device_id = $1`,
        [guestDeviceId]
      );

      const totalUsed = parseInt(guestResult.rows[0].total_requests, 10);
      const limit = TIER_LIMITS.guest.ai_requests_total;
      const remaining = Math.max(0, limit - totalUsed);

      return {
        allowed: remaining > 0,
        used: totalUsed,
        remaining,
        limit,
        reason: remaining > 0 ? null : 'Guest AI limit reached. Create an account to continue.'
      };
    }

    // Free tier: Check daily usage
    const usageResult = await query(
      `SELECT request_count FROM ai_usage
       WHERE user_id = $1 AND usage_date = $2`,
      [userId, today]
    );

    const usedToday = usageResult.rows.length > 0 
      ? parseInt(usageResult.rows[0].request_count, 10) 
      : 0;
    
    // Also check legacy ai_usage_count on users table
    const legacyResult = await query(
      `SELECT ai_usage_count FROM users WHERE id = $1`,
      [userId]
    );
    
    const legacyCount = legacyResult.rows.length > 0
      ? parseInt(legacyResult.rows[0].ai_usage_count, 10)
      : 0;

    const limit = TIER_LIMITS.free.ai_requests_per_day;
    const effectiveUsed = Math.max(usedToday, legacyCount);
    const remaining = Math.max(0, limit - effectiveUsed);

    return {
      allowed: remaining > 0,
      used: effectiveUsed,
      remaining,
      limit,
      reason: remaining > 0 ? null : 'Daily AI limit reached. Upgrade to Pro for unlimited access.'
    };
  } catch (error) {
    console.error('Check AI usage error:', error);
    // Fail closed: deny on error
    return { allowed: false, remaining: 0, limit: 0, reason: 'Error checking usage limits.' };
  }
};

// ============================================================================
// INCREMENT AI USAGE
// ============================================================================

/**
 * Increment AI usage counter
 * @param {number|null} userId - User ID
 * @param {string|null} guestDeviceId - Guest device ID
 * @param {string} requestType - Type of AI request
 */
export const incrementAIUsage = async (userId, guestDeviceId = null, requestType = 'general') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Map request type to column
    const typeColumn = {
      meal_suggestion: 'meal_suggestions',
      food_recognition: 'food_recognition',
      insights: 'insights',
      coach: 'coach_messages'
    }[requestType] || 'coach_messages';

    if (userId) {
      // Authenticated user
      await query(
        `INSERT INTO ai_usage (user_id, usage_date, request_count, ${typeColumn})
         VALUES ($1, $2, 1, 1)
         ON CONFLICT (user_id, usage_date) 
         DO UPDATE SET 
           request_count = ai_usage.request_count + 1,
           ${typeColumn} = COALESCE(ai_usage.${typeColumn}, 0) + 1,
           updated_at = NOW()`,
        [userId, today]
      );

      // Also update legacy counter for backwards compatibility
      await query(
        `UPDATE users SET ai_usage_count = ai_usage_count + 1 WHERE id = $1`,
        [userId]
      );
    } else if (guestDeviceId) {
      // Guest user
      await query(
        `INSERT INTO ai_usage (guest_device_id, usage_date, request_count, ${typeColumn})
         VALUES ($1, $2, 1, 1)
         ON CONFLICT ON CONSTRAINT unique_ai_usage_per_day
         DO UPDATE SET 
           request_count = ai_usage.request_count + 1,
           ${typeColumn} = COALESCE(ai_usage.${typeColumn}, 0) + 1,
           updated_at = NOW()`,
        [guestDeviceId, today]
      );
    }
  } catch (error) {
    console.error('Increment AI usage error:', error);
    // Don't throw - usage tracking failure shouldn't break the request
  }
};

// ============================================================================
// CHECK FEATURE ACCESS
// ============================================================================

/**
 * Check if user has access to a premium feature
 * @param {number} userId - User ID
 * @param {string} feature - Feature key
 * @returns {Object} { allowed, reason }
 */
export const checkFeatureAccess = async (userId, feature) => {
  try {
    const tierInfo = await getUserTier(userId);
    const limits = tierInfo.limits;

    const featureMap = {
      adaptive_calories: limits.adaptive_calories,
      plateau_detection: limits.plateau_detection,
      advanced_insights: limits.advanced_insights,
      export_data: limits.export_data,
      history_unlimited: limits.history_days === Infinity
    };

    const allowed = featureMap[feature] === true;

    return {
      allowed,
      tier: tierInfo.tier,
      reason: allowed ? null : `${feature} requires a Pro subscription.`
    };
  } catch (error) {
    console.error('Check feature access error:', error);
    return { allowed: false, reason: 'Error checking feature access.' };
  }
};

// ============================================================================
// CREATE SUBSCRIPTION
// ============================================================================

/**
 * Create a new subscription for user
 * @param {number} userId - User ID
 * @param {Object} subscriptionData - Subscription details
 * @returns {Object} Created subscription
 */
export const createSubscription = async (userId, subscriptionData) => {
  try {
    const { 
      plan_id, 
      provider, 
      provider_subscription_id, 
      provider_customer_id,
      price_cents,
      currency,
      trial_days = 0
    } = subscriptionData;

    const planDetails = PLAN_DETAILS[plan_id];
    if (!planDetails) {
      throw new Error(`Invalid plan_id: ${plan_id}`);
    }

    const now = new Date();
    const trialEnd = trial_days > 0 ? new Date(now.getTime() + trial_days * 24 * 60 * 60 * 1000) : null;
    const periodStart = trialEnd || now;
    const periodEnd = new Date(periodStart.getTime() + planDetails.duration_days * 24 * 60 * 60 * 1000);

    // Expire any existing active subscriptions
    await query(
      `UPDATE subscriptions 
       SET status = 'expired', updated_at = NOW() 
       WHERE user_id = $1 AND status IN ('active', 'trial')`,
      [userId]
    );

    // Create new subscription
    const result = await query(
      `INSERT INTO subscriptions (
        user_id, tier, plan_id, provider, provider_subscription_id, provider_customer_id,
        status, started_at, current_period_start, current_period_end, expires_at,
        trial_start, trial_end, price_cents, currency
      ) VALUES ($1, 'paid', $2, $3, $4, $5, $6, NOW(), $7, $8, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        plan_id,
        provider,
        provider_subscription_id || null,
        provider_customer_id || null,
        trial_days > 0 ? 'trial' : 'active',
        periodStart,
        periodEnd,
        trial_days > 0 ? now : null,
        trialEnd,
        price_cents || planDetails.price_cents,
        currency || planDetails.currency
      ]
    );

    // Update user's subscription_status for legacy compatibility
    await query(
      `UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2`,
      [plan_id, userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Create subscription error:', error);
    throw error;
  }
};

// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================

/**
 * Cancel user's subscription
 * @param {number} userId - User ID
 * @param {boolean} immediate - Cancel immediately or at period end
 * @returns {Object} Updated subscription
 */
export const cancelSubscription = async (userId, immediate = false) => {
  try {
    if (immediate) {
      // Immediate cancellation
      const result = await query(
        `UPDATE subscriptions 
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND status IN ('active', 'trial')
         RETURNING *`,
        [userId]
      );

      // Revert to free tier
      await query(
        `UPDATE users SET subscription_status = 'free', updated_at = NOW() WHERE id = $1`,
        [userId]
      );

      return result.rows[0];
    } else {
      // Cancel at period end (subscription remains active until expiry)
      const result = await query(
        `UPDATE subscriptions 
         SET cancelled_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND status IN ('active', 'trial')
         RETURNING *`,
        [userId]
      );

      return result.rows[0];
    }
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw error;
  }
};

// ============================================================================
// VERIFY SUBSCRIPTION (for webhooks)
// ============================================================================

/**
 * Verify and sync subscription from payment provider
 * @param {string} providerSubscriptionId - Provider's subscription ID
 * @param {Object} providerData - Data from provider webhook
 * @returns {Object} Updated subscription
 */
export const syncSubscriptionFromProvider = async (providerSubscriptionId, providerData) => {
  try {
    const { status, current_period_end, cancelled_at } = providerData;

    // Map provider status to our status
    const statusMap = {
      active: 'active',
      canceled: 'cancelled',
      cancelled: 'cancelled',
      past_due: 'past_due',
      unpaid: 'past_due',
      trialing: 'trial',
      expired: 'expired'
    };

    const ourStatus = statusMap[status] || 'active';

    const result = await query(
      `UPDATE subscriptions 
       SET status = $1, 
           current_period_end = $2, 
           expires_at = $2,
           cancelled_at = $3,
           updated_at = NOW()
       WHERE provider_subscription_id = $4
       RETURNING user_id, tier, plan_id, status`,
      [ourStatus, current_period_end, cancelled_at || null, providerSubscriptionId]
    );

    if (result.rows.length > 0) {
      const sub = result.rows[0];
      
      // Update user's subscription_status
      const userStatus = ourStatus === 'active' || ourStatus === 'trial' 
        ? sub.plan_id 
        : 'free';
      
      await query(
        `UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2`,
        [userStatus, sub.user_id]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error('Sync subscription error:', error);
    throw error;
  }
};

// ============================================================================
// GET SUBSCRIPTION DETAILS
// ============================================================================

/**
 * Get detailed subscription info for user
 * @param {number} userId - User ID
 * @returns {Object} Subscription details
 */
export const getSubscriptionDetails = async (userId) => {
  try {
    const tierInfo = await getUserTier(userId);
    
    if (tierInfo.tier !== 'paid') {
      return {
        has_subscription: false,
        tier: tierInfo.tier,
        limits: tierInfo.limits,
        available_plans: PLAN_DETAILS
      };
    }

    const subResult = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 
         AND status IN ('active', 'trial')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const subscription = subResult.rows[0] || null;
    const planDetails = subscription ? PLAN_DETAILS[subscription.plan_id] : null;

    return {
      has_subscription: true,
      tier: 'paid',
      subscription: subscription ? {
        plan_id: subscription.plan_id,
        plan_name: planDetails?.name,
        status: subscription.status,
        started_at: subscription.started_at,
        current_period_end: subscription.current_period_end,
        expires_at: subscription.expires_at,
        will_renew: !subscription.cancelled_at,
        cancelled_at: subscription.cancelled_at
      } : null,
      limits: TIER_LIMITS.paid
    };
  } catch (error) {
    console.error('Get subscription details error:', error);
    throw error;
  }
};

// ============================================================================
// RESTORE SUBSCRIPTION
// ============================================================================

/**
 * Restore subscription from receipt
 * @param {number} userId - User ID
 * @param {string} provider - 'apple' or 'google'
 * @param {string|Object} receipt - Receipt data
 * @returns {Object} Restored subscription details
 */
export const restoreSubscription = async (userId, provider, receipt) => {
  try {
    // 1. Validate receipt with provider
    const validationResult = await validateReceipt(provider, receipt);

    if (!validationResult.isValid) {
      throw new Error('Invalid receipt');
    }

    const {
      providerSubscriptionId,
      planId,
      expiresDate
    } = validationResult;

    // 2. Check if subscription already exists
    const subResult = await query(
      `SELECT * FROM subscriptions WHERE provider_subscription_id = $1`,
      [providerSubscriptionId]
    );

    if (subResult.rows.length > 0) {
      const existingSub = subResult.rows[0];

      // Scenario A: Subscription belongs to this user
      if (existingSub.user_id === userId) {
        // Sync status (renew if needed)
        const updatedSub = await syncSubscriptionFromProvider(providerSubscriptionId, {
          status: 'active', // Assumed active since receipt validation passed
          current_period_end: expiresDate
        });

        return {
          action: 'restored',
          subscription: updatedSub
        };
      }

      // Scenario B: Subscription belongs to another user
      else {
        console.warn(`[BILLING] Restore conflict: Sub ${providerSubscriptionId} belongs to user ${existingSub.user_id}, requested by ${userId}`);
        throw new Error('This subscription is associated with another account.');
      }
    }

    // 3. Scenario C: New subscription (not in DB)
    // Create new subscription record
    const newSub = await createSubscription(userId, {
      plan_id: planId,
      provider,
      provider_subscription_id: providerSubscriptionId,
      provider_customer_id: validationResult.originalTransactionId,
      // We don't have price from receipt validation usually, so we rely on plan defaults
    });

    // Manually set the expiry from validation result (since createSubscription defaults to now + duration)
    // This is important if restoring an older purchase that might be mid-cycle
    if (expiresDate) {
      await query(
        `UPDATE subscriptions
         SET current_period_end = $1, expires_at = $1
         WHERE id = $2`,
        [expiresDate, newSub.id]
      );
      newSub.current_period_end = expiresDate;
      newSub.expires_at = expiresDate;
    }

    return {
      action: 'created',
      subscription: newSub
    };

  } catch (error) {
    console.error('Restore subscription error:', error);
    throw error;
  }
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  TIER_LIMITS,
  PLAN_DETAILS,
  getUserTier,
  checkAIUsage,
  incrementAIUsage,
  checkFeatureAccess,
  createSubscription,
  cancelSubscription,
  syncSubscriptionFromProvider,
  getSubscriptionDetails,
  restoreSubscription
};
