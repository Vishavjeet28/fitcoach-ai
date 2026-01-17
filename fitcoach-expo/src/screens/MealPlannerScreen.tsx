import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  backgroundDark: '#FAFAFA', // Light BG
  surfaceDark: '#FFFFFF',    // White Surface
  textPrimary: '#1e293b',    // Slate 800
  textSecondary: '#64748b',  // Slate 500
  textTertiary: '#94a3b8',   // Slate 400
  border: '#e2e8f0'
};

export default function MealPlannerScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const getMealPlan = async () => {
    setLoading(true);
    try {
      // Calls AI service which hits backend /api/ai/meals
      const result = await AIService.getMealSuggestions('dinner');
      // Format the result slightly if it's just raw text, or rely on markdown display if available
      setSuggestion(result);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch meal plan. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Meal Planner</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="food-apple-outline" size={48} color={colors.primary} style={styles.icon} />
          <Text style={styles.description}>
            Get personalized meal suggestions based on your caloric goals and preferences.
          </Text>

          <TouchableOpacity onPress={getMealPlan} disabled={loading} style={styles.buttonContainer}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{loading ? 'Generating Idea...' : 'Suggest a Meal'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {(loading || suggestion) && (
          <View style={styles.resultCard}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Analyzing your nutrition profile...</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.resultTitle}>Suggestion</Text>
                <Text style={styles.resultText}>{suggestion}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backButton: {
    marginRight: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary
  },
  scrollContent: {
    padding: 20
  },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20
  },
  icon: {
    marginBottom: 16
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24
  },
  buttonContainer: {
    width: '100%'
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16
  },
  resultCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    minHeight: 200
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    color: colors.textTertiary,
    marginTop: 12
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12
  },
  resultText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 26
  }
});
