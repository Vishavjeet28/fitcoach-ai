/**
 * AI Coach Screen - Example Implementation
 * Shows how to integrate Gemini AI features in your React Native app
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5001'; // Change to your backend URL

const AICoachScreen = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [mealSuggestions, setMealSuggestions] = useState(null);
  const [insights, setInsights] = useState(null);

  // Helper function to make authenticated API calls
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return null;
      }

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert('Error', error.message);
      return null;
    }
  };

  // 1. Ask AI Coach a question
  const handleAskQuestion = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    setLoading(true);
    setAnswer('');

    const data = await apiCall('/api/ai/ask', 'POST', { question });
    
    if (data) {
      setAnswer(data.answer);
    }

    setLoading(false);
  };

  // 2. Get meal suggestions
  const handleGetMealSuggestions = async () => {
    setLoading(true);

    const data = await apiCall('/api/ai/meal-suggestions', 'POST', {
      dietaryRestrictions: [], // Add your preferences
      preferredCuisines: ['Indian', 'Mediterranean'],
    });

    if (data) {
      setMealSuggestions(data.suggestions);
    }

    setLoading(false);
  };

  // 3. Get personalized insights
  const handleGetInsights = async () => {
    setLoading(true);

    const data = await apiCall('/api/ai/insights', 'GET');

    if (data) {
      setInsights(data.insights);
    }

    setLoading(false);
  };

  // 4. Recognize food from description
  const recognizeFood = async (description) => {
    const data = await apiCall('/api/ai/recognize-food', 'POST', { description });
    
    if (data && data.food) {
      return data.food;
    }
    
    return null;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🤖 AI Fitness Coach</Text>

      {/* Ask Question Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ask Your Coach</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., How much protein should I eat?"
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleAskQuestion}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Thinking...' : 'Ask AI'}
          </Text>
        </TouchableOpacity>

        {answer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerTitle}>💡 Answer:</Text>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGetMealSuggestions}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🍽️ Get Meal Ideas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGetInsights}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>📊 Get Daily Insights</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Meal Suggestions Display */}
      {mealSuggestions && mealSuggestions.meals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Meal Suggestions</Text>
          {mealSuggestions.meals.map((meal, index) => (
            <View key={index} style={styles.mealCard}>
              <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealDescription}>{meal.description}</Text>
              <View style={styles.macros}>
                <Text style={styles.macroText}>🔥 {meal.calories} cal</Text>
                <Text style={styles.macroText}>💪 {meal.protein}g protein</Text>
                <Text style={styles.macroText}>🍚 {meal.carbs}g carbs</Text>
                <Text style={styles.macroText}>🥑 {meal.fat}g fat</Text>
              </View>
              <Text style={styles.mealTips}>💡 {meal.tips}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Insights Display */}
      {insights && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Assessment</Text>
            <Text style={styles.insightText}>{insights.assessment}</Text>

            <Text style={styles.insightTitle}>✅ Strengths</Text>
            {insights.strengths?.map((strength, index) => (
              <Text key={index} style={styles.insightText}>• {strength}</Text>
            ))}

            <Text style={styles.insightTitle}>📈 Areas to Improve</Text>
            {insights.improvements?.map((improvement, index) => (
              <Text key={index} style={styles.insightText}>• {improvement}</Text>
            ))}

            <Text style={styles.insightTitle}>🎯 Recommendation</Text>
            <Text style={styles.insightText}>{insights.recommendation}</Text>

            {insights.motivationalTip && (
              <View style={styles.motivationBox}>
                <Text style={styles.motivationText}>
                  💪 {insights.motivationalTip}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  answerBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  answerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  mealCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mealType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  mealDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  macros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  macroText: {
    fontSize: 12,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  mealTips: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  insightCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#333',
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  motivationBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  motivationText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AICoachScreen;

// ============================================
// USAGE EXAMPLES FOR OTHER SCREENS
// ============================================

/*

// Example 1: Smart Food Logger with AI
const SmartFoodLogger = () => {
  const handleSmartLog = async () => {
    const description = "I had a bowl of oatmeal with berries";
    const token = await AsyncStorage.getItem('accessToken');
    
    const response = await fetch('http://localhost:5001/api/ai/recognize-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ description })
    });
    
    const data = await response.json();
    
    if (data.food) {
      // Auto-fill food log form with AI-recognized data
      setFoodName(data.food.foodName);
      setCalories(data.food.calories);
      setProtein(data.food.protein);
      setCarbs(data.food.carbs);
      setFat(data.food.fat);
    }
  };
};

// Example 2: Daily Insight Badge on Dashboard
const DashboardInsightBadge = () => {
  const [insight, setInsight] = useState(null);
  
  useEffect(() => {
    loadInsight();
  }, []);
  
  const loadInsight = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/insights', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setInsight(data.insights);
  };
  
  return (
    <View style={styles.insightBadge}>
      <Text style={styles.badgeTitle}>💡 Today's Tip</Text>
      <Text style={styles.badgeText}>{insight?.motivationalTip}</Text>
    </View>
  );
};

// Example 3: AI-Powered Meal Planner Tab
const MealPlannerTab = () => {
  const [meals, setMeals] = useState([]);
  
  const generatePlan = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/meal-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        dietaryRestrictions: ['vegetarian'],
        preferredCuisines: ['Indian', 'Italian']
      })
    });
    
    const data = await response.json();
    setMeals(data.suggestions.meals);
  };
  
  return (
    <View>
      <Button title="Generate Today's Meals" onPress={generatePlan} />
      {meals.map(meal => <MealCard key={meal.type} meal={meal} />)}
    </View>
  );
};

*/
