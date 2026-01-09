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
    // Always try to initialize Firebase if GoogleService files are present
    // Firebase will work in both development and production
    console.log('[Firebase] Attempting to initialize Firebase...');

    // Dynamic imports to avoid loading in dev if not needed
    const firebaseAppModule = await import('@react-native-firebase/app');
    const firebaseCrashlyticsModule = await import('@react-native-firebase/crashlytics');
    const firebaseAnalyticsModule = await import('@react-native-firebase/analytics');

    const firebaseApp = firebaseAppModule.default || firebaseAppModule;
    const firebaseCrashlytics = firebaseCrashlyticsModule.default || firebaseCrashlyticsModule;
    const firebaseAnalytics = firebaseAnalyticsModule.default || firebaseAnalyticsModule;

    // @ts-ignore
    crashlytics = firebaseCrashlytics();
    
    // Analytics may not be available if native code hasn't been rebuilt
    // Try to initialize it but don't fail if it's not available
    try {
      // @ts-ignore
      const analyticsInstance = firebaseAnalytics();
      if (analyticsInstance && typeof analyticsInstance.logEvent === 'function') {
        analytics = analyticsInstance;
        console.log('[Firebase] Analytics module loaded successfully');
      } else {
        throw new Error('Analytics instance is not properly initialized');
      }
    } catch (analyticsError: any) {
      console.warn('[Firebase] Analytics not available in native code');
      console.warn('[Firebase] This is normal in development. For full Analytics, rebuild native code:');
      console.warn('[Firebase] Run: npx expo prebuild --clean && npx expo run:ios');
      analytics = null;
    }

    // Verify Firebase is properly configured
    // @ts-ignore
    const apps = firebaseApp.apps || firebaseApp().apps; 
    if (!apps || !apps.length) {
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
  try {
    // Set user in Crashlytics
    if (crashlytics) {
      crashlytics.setUserId(userId);
      if (email) crashlytics.setAttribute('email', email);
      if (username) crashlytics.setAttribute('username', username);
    }
    
    // Set user in Analytics (for user tracking in Firebase Console)
    if (analytics) {
      analytics.setUserId(userId);
      if (email) {
        analytics.setUserProperty('email', email);
        analytics.setUserProperty('user_email', email);
      }
      if (username) {
        analytics.setUserProperty('username', username);
        analytics.setUserProperty('user_name', username);
      }
    } else if (__DEV__) {
      console.log(`[Firebase Analytics] Would set user: ${userId}, email: ${email}, name: ${username}`);
    }
  } catch (e) {
    console.error('[Firebase] Failed to set user:', e);
  }
};

export const clearUser = () => {
  try {
    // Clear user in Crashlytics
    if (crashlytics) {
      crashlytics.setUserId('');
      crashlytics.setAttribute('email', '');
      crashlytics.setAttribute('username', '');
    }
    
    // Clear user in Analytics
    if (analytics) {
      analytics.setUserId(null);
    }
  } catch (e) {
    console.error('[Firebase] Failed to clear user:', e);
  }
};

// Analytics helpers
export const logEvent = (eventName: string, params?: Record<string, any>) => {
  if (!analytics) {
    // Log what would be sent (for debugging)
    if (__DEV__) {
      console.log(`[Firebase Analytics] Would log event: ${eventName}`, params || {});
    }
    return;
  }

  try {
    // Use Firebase Analytics logEvent
    analytics.logEvent(eventName, params || {});
    if (__DEV__) {
      console.log(`[Firebase Analytics] Event logged: ${eventName}`, params || {});
    }
  } catch (e: any) {
    // Check if it's the "not installed natively" error
    if (e?.message?.includes('not installed natively') || e?.message?.includes('firebase.analytics')) {
      if (__DEV__) {
        console.warn('[Firebase] Analytics requires native rebuild. Event would be:', eventName, params);
      }
      analytics = null; // Mark as unavailable to prevent repeated errors
    } else {
      console.error('[Firebase] Failed to log event:', e);
    }
  }
};

export const logScreenView = (screenName: string, screenClass?: string) => {
  if (!analytics) {
    // Silently fail if analytics is not available
    if (__DEV__) {
      console.log(`[Firebase Analytics] Would log screen view: ${screenName}`);
    }
    return;
  }

  try {
    analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (e: any) {
    // Check if it's the "not installed natively" error
    if (e?.message?.includes('not installed natively')) {
      console.warn('[Firebase] Analytics not available - native rebuild required. Run: npx expo prebuild --clean');
      analytics = null; // Mark as unavailable to prevent repeated errors
    } else {
      console.error('[Firebase] Failed to log screen view:', e);
    }
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
