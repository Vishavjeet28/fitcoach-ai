import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

// Firebase Web App Configuration (required for Expo/React Native JS SDK)
const firebaseConfig = {
  apiKey: "AIzaSyB6926fq13CKyg66p6r3gKse2cmna4qYJY",
  authDomain: "fitcoach-ai-87ed4.firebaseapp.com",
  projectId: "fitcoach-ai-87ed4",
  storageBucket: "fitcoach-ai-87ed4.firebasestorage.app",
  messagingSenderId: "504054843092",
  appId: "1:504054843092:web:05e40795c0bc5c590bdd41",
  measurementId: "G-2P3E96MV3R"
};

let app: FirebaseApp;
let auth: Auth;

// Helper to sanitize keys for SecureStore (which doesn't allow ':')
const sanitizeKey = (key: string) => {
  return key.replace(/[^a-zA-Z0-9.\-_]/g, '_');
};

// Initialize Firebase
app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with auto-persistence
// Note: In modern Firebase for Expo, getAuth() often handles persistence automatically
// if @react-native-async-storage/async-storage is installed.
auth = getAuth(app);

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
