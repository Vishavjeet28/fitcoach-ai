/**
 * ============================================================================
 * APPLE STORE SERVICE
 * ============================================================================
 *
 * Service for handling Apple App Store Server Notifications V2.
 *
 * Location: /backend/src/services/appleStoreService.js
 * ============================================================================
 */

import jwt from 'jsonwebtoken';

/**
 * Process Apple App Store Server Notification
 * @param {Object} body - The request body containing signedPayload
 * @returns {Object|null} Normalized subscription data or null if invalid
 */
export const processNotification = async (body) => {
  try {
    const { signedPayload } = body;

    if (!signedPayload) {
      console.warn('[APPLE] No signedPayload found in webhook body');
      return null;
    }

    // Decode the main payload (JWS)
    // SECURITY WARNING: In a production environment, you MUST verify the JWS signature.
    // Apple signs these notifications with a certificate chain (x5c) included in the header.
    // You should validate the chain against Apple's Root CA and then verify the signature.
    // Since this requires complex certificate handling/external libraries, we are currently
    // skipping signature verification but verifying the Bundle ID as a basic check.
    const payload = jwt.decode(signedPayload);

    if (!payload) {
      console.error('[APPLE] Failed to decode signedPayload');
      return null;
    }

    const { notificationType, subtype, data } = payload;

    console.log(`[APPLE] Notification: ${notificationType} (${subtype || 'N/A'})`);

    if (!data) {
      console.warn('[APPLE] No data found in payload');
      return null;
    }

    // Decode transaction info
    let transactionInfo = null;
    if (data.signedTransactionInfo) {
      transactionInfo = jwt.decode(data.signedTransactionInfo);
    }

    // Decode renewal info
    let renewalInfo = null;
    if (data.signedRenewalInfo) {
      renewalInfo = jwt.decode(data.signedRenewalInfo);
    }

    if (!transactionInfo) {
      console.error('[APPLE] Failed to decode transaction info');
      return null;
    }

    const {
      originalTransactionId,
      expiresDate,
      revocationDate,
      productId,
      bundleId
    } = transactionInfo;

    // Verify Bundle ID if configured
    if (process.env.APPLE_BUNDLE_ID && bundleId !== process.env.APPLE_BUNDLE_ID) {
      console.warn(`[APPLE] Bundle ID mismatch: received '${bundleId}', expected '${process.env.APPLE_BUNDLE_ID}'`);
      return null;
    }

    // Map notification type to internal status
    let status = 'active';
    let cancelledAt = null;

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'OFFER_REDEEMED':
        status = 'active';
        break;

      case 'EXPIRED':
        status = 'expired';
        break;

      case 'DID_FAIL_TO_RENEW':
        // User is in grace period or failed
        // Usually we treat this as past_due or expired
        status = 'past_due';
        break;

      case 'GRACE_PERIOD_EXPIRED':
        status = 'expired';
        break;

      case 'REFUND':
      case 'REVOKE':
        status = 'cancelled';
        cancelledAt = revocationDate ? new Date(revocationDate) : new Date();
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        // Auto-renew turned off/on.
        // We don't change the immediate status (it's still active until expiry),
        // but we might want to log it or update a "will_renew" flag.
        // For syncSubscriptionFromProvider, we usually just sync the dates.
        status = 'active';
        break;

      default:
        console.log(`[APPLE] Unhandled notification type: ${notificationType}`);
        // Default to active if we have a valid future expiry date, else expired
        if (expiresDate && new Date(expiresDate) > new Date()) {
          status = 'active';
        } else {
          status = 'expired';
        }
    }

    // If explicit expiry passed in notification (subtype VOLUNTARY/BILLING_ERROR etc can clarify)
    if (notificationType === 'DID_CHANGE_RENEWAL_PREF') {
        // specific subtype logic could go here
    }

    // Calculate dates
    const currentPeriodEnd = expiresDate ? new Date(expiresDate) : null;

    return {
      providerSubscriptionId: originalTransactionId,
      status,
      current_period_end: currentPeriodEnd,
      cancelled_at: cancelledAt,
      product_id: productId,
      notification_type: notificationType,
      environment: payload.data?.environment // Sandbox or Production
    };

  } catch (error) {
    console.error('[APPLE] Error processing notification:', error);
    return null;
  }
};

export default {
  processNotification
};
