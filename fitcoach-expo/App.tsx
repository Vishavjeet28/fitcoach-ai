/**
 * FitCoach AI - Main App Entry Point
 * PRODUCTION HARDENED - Wrapped with ErrorBoundary + Firebase + Unhandled Promise Handler
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
// TEMPORARILY DISABLED: Firebase not installed yet
// import { initializeFirebase } from './src/config/firebase';
import logger from './src/utils/logger';

export default function App() {
  useEffect(() => {
    // TEMPORARILY DISABLED: Firebase not installed yet
    // Initialize Firebase on app startup
    // initializeFirebase()
    //   .then((success) => {
    //     if (success) {
    //       logger.log('Firebase initialized successfully');
    //     } else {
    //       logger.warn('Firebase initialization skipped (development mode)');
    //     }
    //   })
    //   .catch((error) => {
    //     logger.error('Firebase initialization failed', error);
    //   });

    // Handle unhandled promise rejections (CRITICAL for production)
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled Promise Rejection', event.reason, {
        type: 'UnhandledPromiseRejection',
        promise: event.promise.toString(),
      });
      // Prevent default behavior (app crash)
      event.preventDefault();
    };

    // @ts-ignore - PromiseRejectionEvent exists in React Native
    global.addEventListener('unhandledrejection', unhandledRejectionHandler);

    return () => {
      // @ts-ignore
      global.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
