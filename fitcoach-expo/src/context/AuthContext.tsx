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
import { auth } from '../config/firebase';

const TOKEN_KEY = 'fitcoach_access_token';
const REFRESH_TOKEN_KEY = 'fitcoach_refresh_token';
const USER_KEY = 'fitcoach_user';

/**
 * STRICT 5-STATE MACHINE (PRODUCTION RULE)
 * 
 * - loading: App starting, checking auth status
 * - unauthenticated: No token, user needs to login
 * - email_verification_pending: Token exists, email not verified
 * - profile_setup_required: Email verified, profile_completed = false
 * - authenticated: Email verified, profile_completed = true
 */
export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'email_verification_pending'
  | 'profile_setup_required'
  | 'authenticated';

type User = UserProfile;

interface AuthContextType {
  user: User | null;
  token: string | null;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forceLogout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = API_BASE_URL;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    loadStoredAuth();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !firebaseUser.emailVerified) {
        console.log('⚠️ [AUTH] Firebase detected unverified email');
        setAuthStatus('email_verification_pending');
      }
    });

    return unsubscribe;
  }, []);

  /**
   * CRITICAL: Call /api/auth/me to get authoritative auth + onboarding state
   * Backend DB is SINGLE SOURCE OF TRUTH
   */
  const fetchAuthMeFromBackend = async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          ...getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️ [AUTH] Token expired, clearing auth');
          await clearAllAuthData();
          return null;
        }
        throw new Error(`/auth/me failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.user;
    } catch (err) {
      console.error('❌ [AUTH] Failed to fetch /auth/me:', err);
      throw err;
    }
  };

  /**
   * PRODUCTION RULE: On app start, restore session and check auth state
   */
  const loadStoredAuth = async () => {
    console.log('🔐 [AUTH] Starting auth restoration (state: loading)...');

    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (storedToken && storedRefreshToken) {
        console.log('✅ [AUTH] Token found in storage, validating...');

        // Set token immediately to use in fetch
        setToken(storedToken);

        try {
          // Validate token
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });

          if (!refreshResponse.ok) {
            console.warn('⚠️ [AUTH] Token refresh failed');
            await clearAllAuthData();
            setAuthStatus('unauthenticated');
            return;
          }

          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.accessToken;

          await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
          setToken(newAccessToken);

          // NOW fetch authoritative user state from /auth/me
          console.log('🔄 [AUTH] Fetching authoritative user state from /auth/me...');
          const userData = await fetchAuthMeFromBackend();

          if (!userData) {
            console.warn('⚠️ [AUTH] Could not fetch user from /auth/me');
            setAuthStatus('unauthenticated');
            return;
          }

          // CRITICAL: Decide auth status based on DB values ONLY
          decideFinalAuthStatus(userData);
          setUser(userData);
          await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        } catch (validationError) {
          console.error('❌ [AUTH] Token validation error:', validationError);
          await clearAllAuthData();
          setAuthStatus('unauthenticated');
        }
      } else {
        console.log('ℹ️ [AUTH] No stored credentials');
        setAuthStatus('unauthenticated');
      }
    } catch (err) {
      console.error('❌ [AUTH] Error loading stored auth:', err);
      await clearAllAuthData();
      setAuthStatus('unauthenticated');
    }
  };

  /**
   * PRODUCTION RULE: Decide final auth status based on BACKEND values ONLY
   * Only cares about profile_completed flag
   * Email verification only happens during signup, not login
   */
  const decideFinalAuthStatus = (userData: User) => {
    console.log('📊 [AUTH] Deciding auth status based on backend values:', {
      profile_completed: userData.profile_completed,
    });

    if (userData.profile_completed === false) {
      setAuthStatus('profile_setup_required');
      console.log('➡️ [AUTH] Status → profile_setup_required');
    } else {
      setAuthStatus('authenticated');
      console.log('➡️ [AUTH] Status → authenticated');
    }
  };

  const clearAllAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SafeAsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    } catch (err) {
      console.warn('⚠️ [AUTH] Error clearing auth data:', err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);

    try {
      let idToken: string;

      // DEV MODE BYPASS: Skip Firebase authentication in development
      if (__DEV__ && (email.includes('@test.') || email.includes('@dev.') || email === 'test@test.com')) {
        console.log('⚠️ [AUTH DEV] Using mock token bypass for:', email);
        idToken = `mock-firebase-token:${email}`;
      } else {
        // PRODUCTION: Firebase login (identity verification)
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        idToken = await userCredential.user.getIdToken(true);
      }

      const data = await authAPI.firebaseLogin(idToken);

      const { accessToken, refreshToken, user: userData } = data;

      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);

      // CRITICAL: Use backend values to decide status (profile_completed)
      decideFinalAuthStatus(userData);

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
      console.error('❌ [AUTH] Login error:', err);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    setAuthStatus('loading');
    setError(null);

    try {
      // DEV MODE BYPASS: Skip Firebase for test emails
      if (__DEV__ && (email.includes('@test.') || email.includes('@dev.') || email === 'test@test.com')) {
        console.log('⚠️ [AUTH DEV] Using mock signup bypass for:', email);
        const idToken = `mock-firebase-token:${email}`;
        const data = await authAPI.firebaseLogin(idToken);
        const { accessToken, refreshToken, user: userData } = data;

        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);
        decideFinalAuthStatus(userData);
        return true;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }

      // Send verification email
      await sendEmailVerification(userCredential.user);

      console.log('✅ [AUTH] Signup successful, verification email sent');
      setAuthStatus('email_verification_pending');
      return true;

    } catch (err: any) {
      let message = 'Signup failed';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Email already registered';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters';
      } else {
        message = err.message;
      }

      setError(message);
      setAuthStatus('unauthenticated');
      return false;
    }
  };

  const register = signup;

  const logout = async (): Promise<void> => {
    console.log('🔓 [AUTH] Logging out...');

    cancelAllRequests();

    try {
      const pushToken = await SafeAsyncStorage.getItem('push_token');

      await authAPI.logout(pushToken || undefined);

      try {
        await signOut(auth);
      } catch (fbError) {
        console.warn('Firebase signout warning (ignoring):', fbError);
      }
    } catch (err) {
      console.warn('Backend logout failed or offline:', err);
    } finally {
      await clearAllAuthData();
      setAuthStatus('unauthenticated');
    }
  };

  const forceLogout = async (): Promise<void> => {
    console.log('⚠️ [AUTH] Session expired, forcing logout...');

    cancelAllRequests();

    try {
      await signOut(auth);
    } catch (e) {
      // Ignore
    }

    await clearAllAuthData();
    setAuthStatus('unauthenticated');
    setError('Your session has expired. Please login again.');
  };

  const continueAsGuest = async (): Promise<void> => {
    const guestUser: User = {
      id: 0,
      email: 'guest@fitcoach.ai',
      name: 'Guest User',
      profile_completed: true,
      age: undefined,
      gender: undefined,
      height: undefined,
      weight: undefined,
      goal: undefined,
      activityLevel: undefined,
      calorieTarget: 2000,
    };

    setUser(guestUser);
    setAuthStatus('authenticated');
    await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(guestUser));
  };

  const clearError = () => {
    setError(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      console.log('🔄 [AUTH] Refreshing user from /auth/me...');
      const userData = await fetchAuthMeFromBackend();

      if (userData) {
        console.log('📊 [AUTH] User data from /auth/me:', {
          id: userData.id,
          email: userData.email,
          profile_completed: userData.profile_completed,
        });
        setUser(userData);
        await SafeAsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        // Update auth status if profile_completed changed
        decideFinalAuthStatus(userData);
      }
    } catch (e) {
      console.warn('⚠️ [AUTH] Failed to refresh user:', e);
    }
  };

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
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
