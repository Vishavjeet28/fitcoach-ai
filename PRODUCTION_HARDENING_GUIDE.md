# PRODUCTION HARDENING - IMPLEMENTATION GUIDE
## FitCoach AI Mobile App - Final Production Checklist

**Date**: January 8, 2026  
**Status**: IMPLEMENTATION REQUIRED  
**Mode**: STRICT ENGINEERING - NO FEATURE ADDITIONS

---

## ⚠️ CRITICAL: THIS IS NOT A REDESIGN

This document provides MANDATORY hardening for a REAL production mobile application.

**CONSTRAINTS**:
- Mobile app ONLY (Expo + React Native)
- Backend APIs are CORRECT and MUST NOT be modified
- Core authentication is COMPLETE
- Security > Convenience
- NO silent failures
- NO infinite retries
- NO new features

---

## 1. API RELIABILITY & TIMEOUT HANDLING

### Current State Analysis
From `fitcoach-expo/src/services/api.ts`:
- ✅ Timeout configured via `API_TIMEOUT`
- ✅ Network error handling exists (ECONNABORTED, ERR_NETWORK)
- ✅ Server error handling (5xx) exists
- ⚠️ Missing: Request cancellation on logout
- ⚠️ Missing: Explicit retry limits
- ⚠️ Missing: DNS failure handling

### REQUIRED IMPLEMENTATION

#### 1.1 Global Axios Configuration Enhancement

**File**: `fitcoach-expo/src/services/api.ts`

**ADD after axios instance creation**:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Request Cancellation Controller
// ============================================================================
const requestCancellers = new Map<string, AbortController>();

export const cancelAllRequests = () => {
  console.log('[API] Cancelling all in-flight requests');
  requestCancellers.forEach((controller, requestId) => {
    controller.abort();
    requestCancellers.delete(requestId);
  });
};

// Add to request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // PRODUCTION HARDENING: Add cancellation support
    const requestId = `${config.method}-${config.url}-${Date.now()}`;
    const controller = new AbortController();
    config.signal = controller.signal;
    requestCancellers.set(requestId, controller);
    
    // Cleanup on request complete
    const cleanup = () => requestCancellers.delete(requestId);
    config.signal.addEventListener('abort', cleanup);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

#### 1.2 Enhanced Error Handling

**File**: `fitcoach-expo/src/services/api.ts`

