/**
 * ============================================================================
 * GOOGLE PLAY SERVICE
 * ============================================================================
 *
 * Service for interacting with Google Play Developer API.
 * Used to verify subscriptions and purchases server-side.
 *
 * Location: /backend/src/services/googlePlayService.js
 * ============================================================================
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({
  version: 'v3',
  auth,
});

/**
 * Verify subscription status with Google Play
 * @param {string} packageName - App package name (e.g. com.fitcoach.app)
 * @param {string} subscriptionId - Product ID (e.g. monthly_pro)
 * @param {string} purchaseToken - Purchase token from device/webhook
 * @returns {Object} Normalized subscription data
 */
export const verifySubscription = async (packageName, subscriptionId, purchaseToken) => {
  try {
    if (!packageName || !subscriptionId || !purchaseToken) {
      throw new Error('Missing required parameters for subscription verification');
    }

    const res = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const sub = res.data;
    const now = Date.now();
    const expiryTime = parseInt(sub.expiryTimeMillis, 10);

    let status = 'active';

    // Determine status based on Google Play fields
    // paymentState: 0=Pending, 1=Received, 2=Free Trial, 3=Deferred
    if (expiryTime < now) {
      status = 'expired';
    } else if (sub.paymentState === 2) {
      status = 'trial';
    } else if (sub.paymentState === 0) {
      status = 'past_due'; // or pending
    }

    // Check for user cancellation
    // cancelReason: 0=User, 1=System, 2=Replaced, 3=Developer
    const isCancelled = sub.cancelReason !== undefined && sub.cancelReason !== null;
    const cancelledAt = sub.userCancellationTimeMillis
      ? new Date(parseInt(sub.userCancellationTimeMillis, 10))
      : (isCancelled ? new Date() : null);

    // If cancelled but still within period, it's "active" (but will expire)
    // However, billingService handles `cancelled_at` separately from `status`.
    // If status is 'active' and cancelled_at is set, it means "cancels at period end".

    // Check for grace period
    // If expiryTime < now but in grace period? Google doesn't explicitly send "in grace period" status here,
    // but the expiryTime might be extended or we use notification types.
    // Generally trust expiryTime.

    return {
      status,
      current_period_end: new Date(expiryTime),
      cancelled_at: cancelledAt,
      auto_renewing: sub.autoRenewing,
      test_purchase: sub.purchaseType === 0 // 0=Test, 1=Promo, null=Real
    };

  } catch (error) {
    console.error('[GooglePlayService] Verify subscription error:', error.message);
    throw error;
  }
};

export default {
  verifySubscription
};
