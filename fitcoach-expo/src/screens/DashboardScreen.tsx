import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { analyticsAPI, fitnessAPI, mealAPI, workoutAPI, waterAPI, handleAPIError } from '../services/api';
import { logScreenView } from '../config/firebase';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, G } from 'react-native-svg';

// Calm Theme Colors
// Light Theme Colors (Standardized)
const theme = {
  bg: '#FAFAFA',
  primary: '#26d9bb', // Teal
  accentAmber: '#F59E0B',
  accentPurple: '#A855F7',
  accentGreen: '#10B981',
  surface: '#FFFFFF',
  textMain: '#1e293b', // Slate 800
  textSub: '#64748b',   // Slate 500
  border: '#e2e8f0',
  shadowColor: 'rgba(0,0,0,0.05)',
  blueLight: '#E0F2FE', // Light Blue for cards
  orangeLight: '#FFFBEB', // Light Amber
};

const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard State
  const [dashboardData, setDashboardData] = useState({
    calories: { consumed: 0, target: 2000, remaining: 2000 },
    protein: { consumed: 0, target: 150, remaining: 150 },
    water: { consumed: 0, target: 2500 }, // ml
    steps: { count: 3240, target: 10000 }, // Mocked/Static for now as requested or until Step API exists
    focus: {
      workout: { completed: false, label: 'Morning Workout' },
      breakfast: { completed: false, label: 'Eat Breakfast' },
      lunch: { completed: false, label: 'Log Lunch', suggested: 'High protein bowl' },
    }
  });

  const [trends, setTrends] = useState<{
    labels: string[];
    calories: number[];
    average: number;
    macros: { p: number; c: number; f: number };
  }>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    calories: [0, 0, 0, 0, 0, 0, 0],
    average: 0,
    macros: { p: 30, c: 40, f: 30 } // distribution %
  });

  // Calculate Progress Circle Props
  const radius = 36;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const fetchDashboardData = async () => {
    try {
      if (user?.email === 'guest@fitcoach.ai') {
        // Guest Mode Data
        setDashboardData({
          calories: { consumed: 1200, target: 2100, remaining: 900 },
          protein: { consumed: 95, target: 140, remaining: 45 },
          water: { consumed: 1200, target: 2500 },
          steps: { count: 5240, target: 10000 },
          focus: {
            workout: { completed: true, label: 'Morning Workout' },
            breakfast: { completed: true, label: 'Eat Breakfast' },
            lunch: { completed: false, label: 'Log Lunch', suggested: 'Chicken Salad' },
          }
        });
        setTrends({
          labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
          calories: [1800, 2100, 1950, 2000, 2200, 1900, 2150],
          average: 2014,
          macros: { p: 30, c: 45, f: 25 }
        });
        setLoading(false);
        return;
      }

      // 1. Fetch Daily Summary (Calories, Protein)
      // We still use analyticsAPI for calories/protein, but will fetch Water separately as requested.
      const dailySummary = await analyticsAPI.getDailySummary();
      const summary = dailySummary.summary;

      const calorieTarget = summary.calorieTarget || 2000;
      const consumedCals = summary.totalCalories || 0;
      const remainingCals = Math.max(0, calorieTarget - consumedCals);

      const proteinTarget = 150; // Default or fetch from profile if available in summary
      const consumedProtein = summary.totalProtein || 0;
      const remainingProtein = Math.max(0, proteinTarget - consumedProtein);

      // 2. Fetch Water Data (Explicitly using waterAPI)
      let waterData = { total: 0, target: 2500 };
      try {
        const wRes = await waterAPI.getTotals();
        if (wRes && wRes.totals) {
          waterData.total = wRes.totals.amountMl || 0;
          waterData.target = wRes.goal?.amountMl || 2500;
        }
      } catch (e) {
        console.warn('Failed to fetch water data', e);
      }

      // 3. Fetch Meals for Focus Status
      const todayMeals = await mealAPI.getDailyWithRecommendations();
      const focus = {
        workout: { completed: false, label: 'Morning Workout' },
        breakfast: { completed: false, label: 'Eat Breakfast' },
        lunch: { completed: false, label: 'Log Lunch', suggested: 'Healthy Option' }
      };

      if (todayMeals && todayMeals.meals) {
        // Check Breakfast Logged
        if (todayMeals.meals.breakfast.logged.items.length > 0) {
          focus.breakfast.completed = true;
        }
        // Check Lunch Logged
        if (todayMeals.meals.lunch.logged.items.length > 0) {
          focus.lunch.completed = true;
        } else if (todayMeals.meals.lunch.recommendation) {
          focus.lunch.suggested = todayMeals.meals.lunch.recommendation.foodItems?.[0]?.name || 'Suggested Meal';
        }
      }

      // 4. Fetch Workout for Focus Status
      try {
        const workout = await workoutAPI.getTodayWorkout();
        if (workout && (workout.completed || workout.data?.completed)) {
          focus.workout.completed = true;
        }
      } catch (e) {
        // No workout scheduled or error
      }

      setDashboardData({
        calories: { consumed: consumedCals, target: calorieTarget, remaining: remainingCals },
        protein: { consumed: consumedProtein, target: proteinTarget, remaining: remainingProtein },
        water: { consumed: waterData.total, target: waterData.target },
        steps: { count: 3240, target: 10000 }, // Placeholder
        focus
      });

      // 5. Fetch Trends
      const weekly = await analyticsAPI.getWeeklyTrends();
      if (weekly && weekly.dailyData) {
        const labels = weekly.dailyData.map((d: any) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'narrow' }));
        const cals = weekly.dailyData.map((d: any) => d.calories || 0);
        const avg = weekly.averages?.calories || 2000;
        setTrends({
          labels,
          calories: cals,
          average: avg,
          macros: { p: 30, c: 40, f: 30 } // Placeholder distribution until backend sends explicit macro trend stats
        });
      }

    } catch (error) {
      console.error(error);
      handleAPIError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) fetchDashboardData();
    }, [authLoading])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Render Helpers
  const renderProgressCircle = (progress: number, color: string, value: string | number) => {
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    return (
      <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background Circle */}
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Foreground Circle - Rotated -90deg */}
          <G rotation="-90" origin="50, 50">
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.textMain }}>{value}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
          <Text style={styles.headerTitle}>Today</Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Detailed Hero Cards */}
        <View style={styles.heroRow}>
          {/* Calories Card */}
          <View style={styles.heroCard}>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
              {/* Icon pos req fix */}
              <MaterialCommunityIcons name="fire" size={24} color={theme.primary + '50'} style={{ position: 'absolute', right: 0, top: 0 }} />
              {renderProgressCircle(
                (dashboardData.calories.consumed / dashboardData.calories.target) * 100,
                theme.primary,
                dashboardData.calories.remaining
              )}
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cardLabel}>Calories Remaining</Text>
              <Text style={styles.cardSubLabel}>kcal left</Text>
            </View>
          </View>

          {/* Protein Card */}
          <View style={styles.heroCard}>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
              <MaterialCommunityIcons name="egg" size={24} color={theme.primary + '50'} style={{ position: 'absolute', right: 0, top: 0 }} />
              {renderProgressCircle(
                (dashboardData.protein.consumed / dashboardData.protein.target) * 100,
                theme.primary,
                dashboardData.protein.remaining + 'g'
              )}
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cardLabel}>Protein Remaining</Text>
              <Text style={styles.cardSubLabel}>grams left</Text>
            </View>
          </View>
        </View>

        {/* Intake Trends */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Intake Trends</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
            <Text style={styles.linkText}>Last 7 Days</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          {/* Calorie Trend Graph */}
          <View style={[styles.graphCard, { marginRight: 16 }]}>
            <View style={styles.graphHeader}>
              <View>
                <Text style={styles.graphLabel}>CALORIE TREND</Text>
                <Text style={styles.graphValue}>{Math.round(trends.average)} Avg.</Text>
              </View>
              <View style={styles.trendIcon}>
                <MaterialCommunityIcons name="trending-up" size={16} color={theme.primary} />
              </View>
            </View>
            <LineChart
              data={{
                labels: [], // Clean look
                datasets: [{ data: trends.calories.length > 0 ? trends.calories : [0, 0, 0, 0, 0, 0, 0] }]
              }}
              width={240}
              height={80}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: theme.surface,
                backgroundGradientTo: theme.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(80, 141, 247, ${opacity})`,
                strokeWidth: 2,
                propsForDots: { r: "0" } // No dots
              }}
              withInnerLines={false}
              withOuterLines={false}
              withHorizontalLabels={false}
              withVerticalLabels={false}
              bezier
              style={{ paddingRight: 0, marginTop: 8 }}
            />
          </View>

          {/* Macro Mix (Static Visual for now) */}
          <View style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <View>
                <Text style={styles.graphLabel}>MACRO MIX</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <View style={styles.dotRow}><View style={[styles.dot, { backgroundColor: theme.primary }]} /><Text style={styles.dotText}>P</Text></View>
                  <View style={styles.dotRow}><View style={[styles.dot, { backgroundColor: theme.accentAmber }]} /><Text style={styles.dotText}>C</Text></View>
                  <View style={styles.dotRow}><View style={[styles.dot, { backgroundColor: theme.accentPurple }]} /><Text style={styles.dotText}>F</Text></View>
                </View>
              </View>
            </View>
            {/* Mock Macro Curves or distribution */}
            <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="chart-pie" size={48} color={theme.blueLight} />
            </View>
          </View>
        </ScrollView>

        {/* Daily Health Stats */}
        <View style={styles.statsRow}>
          {/* Hydration */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.blueLight }]}>
              <MaterialCommunityIcons name="water" size={24} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{(dashboardData.water.consumed / 1000).toFixed(1)}L</Text>
              <Text style={styles.statGoal}>{(dashboardData.water.target / 1000).toFixed(1)}L Goal</Text>
            </View>
          </View>
          {/* Steps */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.orangeLight }]}>
              <MaterialCommunityIcons name="shoe-print" size={24} color={theme.accentAmber} />
            </View>
            <View>
              <Text style={styles.statValue}>{dashboardData.steps.count.toLocaleString()}</Text>
              <Text style={styles.statGoal}>{(dashboardData.steps.target / 1000)}k Goal</Text>
            </View>
          </View>
        </View>

        {/* Today's Focus */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Today's Focus</Text>
          <View style={{ gap: 12, marginTop: 12 }}>
            {/* Item 1: Workout */}
            <TouchableOpacity style={styles.focusItem} onPress={() => navigation.navigate('WorkoutPlanner')}>
              <View style={[styles.checkCircle, dashboardData.focus.workout.completed ? styles.checked : styles.unchecked]}>
                {dashboardData.focus.workout.completed && <MaterialCommunityIcons name="check" size={14} color="white" />}
              </View>
              <Text style={[styles.focusText, dashboardData.focus.workout.completed && styles.strikethrough]}>
                {dashboardData.focus.workout.label}
              </Text>
              <MaterialCommunityIcons name="dumbbell" size={20} color={theme.textSub} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </TouchableOpacity>

            {/* Item 2: Breakfast */}
            <TouchableOpacity style={styles.focusItem} onPress={() => navigation.navigate('Food')}>
              <View style={[styles.checkCircle, dashboardData.focus.breakfast.completed ? styles.checked : styles.unchecked]}>
                {dashboardData.focus.breakfast.completed && <MaterialCommunityIcons name="check" size={14} color="white" />}
              </View>
              <Text style={[styles.focusText, dashboardData.focus.breakfast.completed && styles.strikethrough]}>
                {dashboardData.focus.breakfast.label}
              </Text>
              <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={theme.textSub} style={{ marginLeft: 'auto', opacity: 0.5 }} />
            </TouchableOpacity>

            {/* Item 3: Lunch */}
            <TouchableOpacity
              style={[styles.focusItem, !dashboardData.focus.lunch.completed ? styles.activeFocus : null]}
              onPress={() => navigation.navigate('Today')}
            >
              <View style={[styles.checkCircle, dashboardData.focus.lunch.completed ? styles.checked : styles.unchecked]}>
                {dashboardData.focus.lunch.completed && <MaterialCommunityIcons name="check" size={14} color="white" />}
              </View>
              <View>
                <Text style={dashboardData.focus.lunch.completed ? styles.focusText : styles.focusTextActive}>{dashboardData.focus.lunch.label}</Text>
                {!dashboardData.focus.lunch.completed && (
                  <Text style={styles.focusSubText}>Suggested: {dashboardData.focus.lunch.suggested}</Text>
                )}
              </View>
              <MaterialCommunityIcons name="pencil" size={20} color={dashboardData.focus.lunch.completed ? theme.textSub : theme.primary} style={{ marginLeft: 'auto', opacity: dashboardData.focus.lunch.completed ? 0.5 : 1 }} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20,
    backgroundColor: theme.bg
  },
  headerDate: { fontSize: 13, fontWeight: '600', color: theme.textSub, letterSpacing: 0.5 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: theme.textMain, marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: theme.surface },

  heroRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginBottom: 24 },
  heroCard: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
    justifyContent: 'space-between'
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: theme.textSub },
  cardSubLabel: { fontSize: 12, fontWeight: '700', color: theme.primary, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.textMain },
  linkText: { fontSize: 14, fontWeight: '600', color: theme.primary },

  graphCard: {
    width: 280, height: 160, backgroundColor: theme.surface, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
    justifyContent: 'space-between'
  },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  graphLabel: { fontSize: 12, fontWeight: '700', color: theme.textSub, letterSpacing: 0.5 },
  graphValue: { fontSize: 20, fontWeight: '800', color: theme.textMain, marginTop: 4 },
  trendIcon: { padding: 4, backgroundColor: theme.blueLight, borderRadius: 50 },

  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotText: { fontSize: 12, fontWeight: '600', color: theme.textSub },

  statsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginTop: 8 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
  },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.textMain },
  statGoal: { fontSize: 12, fontWeight: '600', color: theme.textSub },

  focusItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  activeFocus: {
    borderWidth: 1, borderColor: theme.primary + '30', // Transparent blue
    shadowColor: theme.primary, shadowOpacity: 0.1,
    elevation: 4
  },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: theme.accentGreen },
  unchecked: { borderWidth: 2, borderColor: theme.textSub + '40' }, // lighter border
  focusText: { fontSize: 16, fontWeight: '600', color: theme.textSub },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.6 },
  focusTextActive: { fontSize: 16, fontWeight: '700', color: theme.textMain },
  focusSubText: { fontSize: 12, color: theme.textSub, marginTop: 2 },
});

export default DashboardScreen;
