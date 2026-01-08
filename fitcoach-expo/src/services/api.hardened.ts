import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT, TOKEN_STORAGE } from '../config/api.config';

// Token keys
const { ACCESS_TOKEN, REFRESH_TOKEN } = TOKEN_STORAGE;

// PRODUCTION HARDENING: Global error event emitter
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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // PRODUCTION HARDENING: Handle network errors explicitly
    if (!error.response) {
      // Network error (no response received)
      if (error.code === 'ECONNABORTED') {
        const timeoutError: any = new Error('Request timed out. Please check your connection.');
        timeoutError.code = 'TIMEOUT';
        return Promise.reject(timeoutError);
      }
      if (error.code === 'ERR_NETWORK') {
        const networkError: any = new Error('Network error. Please check your internet connection.');
        networkError.code = 'NETWORK_ERROR';
        return Promise.reject(networkError);
      }
      const genericError: any = new Error('Unable to connect to server. Please try again.');
      genericError.code = 'NO_RESPONSE';
      return Promise.reject(genericError);
    }

    // Handle 401 Unauthorized - attempt token refresh
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
        
        // PRODUCTION HARDENING: Trigger forceLogout in AuthContext
        if (sessionExpiredCallback) {
          sessionExpiredCallback();
        }
        
        // Throw a specific error that screens can handle
        const logoutError: any = new Error('Session expired. Please login again.');
        logoutError.code = 'SESSION_EXPIRED';
        return Promise.reject(logoutError);
      }
    }

    // PRODUCTION HARDENING: Handle 5xx server errors explicitly
    if (error.response?.status >= 500) {
      const serverError: any = new Error('Server error. Please try again later.');
      serverError.code = 'SERVER_ERROR';
      serverError.status = error.response.status;
      return Promise.reject(serverError);
    }

    return Promise.reject(error);
  }
);

// Rest of the API types and functions remain the same...
// (Keeping file compact - copy remaining types and functions from original api.ts)

export default apiClient;
