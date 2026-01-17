import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

// Extracted from GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyDwKRd13luGPyTvfByRCYs1CFk2FXpAyV8",
  authDomain: "fitcoach-ai-87ed4.firebaseapp.com",
  projectId: "fitcoach-ai-87ed4",
  storageBucket: "fitcoach-ai-87ed4.firebasestorage.app",
  messagingSenderId: "504054843092",
  appId: "1:504054843092:ios:d223f30a35c959030bdd41"
};

let app: FirebaseApp;
let auth: Auth;

// Helper to sanitize keys for SecureStore (which doesn't allow ':')
const sanitizeKey = (key: string) => {
    return key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
};

// Adapter for Expo SecureStore to work with Firebase Persistence
const ExpoPersistence = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(sanitizeKey(key));
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(sanitizeKey(key), value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(sanitizeKey(key));
  }
};

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize Auth with Expo SecureStore persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ExpoPersistence)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// Analytics Mocks (for Expo Go)
export const logScreenView = async (screenName: string) => {
  console.log(`[Analytics] Screen: ${screenName}`);
};

export const logEvent = async (name: string, params?: any) => {
  console.log(`[Analytics] Event: ${name}`, params);
};

export const logError = (error: any) => {
  console.error('[Analytics] Error:', error);
};

export const initializeFirebase = async () => {
  return true; // Config is auto-initialized
};

export { app, auth };
