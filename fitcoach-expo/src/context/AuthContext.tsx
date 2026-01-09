import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import SafeAsyncStorage from '../utils/SafeAsyncStorage';
import { registerSessionExpiredCallback, cancelAllRequests, authAPI } from '../services/api';
import { API_BASE_URL } from '../config/api.config';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { logEvent, setUser as setFirebaseUser, clearUser as clearFirebaseUser } from '../config/firebase';

// Complete auth session for Google
WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'fitcoach_access_token';
const REFRESH_TOKEN_KEY = 'fitcoach_refresh_token';
const USER_KEY = 'fitcoach_user';

// STRICT AUTH STATE MACHINE (NON-NEGOTIABLE)
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface User {
  id: number;
  email: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
  calorieTarget?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  authStatus: AuthStatus; // EXPLICIT state machine
  isAuthenticated: boolean; // Derived from authStatus
  isLoading: boolean; // Derived from authStatus
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>; // NEW: For session expiry
  continueAsGuest: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // STRICT AUTH STATE MACHINE
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth configuration (hook must be at top level and unconditional)
  const clientIds = {
    ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  };

  // Check if Google OAuth is configured (for validation later)
  const hasGoogleConfig = !!(clientIds.ios || clientIds.android || clientIds.web);
  
  // Hook must be called unconditionally
  // On iOS, we MUST provide iosClientId or the hook will throw an error
  // Provide a dummy value if not configured - loginWithGoogle will check and prevent usage
  const googleConfig = Platform.OS === 'ios'
    ? {
        iosClientId: clientIds.ios || 'dummy-ios-client-id-not-configured',
        ...(clientIds.web && { webClientId: clientIds.web }),
      }
    : Platform.OS === 'android'
    ? {
        androidClientId: clientIds.android || 'dummy-android-client-id-not-configured',
        ...(clientIds.web && { webClientId: clientIds.web }),
      }
    : {
        webClientId: clientIds.web || 'dummy-web-client-id-not-configured',
      };

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleConfig);

