# Mobile App - Complete API Integration Guide

## 🎯 Current Status

### ✅ Backend API (100% Complete)
- **33+ endpoints** fully implemented and tested
- All endpoints have input validation
- XSS protection enabled
- Rate limiting configured
- GDPR compliant

### ✅ Mobile App Auth (100% Complete)
- Login/Register working with real API
- JWT token management
- Auto-refresh mechanism
- Secure storage with AsyncStorage

### ⚠️ Mobile App Data Screens (0% - PENDING)
- Dashboard shows **mock data**
- Food/Exercise/Water screens not connected to API
- AI features not integrated

---

## 📋 What Needs to Be Done

### 1. Update API Service (`src/services/api.ts`)

The API service already exists but needs to be expanded to include all the new endpoints:

```typescript
// Add these methods to src/services/api.ts

class ApiService {
  // ... existing auth methods ...

  // Food Logging
  async getFoodLogs(startDate?: string, endDate?: string) {
    return this.get('/food/logs', { startDate, endDate });
  }

  async logFood(foodData: {
    foodName: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    loggedAt?: string;
  }) {
    return this.post('/food/logs', foodData);
  }

  async updateFoodLog(id: number, updates: { servingSize?: number; mealType?: string }) {
    return this.put(`/food/logs/${id}`, updates);
  }

  async deleteFoodLog(id: number) {
    return this.delete(`/food/logs/${id}`);
  }

  async searchFoods(query: string, limit?: number) {
    return this.get('/food/search', { q: query, limit });
  }

  async getNutritionTotals(date?: string) {
    return this.get('/food/totals', { date });
  }

  // Exercise Logging
  async getExerciseLogs(startDate?: string, endDate?: string) {
    return this.get('/exercise/logs', { startDate, endDate });
  }

  async logExercise(exerciseData: {
    exerciseName: string;
    duration: number;
    intensity?: 'light' | 'moderate' | 'vigorous';
    caloriesBurned?: number;
    notes?: string;
    loggedAt?: string;
  }) {
    return this.post('/exercise/logs', exerciseData);
  }

  async updateExerciseLog(id: number, updates: any) {
    return this.put(`/exercise/logs/${id}`, updates);
  }

  async deleteExerciseLog(id: number) {
    return this.delete(`/exercise/logs/${id}`);
  }

  async searchExercises(query: string, type?: string, limit?: number) {
    return this.get('/exercise/search', { q: query, type, limit });
  }

  async getExerciseTotals(date?: string) {
    return this.get('/exercise/totals', { date });
  }

  // Water Tracking
  async getWaterLogs(startDate?: string, endDate?: string) {
    return this.get('/water/logs', { startDate, endDate });
  }

  async logWater(amount: number) {
    return this.post('/water/logs', { amount });
  }

  async deleteWaterLog(id: number) {
    return this.delete(`/water/logs/${id}`);
  }

  async getWaterTotals(date?: string) {
    return this.get('/water/totals', { date });
  }

  async getWaterHistory(days?: number) {
    return this.get('/water/history', { days });
  }

  // Analytics
  async getDailySummary(date?: string) {
    return this.get('/analytics/daily', { date });
  }

  async getWeeklyTrends() {
    return this.get('/analytics/weekly');
  }

  async getMonthlySummary() {
    return this.get('/analytics/monthly');
  }

  async getProgressOverview() {
    return this.get('/analytics/progress');
  }

  // AI Features
  async getMealSuggestions(mealType?: string, calorieTarget?: number) {
    return this.post('/ai/meal-suggestions', { mealType, calorieTarget });
  }

  async recognizeFood(description: string) {
    return this.post('/ai/recognize-food', { description });
  }

  async getInsights(days?: number) {
    return this.get('/ai/insights', { days });
  }

  async askFitnessQuestion(question: string, context?: string) {
    return this.post('/ai/ask', { question, context });
  }

  async getInsightsHistory(limit?: number, type?: string) {
    return this.get('/ai/history', { limit, type });
  }

  async markInsightRead(id: number) {
    return this.patch(`/ai/insights/${id}/read`);
  }

  // User Management
  async getUserProfile() {
    return this.get('/user/profile');
  }

  async updatePreferences(preferences: {
    dietaryRestrictions?: string[];
    favoriteCuisines?: string[];
    dislikedFoods?: string[];
    waterGoal?: number;
    calorieGoal?: number;
    proteinGoal?: number;
    carbsGoal?: number;
    fatsGoal?: number;
  }) {
    return this.patch('/user/preferences', preferences);
  }

  async getAccountStats() {
    return this.get('/user/stats');
  }

  async exportUserData() {
    return this.get('/user/export-data');
  }
}
```

