/**
 * Production Logger
 * PRODUCTION HARDENED - Centralized logging with Firebase Crashlytics integration
 * 
 * Usage:
 * import logger from './utils/logger';
 * logger.log('Info message');
 * logger.warn('Warning message', { context: 'value' });
 * logger.error('Error occurred', error, { userId: '123' });
 */

// TEMPORARILY DISABLED: Firebase not installed yet
// import { logError as firebaseLogError, logMessage as firebaseLogMessage } from '../config/firebase';

const isDev = __DEV__;

interface LogContext {
  [key: string]: any;
}

const logger = {
  /**
   * Log info message
   * Development: Console only
   * Production: Console + Firebase
   */
  log: (message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    
    if (context) {
      console.log(formattedMessage, context);
    } else {
      console.log(formattedMessage);
    }

    // TEMPORARILY DISABLED: Firebase not installed yet
    // Send to Firebase in production
    // if (!isDev) {
    //   firebaseLogMessage(message, 'info');
    // }
  },

  /**
   * Log error with optional Error object
   * Development: Console error
   * Production: Console + Firebase Crashlytics
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ❌ ${message}`;

    // Log to console
    if (error) {
      console.error(formattedMessage, error, context || {});
    } else {
      console.error(formattedMessage, context || {});
    }

    // TEMPORARILY DISABLED: Firebase not installed yet
    // Send to Firebase in production
    // if (!isDev) {
    //   if (error instanceof Error) {
    //     firebaseLogError(error, { ...context, message });
    //   } else {
    //     const syntheticError = new Error(message);
    //     firebaseLogError(syntheticError, context);
    //   }
    // }
  },

  /**
   * Log warning message
   * Development: Console warning
   * Production: Console + Firebase
   */
  warn: (message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ⚠️ ${message}`;

    if (context) {
      console.warn(formattedMessage, context);
    } else {
      console.warn(formattedMessage);
    }

    // TEMPORARILY DISABLED: Firebase not installed yet
    // if (!isDev) {
    //   firebaseLogMessage(message, 'warning');
    // }
  },

  /**
   * Log info message (alias for log)
   */
  info: (message: string, context?: LogContext) => {
    logger.log(message, context);
  },

  /**
   * Log debug message (development only)
   */
  debug: (message: string, context?: LogContext) => {
    if (!isDev) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] 🐛 ${message}`;

    if (context) {
      console.debug(formattedMessage, context);
    } else {
      console.debug(formattedMessage);
    }
  },

  /**
   * Log API request (development only)
   */
  api: (method: string, url: string, data?: any) => {
    if (!isDev) return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🌐 ${method} ${url}`, data || '');
  },

  /**
   * Log API response (development only)
   */
  apiResponse: (method: string, url: string, status: number, data?: any) => {
    if (!isDev) return;
    const timestamp = new Date().toISOString();
    const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`[${timestamp}] ${statusEmoji} ${method} ${url} [${status}]`, data || '');
  },
};

export default logger;