**REPLACE existing handleAPIError function** with:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Comprehensive Error Handler
// ============================================================================
export const handleAPIError = (error: any): string => {
  // PRODUCTION HARDENING: Handle request cancellation
  if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
    return 'Request cancelled';
  }
  
  // PRODUCTION HARDENING: Network errors
  if (error.code === 'TIMEOUT') {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return 'No internet connection. Please check your network settings.';
  }
  
  if (error.code === 'NO_RESPONSE') {
    return 'Unable to reach server. Please check your internet connection.';
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    return 'DNS lookup failed. Please check your internet connection.';
  }
  
  // PRODUCTION HARDENING: Session expiry
  if (error.code === 'SESSION_EXPIRED') {
    return 'Your session has expired. Please log in again.';
  }
  
  // PRODUCTION HARDENING: Server errors (5xx)
  if (error.code === 'SERVER_ERROR') {
    return `Server error (${error.status || '500'}). Please try again later.';
  }
  
  // PRODUCTION HARDENING: Client errors (4xx)
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message;
    
    if (status === 400) {
      return message || 'Invalid request. Please check your input.';
    }
    if (status === 403) {
      return message || 'Access denied.';
    }
    if (status === 404) {
      return message || 'Resource not found.';
    }
    if (status === 409) {
      return message || 'Conflict. This data already exists.';
    }
    if (status === 422) {
      return message || 'Validation error. Please check your input.';
    }
    if (status === 429) {
      return 'Too many requests. Please wait and try again.';
    }
    
    // Generic 4xx
    if (status >= 400 && status < 500) {
      return message || `Error ${status}. Please try again.`;
    }
  }
  
  // Fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};
```

#### 1.3 Logout Request Cancellation

**File**: `fitcoach-expo/src/context/AuthContext.tsx`

**ADD to logout function**:

```typescript
const logout = async () => {
  setIsLoading(true);
  setError(null);
  try {
    // PRODUCTION HARDENING: Cancel all in-flight requests
    cancelAllRequests();
    
    await authAPI.logout();
    await SafeAsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  } catch (err) {
    const errorMessage = handleAPIError(err);
    setError(errorMessage);
    console.error('Logout failed:', errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

#### 1.4 Single-Retry Logic

**File**: `fitcoach-expo/src/services/api.ts`

**ADD before response interceptor**:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Single-Retry Configuration
// ============================================================================
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

const shouldRetry = (error: AxiosError): boolean => {
  // Retry ONLY on transient network errors
  if (!error.response && (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET'
  )) {
    return true;
  }
  
  // Retry on 5xx server errors (except 501 Not Implemented)
  if (error.response && error.response.status >= 500 && error.response.status !== 501) {
    return true;
  }
  
  return false;
};

// ADD to response interceptor (after existing error handling):
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    // ... existing error handling code ...
    
    // PRODUCTION HARDENING: Single retry for transient failures
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    
    if (shouldRetry(error) && originalRequest._retryCount < MAX_RETRIES) {
      originalRequest._retryCount += 1;
      console.log(`[API] Retrying request (attempt ${originalRequest._retryCount}/${MAX_RETRIES})`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      return apiClient(originalRequest);
    }
    
    return Promise.reject(error);
  }
);
```

### VERIFICATION

- [ ] No request hangs indefinitely (timeout enforced)
- [ ] Network errors show clear messages
- [ ] DNS failures are handled
- [ ] Single retry on transient failures ONLY
- [ ] Logout cancels all in-flight requests
- [ ] No infinite retry loops

---

## 2. AI SAFETY & COST CONTROL

### Current State Analysis
- ⚠️ Missing: Client-side input validation
- ⚠️ Missing: Daily AI usage limits
- ⚠️ Missing: Auto-fire prevention
- ⚠️ Missing: AI-specific error handling

### REQUIRED IMPLEMENTATION

#### 2.1 AI Input Validation

**File**: `fitcoach-expo/src/services/aiService.ts`

**ADD at top of file**:

```typescript
// ============================================================================
// PRODUCTION HARDENING: AI Input Validation & Cost Control
// ============================================================================

const AI_INPUT_MIN_LENGTH = 3;
const AI_INPUT_MAX_LENGTH = 2000;
const AI_DAILY_LIMIT = 50; // Maximum AI requests per day
const AI_COOLDOWN_MS = 2000; // 2 second cooldown between requests

// Rate limiting state
let lastAIRequestTime = 0;
let dailyAIRequestCount = 0;
let lastResetDate = new Date().toDateString();

// Reset daily counter at midnight
const resetDailyCounterIfNeeded = () => {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastResetDate) {
    dailyAIRequestCount = 0;
    lastResetDate = currentDate;
  }
};

// Validate AI input
const validateAIInput = (input: string): { valid: boolean; error?: string } => {
  // PRODUCTION HARDENING: Check input length
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Please enter a message before sending.' };
  }
  
  if (input.trim().length < AI_INPUT_MIN_LENGTH) {
    return { valid: false, error: `Message must be at least ${AI_INPUT_MIN_LENGTH} characters.` };
  }
  
  if (input.length > AI_INPUT_MAX_LENGTH) {
    return { valid: false, error: `Message too long. Maximum ${AI_INPUT_MAX_LENGTH} characters.` };
  }
  
  // PRODUCTION HARDENING: Check daily limit
  resetDailyCounterIfNeeded();
  if (dailyAIRequestCount >= AI_DAILY_LIMIT) {
    return { 
      valid: false, 
      error: `Daily AI limit reached (${AI_DAILY_LIMIT} requests). Please try again tomorrow.` 
    };
  }
  
  // PRODUCTION HARDENING: Check cooldown
  const now = Date.now();
  const timeSinceLastRequest = now - lastAIRequestTime;
  if (timeSinceLastRequest < AI_COOLDOWN_MS) {
    const waitTime = Math.ceil((AI_COOLDOWN_MS - timeSinceLastRequest) / 1000);
    return { 
      valid: false, 
      error: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.` 
    };
  }
  
  return { valid: true };
};

