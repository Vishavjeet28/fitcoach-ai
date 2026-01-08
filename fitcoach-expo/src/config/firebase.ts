/**
 * Firebase Configuration
 * Initializes Firebase services (Crashlytics, Analytics)
 */

import { Platform } from 'react-native';

let crashlytics: any = null;
let analytics: any = null;

// Initialize Firebase services
export const initializeFirebase = async () => {
  try {
    // Only import Firebase in production or when explicitly enabled
    if (__DEV__ && !process.env.EXPO_PUBLIC_ENABLE_FIREBASE_DEV) {
      console.log('[Firebase] Skipping initialization in development mode');
      return false;
    }

    // Dynamic imports to avoid loading in dev if not needed
    const firebaseApp = await import('@react-native-firebase/app');
    const firebaseCrashlytics = await import('@react-native-firebase/crashlytics');
    const firebaseAnalytics = await import('@react-native-firebase/analytics');

    crashlytics = firebaseCrashlytics.default();
    analytics = firebaseAnalytics.default();

    // Verify Firebase is properly configured
    if (!firebaseApp.default().apps.length) {
      throw new Error('Firebase app not initialized. Check GoogleService files.');
    }

    // Enable Crashlytics collection
    await crashlytics.setCrashlyticsCollectionEnabled(true);

    console.log('[Firebase] Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
    // Don't crash the app if Firebase fails
    return false;
  }
};

// Crashlytics helpers
export const logError = (error: Error, context?: Record<string, any>) => {
  if (!crashlytics) return;

  try {
    // Add context attributes
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        crashlytics.setAttribute(key, String(value));
      });
    }

    // Record the error
    crashlytics.recordError(error);
  } catch (e) {
    console.error('[Firebase] Failed to log error:', e);
  }
};

export const logMessage = (message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info') => {
  if (!crashlytics) return;

  try {
    crashlytics.log(`[${level.toUpperCase()}] ${message}`);
  } catch (e) {
    console.error('[Firebase] Failed to log message:', e);
  }
};

export const setUser = (userId: string, email?: string, username?: string) => {
  if (!crashlytics) return;

  try {
    crashlytics.setUserId(userId);
    if (email) crashlytics.setAttribute('email', email);
    if (username) crashlytics.setAttribute('username', username);
  } catch (e) {
    console.error('[Firebase] Failed to set user:', e);
  }
};

export const clearUser = () => {
  if (!crashlytics) return;

  try {
    crashlytics.setUserId('');
    crashlytics.setAttribute('email', '');
    crashlytics.setAttribute('username', '');
  } catch (e) {
    console.error('[Firebase] Failed to clear user:', e);
  }
};

// Analytics helpers
export const logEvent = (eventName: string, params?: Record<string, any>) => {
  if (!analytics) return;

  try {
    analytics.logEvent(eventName, params);
  } catch (e) {
    console.error('[Firebase] Failed to log event:', e);
  }
};

export const logScreenView = (screenName: string, screenClass?: string) => {
  if (!analytics) return;

  try {
    analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (e) {
    console.error('[Firebase] Failed to log screen view:', e);
  }
};

// Check if Firebase is available
export const isFirebaseAvailable = () => {
  return crashlytics !== null && analytics !== null;
};

export default {
  initializeFirebase,
  logError,
  logMessage,
  setUser,
  clearUser,
  logEvent,
  logScreenView,
  isFirebaseAvailable,
};
