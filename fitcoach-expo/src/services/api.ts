import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT, TOKEN_STORAGE } from '../config/api.config';

// Token keys
const { ACCESS_TOKEN, REFRESH_TOKEN } = TOKEN_STORAGE;

// ============================================================================
// PRODUCTION HARDENING: Request Cancellation
// ============================================================================
/**
 * Active request cancellation controllers
 * Allows canceling all pending requests on logout or navigation
 */
const activeRequests = new Map<string, AbortController>();

export const cancelAllRequests = () => {
  console.log(`[API] Canceling ${activeRequests.size} active requests`);
  activeRequests.forEach((controller, key) => {
    controller.abort();
    activeRequests.delete(key);
  });
};

const createRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// PRODUCTION HARDENING: Retry Logic
// ============================================================================
const MAX_RETRIES = 1; // Single retry only
const RETRY_DELAY = 1000; // 1 second

const shouldRetry = (error: AxiosError): boolean => {
  // Only retry on network errors or 5xx server errors
  if (!error.response) {
    // Network error - retry
    return true;
  }
  if (error.response.status >= 500 && error.response.status < 600) {
    // Server error - retry
    return true;
  }
  // Don't retry 4xx client errors (bad request, auth, etc.)
  return false;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// PRODUCTION HARDENING: Session Expiry Callback Registration
// ============================================================================
/**
 * Global callback to trigger forceLogout in AuthContext when session expires.
 * This is registered by AuthProvider during app initialization.
 */
let sessionExpiredCallback: (() => void) | null = null;

export const registerSessionExpiredCallback = (callback: () => void) => {
  sessionExpiredCallback = callback;
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken);
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },
};

// Request interceptor to add auth token + AbortController
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ============================================================================
    // PRODUCTION HARDENING: Add AbortController for request cancellation
    // ============================================================================
    const requestId = createRequestId();
    const controller = new AbortController();
    
    config.signal = controller.signal;
    // @ts-ignore - Add requestId to config for cleanup
    config.requestId = requestId;
    
    activeRequests.set(requestId, controller);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


// ============================================================================
// PRODUCTION HARDENING: Response Interceptor with Enhanced Error Handling
// ============================================================================
apiClient.interceptors.response.use(
  (response) => {
    // ============================================================================
    // PRODUCTION HARDENING: Clean up completed request from active map
    // ============================================================================
    const requestId = (response.config as any).requestId;
    if (requestId) {
      activeRequests.delete(requestId);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Clean up failed request from active map
    if (originalRequest?.requestId) {
      activeRequests.delete(originalRequest.requestId);
    }

    // ============================================================================
    // PRODUCTION HARDENING: Handle Request Cancellation
    // ============================================================================
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      console.log('[API] Request canceled:', originalRequest?.url);
      return Promise.reject(new Error('Request canceled'));
    }

    // ============================================================================
    // PRODUCTION HARDENING: Retry Logic (Single Retry)
    // ============================================================================
    const retryCount = originalRequest?._retryCount || 0;
    
    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      originalRequest._retryCount = retryCount + 1;
      console.log(`[API] Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES}):`, originalRequest?.url);
      
      await delay(RETRY_DELAY);
      return apiClient(originalRequest);
    }

    // ============================================================================
    // PRODUCTION HARDENING: Network Error Handling
    // ============================================================================
    if (!error.response) {
      // No response received - network/connection issue
      if (error.code === 'ECONNABORTED') {
        const timeoutError: any = new Error('Request timed out. Please check your connection and try again.');
        timeoutError.code = 'TIMEOUT';
        return Promise.reject(timeoutError);
      }
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const networkError: any = new Error('Network error. Please check your internet connection.');
        networkError.code = 'NETWORK_ERROR';
        return Promise.reject(networkError);
      }
      if (error.code === 'EAI_AGAIN' || error.message?.includes('getaddrinfo')) {
        const dnsError: any = new Error('DNS lookup failed. Please check your internet connection.');
        dnsError.code = 'DNS_ERROR';
        return Promise.reject(dnsError);
      }
      // Generic no-response error
      const connectionError: any = new Error('Unable to connect to server. Please try again.');
      connectionError.code = 'NO_RESPONSE';
      return Promise.reject(connectionError);
    }

    // ============================================================================
    // Handle 401 Unauthorized - attempt token refresh
    // ============================================================================
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
        
        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Clear tokens
        await tokenManager.clearTokens();
        
        // ============================================================================
        // PRODUCTION HARDENING: Trigger forceLogout in AuthContext
        // ============================================================================
        if (sessionExpiredCallback) {
          console.log('🔐 [API] Session expired - triggering forceLogout');
          sessionExpiredCallback();
        }
        
        // Throw a specific error that screens can handle
        const logoutError: any = new Error('Session expired. Please login again.');
        logoutError.code = 'SESSION_EXPIRED';
        return Promise.reject(logoutError);
      }
    }

    // ============================================================================
    // PRODUCTION HARDENING: Server Error Handling (5xx)
    // ============================================================================
    if (error.response?.status >= 500) {
      const serverError: any = new Error('Server error. Please try again later.');
      serverError.code = 'SERVER_ERROR';
      serverError.status = error.response.status;
      return Promise.reject(serverError);
    }

    return Promise.reject(error);
  }
);

