/**
 * AI Service for React Native - Backend Gemini Integration
 * PRODUCTION HARDENED - Input validation, rate limiting, cost control
 * Connects to FitCoach backend AI endpoints powered by Gemini
 */

import apiClient from './api';
import logger from '../utils/logger';
import SafeAsyncStorage from '../utils/SafeAsyncStorage';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// PRODUCTION HARDENING: AI Safety Constants
// ============================================================================
const MIN_INPUT_LENGTH = 3;
const MAX_INPUT_LENGTH = 2000;
const DAILY_REQUEST_LIMIT = 50;
const COOLDOWN_MS = 2000; // 2 seconds between requests
const STORAGE_KEY = 'ai_rate_limit';

interface RateLimitData {
  date: string; // YYYY-MM-DD
  count: number;
  lastRequestTime: number;
}

class AIService {
  private rateLimitData: RateLimitData | null = null;
  private lastRequestTime: number = 0;

  constructor() {
    this.loadRateLimitData();
  }

  // ============================================================================
  // PRODUCTION HARDENING: Rate Limiting & Cost Control
  // ============================================================================
  
  private async loadRateLimitData(): Promise<void> {
    try {
      const stored = await SafeAsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.rateLimitData = JSON.parse(stored);
        
        // Reset if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (this.rateLimitData && this.rateLimitData.date !== today) {
          this.rateLimitData = { date: today, count: 0, lastRequestTime: 0 };
          this.saveRateLimitData();
        }
      } else {
        const today = new Date().toISOString().split('T')[0];
        this.rateLimitData = { date: today, count: 0, lastRequestTime: 0 };
        this.saveRateLimitData();
      }
    } catch (error) {
      logger.error('Failed to load rate limit data', error);
      const today = new Date().toISOString().split('T')[0];
      this.rateLimitData = { date: today, count: 0, lastRequestTime: 0 };
    }
  }

  private saveRateLimitData(): void {
    if (this.rateLimitData) {
      try {
        SafeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.rateLimitData));
      } catch (error) {
        logger.error('Failed to save rate limit data', error);
      }
    }
  }

  private checkRateLimit(): { allowed: boolean; message?: string } {
    if (!this.rateLimitData) {
      return { allowed: false, message: 'Rate limit data not initialized' };
    }

    // Check daily limit
    if (this.rateLimitData.count >= DAILY_REQUEST_LIMIT) {
      logger.warn('AI daily request limit reached', { count: this.rateLimitData.count });
      return {
        allowed: false,
        message: `You've reached your daily limit of ${DAILY_REQUEST_LIMIT} AI requests. Please try again tomorrow.`,
      };
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimitData.lastRequestTime;
    if (timeSinceLastRequest < COOLDOWN_MS) {
      const waitTime = Math.ceil((COOLDOWN_MS - timeSinceLastRequest) / 1000);
      return {
        allowed: false,
        message: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`,
      };
    }

    return { allowed: true };
  }

  private incrementRateLimit(): void {
    if (this.rateLimitData) {
      this.rateLimitData.count += 1;
      this.rateLimitData.lastRequestTime = Date.now();
      this.saveRateLimitData();
      
      logger.log(`AI request count: ${this.rateLimitData.count}/${DAILY_REQUEST_LIMIT}`);
    }
  }

  // ============================================================================
  // PRODUCTION HARDENING: Input Validation
  // ============================================================================
  
  private validateInput(input: string): { valid: boolean; message?: string } {
    if (!input || typeof input !== 'string') {
      return { valid: false, message: 'Please enter a valid message' };
    }

    const trimmed = input.trim();

    if (trimmed.length < MIN_INPUT_LENGTH) {
      return {
        valid: false,
        message: `Message must be at least ${MIN_INPUT_LENGTH} characters`,
      };
    }

    if (trimmed.length > MAX_INPUT_LENGTH) {
      return {
        valid: false,
        message: `Message must be less than ${MAX_INPUT_LENGTH} characters`,
      };
    }

    return { valid: true };
  }

  /**
   * Get remaining requests for today
   */
  getRemainingRequests(): number {
    if (!this.rateLimitData) return DAILY_REQUEST_LIMIT;
    return Math.max(0, DAILY_REQUEST_LIMIT - this.rateLimitData.count);
  }

  /**
   * Chat with AI using chat history
   * Calls backend /api/ai/ask endpoint
   */
  async chatWithHistory(messages: Array<{role: 'user' | 'assistant'; content: string}>): Promise<string> {
    // Validate input
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Invalid message format');
    }

    const validation = this.validateInput(lastMessage.content);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Check rate limit
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    try {
      logger.log('AI chat request', { messageCount: messages.length });
      
      const response = await apiClient.post('/ai/ask', {
        question: lastMessage.content,
        context: messages.slice(0, -1)
      });

      // Increment rate limit on success
      this.incrementRateLimit();

      logger.log('AI chat response received');
      return response.data.answer || response.data.message || 'Sorry, I couldn\'t generate a response.';
    } catch (error: any) {
      logger.error('AI chat failed', error);
      
      // Handle specific error types
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      if (error.response?.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      if (error.message) {
        throw error; // Re-throw validation/rate limit errors
      }
      
      throw new Error('Sorry, I\'m having trouble connecting right now. Please try again in a moment.');
    }
  }

  /**
   * Simple chat without history
   */
  async chat(userMessage: string, systemPrompt?: string): Promise<string> {
    // Validate input
    const validation = this.validateInput(userMessage);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Check rate limit
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    try {
      logger.log('AI simple chat request');
      
      const response = await apiClient.post('/ai/ask', {
        question: userMessage
      });

      // Increment rate limit on success
      this.incrementRateLimit();

      logger.log('AI chat response received');
      return response.data.answer || response.data.message || 'Sorry, I couldn\'t generate a response.';
    } catch (error: any) {
      logger.error('AI chat failed', error);
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      if (error.response?.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      if (error.message) {
        throw error;
      }
      
      throw new Error('Sorry, I\'m having trouble connecting right now. Please try again in a moment.');
    }
  }

  /**
   * Get daily AI insights
   */
  async getInsights(): Promise<any> {
    // Rate limit check (insights don't require user input validation)
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    try {
      logger.log('AI insights request');
      
      const response = await apiClient.get('/ai/insights');
      
      // Increment rate limit on success
      this.incrementRateLimit();
      
      logger.log('AI insights received');
      return response.data;
    } catch (error: any) {
      logger.error('AI insights failed', error);
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      if (error.response?.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Get meal suggestions
   */
  async getMealSuggestions(mealType: string, calorieTarget?: number, preferences?: string[]): Promise<string> {
    // Rate limit check
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    try {
      logger.log('AI meal suggestions request', { mealType });
      
      const response = await apiClient.post('/ai/meal-suggestions', {
        mealType,
        calorieTarget,
        dietaryPreferences: preferences
      });

      // Increment rate limit on success
      this.incrementRateLimit();

      logger.log('AI meal suggestions received');
      return response.data.suggestions || response.data.message || 'No suggestions available.';
    } catch (error: any) {
      logger.error('AI meal suggestions failed', error);
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      if (error.response?.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      
      throw new Error('Unable to get meal suggestions right now.');
    }
  }

  /**
   * Analyze food item
   */
  async analyzeFoodItem(foodName: string): Promise<string> {
    // Validate input
    const validation = this.validateInput(foodName);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Rate limit check
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    try {
      logger.log('AI food analysis request', { foodName });
      
      const response = await apiClient.post('/ai/recognize-food', {
        foodDescription: foodName
      });

      // Increment rate limit on success
      this.incrementRateLimit();

      logger.log('AI food analysis received');
      return response.data.analysis || response.data.message || 'Unable to analyze this food.';
    } catch (error: any) {
      logger.error('AI food analysis failed', error);
      
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      if (error.response?.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      
      throw new Error('Unable to analyze this food right now.');
    }
  }

  /**
   * Get fitness advice
   */
  async getFitnessAdvice(query: string, userContext?: any): Promise<string> {
    return this.chat(query);
  }

  /**
   * Get workout plan
   */
  async getWorkoutPlan(goals: string, fitnessLevel?: string): Promise<string> {
    const query = `Create a workout plan for: ${goals}, fitness level: ${fitnessLevel || 'beginner'}`;
    return this.chat(query);
  }

  /**
   * Get hydration advice
   */
  async getHydrationAdvice(currentIntake: number, goal: number): Promise<string> {
    const query = `Current water intake: ${currentIntake}L, Goal: ${goal}L. Give me hydration tips.`;
    return this.chat(query);
  }
}

// Export singleton
const instance = new AIService();
export default instance;