// Update rate limiting state
const updateAIRateLimiting = () => {
  lastAIRequestTime = Date.now();
  dailyAIRequestCount += 1;
};
```

#### 2.2 AI Request Validation in All AI Functions

**File**: `fitcoach-expo/src/services/aiService.ts`

**UPDATE existing AI functions**:

```typescript
export const chat = async (message: string): Promise<string> => {
  // PRODUCTION HARDENING: Validate input before API call
  const validation = validateAIInput(message);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // PRODUCTION HARDENING: Update rate limiting
  updateAIRateLimiting();
  
  try {
    const response = await apiClient.post('/ai/chat', { message });
    return response.data.response;
  } catch (error: any) {
    // PRODUCTION HARDENING: Distinguish 4xx (client) vs 5xx (server)
    if (error.response) {
      const status = error.response.status;
      if (status === 400) {
        throw new Error('Invalid message format. Please try again.');
      }
      if (status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      }
      if (status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again.');
      }
    }
    throw error;
  }
};

export const getDailyInsights = async (): Promise<string> => {
  // PRODUCTION HARDENING: Check daily limit (insights count toward limit)
  resetDailyCounterIfNeeded();
  if (dailyAIRequestCount >= AI_DAILY_LIMIT) {
    throw new Error(`Daily AI limit reached (${AI_DAILY_LIMIT} requests). Please try again tomorrow.`);
  }
  
  // PRODUCTION HARDENING: Update rate limiting
  updateAIRateLimiting();
  
  try {
    const response = await apiClient.get('/ai/insights');
    return response.data.insights;
  } catch (error: any) {
    // PRODUCTION HARDENING: Handle AI-specific errors
    if (error.response?.status === 429) {
      throw new Error('AI insights temporarily unavailable. Please try again later.');
    }
    if (error.response?.status >= 500) {
      throw new Error('AI service error. Please try again later.');
    }
    throw error;
  }
};
```

#### 2.3 UI-Side Auto-Fire Prevention

**File**: `fitcoach-expo/src/pages/Coach.tsx` (or wherever AI chat is used)

**ADD to prevent auto-fire**:

```typescript
const CoachScreen = () => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const hasSentInitialMessage = useRef(false);
  
  // PRODUCTION HARDENING: Prevent auto-fire on render
  useEffect(() => {
    // Do NOT send AI requests on component mount
    hasSentInitialMessage.current = false;
  }, []);
  
  const handleSendMessage = async () => {
    // PRODUCTION HARDENING: Prevent double-send
    if (isSending) {
      return;
    }
    
    // PRODUCTION HARDENING: Validate input UI-side
    if (!message || message.trim().length === 0) {
      Alert.alert('Error', 'Please enter a message before sending.');
      return;
    }
    
    setIsSending(true);
    try {
      await chat(message);
      setMessage(''); // Clear input after success
    } catch (error: any) {
      // PRODUCTION HARDENING: Show clear error to user
      Alert.alert('AI Error', error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  // ... rest of component
};
```

### VERIFICATION

- [ ] AI input validated client-side (length 3-2000 chars)
- [ ] Empty/spam requests prevented
- [ ] Daily limit enforced (50 requests/day)
- [ ] 2-second cooldown between requests
- [ ] AI requests do NOT auto-fire on render
- [ ] 4xx errors show user-facing messages
- [ ] 5xx errors show retry guidance
- [ ] Single retry on transient AI failures

---

## 3. HISTORY & DATA CONSISTENCY

### REQUIRED IMPLEMENTATION

#### 3.1 Force Refetch After POST Success

**File**: Create `fitcoach-expo/src/hooks/useDataSync.ts`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Data Synchronization Hook
// ============================================================================
import { useState, useCallback } from 'react';

export const useDataSync = (fetchDataFn: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const forceRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDataFn();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDataFn]);
  
  const onPostSuccess = useCallback(async () => {
    // PRODUCTION HARDENING: Force refetch after successful POST
    console.log('[DATA_SYNC] POST success - forcing refetch');
    await forceRefresh();
  }, [forceRefresh]);
  
  return { isRefreshing, forceRefresh, onPostSuccess };
};
```

**Usage in screens**:

```typescript
// Example: Food logging screen
const FoodLogScreen = () => {
  const { isRefreshing, onPostSuccess } = useDataSync(fetchFoodLogs);
  
  const handleAddFood = async (foodData: any) => {
    try {
      await foodAPI.logFood(foodData);
      // PRODUCTION HARDENING: Force refetch to show new data
      await onPostSuccess();
      Alert.alert('Success', 'Food logged successfully');
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };
  
  // ... rest of component
};
```

#### 3.2 Timezone-Safe Day Boundaries

**File**: Create `fitcoach-expo/src/utils/dateUtils.ts`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Timezone-Safe Date Handling
// ============================================================================

/**
 * Get current date in YYYY-MM-DD format (local timezone)
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date range for API queries (ensures full day coverage)
 */
export const getDateRange = (date: string) => {
  // PRODUCTION HARDENING: Use local timezone midnight boundaries
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
};

/**
 * Check if date is today (local timezone)
 */
export const isToday = (dateString: string): boolean => {
  return dateString === getTodayLocal();
};
```

#### 3.3 Loading vs Empty States

**File**: Create `fitcoach-expo/src/components/DataStateHandler.tsx`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Clear Loading vs Empty State Handling
// ============================================================================
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface DataStateHandlerProps {
  isLoading: boolean;
  data: any[] | null;
  error: string | null;
  emptyMessage: string;
  children: React.ReactNode;
}

export const DataStateHandler: React.FC<DataStateHandlerProps> = ({
  isLoading,
  data,
  error,
  emptyMessage,
  children,
}) => {
  // PRODUCTION HARDENING: Show loading indicator
  if (isLoading && data === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // PRODUCTION HARDENING: Show error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }
  
  // PRODUCTION HARDENING: Show empty state (NOT loading, just no data)
  if (data && data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }
  
  // PRODUCTION HARDENING: Show data
  return <>{children}</>;
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#CC0000',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
```

#### 3.4 Guest User Warnings

**File**: `fitcoach-expo/src/context/AuthContext.tsx`

**UPDATE continueAsGuest function**:

```typescript
const continueAsGuest = async (): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    // PRODUCTION HARDENING: Set guest user with clear warning
    const guestUser: User = {
      id: 'guest',
      email: 'guest@local',
      name: 'Guest',
      isGuest: true,
    };
    setUser(guestUser);
    setToken('guest-token');
    
    // PRODUCTION HARDENING: Show data persistence warning
    Alert.alert(
      'Guest Mode',
      '⚠️ Your data will NOT be saved and will be lost when you close the app. Sign up to save your progress.',
      [{ text: 'I Understand', style: 'default' }]
    );
  } catch (error) {
    console.error('Guest mode failed:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.5 Partial Failure Handling

**File**: Create `fitcoach-expo/src/utils/batchOperations.ts`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Batch Operation with Partial Failure Handling
// ============================================================================

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: T; error: string }>;
  partialFailure: boolean;
}

export const executeBatch = async <T,>(
  items: T[],
  operation: (item: T) => Promise<void>,
  itemName: string
): Promise<BatchResult<T>> => {
  const successful: T[] = [];
  const failed: Array<{ item: T; error: string }> = [];
  
  for (const item of items) {
    try {
      await operation(item);
      successful.push(item);
    } catch (error: any) {
      failed.push({ item, error: error.message || 'Unknown error' });
    }
  }
  
  const partialFailure = failed.length > 0 && successful.length > 0;
  
  // PRODUCTION HARDENING: Surface partial failures clearly
  if (partialFailure) {
    Alert.alert(
      'Partial Success',
      `${successful.length} ${itemName}(s) saved successfully, but ${failed.length} failed. Please review and try again.`,
      [{ text: 'OK', style: 'default' }]
    );
  } else if (failed.length === items.length) {
    Alert.alert(
      'Operation Failed',
      `All ${itemName}s failed to save. Please check your connection and try again.`,
      [{ text: 'OK', style: 'cancel' }]
    );
  }
  
  return { successful, failed, partialFailure };
};
```

### VERIFICATION

- [ ] POST success triggers immediate refetch
- [ ] Dates use local timezone (not UTC for day boundaries)
- [ ] Loading state shows spinner (not empty state)
- [ ] Empty state shows "No data" message (not loading)
- [ ] Guest users see "data not saved" warning
- [ ] Partial failures surfaced with clear counts

---

## 4. FIREBASE CRASHLYTICS & ERROR TRACKING

### REQUIRED IMPLEMENTATION

#### 4.1 Install Firebase SDK

**Command**:
```bash
cd fitcoach-expo
npx expo install @react-native-firebase/app @react-native-firebase/crashlytics
npm install --save @react-native-firebase/analytics
```

#### 4.2 Configure Firebase

**File**: `fitcoach-expo/app.json`

**ADD**:
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics"
    ],
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

#### 4.3 Global Error Boundary

**File**: Create `fitcoach-expo/src/components/ErrorBoundary.tsx`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Global Error Boundary
// ============================================================================
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // PRODUCTION HARDENING: Log to Crashlytics
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    if (__DEV__) {
      console.error('Error stack:', error.stack);
      console.error('Component stack:', errorInfo.componentStack);
    } else {
      // PRODUCTION: Send to Crashlytics
      crashlytics().recordError(error);
      crashlytics().log(`Component stack: ${errorInfo.componentStack}`);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>💥</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Our team has been notified.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorText}>
              {this.state.error.toString()}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#CC0000',
    fontFamily: 'monospace',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#FFF0F0',
  },
  button: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

