/**
 * ============================================================================
 * LOGGER UTILITY
 * FitCoach AI Backend
 * ============================================================================
 */

export const logError = (context, error) => {
  console.error(`[ERROR] ${context}:`, error.message || error);
  
  // In production, send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service
  }
};

export const logInfo = (context, message) => {
  console.log(`[INFO] ${context}:`, message);
};

export const logWarning = (context, message) => {
  console.warn(`[WARNING] ${context}:`, message);
};