// API Types
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

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

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileData {
  name?: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
  calorieTarget?: number;
}

// Auth API
export const authAPI = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', data);
    const { accessToken, refreshToken } = response.data;
    await tokenManager.setTokens(accessToken, refreshToken);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', data);
    const { accessToken, refreshToken } = response.data;
    await tokenManager.setTokens(accessToken, refreshToken);
    return response.data;
  },

  async googleAuth(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/google', { idToken });
    const { accessToken, refreshToken } = response.data;
    await tokenManager.setTokens(accessToken, refreshToken);
    return response.data;
  },

  async appleAuth(identityToken: string, user?: any): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/apple', { identityToken, user });
    const { accessToken, refreshToken } = response.data;
    await tokenManager.setTokens(accessToken, refreshToken);
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = await tokenManager.getRefreshToken();
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      await tokenManager.clearTokens();
    }
  },

  async updateProfile(data: UpdateProfileData): Promise<{ message: string; user: User }> {
    const response = await apiClient.patch('/auth/profile', data);
    return response.data;
  },

  async refreshToken(): Promise<string> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post('/auth/refresh', { refreshToken });
    const { accessToken } = response.data;
    await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
    return accessToken;
  },
};

// Health check
export const healthAPI = {
  async check(): Promise<{ status: string; database: string }> {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.data;
  },
};

// Analytics Types
export interface DailySummary {
  date: string;
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalExerciseCalories: number;
    totalExerciseMinutes: number;
    totalWaterMl: number;
    calorieTarget: number;
    waterTargetMl: number;
    netCalories: number;
  };
}

export interface WeeklyTrends {
  startDate: string;
  endDate: string;
  days: number;
  dailyData: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    exerciseCalories: number;
    exerciseMinutes: number;
    waterMl: number;
    calorieTarget: number;
    netCalories: number;
  }>;
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    exerciseCalories: number;
    exerciseMinutes: number;
    water: number;
  };
}

export interface ProgressOverview {
  totalDaysTracked: number;
  currentStreak: number;
  longestStreak: number;
  consistency: {
    percentage: number;
    daysMetGoal: number;
    totalDays: number;
  };
  achievements: {
    daysMetCalorieGoal: number;
    daysMetWaterGoal: number;
    daysExercised: number;
  };
  userStats: {
    averageDailyCalories: number;
    averageDailyProtein: number;
    averageDailyCarbs: number;
    averageDailyFat: number;
    averageDailyWater: number;
  };
}

// Food Types
export interface FoodLog {
  id: number;
  user_id: number;
  food_id?: number;
  custom_food_name?: string;
  food_name?: string;
  brand?: string;
  category?: string;
  servings: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  notes?: string;
  meal_date: string;
  logged_at: string;
}