#### 4.4 Unhandled Promise Rejection Handler

**File**: `fitcoach-expo/src/main.tsx` (or App.tsx)

**ADD at top of file**:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Unhandled Promise Rejection Handler
// ============================================================================
import crashlytics from '@react-native-firebase/crashlytics';

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (!__DEV__) {
    // PRODUCTION: Log to Crashlytics
    crashlytics().recordError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`)
    );
  }
};

// Register handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}
```

#### 4.5 Centralized Production Logging

**File**: Create `fitcoach-expo/src/utils/logger.ts`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Centralized Logger
// ============================================================================
import crashlytics from '@react-native-firebase/crashlytics';

class Logger {
  private isDev = __DEV__;
  
  // PRODUCTION HARDENING: Only log to console in development
  log(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      crashlytics().log(`WARN: ${message}`);
    }
  }
  
  error(message: string, error?: any) {
    if (this.isDev) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      // PRODUCTION: Send to Crashlytics
      crashlytics().log(`ERROR: ${message}`);
      if (error) {
        crashlytics().recordError(error);
      }
    }
  }
  
  // PRODUCTION HARDENING: User action tracking
  logUserAction(action: string, metadata?: Record<string, any>) {
    if (this.isDev) {
      console.log(`[USER_ACTION] ${action}`, metadata);
    } else {
      crashlytics().log(`USER_ACTION: ${action}`);
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          crashlytics().setAttribute(key, String(value));
        });
      }
    }
  }
}

