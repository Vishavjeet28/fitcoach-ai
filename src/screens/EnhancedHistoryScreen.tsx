/**
 * ============================================================================
 * ENHANCED HISTORY SCREEN
 * FitCoach AI Mobile - React Native + TypeScript
 * 
 * STRICT ENGINEERING MODE REQUIREMENTS:
 * - Daily/Weekly/Monthly/Yearly tabs
 * - Nutrition charts (calories, macros)
 * - Weight trend graphs
 * - Workout adherence charts
 * - Comparison view (current vs previous period)
 * - Recalculated from raw logs (never averaged snapshots)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
const screenWidth = Dimensions.get('window').width;

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface WeeklyAnalytics {
  period: string;
  start_date: string;
  end_date: string;
  nutrition: {
    days_tracked: number;
    avg_calories: string;
    avg_protein: string;
    avg_carbs: string;
    avg_fat: string;
  };
  weight: {
    avg: string;
    min: string;
    max: string;
  };
  workouts: {
    completed: number;
    total_calories_burned: number;
    avg_duration: string;
  };
}

interface MonthlyAnalytics extends WeeklyAnalytics {
  year: number;
  month: number;
  nutrition: WeeklyAnalytics['nutrition'] & {
    total_calories_month: number;
    adherence_rate: string;
  };
  weight: {
    weekly_averages: Array<{ week: string; avg: string }>;
    change_kg: string;
  };
  workouts: WeeklyAnalytics['workouts'] & {
    adherence_rate: string;
  };
}

export default function EnhancedHistoryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('weekly');
  const [analytics, setAnalytics] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      const today = new Date().toISOString().split('T')[0];

      // Get analytics based on period
      let endpoint = '';
      let params: any = { user_id: userId };

      if (period === 'weekly') {
        // Get Monday of current week
        const current = new Date();
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(current.setDate(diff));
        params.week_start = monday.toISOString().split('T')[0];
        endpoint = '/api/analytics/weekly';
      } else if (period === 'monthly') {
        params.year = new Date().getFullYear();
        params.month = new Date().getMonth() + 1;
        endpoint = '/api/analytics/monthly';
      } else if (period === 'yearly') {
        params.year = new Date().getFullYear();
        endpoint = '/api/analytics/yearly';
      }

      const response = await axios.get(`${API_URL}${endpoint}`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setAnalytics(response.data.data);

      // Get comparison data
      const comparisonResponse = await axios.get(`${API_URL}/api/analytics/comparison`, {
        params: { user_id: userId, period: period === 'daily' ? 'week' : period.replace('ly', ''), current_date: today },
        headers: { Authorization: `Bearer ${token}` },
      });

      setComparison(comparisonResponse.data.data);
    } catch (error: any) {
      console.error('Load analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.periodButton, period === p && styles.periodButtonActive]}
          onPress={() => setPeriod(p)}
        >
          <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatCard = (title: string, value: string, change: string | null, icon: string) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Ionicons name={icon as any} size={24} color="#6366F1" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={parseFloat(change) > 0 ? 'trending-up' : parseFloat(change) < 0 ? 'trending-down' : 'remove'}
            size={16}
            color={parseFloat(change) > 0 ? '#10B981' : parseFloat(change) < 0 ? '#EF4444' : '#6B7280'}
          />
          <Text style={[
            styles.changeText,
            { color: parseFloat(change) > 0 ? '#10B981' : parseFloat(change) < 0 ? '#EF4444' : '#6B7280' }
          ]}>
            {change}% vs last {period.replace('ly', '')}
          </Text>
        </View>
      )}
    </View>
  );

  const renderNutritionChart = () => {
    if (!analytics?.nutrition) return null;

    const data = {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [
          parseFloat(analytics.nutrition.avg_protein || '0'),
          parseFloat(analytics.nutrition.avg_carbs || '0'),
          parseFloat(analytics.nutrition.avg_fat || '0'),
        ],
      }],
    };

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Average Daily Macros</Text>
        <BarChart
          data={data}
          width={screenWidth - 64}
          height={200}
          yAxisSuffix="g"
          chartConfig={{
            backgroundColor: '#1F2937',
            backgroundGradientFrom: '#1F2937',
            backgroundGradientTo: '#111827',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderWeightChart = () => {
    if (!analytics?.weight) return null;

    let chartData;
    if (period === 'monthly' && analytics.weight.weekly_averages) {
      chartData = {
        labels: analytics.weight.weekly_averages.map((w: any, idx: number) => `W${idx + 1}`),
        datasets: [{
          data: analytics.weight.weekly_averages.map((w: any) => parseFloat(w.avg)),
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          strokeWidth: 3,
        }],
      };
    } else {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <View style={styles.weightSummary}>
            <Text style={styles.weightValue}>{analytics.weight.avg || analytics.weight.change_kg} kg</Text>
            <Text style={styles.weightLabel}>
              {period === 'weekly' ? 'Average' : 'Change'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weight Trend (Weekly Averages)</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 64}
          height={200}
          chartConfig={{
            backgroundColor: '#1F2937',
            backgroundGradientFrom: '#1F2937',
            backgroundGradientTo: '#111827',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#8B5CF6',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderWorkoutStats = () => {
    if (!analytics?.workouts) return null;

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Workout Summary</Text>
        <View style={styles.workoutGrid}>
          <View style={styles.workoutStat}>
            <Ionicons name="barbell" size={32} color="#6366F1" />
            <Text style={styles.workoutValue}>{analytics.workouts.completed}</Text>
            <Text style={styles.workoutLabel}>Completed</Text>
          </View>
          <View style={styles.workoutStat}>
            <Ionicons name="flame" size={32} color="#EF4444" />
            <Text style={styles.workoutValue}>{analytics.workouts.total_calories_burned}</Text>
            <Text style={styles.workoutLabel}>Calories Burned</Text>
          </View>
          <View style={styles.workoutStat}>
            <Ionicons name="time" size={32} color="#10B981" />
            <Text style={styles.workoutValue}>{analytics.workouts.avg_duration || 0}</Text>
            <Text style={styles.workoutLabel}>Avg Minutes</Text>
          </View>
        </View>
        {analytics.workouts.adherence_rate && (
          <View style={styles.adherenceBar}>
            <Text style={styles.adherenceLabel}>Program Adherence</Text>
            <View style={styles.adherenceTrack}>
              <View
                style={[
                  styles.adherenceFill,
                  { width: `${Math.min(parseFloat(analytics.workouts.adherence_rate), 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.adherenceValue}>{analytics.workouts.adherence_rate}%</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics & History</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Summary Stats */}
        {analytics && (
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Avg Calories',
              `${analytics.nutrition?.avg_calories || analytics.nutrition?.avg_daily_calories || '0'} kcal`,
              comparison?.comparison?.calories_change_pct,
              'nutrition'
            )}
            {renderStatCard(
              'Weight',
              `${analytics.weight?.avg || analytics.weight?.change_kg || '0'} kg`,
              comparison?.comparison?.weight_change_pct,
              'scale'
            )}
            {renderStatCard(
              'Workouts',
              `${analytics.workouts?.completed || 0}`,
              comparison?.comparison?.workouts_change_pct,
              'barbell'
            )}
          </View>
        )}

        {/* Nutrition Chart */}
        {renderNutritionChart()}

        {/* Weight Chart */}
        {renderWeightChart()}

        {/* Workout Stats */}
        {renderWorkoutStats()}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#6366F1" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Recalculated from Raw Logs</Text>
            <Text style={styles.infoText}>
              All analytics are computed directly from your food, weight, and workout logs.
              We never average snapshots - every number is rebuilt from source data.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  periodButtonActive: {
    backgroundColor: '#6366F1',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  weightSummary: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  weightValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  weightLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  workoutGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  workoutLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  adherenceBar: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  adherenceTrack: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  adherenceFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  adherenceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'right',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
