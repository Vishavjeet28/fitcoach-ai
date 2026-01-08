import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { analyticsAPI, handleAPIError, userAPI } from '../services/api';

const colors = {
  background: '#0F1419',
  surface: '#1A1F26',
  primary: '#13ec80',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  progressBg: '#2A3038',
  lowValue: '#FB7185',
  goodValue: '#13ec80',
};

interface TodayData {
  userName: string;
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  water: { consumed: number; target: number };
  exercise: number;
  streak: number;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayData, setTodayData] = useState<TodayData>({
    userName: 'User',
    calories: { consumed: 0, target: 2000 },
    protein: { consumed: 0, target: 150 },
    water: { consumed: 0, target: 3.0 },
    exercise: 0,
    streak: 0,
  });
  const [aiHint, setAiHint] = useState<string | null>(null);

  const fetchHomeData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [dailyData, profileData, progressData] = await Promise.all([
        analyticsAPI.getDailySummary(),
        userAPI.getProfile().catch(() => ({ user: { name: 'User' } })),
        analyticsAPI.getProgress().catch(() => ({ currentStreak: 0 })),
      ]);

      const summary = dailyData.summary;

      // Calculate targets
      const calorieTarget = summary.calorieTarget || 2000;
      const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
      const waterTarget = (summary.waterTargetMl || 3000) / 1000;

      const data: TodayData = {
        userName: ((profileData as any).user?.name || (profileData as any).name || 'User'),
        calories: {
          consumed: summary.totalCalories || 0,
          target: calorieTarget,
        },
        protein: {
          consumed: Math.round(summary.totalProtein || 0),
          target: proteinTarget,
        },
        water: {
          consumed: (summary.totalWaterMl || 0) / 1000,
          target: waterTarget,
        },
        exercise: summary.totalExerciseCalories || 0,
        streak: progressData.currentStreak || 0,
      };

      setTodayData(data);

      // Generate AI hint if needed
      const proteinPercent = (data.protein.consumed / data.protein.target) * 100;
      const waterPercent = (data.water.consumed / data.water.target) * 100;
      const caloriePercent = (data.calories.consumed / data.calories.target) * 100;

      let hint: string | null = null;
      
      if (proteinPercent < 50 && caloriePercent > 20) {
        hint = 'Protein is low today — add curd, eggs, or dal.';
      } else if (waterPercent < 40 && caloriePercent > 20) {
        hint = 'Remember to stay hydrated — drink more water.';
      } else if (caloriePercent > 100) {
        hint = 'You have hit your calorie goal. Nice work!';
      } else if (caloriePercent < 20 && getCurrentHour() > 18) {
        hint = 'Log your evening meal to track your full day.';
      }

      setAiHint(hint);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        console.error('Error fetching home data:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHomeData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  const getGreeting = (): string => {
    const hour = getCurrentHour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentHour = (): number => {
    return new Date().getHours();
  };

  const getFormattedDate = (): string => {
    const date = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Greeting + Date */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          {getGreeting()}, {todayData.userName.split(' ')[0]}
        </Text>
        <Text style={styles.date}>{getFormattedDate()}</Text>
      </View>

      {/* Today Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today</Text>

        {/* Calories */}
        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Calories</Text>
            <Text style={styles.metricValue}>
              {todayData.calories.consumed}
              <Text style={styles.metricTarget}> / {todayData.calories.target}</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (todayData.calories.consumed / todayData.calories.target) * 100,
                    100
                  )}%`,
                  backgroundColor:
                    todayData.calories.consumed < todayData.calories.target * 0.3
                      ? colors.lowValue
                      : colors.goodValue,
                },
              ]}
            />
          </View>
        </View>

        {/* Protein */}
        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Protein</Text>
            <Text style={styles.metricValue}>
              {todayData.protein.consumed}g
              <Text style={styles.metricTarget}> / {todayData.protein.target}g</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (todayData.protein.consumed / todayData.protein.target) * 100,
                    100
                  )}%`,
                  backgroundColor:
                    todayData.protein.consumed < todayData.protein.target * 0.3
                      ? colors.lowValue
                      : colors.goodValue,
                },
              ]}
            />
          </View>
        </View>

        {/* Water */}
        <View style={styles.metricRow}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Water</Text>
            <Text style={styles.metricValue}>
              {todayData.water.consumed.toFixed(1)}L
              <Text style={styles.metricTarget}> / {todayData.water.target.toFixed(1)}L</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (todayData.water.consumed / todayData.water.target) * 100,
                    100
                  )}%`,
                  backgroundColor:
                    todayData.water.consumed < todayData.water.target * 0.3
                      ? colors.lowValue
                      : colors.goodValue,
                },
              ]}
            />
          </View>
        </View>

        {/* Exercise */}
        <View style={[styles.metricRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Exercise</Text>
            <Text style={styles.metricValue}>
              {todayData.exercise}
              <Text style={styles.metricTarget}> kcal burned</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Primary Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={() => navigation.navigate('FoodLog' as never)}
      >
        <Text style={styles.primaryButtonText}>+ Log Food</Text>
      </Pressable>

      {/* AI Hint */}
      {aiHint && (
        <View style={styles.aiHintCard}>
          <Text style={styles.aiHintText}>{aiHint}</Text>
        </View>
      )}

      {/* Streak */}
      {todayData.streak > 0 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>🔥 {todayData.streak}-day streak</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },

  // Greeting
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  metricRow: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.progressBg,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  metricTarget: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.progressBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Primary Button
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },

  // AI Hint
  aiHintCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  aiHintText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Streak
  streakContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  streakText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});

export default HomeScreen;
