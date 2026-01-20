import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { analyticsAPI, foodAPI, exerciseAPI, handleAPIError } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  backgroundDark: '#FAFAFA', // Light BG
  surfaceDark: '#FFFFFF',    // White Surface
  textPrimary: '#1e293b',    // Slate 800
  textSecondary: '#64748b',  // Slate 500
  textTertiary: '#94a3b8',   // Slate 400
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  purple: '#A855F7',
  orange: '#F97316',
  border: '#e2e8f0',
};

interface HistoryEntry {
  id: number;
  date: string;
  type: 'food' | 'exercise' | 'weight';
  description: string;
  calories?: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  weight?: number;
  exercise?: {
    duration: number;
    caloriesBurned: number;
  };
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { token, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'food' | 'exercise' | 'weight'>('all');

  // Use focus effect to reload data whenever screen appears
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading) { console.log('📜 [HISTORY] Auth ready, loading history'); loadHistory(); }
    }, [authLoading])
  );

  const loadHistory = async () => {
    console.log('📜 [HISTORY] Fetching history data...');

    // Check for Guest Mode
    if (!token) {
      console.log('👤 [HISTORY] Guest mode detected - skipping API calls');
      setLoading(false);
      setHistory([]); // Empty history
      return;
    }

    try {
      setLoading(true);

      // Calculate date range for last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      const endDate = end.toISOString().split('T')[0];
      const startDate = start.toISOString().split('T')[0];

      // Fetch logs in parallel
      const [foodLogs, exerciseLogs] = await Promise.all([
        foodAPI.getLogs(startDate, endDate),
        exerciseAPI.getLogs(startDate, endDate)
      ]);

      const transformedHistory: HistoryEntry[] = [];

      // Process Food Logs
      if (Array.isArray(foodLogs)) {
        foodLogs.forEach(log => {
          transformedHistory.push({
            id: log.id,
            date: log.meal_date, // "YYYY-MM-DD"
            type: 'food',
            description: log.custom_food_name || log.food_name || 'Food Item',
            calories: log.calories,
            macros: {
              protein: log.protein,
              carbs: log.carbs,
              fat: log.fat
            }
          });
        });
      }

      // Process Exercise Logs
      if (Array.isArray(exerciseLogs)) {
        exerciseLogs.forEach(log => {
          transformedHistory.push({
            id: log.id + 100000, // Offset ID to avoid collision
            date: log.workout_date,
            type: 'exercise',
            description: log.custom_exercise_name || log.exercise_name || 'Workout',
            exercise: {
              duration: log.duration_minutes,
              caloriesBurned: log.calories_burned
            }
          });
        });
      }

      // Sort by date descending (newest first)
      transformedHistory.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setHistory(transformedHistory);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        console.error('Failed to load history:', error);
        // Don't show alert on every load failure to avoid annoyance, just log
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (selectedTab === 'all') {
      return history;
    }
    return history.filter(entry => entry.type === selectedTab);
  }, [history, selectedTab]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'food': return 'food-apple';
      case 'exercise': return 'dumbbell';
      case 'weight': return 'scale-bathroom';
      default: return 'history';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'food': return colors.success;
      case 'exercise': return colors.warning;
      case 'weight': return colors.info;
      default: return colors.primary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity History</Text>
        <Text style={styles.subtitle}>Track your fitness journey</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollView}>
          {[
            { key: 'all', label: 'All', icon: 'view-list' },
            { key: 'food', label: 'Food', icon: 'food-apple' },
            { key: 'exercise', label: 'Exercise', icon: 'dumbbell' },
            { key: 'weight', label: 'Weight', icon: 'scale-bathroom' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setSelectedTab(tab.key as any)}
              activeOpacity={0.7}
            >
              {selectedTab === tab.key ? (
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.activeTabGradient}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color={colors.backgroundDark}
                  />
                  <Text style={styles.activeTabText}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color={colors.textTertiary}
                  />
                  <Text style={styles.inactiveTabText}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* History List */}
      <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'all'
                ? 'Start tracking your activities!'
                : `No ${selectedTab} entries found`}
            </Text>
          </View>
        ) : (
          filteredHistory.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <View style={styles.historyItemHeader}>
                <View style={styles.historyItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${getColorForType(entry.type)}20` }]}>
                    <MaterialCommunityIcons
                      name={getIconForType(entry.type) as any}
                      size={24}
                      color={getColorForType(entry.type)}
                    />
                  </View>
                  <View style={styles.historyItemInfo}>
                    <Text style={styles.historyItemTitle}>{entry.description}</Text>
                    <Text style={styles.historyItemDate}>{formatDate(entry.date)}</Text>
                  </View>
                </View>
                <View style={styles.historyItemRight}>
                  {entry.calories && (
                    <Text style={styles.historyItemCalories}>{entry.calories} kcal</Text>
                  )}
                  {entry.weight && (
                    <Text style={styles.historyItemWeight}>{entry.weight} kg</Text>
                  )}
                  {entry.exercise && (
                    <Text style={styles.historyItemExercise}>
                      {entry.exercise.duration}min • {entry.exercise.caloriesBurned} kcal
                    </Text>
                  )}
                </View>
              </View>

              {entry.macros && (
                <View style={styles.macrosContainer}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{entry.macros.protein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{entry.macros.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>{entry.macros.fat}g</Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabContainer: {
    paddingVertical: 16,
  },
  tabScrollView: {
    paddingHorizontal: 24,
    gap: 8,
  },
  tab: {
    marginRight: 8,
  },
  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inactiveTabText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  historyItemWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
  },
  historyItemExercise: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});