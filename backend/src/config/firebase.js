import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseInitialized = false;

// Initialize Firebase Admin
// Expects GOOGLE_APPLICATION_CREDENTIALS env var to point to json file
// OR FIREBASE_SERVICE_ACCOUNT env var with JSON content
// OR default environment (GCP)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized with env var');
      firebaseInitialized = true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      console.log('✅ Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS');
      firebaseInitialized = true;
    } else {
      // No credentials - development mode
      console.warn('⚠️ Firebase Admin: No credentials found. Using development bypass mode.');
      console.warn('⚠️ To fix: Set FIREBASE_SERVICE_ACCOUNT env var with your service account JSON');
      firebaseInitialized = false;
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    firebaseInitialized = false;
  }
}

export const verifyFirebaseToken = async (token) => {
  // MOCK TOKEN BACKDOOR (for testing)
  if (token && token.startsWith('mock-firebase-token')) {
    console.warn('⚠️ [BACKEND] Using Mock Firebase Token');
    const parts = token.split(':');
    const email = parts.length > 1 ? parts[1] : 'mockuser@example.com';

    return {
      uid: 'mock-uid-' + email,
      email: email,
      email_verified: true,
      name: 'Mock User'
    };
  }

  // PRODUCTION MODE: Use Firebase Admin to verify
  if (firebaseInitialized) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ [FIREBASE] Token verified for:', decodedToken.email);
      return decodedToken;
    } catch (error) {
      console.error('❌ [FIREBASE] Token verification failed:', error.message);
      throw error;
    }
  }

  // DEVELOPMENT MODE: Decode without verification (INSECURE - ONLY FOR DEV)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ [DEV MODE] Firebase Admin not initialized - bypassing token verification');
    console.warn('⚠️ [DEV MODE] To fix: Set FIREBASE_SERVICE_ACCOUNT env var');

    try {
      // Handle Firebase ID tokens (real JWTs from Firebase Auth)
      if (token && token.split('.').length === 3) {
        const parts = token.split('.');

        // Decode the payload (middle part) - handle both URL-safe and standard base64
        let payload;
        try {
          // Add padding if needed for base64 decoding
          let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64Payload.length % 4) {
            base64Payload += '=';
          }
          payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
        } catch (decodeError) {
          console.error('❌ [DEV MODE] Failed to decode JWT payload:', decodeError.message);
          throw new Error('Invalid JWT format');
        }

        console.log('⚠️ [DEV MODE] Decoded token payload:', {
          email: payload.email,
          email_verified: payload.email_verified,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'
        });

        // Check if token is expired
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('⚠️ [DEV MODE] Token is expired but proceeding anyway in dev mode');
        }

        return {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email,
          email_verified: payload.email_verified !== false, // Default to true if not specified
          name: payload.name || payload.displayName || 'User'
        };
      }

      // Token doesn't look like a JWT
      console.error('❌ [DEV MODE] Token is not a valid JWT format');
      throw new Error('Token is not a valid JWT');

    } catch (error) {
      console.error('❌ [DEV MODE] Token decode error:', error.message);
      throw new Error(`Cannot verify token in development mode: ${error.message}`);
    }
  }

  // PRODUCTION without Firebase credentials - CRITICAL ERROR
  console.error('❌ [CRITICAL] Firebase Admin not initialized and not in development mode!');
  throw new Error('Firebase authentication is not properly configured');
};

export default admin;