// ============================================================================
// PRODUCTION HARDENING: API URL from environment
// ============================================================================
const API_URL = API_BASE_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * PRODUCTION RULE: Token restoration MUST complete before navigation.
   * App MUST start in "loading" state.
   */
  const loadStoredAuth = async () => {
    console.log('🔐 [AUTH] Starting auth restoration...');
    console.log('🔐 [AUTH] AuthStatus: loading');
    
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const storedUser = await SafeAsyncStorage.getItem(USER_KEY);

      if (storedToken && storedRefreshToken && storedUser) {
        console.log('✅ [AUTH] Token and user found in storage, validating with backend...');
        
        // PRODUCTION RULE: NEVER trust stored tokens blindly.
        // Validate with backend to ensure session is still valid.
        try {
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            const { accessToken } = data;
            
            // Update access token in secure storage
            await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
            
            setToken(accessToken);
            setUser(JSON.parse(storedUser));
            setAuthStatus('authenticated');
            console.log('✅ [AUTH] Token validated, user authenticated');
          } else {
            // Token refresh failed - clear everything
            console.warn('⚠️ [AUTH] Token validation failed, clearing stored auth');
            await clearAllAuthData();
            setAuthStatus('unauthenticated');
          }
        } catch (validationError) {
          console.error('❌ [AUTH] Token validation error:', validationError);
          await clearAllAuthData();
          setAuthStatus('unauthenticated');
        }
      } else {
        console.log('ℹ️ [AUTH] No stored credentials found');
        setAuthStatus('unauthenticated');
      }
    } catch (err) {
      console.error('❌ [AUTH] Error loading stored auth:', err);
      await clearAllAuthData();
      setAuthStatus('unauthenticated');
    }
    
    console.log('✅ [AUTH] Auth restoration complete');
  };

  /**
   * PRODUCTION RULE: Clear ALL auth data on logout/expiry.
   * Partial logout is a SECURITY FAILURE.
   */
  const clearAllAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SafeAsyncStorage.removeItem(USER_KEY);
      
      setToken(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing auth data:', err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Login Backend error response:', text);
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(text);
          // Check for validation details first (most specific error)
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage = errorData.details.map((e: any) => e.msg || e.message).join(', ');
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e: any) => e.msg || e.message).join(', ');
          } else {
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { accessToken, refreshToken, user: userData } = data;

      // Store all auth data securely
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setAuthStatus('authenticated');
      
      // Track login in Firebase Analytics (use standard Firebase event names)
      logEvent('login', { method: 'email' });
      // Also log the user_signup event for better tracking
      logEvent('user_login', { method: 'email', user_id: String(userData.id) });
      // Set user in Firebase (this tracks users in Firebase Console)
      setFirebaseUser(String(userData.id), userData.email, userData.name);
      
      console.log('✅ [AUTH] Login successful');
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setAuthStatus('unauthenticated');
      console.error('Login error:', err);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Backend error response:', text);
        let errorMessage = 'Registration failed';
        try {
          const errorData = JSON.parse(text);
          // Check for validation details first (most specific error)
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage = errorData.details.map((e: any) => e.msg || e.message).join(', ');
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e: any) => e.msg || e.message).join(', ');
          } else {
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { accessToken, refreshToken, user: userData } = data;

      // Store all auth data securely
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setAuthStatus('authenticated');
      
      // Track signup in Firebase Analytics (use standard Firebase event names)
      logEvent('sign_up', { method: 'email' });
      // Also log custom event for better tracking
      logEvent('user_signup', { method: 'email', user_id: String(userData.id) });
      // Set user in Firebase (this tracks users in Firebase Console)
      setFirebaseUser(String(userData.id), userData.email, userData.name);
      
      console.log('✅ [AUTH] Signup successful');
      return true;
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setAuthStatus('unauthenticated');
      console.error('Signup error:', err);
      return false;
    }
  };

  const register = signup;

  /**
   * Google OAuth Authentication
   */
  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);

    try {
      // Check if Google OAuth is configured
      if (!hasGoogleConfig) {
        Alert.alert(
          'Google Sign-In Not Configured',
          'Google Sign-In requires OAuth credentials. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.',
          [{ text: 'OK' }]
        );
        setAuthStatus('unauthenticated');
        return false;
      }

      // Prompt for authentication
      const result = await googlePromptAsync();

      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          setError('Google sign-in was cancelled');
        } else {
          setError('Google sign-in failed');
        }
        setAuthStatus('unauthenticated');
        return false;
      }

      // Get ID token from response
      const idToken = result.params?.id_token;
      if (!idToken) {
        setError('Failed to get Google ID token');
        setAuthStatus('unauthenticated');
        return false;
      }

      // Send to backend for verification
      const authResponse = await authAPI.googleAuth(idToken);
      const { accessToken, refreshToken, user: userData } = authResponse;

      // Store all auth data securely
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setAuthStatus('authenticated');
      console.log('✅ [AUTH] Google login successful');
      return true;
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google authentication failed');
      setAuthStatus('unauthenticated');
      return false;
    }
  };

  /**
   * Apple OAuth Authentication
   */
  const loginWithApple = async (): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);

    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        setError('Apple Sign-In is not available on this device');
        setAuthStatus('unauthenticated');
        return false;
      }

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError('Failed to get Apple identity token');
        setAuthStatus('unauthenticated');
        return false;
      }

      // Prepare user data (Apple only provides this on first sign-in)
      const appleUser = credential.fullName
        ? {
            email: credential.email,
            name: {
              firstName: credential.fullName.givenName || '',
              lastName: credential.fullName.familyName || '',
            },
          }
        : undefined;

      // Send to backend for verification
      const authResponse = await authAPI.appleAuth(credential.identityToken, appleUser);
      const { accessToken, refreshToken, user: userData } = authResponse;

      // Store all auth data securely
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setAuthStatus('authenticated');
      console.log('✅ [AUTH] Apple login successful');
      return true;
    } catch (err: any) {
      console.error('Apple auth error:', err);
      
      // Handle user cancellation gracefully
      if (err.code === 'ERR_REQUEST_CANCELED' || err.message?.includes('canceled')) {
        setError('Apple sign-in was cancelled');
      } else {
        setError(err.message || 'Apple authentication failed');
      }
      
      setAuthStatus('unauthenticated');
      return false;
    }
  };

  /**
   * PRODUCTION RULE: Logout MUST be complete and destructive.
   * - Clear all stored tokens
   * - Clear in-memory auth state
   * - Reset navigation (handled by AppNavigator)
   * - Cancel pending requests (handled by axios interceptor)
   */
  const logout = async (): Promise<void> => {
    console.log('🔓 [AUTH] Logging out...');
    
    // ============================================================================
    // PRODUCTION HARDENING: Cancel all pending API requests
    // ============================================================================
    cancelAllRequests();
    
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      // Try to notify backend, but don't block on failure
      if (refreshToken) {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              ...getHeaders(),
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (err) {
          console.warn('Backend logout notification failed (non-blocking):', err);
        }
      }
    } finally {
      // ALWAYS clear local auth data regardless of backend response
      await clearAllAuthData();
      setAuthStatus('unauthenticated');
      
      // Track logout in Firebase Analytics
      logEvent('user_logout');
      clearFirebaseUser();
      
      console.log('✅ [AUTH] Logout complete');
    }
  };

  /**
   * PRODUCTION RULE: Force logout on session expiry.
   * Called by axios interceptor when refresh token fails.
   */
  const forceLogout = async (): Promise<void> => {
    console.log('⚠️ [AUTH] Session expired, forcing logout...');
    
    // Cancel all pending requests
    cancelAllRequests();
    
    await clearAllAuthData();
    setAuthStatus('unauthenticated');
    setError('Your session has expired. Please login again.');
  };

  /**
   * PRODUCTION RULE: Guest mode MUST NOT set real tokens.
   * Guest users CANNOT access protected backend endpoints.
   */
  const continueAsGuest = async (): Promise<void> => {
    // ============================================================================
    // PRODUCTION HARDENING: Warn user about data loss
    // ============================================================================
    Alert.alert(
      'Guest Mode',
      'In guest mode, your data will NOT be saved. Create an account to save your progress.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue as Guest',
          onPress: async () => {
            try {
              const guestUser: User = {
                id: 0,
                email: 'guest@fitcoach.ai',
                name: 'Guest User',
                calorieTarget: 2000,
              };

              // Store guest user but NO tokens
              setUser(guestUser);
              setToken(null); // CRITICAL: No token for guest
              setAuthStatus('unauthenticated'); // Guest is NOT authenticated
              
              // Store guest marker in async storage (not secure store)
              await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(guestUser));
              
              console.log('✅ [AUTH] Guest mode activated (unauthenticated)');
            } catch (err) {
              console.error('Continue as guest error:', err);
              setError('Failed to continue as guest');
              setAuthStatus('unauthenticated');
            }
          },
        },
      ],
    );
  };

  const clearError = () => {
    setError(null);
  };

  // Derived states for backward compatibility
  const isAuthenticated = authStatus === 'authenticated';
  const isLoading = authStatus === 'loading';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authStatus,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        signup,
        loginWithGoogle,
        loginWithApple,
        logout,
        forceLogout,
        continueAsGuest,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * PRODUCTION RULE: Dedicated hook for auth readiness checks.
 * Screens MUST NOT render protected content while authStatus === 'loading'.
 */
export const useAuthReady = () => {
  const { authStatus, isAuthenticated, token } = useAuth();
  const isAuthReady = authStatus !== 'loading';
  
  return { 
    isAuthReady, 
    isAuthenticated, 
    token,
    authStatus, // Expose full state machine
  };
};
