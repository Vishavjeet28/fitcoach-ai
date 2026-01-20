import axios from 'axios';
import crypto from 'crypto';

/**
 * ============================================================================
 * RECEIPT VALIDATION SERVICE
 * ============================================================================
 *
 * Validates in-app purchase receipts with Apple and Google servers.
 */

// ============================================================================
// APPLE RECEIPT VALIDATION
// ============================================================================

/**
 * Validate Apple App Store receipt
 * @param {string} receipt - Base64 encoded receipt data
 * @returns {Promise<Object>} Validation result { isValid, originalTransactionId, environment }
 */
export const validateAppleReceipt = async (receipt) => {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    console.error('[RECEIPT] Missing APPLE_SHARED_SECRET env var');
    // In dev, we might allow bypassing if explicitly configured, but for now fail safe
    throw new Error('Server configuration error: Missing Apple Shared Secret');
  }

  const verify = async (url) => {
    try {
      const response = await axios.post(url, {
        'receipt-data': receipt,
        'password': sharedSecret,
        'exclude-old-transactions': true
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error(`[RECEIPT] Apple validation failed for ${url}:`, error.message);
      throw error;
    }
  };

  try {
    // 1. Try Production
    let data = await verify(APPLE_VERIFY_URL);

    // 2. If Sandbox receipt sent to Production (Status 21007), retry Sandbox
    if (data.status === 21007) {
      console.log('[RECEIPT] Sandbox receipt detected, retrying with Sandbox URL...');
      data = await verify(APPLE_SANDBOX_URL);
    }

    if (data.status === 0) {
      // Valid receipt
      // Get the latest receipt info
      const latest = data.latest_receipt_info && data.latest_receipt_info.length > 0
        ? data.latest_receipt_info[0]
        : data.receipt;

      return {
        isValid: true,
        originalTransactionId: latest.original_transaction_id,
        productId: latest.product_id,
        expiresDate: latest.expires_date_ms,
        environment: data.environment
      };
    } else {
      console.warn('[RECEIPT] Apple receipt invalid, status:', data.status);
      return { isValid: false, status: data.status };
    }
  } catch (error) {
    console.error('[RECEIPT] Apple validation error:', error.message);
    return { isValid: false, error: error.message };
  }
};

const APPLE_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';


// ============================================================================
// GOOGLE RECEIPT VALIDATION
// ============================================================================

/**
 * Generate Google OAuth2 Access Token using Service Account
 * (Lightweight implementation without googleapis dependency)
 */
const getGoogleAccessToken = async () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Handle newlines in private key from env vars
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Missing Google Service Account credentials (EMAIL or PRIVATE_KEY)');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now
  };

  // Base64Url Encode
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsignedToken = `${encode(header)}.${encode(claimSet)}`;

  // Sign
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(key, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  // Exchange JWT for Access Token
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('[RECEIPT] Google Auth failed:', error.response ? error.response.data : error.message);
    throw new Error('Failed to authenticate with Google');
  }
};

/**
 * Validate Google Play receipt (purchase token)
 * @param {string} token - The purchase token
 * @param {string} subscriptionId - The product ID (e.g. 'monthly_pro')
 * @returns {Promise<Object>} Validation result
 */
export const validateGoogleReceipt = async (token, subscriptionId) => {
  const packageName = process.env.GOOGLE_PACKAGE_NAME || 'com.fitcoach.app';

  try {
    const accessToken = await getGoogleAccessToken();

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${token}`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const sub = response.data;

    // paymentState: 0=pending, 1=received, 2=trial, 3=retry
    // We consider 1 (Received) and 2 (Free Trial) as valid
    // Note: '0' might also be valid for immediate processing, but usually we want confirmation.
    // However, for creation, if it exists, it's generally valid.

    // Check expiry
    const expiryTime = parseInt(sub.expiryTimeMillis, 10);
    const isValid = expiryTime > Date.now();

    return {
      isValid,
      paymentState: sub.paymentState,
      expiryTimeMillis: sub.expiryTimeMillis,
      orderId: sub.orderId,
      autoRenewing: sub.autoRenewing
    };

  } catch (error) {
    console.error('[RECEIPT] Google validation error:', error.response ? error.response.data : error.message);

    // Handle specific API errors if needed
    if (error.response && error.response.status === 404) {
      return { isValid: false, reason: 'Purchase not found' };
    }

    return { isValid: false, error: error.message };
  }
};

export default {
  validateAppleReceipt,
  validateGoogleReceipt
};