---

### 2. Update DashboardScreen (`src/screens/DashboardScreen.tsx`)

Replace mock data with real API calls:

```typescript
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get daily summary from analytics
      const dailySummary = await apiService.getDailySummary();
      
      // Get nutrition totals
      const nutritionTotals = await apiService.getNutritionTotals();
      
      // Get water totals
      const waterTotals = await apiService.getWaterTotals();
      
      // Get exercise totals
      const exerciseTotals = await apiService.getExerciseTotals();

      // Transform API data to dashboard format
      setDashboardData({
        user: {
          name: 'User', // Get from user profile API
          avatar: 'https://...' // Get from profile
        },
        dailyCalories: {
          consumed: nutritionTotals.totals.calories || 0,
          target: nutritionTotals.goals.calories || 2000,
          burned: exerciseTotals.totals.caloriesBurned || 0,
          remaining: (nutritionTotals.goals.calories || 2000) - 
                    (nutritionTotals.totals.calories || 0) + 
                    (exerciseTotals.totals.caloriesBurned || 0)
        },
        macros: {
          protein: {
            consumed: nutritionTotals.totals.protein || 0,
            target: nutritionTotals.goals.protein || 150
          },
          carbs: {
            consumed: nutritionTotals.totals.carbs || 0,
            target: nutritionTotals.goals.carbs || 200
          },
          fat: {
            consumed: nutritionTotals.totals.fats || 0,
            target: nutritionTotals.goals.fats || 65
          }
        },
        water: {
          consumed: waterTotals.total / 1000, // Convert ml to L
          target: waterTotals.goal / 1000
        }
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ... rest of your UI code using dashboardData
};
```

---

### 3. Create/Update Food Logging Screen

Update `src/screens/FoodLogScreen.tsx`:

```typescript
const FoodLogScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const results = await apiService.searchFoods(searchQuery, 20);
      setSearchResults(results.foods);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Failed to search foods');
    } finally {
      setLoading(false);
    }
  };

  const handleLogFood = async (food: any) => {
    try {
      await apiService.logFood({
        foodName: food.name,
        servingSize: food.serving_size,
        servingUnit: food.serving_unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber,
        mealType: 'breakfast' // Let user select
      });
      
      Alert.alert('Success', 'Food logged successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to log food:', error);
      Alert.alert('Error', 'Failed to log food');
    }
  };

  // ... UI code
};
```

---

### 4. Create/Update Exercise Logging Screen

Update `src/screens/ExerciseLogScreen.tsx`:

```typescript
const ExerciseLogScreen = () => {
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('moderate');

  const handleLogExercise = async () => {
    if (!exerciseName || !duration) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await apiService.logExercise({
        exerciseName,
        duration: parseInt(duration),
        intensity: intensity as 'light' | 'moderate' | 'vigorous'
      });

      Alert.alert('Success', 'Exercise logged successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to log exercise:', error);
      Alert.alert('Error', 'Failed to log exercise');
    }
  };

  // ... UI code
};
```

---

### 5. Create/Update Water Logging Screen

Update `src/screens/WaterLogScreen.tsx`:

