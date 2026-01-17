// For local testing, use your Mac's IP address instead of localhost
// Find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
const API_BASE_URL = 'http://192.168.31.240:5001/api';

// Default user ID (in a real app, this would come from authentication)
const DEFAULT_USER_ID = 1;

class API {
  // User endpoints
  static async getUser(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  }

  static async updateUser(userId = DEFAULT_USER_ID, data: any) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  }

  // Chat endpoints
  static async getChatHistory(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/chat/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch chat history');
    return response.json();
  }

  static async sendMessage(message: string, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/chat/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    return response.json();
  }

  static async clearChat(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/chat/${userId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to clear chat');
    return response.json();
  }

  // Meal endpoints
  static async getMeals(userId = DEFAULT_USER_ID, date?: string) {
    const url = date 
      ? `${API_BASE_URL}/meals/${userId}?date=${date}`
      : `${API_BASE_URL}/meals/${userId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch meals');
    return response.json();
  }

  static async logMeal(meal: any, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meals/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meal)
    });
    if (!response.ok) throw new Error('Failed to log meal');
    return response.json();
  }

  static async deleteMeal(mealId: number, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meals/${userId}/${mealId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete meal');
    return response.json();
  }

  // Workout endpoints
  static async getWorkouts(userId = DEFAULT_USER_ID, date?: string) {
    const url = date 
      ? `${API_BASE_URL}/workouts/${userId}?date=${date}`
      : `${API_BASE_URL}/workouts/${userId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch workouts');
    return response.json();
  }

  static async logWorkout(workout: any, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/workouts/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workout)
    });
    if (!response.ok) throw new Error('Failed to log workout');
    return response.json();
  }

  static async deleteWorkout(workoutId: number, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/workouts/${userId}/${workoutId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete workout');
    return response.json();
  }

  // Water intake endpoints
  static async getWaterIntake(userId = DEFAULT_USER_ID, date?: string) {
    const url = date 
      ? `${API_BASE_URL}/water/${userId}?date=${date}`
      : `${API_BASE_URL}/water/${userId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch water intake');
    return response.json();
  }

  static async logWater(amount: number, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/water/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (!response.ok) throw new Error('Failed to log water');
    return response.json();
  }

  // Recipe endpoints
  static async getRecipes(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/recipes/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch recipes');
    return response.json();
  }

  static async generateRecipe(prompt: string, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/recipes/${userId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('Failed to generate recipe');
    return response.json();
  }

  static async deleteRecipe(recipeId: number, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/recipes/${userId}/${recipeId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete recipe');
    return response.json();
  }

  // Dashboard endpoint
  static async getDashboard(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/dashboard/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  }

  // ============================================================================
  // NEW ENDPOINTS FOR TODAY SCREEN & WORKOUT/MEAL SYSTEMS
  // ============================================================================

  // Daily Nutrition Status
  static async getDailyNutrition(date: string, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/analytics/daily?user_id=${userId}&date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch daily nutrition');
    return response.json();
  }

  // Get daily meals by meal type
  static async getDailyMeals(date: string, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meals/daily?user_id=${userId}&date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch daily meals');
    return response.json();
  }

  // Workout System APIs
  static async getTodayWorkout(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/workout/daily?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch today\'s workout');
    return response.json();
  }

  static async getWorkoutTemplates() {
    const response = await fetch(`${API_BASE_URL}/workout/templates`);
    if (!response.ok) throw new Error('Failed to fetch workout templates');
    return response.json();
  }

  static async recommendWorkoutProgram(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/workout/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!response.ok) throw new Error('Failed to recommend workout program');
    return response.json();
  }

  static async logWorkoutSession(sessionData: any, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/workout/log-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sessionData, user_id: userId })
    });
    if (!response.ok) throw new Error('Failed to log workout session');
    return response.json();
  }

  static async getWorkoutHistory(userId = DEFAULT_USER_ID, limit = 10) {
    const response = await fetch(`${API_BASE_URL}/workout/history?user_id=${userId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch workout history');
    return response.json();
  }

  // Meal Recommendation System APIs
  static async getMealRecommendation(mealType: string, date: string, preferences: any = {}, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meal-recommendations/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        meal_type: mealType,
        date: date,
        preferences: preferences
      })
    });
    if (!response.ok) throw new Error('Failed to get meal recommendation');
    return response.json();
  }

  static async getRemainingMacros(date: string, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meal-recommendations/remaining?user_id=${userId}&date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch remaining macros');
    return response.json();
  }

  static async swapMealMacros(swapData: any, userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/meal-recommendations/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...swapData, user_id: userId })
    });
    if (!response.ok) throw new Error('Failed to swap meal macros');
    return response.json();
  }

  // Analytics APIs
  static async getWeeklyAnalytics(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/analytics/weekly?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch weekly analytics');
    return response.json();
  }

  static async getMonthlyAnalytics(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/analytics/monthly?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch monthly analytics');
    return response.json();
  }

  static async getYearlyAnalytics(userId = DEFAULT_USER_ID) {
    const response = await fetch(`${API_BASE_URL}/analytics/yearly?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch yearly analytics');
    return response.json();
  }
}

export default API;
