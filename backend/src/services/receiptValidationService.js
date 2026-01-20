/**
 * ============================================================================
 * RECEIPT VALIDATION SERVICE
 * ============================================================================
 *
 * Handles validation of IAP receipts with Apple App Store and Google Play Store.
 *
 * Location: /backend/src/services/receiptValidationService.js
 * ============================================================================
 */

// import axios from 'axios'; // Uncomment when implementing real validation
// import { google } from 'googleapis'; // Uncomment when implementing real validation

const PLAN_MAPPING = {
  'com.fitcoach.weekly': 'weekly',
  'com.fitcoach.monthly': 'monthly',
  'com.fitcoach.yearly': 'yearly',
  // Test IDs
  'weekly': 'weekly',
  'monthly': 'monthly',
  'yearly': 'yearly'
};

/**
 * Validate receipt with provider
 * @param {string} provider - 'apple' or 'google'
 * @param {string|Object} receipt - Receipt data
 * @returns {Promise<Object>} Validation result
 */
export const validateReceipt = async (provider, receipt) => {
  console.log(`[RECEIPT] Validating ${provider} receipt...`);

  try {
    if (provider === 'apple') {
      return await validateAppleReceipt(receipt);
    } else if (provider === 'google') {
      return await validateGoogleReceipt(receipt);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error('Receipt validation error:', error);
    throw new Error('Receipt validation failed: ' + error.message);
  }
};

/**
 * Validate Apple App Store receipt
 * @param {string} receiptData - Base64 encoded receipt
 */
const validateAppleReceipt = async (receiptData) => {
  // TODO: Implement real Apple Receipt Validation
  // POST to https://buy.itunes.apple.com/verifyReceipt (production)
  // or https://sandbox.itunes.apple.com/verifyReceipt (sandbox)

  // MOCK IMPLEMENTATION
  if (!receiptData || receiptData.includes('invalid')) {
    throw new Error('Invalid Apple receipt');
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Determine plan from mock receipt content or default
  // In real implementation, this comes from the latest_receipt_info
  let planId = 'monthly';
  if (receiptData.includes('weekly')) planId = 'weekly';
  if (receiptData.includes('yearly')) planId = 'yearly';

  // Generate a consistent ID based on receipt length or content
  const providerSubscriptionId = `original_transaction_${receiptData.length}`;

  const now = new Date();
  const expiresDate = new Date(now);
  expiresDate.setDate(now.getDate() + 30); // Mock 30 days expiry

  return {
    isValid: true,
    providerSubscriptionId,
    planId: PLAN_MAPPING[planId] || planId,
    productId: `com.fitcoach.${planId}`,
    purchaseDate: now,
    expiresDate: expiresDate,
    originalTransactionId: providerSubscriptionId
  };
};

/**
 * Validate Google Play receipt
 * @param {Object|string} receiptData - Receipt object or JSON string
 */
const validateGoogleReceipt = async (receiptData) => {
  // TODO: Implement real Google Play Validation
  // Use googleapis androidpublisher

  let receipt = receiptData;
  if (typeof receiptData === 'string') {
    try {
      receipt = JSON.parse(receiptData);
    } catch (e) {
      // Treat as raw token if not JSON
      receipt = { purchaseToken: receiptData };
    }
  }

  if (!receipt || (receipt.purchaseToken && receipt.purchaseToken.includes('invalid'))) {
    throw new Error('Invalid Google receipt');
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const productId = receipt.productId || 'com.fitcoach.monthly';
  const planId = productId.replace('com.fitcoach.', '');

  const providerSubscriptionId = receipt.orderId || `GPA.mock.${Date.now()}`;

  const now = new Date();
  const expiresDate = new Date(now);
  expiresDate.setDate(now.getDate() + 30);

  return {
    isValid: true,
    providerSubscriptionId,
    planId: PLAN_MAPPING[productId] || PLAN_MAPPING[planId] || 'monthly',
    productId: productId,
    purchaseDate: now,
    expiresDate: expiresDate,
    originalTransactionId: providerSubscriptionId
  };
};

export default {
  validateReceipt
};