export interface CreateFoodLog {
  foodId?: number;
  foodName?: string; // For validator
  customFoodName?: string; // For controller
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt?: string;
}

export interface FoodTotals {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  target: {
    calories: number;
  };
  remaining: {
    calories: number;
  };
  percentageConsumed: number;
}

// Exercise Types
export interface ExerciseLog {
  id: number;
  user_id: number;
  exercise_id?: number;
  custom_exercise_name?: string;
  exercise_name?: string;
  category?: string;
  met_value?: number;
  duration_minutes: number;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  distance_km?: number;
  calories_burned: number;
  intensity: 'light' | 'moderate' | 'vigorous';
  notes?: string;
  workout_date: string;
  logged_at: string;
}

export interface CreateExerciseLog {
  exerciseId?: number;
  customExerciseName?: string;
  durationMinutes: number;
  sets?: number;
  reps?: number;
  weightKg?: number;
  distanceKm?: number;
  intensity?: 'light' | 'moderate' | 'vigorous';
  notes?: string;
  workoutDate?: string;
}

export interface ExerciseTotals {
  date: string;
  totals: {
    caloriesBurned: number;
    durationMinutes: number;
    workoutCount: number;
  };
}

// Water Types
export interface WaterLog {
  id: number;
  user_id: number;
  amount_ml: number;
  log_date: string;
  logged_at: string;
}

export interface WaterTotals {
  date: string;
  totals: {
    amountMl: number;
    logCount: number;
  };
  goal: {
    amountMl: number;
  };
  remaining: {
    amountMl: number;
  };
  progress: {
    percentage: number;
  };
}

// Analytics API
export const analyticsAPI = {
  async getDailySummary(date?: string): Promise<DailySummary> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/analytics/daily', { params });
    return response.data;
  },

  async getWeeklyTrends(startDate?: string, endDate?: string): Promise<WeeklyTrends> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/analytics/weekly', { params });
    return response.data;
  },

  async getMonthlyStats(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await apiClient.get('/analytics/monthly', { params });
    return response.data;
  },

  async getProgress(): Promise<ProgressOverview> {
    const response = await apiClient.get('/analytics/progress');
    return response.data;
  },
};

// Food API
export const foodAPI = {
  async getLogs(startDate?: string, endDate?: string): Promise<FoodLog[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/food/logs', { params });
    return response.data.logs;
  },

  async createLog(data: CreateFoodLog): Promise<FoodLog> {
    const response = await apiClient.post('/food/logs', data);
    return response.data.log;
  },

  async updateLog(id: number, data: Partial<CreateFoodLog>): Promise<FoodLog> {
    const response = await apiClient.put(`/food/logs/${id}`, data);
    return response.data.log;
  },

  async deleteLog(id: number): Promise<void> {
    await apiClient.delete(`/food/logs/${id}`);
  },

  async searchFood(query: string): Promise<any[]> {
    const response = await apiClient.get('/food/search', { params: { q: query } });
    return response.data.results;
  },

  async getTotals(date?: string): Promise<FoodTotals> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/food/totals', { params });
    return response.data;
  },
};

// Exercise API
export const exerciseAPI = {
  async getLogs(startDate?: string, endDate?: string): Promise<ExerciseLog[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/exercise/logs', { params });
    return response.data.logs;
  },

  async createLog(data: CreateExerciseLog): Promise<ExerciseLog> {
    const response = await apiClient.post('/exercise/logs', data);
    return response.data.log;
  },

  async updateLog(id: number, data: Partial<CreateExerciseLog>): Promise<ExerciseLog> {
    const response = await apiClient.put(`/exercise/logs/${id}`, data);
    return response.data.log;
  },

  async deleteLog(id: number): Promise<void> {
    await apiClient.delete(`/exercise/logs/${id}`);
  },

  async searchExercise(query: string): Promise<any[]> {
    const response = await apiClient.get('/exercise/search', { params: { q: query } });
    return response.data.results;
  },

  async getTotals(date?: string): Promise<ExerciseTotals> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/exercise/totals', { params });
    return response.data;
  },
};

