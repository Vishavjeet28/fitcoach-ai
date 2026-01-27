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
const MAX_RETRIES = 2; // Two retries for better reliability
const RETRY_DELAY = 2000; // 2 seconds

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
        const timeoutError: any = new Error(
          'Connection timed out. Please ensure:\n' +
          '1. Your backend server is running\n' +
          '2. You are on the same WiFi network\n' +
          '3. Check the IP address in api.config.ts'
        );
        timeoutError.code = 'TIMEOUT';
        return Promise.reject(timeoutError);
      }
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const networkError: any = new Error(
          'Cannot connect to server. Please ensure:\n' +
          '1. Backend is running (cd backend && node src/server.js)\n' +
          '2. Both devices on same WiFi\n' +
          '3. Firewall allows port 5001'
        );
        networkError.code = 'NETWORK_ERROR';
        return Promise.reject(networkError);
      }
      if (error.code === 'EAI_AGAIN' || error.message?.includes('getaddrinfo')) {
        const dnsError: any = new Error('DNS lookup failed. Please check your internet connection.');
        dnsError.code = 'DNS_ERROR';
        return Promise.reject(dnsError);
      }
      // Generic no-response error
      const connectionError: any = new Error(
        'Unable to reach backend server. Ensure backend is running and accessible.'
      );
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
  push_token?: string;
  subscriptionStatus?: 'free' | 'pro' | 'premium' | 'weekly' | 'monthly' | 'yearly';
  subscriptionPlan?: 'weekly' | 'monthly' | 'yearly';
  aiUsageCount?: number;
  dietaryRestrictions?: string[];
  preferredCuisines?: string[];
  createdAt?: string;
  lastLogin?: string;
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
  push_token?: string;
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

  async logout(pushToken?: string): Promise<void> {
    const refreshToken = await tokenManager.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken, pushToken });
      }
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

  async firebaseLogin(idToken: string, pushToken?: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/firebase-login', { idToken, pushToken });
    const { accessToken, refreshToken, user } = response.data;
    await tokenManager.setTokens(accessToken, refreshToken);
    return response.data;
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

export interface AnalyticsDataResponse {
  period: string;
  data: AnalyticsSnapshot[];
}

export interface AnalyticsSnapshot {
  date: string;
  weight: number;
  trend: number;
  calories: number;
  calorie_target: number;
  protein: number;
  carbs: number;
  fat: number;
  workout_completed?: boolean;
  workout_calories_burned?: number;
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
  fat?: number; // Corrected from fats
  fiber?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt?: string;
  mealDate?: string; // Added to support custom dates
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

// Meal Recommendation Types
export interface MealData {
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  recommendation: {
    id: number;
    foodItems: Array<{
      name: string;
      portion: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    generationMethod: string;
    aiReasoning?: string;
    createdAt: string;
  } | null;
  logged: {
    items: Array<{
      foodName: string;
      portionSize: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      loggedAt: string;
    }>;
    totals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  compliance: {
    score: number;
    wasFollowed: boolean;
    wasSwapped: boolean;
    swapCount: number;
  } | null;
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

  // NEW: Strict Analytics Data
  async getChartData(period: '1w' | '1m' | '3m' | '6m' | '1y'): Promise<AnalyticsDataResponse> {
    const response = await apiClient.get('/analytics/chart-data', {
      params: { period },
      timeout: 15000 // 15 seconds
    });
    return response.data;
  },

  async syncAnalytics(): Promise<any> {
    const response = await apiClient.post('/analytics/sync');
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

  async getDailyNutrition(date: string): Promise<any> {
    const response = await apiClient.get('/analytics/daily', { params: { date } });
    return response.data.summary;
  },
};

// Recipe System APIs
export const recipeAPI = {
  async getRecipes(): Promise<any[]> {
    const response = await apiClient.get('/recipes');
    return response.data.recipes;
  },
  async generateRecipe(prompt: string): Promise<any> {
    const response = await apiClient.post('/recipes/generate', { prompt });
    return response.data.recipe;
  },
  async deleteRecipe(id: number): Promise<void> {
    await apiClient.delete(`/recipes/${id}`);
  }
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

  // Today Screen specific methods
  async getDailyMeals(date: string): Promise<any[]> {
    const response = await apiClient.get('/meals/daily', { params: { date } });
    return response.data.meals || [];
  },
};

// Meal Recommendation API
export const mealAPI = {
  /**
   * Generate daily meal plan with AI recommendations
   * POST /api/meals/generate-daily-plan
   */
  async generateDailyPlan(date?: string): Promise<{
    success: boolean;
    date: string;
    meals: any[];
  }> {
    const response = await apiClient.post('/meals/generate-daily-plan', { date });
    return response.data;
  },

  /**
   * Swap a specific meal with AI alternative
   * POST /api/meals/swap-meal
   */
  async swapMeal(mealType: 'breakfast' | 'lunch' | 'dinner', date?: string): Promise<{
    success: boolean;
    date: string;
    mealType: string;
    meal: any;
  }> {
    const response = await apiClient.post('/meals/swap-meal', { mealType, date });
    return response.data;
  },

  /**
   * Get daily meals with recommendations AND logged food
   * GET /api/meals/daily-with-recommendations?date=YYYY-MM-DD
   */
  async getDailyWithRecommendations(date?: string): Promise<{
    success: boolean;
    date: string;
    meals: {
      breakfast: MealData;
      lunch: MealData;
      dinner: MealData;
    };
    distribution: {
      mealStyle: string;
      goalStyle: string;
    } | null;
  }> {
    const params = date ? { date } : {};
    const response = await apiClient.get('/meals/daily-with-recommendations', { params });
    return response.data;
  },

  /**
   * Recalculate meal distribution based on updated profile/goals
   * POST /api/meals/recalculate
   */
  async recalculateDistribution(): Promise<any> {
    const response = await apiClient.post('/meals/recalculate');
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

// Workout API
export const workoutAPI = {
  async getTodayWorkout(): Promise<any> {
    const response = await apiClient.get('/workout/daily');
    return response.data;
  },

  async getTemplates(): Promise<any[]> {
    const response = await apiClient.get('/workout/templates');
    return response.data.data?.templates || response.data.templates || [];
  },

  async getTemplateById(templateId: string): Promise<any> {
    const response = await apiClient.get(`/workout/templates/${templateId}`);
    return response.data;
  },

  async logSession(sessionData: any): Promise<any> {
    const response = await apiClient.post('/workout/log-session', sessionData);
    return response.data;
  },

  async getHistory(limit: number = 10): Promise<any[]> {
    const response = await apiClient.get('/workout/history', { params: { limit } });
    return response.data.history || [];
  },

  async recommendProgram(userId?: number): Promise<any> {
    const response = await apiClient.post('/workout/recommend', { user_id: userId });
    return response.data;
  },

  async getPersonalRecords(): Promise<any[]> {
    const response = await apiClient.get('/workout/personal-records');
    return response.data.records || [];
  },

  async createPersonalRecord(data: {
    exercise_name: string;
    value: number;
    unit: string;
    achieved_at?: string
  }): Promise<any> {
    const response = await apiClient.post('/workout/personal-records', data);
    return response.data;
  },

  async getAnalytics(): Promise<any> {
    const response = await apiClient.get('/workout/analytics');
    return response.data;
  },

  async updatePreferences(preferences: any): Promise<any> {
    const response = await apiClient.put('/workout/preferences', preferences);
    return response.data;
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
  activityLevel?: string;
  goal?: string;
  calorieTarget?: number;
  dietaryRestrictions?: string[];
  preferredCuisines?: string[];
  createdAt?: string;
  lastLogin?: string;
  subscriptionStatus?: 'free' | 'pro' | 'premium' | 'weekly' | 'monthly' | 'yearly';
  aiUsageCount?: number;
  push_token?: string;
  profile_completed?: boolean;
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

  /**
   * CRITICAL: One-time profile setup
   * Calls POST /api/user/profile-setup
   * Backend enforces 409 conflict if already completed
   */
  async setupProfile(data: {
    age: number;
    gender: string;
    height: number;
    weight: number;
    activityLevel: string;
    goal: string;
    // Extended fields
    goal_aggressiveness?: string;
    workout_level?: string;
    meal_style?: string;
    dietary_restrictions?: string;
    allergies?: string;
    preferred_cuisines?: string;
  }): Promise<{ message: string; user: UserProfile }> {
    const response = await apiClient.post('/user/profile-setup', data);
    return response.data;
  },

  // NEW: Update Profile (for Onboarding)
  async updateProfile(data: {
    age?: number;
    gender?: string;
    height?: number;
    weight?: number;
    activity_level?: string;
    goal?: string;
    profile_completed?: boolean;
    preferences?: any;
  }): Promise<{ message: string; user: UserProfile }> {
    const response = await apiClient.patch('/user/profile', data);
    return response.data;
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

// ============================================================================
// FITNESS API - Fitness Logic Engine endpoints
// ============================================================================

export interface FitnessTargets {
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  goal_type: string;
  activity_level: string;
}

export interface Goal {
  id: number;
  user_id: number;
  goal_type: 'fat_loss' | 'maintenance' | 'muscle_gain' | 'recomposition';
  start_date: string;
  target_date?: string;
  start_weight_kg?: number;
  target_weight_kg?: number;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  is_active: boolean;
}

export interface WeightLog {
  id: number;
  weight_kg: number;
  body_fat_percentage?: number;
  source: 'manual' | 'smart_scale' | 'imported';
  log_date: string;
  logged_at: string;
  notes?: string;
}

export interface WeightTrend {
  trend: 'gaining' | 'losing' | 'stable' | 'insufficient_data';
  first_weight?: number;
  last_weight?: number;
  change_kg?: number;
  weekly_change_kg?: number;
  data_points: number;
}

export interface DailyDecision {
  status: 'on_track' | 'over' | 'under' | 'no_data';
  calorie_gap: number;
  protein_gap_g: number;
  carb_gap_g: number;
  fat_gap_g: number;
  net_calories: number;
  calories_eaten: number;
  calories_burned: number;
  logging_complete: boolean;
  next_action: string;
}

export interface PlateauEvent {
  detected: boolean;
  days_stalled?: number;
  weight_at_detection?: number;
  average_weight_during?: number;
  logging_compliance_percentage?: number;
  reason?: string;
  suggested_adjustment?: number;
}

export const fitnessAPI = {
  // Get user's calculated targets
  async getTargets(): Promise<{ source: string; targets: FitnessTargets }> {
    const response = await apiClient.get('/fitness/targets');
    return response.data;
  },

  // Force recalculation of targets
  async recalculateTargets(): Promise<FitnessTargets> {
    const response = await apiClient.post('/fitness/targets/recalculate');
    return response.data.targets;
  },

  // Set a new goal
  async setGoal(goalData: {
    goal_type: 'fat_loss' | 'maintenance' | 'muscle_gain' | 'recomposition';
    target_weight_kg?: number;
    target_date?: string;
    custom_calorie_adjustment?: number;
  }): Promise<Goal> {
    const response = await apiClient.post('/fitness/goals', goalData);
    return response.data.goal;
  },

  // Get active goal
  async getActiveGoal(): Promise<{ has_goal: boolean; goal?: Goal }> {
    const response = await apiClient.get('/fitness/goals/active');
    return response.data;
  },

  // Log weight
  async logWeight(data: {
    weight_kg: number;
    body_fat_percentage?: number;
    source?: 'manual' | 'smart_scale';
    notes?: string;
    log_date?: string;
  }): Promise<WeightLog> {
    const response = await apiClient.post('/fitness/weight', data);
    return response.data.weight_log;
  },

  // Get weight history
  async getWeightHistory(days: number = 30): Promise<{ logs: WeightLog[]; trend: WeightTrend }> {
    const response = await apiClient.get('/fitness/weight', { params: { days } });
    return response.data;
  },

  // Get today's daily decision
  async getDailyDecision(date?: string): Promise<{
    date: string;
    decision: DailyDecision;
    targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  }> {
    const response = await apiClient.get('/fitness/daily-decision', { params: { date } });
    return response.data;
  },

  // Check for plateau (premium)
  async checkPlateau(): Promise<{ plateau_detected: boolean; plateau?: PlateauEvent }> {
    const response = await apiClient.get('/fitness/plateau-check');
    return response.data;
  },

  // Apply plateau adjustment (premium)
  async applyPlateauAdjustment(plateauId: number): Promise<{ new_calorie_target: number }> {
    const response = await apiClient.post(`/fitness/plateau/${plateauId}/apply`);
    return response.data;
  }
};

// ============================================================================
// BILLING API
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  duration_days: number;
  price_formatted: string;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  tier: 'guest' | 'free' | 'paid';
  subscription?: {
    plan_id: string;
    plan_name: string;
    status: string;
    started_at: string;
    current_period_end: string;
    expires_at: string;
    will_renew: boolean;
    cancelled_at?: string;
  };
  limits: {
    ai_requests_per_day?: number;
    ai_requests_total?: number;
    history_days: number | 'unlimited';
    adaptive_calories: boolean;
    plateau_detection: boolean;
    advanced_insights: boolean;
    export_data: boolean;
  };
}

export interface AIUsageStatus {
  tier: string;
  can_use_ai: boolean;
  used: number;
  remaining: number;
  limit: number;
  reason?: string;
}

export const billingAPI = {
  // Get available plans
  async getPlans(): Promise<{ plans: SubscriptionPlan[]; features: Record<string, any> }> {
    const response = await apiClient.get('/billing/plans');
    return response.data;
  },

  // Get subscription status
  async getStatus(): Promise<SubscriptionStatus> {
    const response = await apiClient.get('/billing/status');
    return response.data;
  },

  // Create subscription (after payment)
  async subscribe(data: {
    plan_id: string;
    provider: 'apple' | 'google' | 'stripe';
    provider_subscription_id?: string;
    receipt?: string;
  }): Promise<{ subscription: any }> {
    const response = await apiClient.post('/billing/subscribe', data);
    return response.data;
  },

  // Cancel subscription
  async cancel(immediate: boolean = false): Promise<any> {
    const response = await apiClient.post('/billing/cancel', { immediate });
    return response.data;
  },

  // Get AI usage
  async getAIUsage(): Promise<AIUsageStatus> {
    const response = await apiClient.get('/billing/ai-usage');
    return response.data;
  },

  // Check if user has access to a specific feature
  async checkFeature(feature: string): Promise<{ has_access: boolean; reason?: string }> {
    const response = await apiClient.get(`/billing/feature/${feature}`);
    return response.data;
  },

  // Restore purchases (for app store)
  async restorePurchases(data: {
    provider: 'apple' | 'google';
    receipt?: string;
  }): Promise<{ restored: boolean; subscription?: any }> {
    const response = await apiClient.post('/billing/restore', data);
    return response.data;
  },
};

// ============================================================================
// WEIGHT API (DEDICATED)
// ============================================================================
export const weightAPI = {
  // Get weight history, stats, trends
  getWeightData: async (): Promise<WeightData> => {
    const response = await apiClient.get('/weight');
    return response.data;
  },

  // Log weight entry
  logWeight: async (weight: number, notes?: string, date?: string): Promise<any> => {
    const response = await apiClient.post('/weight/log', { weight, notes, date });
    return response.data;
  },
};

export interface WeightData {
  currentWeight: number;
  startWeight: number;
  logs: WeightLog[];
  trend: {
    direction: 'gaining' | 'losing' | 'stable' | 'insufficient_data';
    rate: number;
    percentage?: number;
  } | null;
  plateau: {
    isPlateau: boolean;
    reason?: 'no_change' | 'rebound';
  };
  goal: string;
}

// ============================================================================
// HABITS API (Product Redesign)
// ============================================================================
export const habitsAPI = {
  // Get all user habits
  async getUserHabits(): Promise<any[]> {
    const response = await apiClient.get('/habits');
    return response.data.data || [];
  },

  // Get today's habits with completion status
  async getTodayHabits(): Promise<{ date: string; data: any[] }> {
    const response = await apiClient.get('/habits/today');
    return response.data;
  },

  // Create new habit
  async createHabit(data: { habit_name: string; icon?: string; color?: string }): Promise<any> {
    const response = await apiClient.post('/habits', data);
    return response.data;
  },

  // Toggle habit completion for today
  async toggleHabit(habitId: string | number): Promise<any> {
    const response = await apiClient.post(`/habits/${habitId}/toggle`);
    return response.data;
  },

  // Delete habit
  async deleteHabit(habitId: string | number): Promise<any> {
    const response = await apiClient.delete(`/habits/${habitId}`);
    return response.data;
  },
};

// ============================================================================
// TODOS API (Product Redesign)
// ============================================================================
export const todosAPI = {
  // Get today's todos
  async getTodayTodos(): Promise<{ date: string; data: any[] }> {
    const response = await apiClient.get('/todos/today');
    return response.data;
  },

  // Complete/uncomplete a todo
  async completeTodo(todoId: string | number, completed: boolean = true): Promise<any> {
    const response = await apiClient.post(`/todos/${todoId}/complete`, { completed });
    return response.data;
  },
};

// ============================================================================
// TIPS API (Product Redesign)
// ============================================================================
export const tipsAPI = {
  // Get daily tip
  async getDailyTip(): Promise<{ tip: string; category: string }> {
    const response = await apiClient.get('/tips/daily');
    return response.data.data;
  },

  // Get tip history
  async getTipHistory(days: number = 7): Promise<any[]> {
    const response = await apiClient.get(`/tips/history?days=${days}`);
    return response.data.data || [];
  },
};

// ============================================================================
// STREAKS API (Product Redesign)
// ============================================================================
export const streaksAPI = {
  // Get all user streaks
  async getUserStreaks(): Promise<any> {
    const response = await apiClient.get('/streaks');
    return response.data.data;
  },

  // Get streak summary for home screen
  async getSummary(): Promise<{ current: number; overall: number; longest: number }> {
    const response = await apiClient.get('/streaks/summary');
    return response.data.data;
  },
};

// ============================================================================
// POSTURE & PAIN CARE API
// ============================================================================
export const postureCareAPI = {
  // Get exercise library
  async getExercises(targetArea?: string): Promise<any[]> {
    const params = targetArea ? `?target_area=${targetArea}` : '';
    const response = await apiClient.get(`/posture-care/exercises${params}`);
    return response.data.exercises || [];
  },

  // Get user's pain preferences
  async getPainPreferences(): Promise<any[]> {
    const response = await apiClient.get('/posture-care/pain-preferences');
    return response.data.preferences || [];
  },

  // Set user's pain preferences
  async setPainPreferences(painTypes: { pain_type: string; severity?: string }[]): Promise<any> {
    const response = await apiClient.post('/posture-care/pain-preferences', { pain_types: painTypes });
    return response.data;
  },

  // Get today's care plan
  async getDailyPlan(): Promise<any> {
    const response = await apiClient.get('/posture-care/daily-plan');
    return response.data;
  },

  // Complete a session
  async completeSession(data: { duration_seconds: number; exercises_completed: number; feedback?: string }): Promise<any> {
    const response = await apiClient.post('/posture-care/complete', data);
    return response.data;
  },

  // Get session history
  async getHistory(days: number = 30): Promise<any[]> {
    const response = await apiClient.get(`/posture-care/history?days=${days}`);
    return response.data.sessions || [];
  },

  async getSummary(): Promise<any> {
    const response = await apiClient.get('/posture-care/summary');
    return response.data;
  },
};

// ============================================================================
// LIVE WORKOUT API - Real-Time Workout Execution
// ============================================================================
export const liveWorkoutAPI = {
  /**
   * Start a new live workout session based on today's workout
   */
  async start(): Promise<any> {
    const response = await apiClient.post('/live-workout/start');
    return response.data;
  },

  /**
   * Log a completed set during rest period
   * @param data - { exercise_index, reps, weight_kg? }
   */
  async logSet(data: { exercise_index: number; reps: number; weight_kg?: number }): Promise<any> {
    const response = await apiClient.post('/live-workout/log-set', data);
    return response.data;
  },

  /**
   * Get current live workout status (for resuming/checking state)
   */
  async getStatus(): Promise<any> {
    const response = await apiClient.get('/live-workout/status');
    return response.data;
  },

  /**
   * End workout and save to permanent records
   * @param data - { rating?, notes? }
   */
  async end(data?: { rating?: number; notes?: string }): Promise<any> {
    const response = await apiClient.post('/live-workout/end', data || {});
    return response.data;
  },

  /**
   * Skip current exercise and move to next
   */
  async skipExercise(): Promise<any> {
    const response = await apiClient.post('/live-workout/skip-exercise');
    return response.data;
  },

  /**
   * Cancel workout without saving progress
   */
  async cancel(): Promise<any> {
    const response = await apiClient.post('/live-workout/cancel');
    return response.data;
  },
};

// ============================================================================
// YOGA API (New Module)
// ============================================================================
export const yogaAPI = {
  async getCategories(): Promise<any[]> {
    const response = await apiClient.get('/yoga/categories');
    return response.data;
  },

  async getSessions(category?: string, duration?: string): Promise<any[]> {
    const params: any = {};
    if (category) params.category = category;
    if (duration) params.duration = duration;
    const response = await apiClient.get('/yoga/sessions', { params });
    return response.data;
  },

  async getSessionById(id: number): Promise<any> {
    const response = await apiClient.get(`/yoga/session/${id}`);
    return response.data;
  },

  async getTodaySuggestion(): Promise<any> {
    const response = await apiClient.get('/yoga/today');
    return response.data;
  },

  async logSession(data: {
    session_id: number;
    duration_completed_seconds: number;
    completed: boolean;
    mood_rating?: number;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post('/yoga/log', data);
    return response.data;
  }
};

export const api = {
  auth: authAPI,
  food: foodAPI,
  meal: mealAPI,
  exercise: exerciseAPI,
  water: waterAPI,
  health: healthAPI,
  analytics: analyticsAPI,
  user: userAPI,
  fitness: fitnessAPI,
  billing: billingAPI,
  weight: weightAPI,
  habits: habitsAPI,
  todos: todosAPI,
  tips: tipsAPI,
  streaks: streaksAPI,
  postureCare: postureCareAPI,
  recipe: recipeAPI,
  liveWorkout: liveWorkoutAPI,
  yoga: yogaAPI,
};

export default apiClient;