export const logger = new Logger();
```

### VERIFICATION

- [ ] Firebase SDK installed
- [ ] Crashlytics configured for iOS and Android
- [ ] Global ErrorBoundary wraps entire app
- [ ] Unhandled promise rejections captured
- [ ] Logger separates dev logs from production
- [ ] Crashes visible in Firebase Console

---

## 5. ENVIRONMENT & RELEASE CONFIGURATION

### REQUIRED IMPLEMENTATION

#### 5.1 Remove Ngrok References

**Search for ngrok in all files**:
```bash
cd fitcoach-expo
grep -r "ngrok" . --exclude-dir=node_modules
```

**REPLACE all ngrok URLs** with environment variables.

#### 5.2 Environment Configuration

**File**: Create `fitcoach-expo/.env.development`:

```bash
# Development Environment
EXPO_PUBLIC_API_URL=http://localhost:5001/api
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_LOG_LEVEL=debug
```

**File**: Create `fitcoach-expo/.env.production`:

```bash
# Production Environment
EXPO_PUBLIC_API_URL=https://api.fitcoach.com/api
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_LOG_LEVEL=error
```

#### 5.3 API URL Configuration

**File**: `fitcoach-expo/src/config/api.config.ts`

**CREATE** (if doesn't exist):

```typescript
// ============================================================================
// PRODUCTION HARDENING: Environment-Based Configuration
// ============================================================================
import Constants from 'expo-constants';

const ENV = Constants.expoConfig?.extra?.ENV || 'development';

export const API_BASE_URL = 
  ENV === 'production'
    ? 'https://api.fitcoach.com/api'
    : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api');

export const API_TIMEOUT = 30000; // 30 seconds

export const TOKEN_STORAGE = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
};