// Water API
export const waterAPI = {
  async getLogs(date?: string): Promise<WaterLog[]> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/water/logs', { params });
    return response.data.logs || [];
  },

  async createLog(amountMl: number, logDate?: string): Promise<WaterLog> {
    const response = await apiClient.post('/water/logs', { amountMl, logDate });
    return response.data.log;
  },

  async deleteLog(id: number): Promise<void> {
    await apiClient.delete(`/water/logs/${id}`);
  },

  async getTotals(date?: string): Promise<WaterTotals> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/water/totals', { params });
    return response.data;
  },

  async getHistory(days: number = 7): Promise<any[]> {
    const response = await apiClient.get('/water/history', { params: { days } });
    return response.data.history || [];
  },
};

// User Profile Types
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activity_level?: string;
  goal?: string;
  calorie_target?: number;
  dietary_restrictions?: string[];
  preferred_cuisines?: string[];
  created_at: string;
  last_login: string;
}

export interface UserStats {
  foodLogsCount: number;
  exerciseLogsCount: number;
  waterLogsCount: number;
  daysLogged: number;
  aiInsightsCount: number;
  memberSince: string;
}

export interface UserPreferences {
  dietaryRestrictions?: string[];
  preferredCuisines?: string[];
}

// User API
export const userAPI = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/user/profile');
    return response.data.user;
  },

  async getStats(): Promise<UserStats> {
    const response = await apiClient.get('/user/stats');
    return response.data.stats;
  },

  async updatePreferences(preferences: UserPreferences): Promise<{ message: string; preferences: any }> {
    const response = await apiClient.patch('/user/preferences', preferences);
    return response.data;
  },

  async exportData(): Promise<any> {
    const response = await apiClient.get('/user/export-data');
    return response.data;
  },

  async deleteData(confirmation: string): Promise<{ message: string }> {
    const response = await apiClient.delete('/user/delete-data', {
      data: { confirmation }
    });
    return response.data;
  },

  async deactivateAccount(): Promise<{ message: string }> {
    const response = await apiClient.post('/user/deactivate');
    return response.data;
  },
};

// Error handler helper
// ============================================================================
// PRODUCTION HARDENING: Enhanced Error Handler
// ============================================================================
export const handleAPIError = (error: any): string => {
  // Handle custom error codes from interceptor
  if (error?.code) {
    switch (error.code) {
      case 'TIMEOUT':
        return 'Request timed out. Please check your connection and try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection.';
      case 'DNS_ERROR':
        return 'DNS lookup failed. Please check your internet connection.';
      case 'NO_RESPONSE':
        return 'Unable to connect to server. Please try again.';
      case 'SESSION_EXPIRED':
        return 'Session expired. Please login again.';
      case 'SERVER_ERROR':
        return 'Server error. Please try again later.';
    }
  }

  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: string; message: string }>;
    
    // Server provided an error message
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    
    // HTTP status code errors
    if (axiosError.response?.status) {
      const status = axiosError.response.status;
      if (status >= 400 && status < 500) {
        return 'Invalid request. Please check your input and try again.';
      }
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
    }
    
    // Network errors
    if (axiosError.code === 'ECONNREFUSED') {
      return 'Cannot connect to server. Please make sure the backend is running.';
    }
    if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your connection.';
    }
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }
    
    return axiosError.message || 'An unexpected error occurred';
  }
  
  // Generic error
  return error?.message || 'An unexpected error occurred';
};

export default apiClient;


// Combined API export for convenience
export const api = {
  auth: authAPI,
  food: foodAPI,
  exercise: exerciseAPI,
  water: waterAPI,
  health: healthAPI,
  analytics: analyticsAPI,
  user: userAPI,
};
