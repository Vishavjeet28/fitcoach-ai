/**
 * ============================================================================
 * LOGGER UTILITY
 * FitCoach AI Backend
 * ============================================================================
 */

import * as Sentry from '@sentry/node';

export const logError = (context, error) => {
  console.error(`[ERROR] ${context}:`, error.message || error);
  
  // In production, send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production' || process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        context,
      },
    });
  }
};

export const logInfo = (context, message) => {
  console.log(`[INFO] ${context}:`, message);
};

export const logWarning = (context, message) => {
  console.warn(`[WARNING] ${context}:`, message);
};
