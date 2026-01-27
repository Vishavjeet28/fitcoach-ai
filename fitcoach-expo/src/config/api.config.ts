/**
 * API Configuration
 * PRODUCTION HARDENED - Environment-based configuration with validation
 */

import Constants from 'expo-constants';

// ============================================================================
// PRODUCTION HARDENING: Environment Variable Support
// ============================================================================
// For development: Use EXPO_PUBLIC_API_URL in .env or app.json
// For production: Set EXPO_PUBLIC_API_URL before build
//
// Example .env file:
// EXPO_PUBLIC_API_URL=http://localhost:5001/api
//
// Or in app.json:
// "extra": {
//   "EXPO_PUBLIC_API_URL": "https://your-api.com/api"
// }



const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (production builds)
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl;
  }

  // Priority 2: Development fallback
  if (__DEV__) {
    // For development, use the network IP which works for both
    // simulators and physical devices on the same WiFi
    // 
    // iOS Simulator CAN use localhost, but network IP works too
    // Android emulator uses 10.0.2.2, but network IP also works if on same network
    // Physical devices MUST use network IP
    //
    // Using network IP universally for simplicity:
    return 'http://192.168.31.240:5001/api';
  }

  // Priority 3: Production must have env variable set
  throw new Error(
    '❌ PRODUCTION ERROR: API_BASE_URL not configured!\n\n' +
    'Please set EXPO_PUBLIC_API_URL environment variable before building.\n' +
    'Example: EXPO_PUBLIC_API_URL=https://api.fitcoach.app/api\n\n' +
    'For more info, see: src/config/api.config.ts'
  );
};

// ============================================================================
// PRODUCTION HARDENING: URL Validation
// ============================================================================
function validateApiUrl(url: string): void {
  try {
    const parsed = new URL(url);

    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}. Must be http: or https:`);
    }

    // Must have a hostname
    if (!parsed.hostname) {
      throw new Error('Missing hostname');
    }

    // Warn about common mistakes
    if (url.includes('your-production-api.com')) {
      throw new Error('Placeholder URL detected. Please set a real API URL.');
    }

    // Warn about ngrok in production (CRITICAL)
    if (url.includes('ngrok') && !__DEV__) {
      throw new Error(
        '❌ PRODUCTION ERROR: ngrok URL detected in production build!\n\n' +
        'ngrok tunnels are for development only and will cause failures in production.\n' +
        'Please set EXPO_PUBLIC_API_URL to your production API domain.\n' +
        'Example: https://api.fitcoach.com/api'
      );
    }

  } catch (error: any) {
    throw new Error(
      `❌ Invalid API_BASE_URL: "${url}"\n` +
      `Error: ${error.message}\n\n` +
      `Please check your EXPO_PUBLIC_API_URL configuration.`
    );
  }
}

// Get and validate API URL
export const API_BASE_URL = (() => {
  const url = getApiBaseUrl();
  validateApiUrl(url);

  if (__DEV__) {
    console.log('🌐 [CONFIG] API Base URL:', url);
  }

  return url;
})();

export const API_TIMEOUT = 60000; // 60 seconds (increased for slower networks)

// Token storage keys (alphanumeric, dots, dashes, underscores only)
export const TOKEN_STORAGE = {
  ACCESS_TOKEN: 'fitcoach_access_token',
  REFRESH_TOKEN: 'fitcoach_refresh_token',
};

// Export validation utility for use in App.tsx startup checks
export function validateConfiguration(): { valid: boolean; error?: string } {
  try {
    validateApiUrl(API_BASE_URL);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