```typescript
const WaterLogScreen = () => {
  const [amount, setAmount] = useState(250); // Default 250ml

  const handleLogWater = async () => {
    try {
      await apiService.logWater(amount);
      Alert.alert('Success', `Logged ${amount}ml of water`);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to log water:', error);
      Alert.alert('Error', 'Failed to log water');
    }
  };

  const handleQuickLog = async (quickAmount: number) => {
    try {
      await apiService.logWater(quickAmount);
      Alert.alert('Success', `Logged ${quickAmount}ml of water`);
    } catch (error) {
      Alert.alert('Error', 'Failed to log water');
    }
  };

  // ... UI code with quick buttons for 250ml, 500ml, 750ml, 1000ml
};
```

---

### 6. Update AI Coach Screen (Optional)

If you want to integrate the backend AI features:

```typescript
const CoachScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      // Option 1: Use AI Q&A endpoint
      const response = await apiService.askFitnessQuestion(message);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);

      // Option 2: Use food recognition if user is logging food
      if (message.toLowerCase().includes('ate') || message.toLowerCase().includes('food')) {
        const foodData = await apiService.recognizeFood(message);
        // Show nutrition info and offer to log it
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I had trouble processing that. Please try again.' 
      }]);
    }
  };

  // ... UI code
};
```

---

## 🎯 Step-by-Step Implementation Plan

### Phase 1: Dashboard Integration (2-4 hours)
1. ✅ Expand API service with all new methods
2. ✅ Update DashboardScreen to fetch real data
3. ✅ Add loading and error states
4. ✅ Test with backend running

### Phase 2: Food Logging (3-5 hours)
1. ✅ Update FoodLogScreen with search functionality
2. ✅ Add food logging form
3. ✅ Connect to food API endpoints
4. ✅ Update dashboard after logging

### Phase 3: Exercise Logging (2-3 hours)
1. ✅ Update ExerciseLogScreen
2. ✅ Add exercise search/entry
3. ✅ Connect to exercise API endpoints
4. ✅ Update dashboard after logging

### Phase 4: Water Tracking (1-2 hours)
1. ✅ Update WaterLogScreen
2. ✅ Add quick log buttons
3. ✅ Connect to water API endpoints
4. ✅ Update dashboard after logging

### Phase 5: Polish & Testing (2-3 hours)
1. ✅ Add pull-to-refresh on dashboard
2. ✅ Add error handling everywhere
3. ✅ Test all flows end-to-end
4. ✅ Fix any bugs

---

## 🚀 Quick Start

### 1. Make sure backend is running:
```bash
cd backend
node src/server.js
# Should see: "🚀 FitCoach Backend running on port 5001"
```

### 2. Update API base URL in mobile app:
```typescript
// src/config/api.config.ts
export const API_CONFIG = {
  BASE_URL: 'http://192.168.31.240:5001/api', // Your local IP
  TIMEOUT: 10000,
};
```

### 3. Start implementing screen by screen:
- Start with Dashboard (most important)
- Then Food Logging
- Then Exercise
- Then Water

---

## 📝 Testing Checklist

- [ ] Dashboard loads real data
- [ ] Food search works
- [ ] Can log food entry
- [ ] Dashboard updates after food log
- [ ] Can log exercise
- [ ] Dashboard updates after exercise
- [ ] Can log water
- [ ] Dashboard updates after water log
- [ ] Error messages show properly
- [ ] Loading states work
- [ ] Pull-to-refresh works

---

## 🎉 Result

Once complete, you'll have:
- ✅ Fully functional mobile app connected to real backend
- ✅ No more mock data
- ✅ Real-time updates
- ✅ Proper error handling
- ✅ Loading states
- ✅ Production-ready mobile app!

---

**Estimated Total Time**: 10-15 hours of focused development

**Backend Status**: 100% Ready ✅  
**Mobile App Status**: Waiting for integration ⏳  
**Documentation**: Complete ✅