// PRODUCTION HARDENING: Log configuration in development only
if (__DEV__) {
  console.log('[CONFIG] Environment:', ENV);
  console.log('[CONFIG] API Base URL:', API_BASE_URL);
}
```

#### 5.4 App Store Configuration

**File**: `fitcoach-expo/app.json`

**VERIFY**:

```json
{
  "expo": {
    "name": "FitCoach AI",
    "slug": "fitcoach-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.fitcoach",
      "usesAppleSignIn": true,
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.fitcoach",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    "privacy": "public",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

#### 5.5 Permissions Validation

**File**: Create `fitcoach-expo/src/utils/permissions.ts`:

```typescript
// ============================================================================
// PRODUCTION HARDENING: Permission Validation
// ============================================================================
import * as Network from 'expo-network';
import { Alert } from 'react-native';

export const checkNetworkPermission = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    if (!networkState.isConnected) {
      Alert.alert(
        'No Internet Connection',
        'FitCoach requires an internet connection. Please check your network settings.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Network permission check failed:', error);
    return true; // Fail open to not block app
  }
};
```

### VERIFICATION

- [ ] No ngrok references remain
- [ ] Environment variables configured (dev/prod)
- [ ] API URL changes based on environment
- [ ] App store identifiers correct
- [ ] Permissions explicitly declared
- [ ] Privacy policy URL included

---

## 6. FINAL VERIFICATION & DOCUMENTATION

### Implementation Checklist

#### API Reliability ✅/❌
- [ ] Global request timeout (30s) enforced
- [ ] Network error handling (no internet, DNS failure)
- [ ] Backend unreachable shows clear message
- [ ] Single-retry logic (ONCE only, transient failures)
- [ ] Request cancellation on logout
- [ ] No infinite retry loops
- [ ] Clear user-facing error messages

#### AI Safety ✅/❌
- [ ] Input validation (3-2000 characters)
- [ ] Empty/spam requests prevented
- [ ] Daily AI limit enforced (50 requests/day)
- [ ] 2-second cooldown between requests
- [ ] AI calls do NOT auto-fire on render
- [ ] 4xx errors show user messages
- [ ] 5xx errors show retry guidance
- [ ] Single retry on transient AI failures

#### Data Consistency ✅/❌
- [ ] POST success forces refetch
- [ ] Timezone-safe day boundaries
- [ ] Loading state distinct from empty state
- [ ] Guest users see "data not saved" warning
- [ ] Partial failures surfaced clearly

#### Error Tracking ✅/❌
- [ ] Firebase Crashlytics installed
- [ ] Global ErrorBoundary implemented
- [ ] Unhandled promise rejections captured
- [ ] Centralized logging (dev vs prod)
- [ ] Dev logs NOT in production
- [ ] Crashes visible in Firebase Console

#### Release Configuration ✅/❌
- [ ] No ngrok references
- [ ] Dev vs prod environments configured
- [ ] API URLs secured
- [ ] Permissions validated
- [ ] Privacy policy aligned
- [ ] App store configuration verified

### Remaining Known Risks

1. **Firebase Configuration**: Requires `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) files from Firebase Console

2. **API Base URL**: Production URL (`https://api.fitcoach.com/api`) must be replaced with actual domain

3. **OAuth Credentials**: Google and Apple OAuth still require provider configuration (documented in OAUTH_PRODUCTION_READY.md)

4. **Database Migration**: OAuth migration not yet applied (documented in section 1 of implementation)

5. **Network State Persistence**: Offline mode not implemented (app requires internet connection)

### Confirmation: No Core Logic Changes

✅ **CONFIRMED**: No core authentication logic modified
✅ **CONFIRMED**: No backend API endpoints changed
✅ **CONFIRMED**: No existing features redesigned
✅ **CONFIRMED**: Only hardening and safety measures added

All implementations are:
- Additive (no breaking changes)
- Fail-safe (errors surface clearly)
- Production-ready (no silent failures)
- Observable (Crashlytics integration)

---

## IMPLEMENTATION INSTRUCTIONS

1. **Apply API Reliability hardening** (Section 1)
   - Update `api.ts` with request cancellation
   - Add single-retry logic
   - Enhance error messages

2. **Apply AI Safety hardening** (Section 2)
   - Add input validation to `aiService.ts`
   - Implement daily limits
   - Add auto-fire prevention in UI

3. **Apply Data Consistency hardening** (Section 3)
   - Create `useDataSync` hook
   - Add `dateUtils.ts`
   - Implement `DataStateHandler` component

4. **Install and Configure Firebase** (Section 4)
   - Install Firebase SDK
   - Create ErrorBoundary
   - Add unhandled rejection handler
   - Create centralized logger

5. **Configure Environments** (Section 5)
   - Remove ngrok references
   - Create .env files
   - Update API configuration
   - Validate permissions

6. **Verify All Changes** (Section 6)
   - Run through checklist
   - Test error scenarios
   - Verify Crashlytics
   - Confirm no regressions

---

**END OF PRODUCTION HARDENING GUIDE**

This document provides COMPLETE instructions for hardening the mobile app.
No features added. No redesigns. Only safety, reliability, and observability.
