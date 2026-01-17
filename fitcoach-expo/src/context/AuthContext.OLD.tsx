import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import SafeAsyncStorage from '../utils/SafeAsyncStorage';
import { registerSessionExpiredCallback, cancelAllRequests, authAPI, userAPI, UserProfile } from '../services/api';
import { API_BASE_URL } from '../config/api.config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase'; // Strict Firebase JS SDK

const TOKEN_KEY = 'fitcoach_access_token';
const REFRESH_TOKEN_KEY = 'fitcoach_refresh_token';
const USER_KEY = 'fitcoach_user';

// STRICT AUTH STATE MACHINE (NON-NEGOTIABLE)
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'email_verification_pending';

// User is defined in api.ts as well, but we are using UserProfile to be consistent with getProfile
type User = UserProfile;

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
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>; // NEW: For session expiry
  continueAsGuest: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // STRICT AUTH STATE MACHINE
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // PRODUCTION HARDENING: API URL from environment
  // ============================================================================
  const API_URL = API_BASE_URL;

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

  useEffect(() => {
    loadStoredAuth();

    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          console.log('⚠️ [AUTH] User email not verified (detected by listener)');
          setAuthStatus('email_verification_pending');
        }
      }
    });

    return unsubscribe;
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
            
            // CRITICAL FIX: Don't use stale stored user data
            // Fetch fresh profile from backend to get current profile_completed status
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser); // Set temporarily
            setAuthStatus('authenticated');
            
            console.log('✅ [AUTH] Token validated, fetching fresh profile...');
            
            // Refresh user profile from backend to get latest profile_completed
            try {
              const profile = await userAPI.getProfile();
              console.log('🔄 [AUTH] Fresh profile loaded:', {
                id: profile.id,
                email: profile.email,
                profile_completed: profile.profile_completed
              });
              setUser(profile);
              await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
            } catch (profileError) {
              console.warn('⚠️ [AUTH] Could not refresh profile, using stored data');
              // Keep using parsedUser if profile fetch fails
            }
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
      // 1. Attempt Firebase Login (Source of Truth for Identity)
      // Uses the strict 'auth' instance imported from config
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Strict Email Verification Check
      if (!userCredential.user.emailVerified) {
          console.log('⚠️ [AUTH] User email not verified');
          // Do not sign out. Let the UI handle the 'email_verification_pending' state.
          setAuthStatus('email_verification_pending');
          return false;
      }

      // 2. Get ID Token for Backend Verification
      // Force refresh to ensure we have latest claims
      const idToken = await userCredential.user.getIdToken(true);

      // 3. Authenticate with Backend (Strict Backend Verification)
      // This enforces "Reject unverified Firebase users" on the server side
      const data = await authAPI.firebaseLogin(idToken);
      
      const { accessToken, refreshToken, user: userData } = data;

      // Store all auth data securely
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      setAuthStatus('authenticated');
      
      // Track login (using basic console logging as native analytics might be missing)
      console.log(`[Analytics] Login event: ${userData.id}`);
      // setFirebaseUser(String(userData.id), userData.email, userData.name); // Using only JS SDK now, native analytics removed
      
      console.log('✅ [AUTH] Login successful');
      return true;

    } catch (err: any) {
      let message = 'Login failed';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else {
        message = err.message;
      }
      
      setError(message);
      setAuthStatus('unauthenticated');
      console.error('Login error:', err);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);
    
    try {
      console.log('🔥 [AUTH] Creating Firebase user...');
      // 1. Create user in Firebase Auth (STRICT: Source of Truth)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Set Display Name
      if (userCredential.user) {
          await updateProfile(userCredential.user, { displayName: name });
      }

      // 3. Send Verification Email (MANDATORY)
      await sendEmailVerification(userCredential.user);
      console.log('📧 [AUTH] Verification email sent');
      
      // 4. STOP FLOW - Do not auto-login
      // STRICT REQUIREMENT: User must verify email first
      // Do not sign out, so that we can check verification status later
      setAuthStatus('email_verification_pending');
      
      return false; // User is not authenticated yet

    } catch (err: any) {
      console.warn('⚠️ [AUTH] Signup error:', err.message);
      
      // Handle "Email already in use"
      if (err.code === 'auth/email-already-in-use') {
         setError('Email is already registered. Please login.');
         // Optionally we could redirect to login, but let's just show error
      } else {
         setError(err.message || 'Signup failed');
      }
      setAuthStatus('unauthenticated');
      console.error('Signup error:', err);
      return false;
    }
  };

  const register = signup;

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
      // Get Push Token to clear from backend
      const pushToken = await SafeAsyncStorage.getItem('push_token');
      
      // Call Backend Logout with token revocation
      await authAPI.logout(pushToken || undefined);

      // Sign out from Firebase (Strict JS SDK)
      try {
        await signOut(auth);
      } catch (fbError) {
        console.warn('Firebase signout warning (ignoring):', fbError);
      }
    } catch (err) {
      console.warn('Backend logout failed or offline:', err);
    } finally {
      // ALWAYS clear local state
      await clearAllAuthData();
      setAuthStatus('unauthenticated');
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
    
    // Ensure Firebase is also signed out
    try {
        await signOut(auth);
    } catch (e) {
        // Ignore
    }

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
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                subscriptionStatus: 'free',
                aiUsageCount: 0
              };

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

  const refreshUser = async () => {
    if (!token) return;
    try {
        const profile = await userAPI.getProfile();
        console.log('🔄 [AUTH] Refreshed user profile:', {
          id: profile.id,
          email: profile.email,
          profile_completed: profile.profile_completed,
          age: profile.age,
          goal: profile.goal
        });
        setUser(profile);
        await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch (e) {
        console.warn('Failed to refresh user profile', e);
    }
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
        logout,
        forceLogout,
        continueAsGuest,
        clearError,
        refreshUser
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
