/**
 * HomeScreen.tsx
 * Purpose: Awareness & Reassurance - "Am I doing okay?"
 * 
 * REDESIGN: 3-Minute Busy User Check-in
 * - Rings (Calories/Protein)
 * - Macro Budget (Fuel Gauge)
 * - Workout Card (Today's Plan)
 * - Quick Actions (Log Food, Water, Workout, Weight)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { fitnessAPI, analyticsAPI, waterAPI, habitsAPI, weightAPI, workoutAPI, postureCareAPI } from '../services/api';

const { width } = Dimensions.get('window');

const colors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#26D9BB',
  primaryLight: '#E6FAF6',
  secondary: '#8B5CF6',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  calories: '#F59E0B',
  protein: '#8B5CF6',
  carbs: '#3B82F6',
  fat: '#EC4899',
  water: '#06B6D4',
  steps: '#10B981',
};

interface DailyData {
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number; left: number };
  carbs: { consumed: number; target: number; left: number };
  fat: { consumed: number; target: number; left: number };
  macros: { protein: number; carbs: number; fat: number };
  hydration: { current: number; target: number };
  steps: { current: number; goal: number };
  weeklyTrend: number[];
  habits: { id: string; name: string; completed: boolean; icon: string }[];
  tip: string;
  streak: number;
  workout?: { id: string; name: string; duration_minutes: number; intensity: string; completed: boolean };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DailyData | null>(null);
  const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);

  // Posture Care State
  const [postureCare, setPostureCare] = useState<{
    recommended: boolean;
    completedToday: boolean;
    estimatedMinutes: number;
    currentStreak: number;
    label?: string;
  } | null>(null);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  // Add Habit State
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('check-circle-outline');

  const habitIcons = ['run', 'yoga', 'weight-lifter', 'food-apple', 'water', 'book-open-page-variant', 'meditation', 'sleep', 'alarm', 'check-circle-outline'];

  useFocusEffect(
    useCallback(() => {
      if (token) {
        loadDashboardData();
      } else if (user) {
        // Guest mode - load mock data
        loadGuestData();
      }
    }, [token, user])
  );

  const loadGuestData = () => {
    setData({
      calories: { consumed: 1450, target: 2200 },
      protein: { consumed: 95, target: 160, left: 65 },
      carbs: { consumed: 160, target: 250, left: 90 },
      fat: { consumed: 55, target: 70, left: 15 },
      macros: { protein: 26, carbs: 44, fat: 30 },
      hydration: { current: 1250, target: 3000 },
      steps: { current: 3500, goal: 10000 },
      weeklyTrend: [1950, 2100, 1850, 2050, 2200, 1900, 1450],
      habits: [],
      workout: undefined,
      tip: "Welcome! This is a preview of your dashboard.",
      streak: 3,
    });
    setNutritionHistory([
      { day: 'Mon', protein: 120, carbs: 180, fat: 50 },
      { day: 'Tue', protein: 140, carbs: 160, fat: 55 },
      { day: 'Wed', protein: 130, carbs: 200, fat: 60 },
      { day: 'Thu', protein: 150, carbs: 150, fat: 45 },
      { day: 'Fri', protein: 110, carbs: 220, fat: 70 },
      { day: 'Sat', protein: 100, carbs: 250, fat: 80 },
      { day: 'Sun', protein: 130, carbs: 140, fat: 50 },
    ]);
    setPostureCare({
      recommended: true,
      completedToday: false,
      estimatedMinutes: 4,
      currentStreak: 0,
    });
    setLoading(false);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get local date YYYY-MM-DD for accurate daily tracking
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Fetch all dashboard data in parallel
      const [targetsRes, todayRes, waterRes, habitsRes, workoutRes, tipsRes, streaksRes, weeklyTrendsRes] = await Promise.all([
        fitnessAPI.getTargets().catch(() => null),
        analyticsAPI.getDailySummary(localDate).catch(() => null),
        waterAPI.getTotals().catch(() => ({ total_ml: 0 })),
        habitsAPI?.getTodayHabits?.().catch(() => ({ data: [] })),
        workoutAPI.getTodayWorkout().catch(() => null),
        fetch('/api/tips/daily', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: { tip: "Your potential is limitless." } })),
        fetch('/api/streaks/summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: { current: 0 } })),
        analyticsAPI.getWeeklyTrends().catch(() => ({ dailyData: [] })),
      ]);

      // Parse consumed
      const summaryData = (todayRes as any)?.summary || todayRes;
      const caloriesConsumed = summaryData?.totalCalories || summaryData?.calories || 0;
      const proteinConsumed = summaryData?.totalProtein || summaryData?.protein || 0;
      const carbsConsumed = summaryData?.totalCarbs || summaryData?.carbs || 0;
      const fatConsumed = summaryData?.totalFat || summaryData?.fat || 0;

      // Parse targets - Prioritize summary snapshot, then live targets
      const targets = (targetsRes as any)?.targets || targetsRes;
      const calorieTarget = summaryData?.calorieTarget || targets?.calorie_target || targets?.dailyCalories || 2000;
      const proteinTarget = summaryData?.proteinTarget || targets?.protein_target_g || targets?.protein || 150; // Default increased
      const carbTarget = summaryData?.carbTarget || targets?.carb_target_g || 250;
      const fatTarget = summaryData?.fatTarget || targets?.fat_target_g || 70;

      // Calculate macros
      const totalMacros = proteinConsumed + carbsConsumed + fatConsumed;
      const macroPercentages = {
        protein: totalMacros ? Math.round((proteinConsumed / totalMacros) * 100) : 0,
        carbs: totalMacros ? Math.round((carbsConsumed / totalMacros) * 100) : 0,
        fat: totalMacros ? Math.round((fatConsumed / totalMacros) * 100) : 0,
      };

      const waterMl = (waterRes as any)?.total_ml || (waterRes as any)?.total || (waterRes as any)?.totals?.amountMl || 0;
      const habits = (habitsRes?.data || []).map((h: any) => ({
        id: h.id,
        name: h.name,
        completed: h.completed,
        icon: h.icon || 'star'
      }));

      setData({
        calories: { consumed: caloriesConsumed, target: calorieTarget },
        protein: {
          consumed: proteinConsumed,
          target: proteinTarget,
          left: Math.max(0, proteinTarget - proteinConsumed)
        },
        carbs: {
          consumed: carbsConsumed,
          target: carbTarget,
          left: Math.max(0, carbTarget - carbsConsumed)
        },
        fat: {
          consumed: fatConsumed,
          target: fatTarget,
          left: Math.max(0, fatTarget - fatConsumed)
        },
        macros: macroPercentages,
        hydration: { current: waterMl, target: 3000 },
        steps: { current: 5200, goal: 10000 },
        weeklyTrend: [1800, 2100, 1950, 2000, 1850, 1900, caloriesConsumed || 0],
        habits,
        workout: workoutRes?.program ? { ...workoutRes.program, completed: workoutRes.completed } : null,
        tip: (tipsRes as any)?.data?.tip || "Protein at breakfast helps maintain satiety throughout the day.",
        streak: (streaksRes as any)?.data?.current || 0,
      });

      if (weeklyTrendsRes.dailyData) {
        const history = weeklyTrendsRes.dailyData.slice(-7).map((d: any) => ({
          day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
          protein: d.protein || 0,
          carbs: d.carbs || 0,
          fat: d.fat || 0
        }));
        setNutritionHistory(history.length > 0 ? history : []);
      }


      // Fetch Posture Care
      try {
        const pcRes = await postureCareAPI.getSummary();
        setPostureCare(pcRes);
      } catch (e) {
        console.log('Posture care fetch error', e);
        // Fallback for UI if API fails
        setPostureCare({
          recommended: true,
          completedToday: false,
          estimatedMinutes: 4,
          currentStreak: 0
        });
      }

    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    if (!data) return;

    // Optimistic update
    const updatedHabits = data.habits.map(h =>
      h.id === habitId ? { ...h, completed: !h.completed } : h
    );
    setData({ ...data, habits: updatedHabits });

    // If guest, stop here (local update only)
    if (!token) return;

    try {
      await habitsAPI?.toggleHabit?.(habitId);
    } catch (e) {
      console.log('Habit toggle failed:', e);
      // Revert on failure
      setData(prev => prev ? ({ ...prev, habits: data.habits }) : null);
    }
  };

  const handleQuickAddWater = async () => {
    if (!data) return;
    const amount = 250;

    // Optimistic
    setData({
      ...data,
      hydration: {
        ...data.hydration,
        current: data.hydration.current + amount
      }
    });

    try {
      await waterAPI.createLog(amount, new Date().toISOString().split('T')[0]);
    } catch (e) {
      console.error('Failed to log water', e);
    }
  };

  const handleLogWeight = async () => {
    if (!weightInput) return;
    try {
      await weightAPI.logWeight(parseFloat(weightInput));
      setWeightInput('');
      setShowWeightModal(false);
      Alert.alert('Success', 'Weight logged successfully');
      loadDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight');
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Required', 'Please enter a habit name');
      return;
    }

    if (!data) return;

    try {
      // Optimistic Update
      const tempId = Date.now().toString();
      const newHabit = {
        id: tempId,
        name: newHabitName,
        completed: false,
        icon: newHabitIcon
      };

      setData({
        ...data,
        habits: [...data.habits, newHabit]
      });

      setShowHabitModal(false);
      setNewHabitName('');
      setNewHabitIcon('check-circle-outline');

      if (token) {
        // API Call
        await habitsAPI.createHabit({
          habit_name: newHabitName,
          icon: newHabitIcon
        });
        // Reload to get real ID
        loadDashboardData();
      }
    } catch (error) {
      console.error('Create habit error:', error);
      Alert.alert('Error', 'Failed to create habit');
      // Revert if needed (simplified here)
    }
  };

  const handlePlanWorkout = async () => {
    try {
      setLoading(true);
      if (!token) {
        Alert.alert('Guest Mode', 'AI Workout planning is a premium feature. Sign up to unlock it!');
        setLoading(false);
        return;
      }

      await workoutAPI.recommendProgram();
      Alert.alert('Success', 'AI Workout plan generated successfully!', [
        { text: 'View Plan', onPress: () => navigation.navigate('WorkoutPlanner') }
      ]);
      loadDashboardData();
    } catch (error) {
      console.error('Plan workout error:', error);
      Alert.alert('Error', 'Failed to generate workout plan');
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 15) return 'Lunch';
    if (hour < 20) return 'Dinner';
    return 'Snack';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your day...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No data available</Text>
      </View>
    );
  }

  const greeting = getGreeting();
  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <FadeInView delay={100} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {userName}! 👋</Text>
          <Text style={styles.subtitle}>Here's your day at a glance</Text>
        </View>
        {data.streak > 0 && (
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={16} color="#F97316" />
            <Text style={styles.streakText}>{data.streak}</Text>
          </View>
        )}
      </FadeInView>


      {/* ================================================================= */}
      {/* NEW HOME SCREEN DESIGN IMPLEMENTATION */}
      {/* ================================================================= */}

      {/* 2. TODAY STATUS LINE (EMOTIONAL ANCHOR) */}
      <FadeInView delay={200} style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <Text style={{ fontSize: 17, color: '#64748B', fontWeight: '500', lineHeight: 24 }}>
          {data.calories.consumed > data.calories.target
            ? "You've hit your calorie goal! Great job on fueling up. 🎉"
            : "You're on track today. Keep the momentum going! ✅"}
        </Text>
      </FadeInView>

      {/* 1. PRIMARY PROGRESS SNAPSHOT (Left: Calories, Right: Protein) */}
      <FadeInView delay={300} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 12 }}>
        {/* Calories Remaining */}
        <View style={{ flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -1.5, marginBottom: 4 }}>
            {Math.max(0, Math.round(data.calories.target - data.calories.consumed))}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="fire" size={16} color="#F59E0B" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }}>CALORIES LEFT</Text>
          </View>
        </View>

        {/* Protein Remaining */}
        <View style={{ flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -1.5, marginBottom: 4 }}>
            {Math.max(0, Math.round(data.protein.target - data.protein.consumed))}g
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="food-steak" size={16} color="#8B5CF6" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }}>PROTEIN LEFT</Text>
          </View>
        </View>
      </FadeInView>



      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 24, marginBottom: 8 }} />
      {/* END NEW HOME SCREEN DESIGN */}



      {/* Nutrition History Graph */}
      {nutritionHistory.length > 0 && data && (
        <View style={{ marginTop: 8, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Weekly Macro Pulse</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textTertiary, fontWeight: '600' }}>Last 7 Days</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 20 }}
            style={{ marginHorizontal: -24 }}
          >
            <View style={{ width: 20 }} />
            {[...nutritionHistory].reverse().map((day, index) => {
              const totalCal = Math.round((day.protein * 4) + (day.carbs * 4) + (day.fat * 9));
              // Calculate relative widths for micro-bars (max 250g reference)
              const w = (val: number) => Math.min((val / 200) * 100, 100);

              const isToday = index === 0;

              return (
                <View
                  key={index}
                  style={[
                    styles.dayCard,
                    isToday && { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: '#F0FDFA' }
                  ]}
                >
                  <View style={styles.dayCardHeader}>
                    <Text style={[styles.dayCardTitle, isToday && { color: colors.primary }]}>{day.day}</Text>
                    <Text style={styles.dayCardCal}>{totalCal}</Text>
                    <Text style={styles.dayCardCalLabel}>kcal</Text>
                  </View>

                  <View style={styles.dayCardDivider} />

                  <View style={styles.macroRow}>
                    <View style={styles.macroInfo}>
                      <Text style={styles.macroLabel}>Pro</Text>
                      <Text style={styles.macroValueProp}>{day.protein}g</Text>
                    </View>
                    <View style={styles.microBarBg}>
                      <View style={[styles.microBarFill, { width: `${w(day.protein)}%`, backgroundColor: colors.protein }]} />
                    </View>
                  </View>

                  <View style={styles.macroRow}>
                    <View style={styles.macroInfo}>
                      <Text style={styles.macroLabel}>Carb</Text>
                      <Text style={styles.macroValueCarb}>{day.carbs}g</Text>
                    </View>
                    <View style={styles.microBarBg}>
                      <View style={[styles.microBarFill, { width: `${w(day.carbs)}%`, backgroundColor: colors.carbs }]} />
                    </View>
                  </View>

                  <View style={styles.macroRow}>
                    <View style={styles.macroInfo}>
                      <Text style={styles.macroLabel}>Fat</Text>
                      <Text style={styles.macroValueFat}>{day.fat}g</Text>
                    </View>
                    <View style={styles.microBarBg}>
                      <View style={[styles.microBarFill, { width: `${w(day.fat)}%`, backgroundColor: colors.fat }]} />
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={{ width: 24 }} />
          </ScrollView>
        </View>
      )}



      {/* Posture Correction Card */}
      <FadeInView delay={400} style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>🧘 Posture Correction</Text>
        <TouchableOpacity
          style={styles.postureCareCard}
          onPress={() => navigation.navigate('Posture')}
        >
          <View style={[styles.postureCareIconContainer, { backgroundColor: '#26d9bb20' }]}>
            <MaterialCommunityIcons name="human-handsup" size={28} color="#26d9bb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postureCareTitle}>Fix Your Alignment</Text>
            <Text style={styles.postureCareSubtitle}>
              {postureCare?.completedToday
                ? '✓ Completed today'
                : `${postureCare?.estimatedMinutes || 4} min • Improve your posture`}
            </Text>
          </View>
          {(postureCare?.currentStreak || 0) > 0 && (
            <View style={styles.postureCareStreak}>
              <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
              <Text style={styles.postureStreakText}>{postureCare?.currentStreak}</Text>
            </View>
          )}
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      </FadeInView>

      {/* Pain Care Card */}
      <FadeInView delay={450} style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>🩹 Pain Care & Rehab</Text>
        <TouchableOpacity
          style={[styles.postureCareCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}
          onPress={() => navigation.navigate('PainRelief')}
        >
          <View style={[styles.postureCareIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <MaterialCommunityIcons name="bandage" size={28} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postureCareTitle}>Targeted Pain Relief</Text>
            <Text style={styles.postureCareSubtitle}>
              Back, Knee, Shoulder & more
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      </FadeInView>

      {/* Yoga & Mindfulness Card */}
      <FadeInView delay={500} style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { marginTop: 0 }]}>🧘 Yoga & Mindfulness</Text>
        <TouchableOpacity
          style={[styles.postureCareCard, { borderLeftColor: '#8DA399', borderLeftWidth: 4 }]}
          onPress={() => navigation.navigate('Yoga', { screen: 'YogaMain' })}
        >
          <View style={[styles.postureCareIconContainer, { backgroundColor: '#8DA39920' }]}>
            <MaterialCommunityIcons name="meditation" size={28} color="#8DA399" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postureCareTitle}>Find Your Balance</Text>
            <Text style={styles.postureCareSubtitle}>
              Move gently • Breathe deeply
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>
      </FadeInView>

      {/* Macronutrients Dashboard - Luxurious Animation */}
      <FadeInView delay={500} style={styles.sectionContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.macroDashboard}
        >
          {/* Header */}
          <View style={styles.macroDashboardHeader}>
            <View>
              <Text style={styles.macroDashboardTitle}>NUTRITION BALANCE</Text>
              <Text style={styles.macroDashboardSubtitle}>Daily Fuel Breakdown</Text>
            </View>
            <View style={styles.macroMenuBtn}>
              <MaterialCommunityIcons name="chart-pie" size={20} color="#64748B" />
            </View>
          </View>

          <View style={styles.macroContentRow}>
            {/* Left: Enhanced Donut */}
            <View style={styles.donutContainer}>
              <MacroDonut
                fat={data.macros.fat}
                carbs={data.macros.carbs}
                protein={data.macros.protein}
              />
            </View>

            {/* Right: Detailed Breakdown */}
            <View style={styles.macroDetailsCol}>
              {/* Protein */}
              <View style={styles.macroDetailItem}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.indicatorDot, { backgroundColor: colors.protein }]} />
                  <Text style={styles.detailLabel}>Protein</Text>
                  <Text style={styles.detailValue}>{data.macros.protein || 0}%</Text>
                </View>
                <View style={styles.detailProgressBarBg}>
                  <View style={[styles.detailProgressBarFill, { width: `${data.macros.protein}%`, backgroundColor: colors.protein }]} />
                </View>
              </View>

              {/* Carbs */}
              <View style={styles.macroDetailItem}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.indicatorDot, { backgroundColor: colors.carbs }]} />
                  <Text style={styles.detailLabel}>Carbs</Text>
                  <Text style={styles.detailValue}>{data.macros.carbs || 0}%</Text>
                </View>
                <View style={styles.detailProgressBarBg}>
                  <View style={[styles.detailProgressBarFill, { width: `${data.macros.carbs}%`, backgroundColor: colors.carbs }]} />
                </View>
              </View>

              {/* Fat */}
              <View style={styles.macroDetailItem}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.indicatorDot, { backgroundColor: colors.fat }]} />
                  <Text style={styles.detailLabel}>Fats</Text>
                  <Text style={styles.detailValue}>{data.macros.fat || 0}%</Text>
                </View>
                <View style={styles.detailProgressBarBg}>
                  <View style={[styles.detailProgressBarFill, { width: `${data.macros.fat}%`, backgroundColor: colors.fat }]} />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </FadeInView>

      {/* Stats Row */}
      <FadeInView delay={600} style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="cup-water" size={24} color={colors.water} />
            <TouchableOpacity onPress={() => navigation.navigate('WaterLog')} style={styles.quickAddButton}>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.statValue}>
            {(data.hydration.current / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.statLabel}>of {data.hydration.target / 1000}L</Text>
        </View>
        <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="walk" size={24} color={colors.steps} />
          </View>
          <Text style={styles.statValue}>
            {(data.steps.current / 1000).toFixed(1)}k
          </Text>
          <Text style={styles.statLabel}>of {data.steps.goal / 1000}k steps</Text>
        </View>
      </FadeInView>

      {/* Daily Rituals (Habits) */}
      <FadeInView delay={700} style={styles.sectionContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>✨ Daily Rituals</Text>
          <TouchableOpacity onPress={() => setShowHabitModal(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {data.habits.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyHabitCard}
            onPress={async () => {
              setLoading(true);
              const defaults = [
                { habit_name: 'Morning Power', icon: 'weather-sunny' },
                { habit_name: 'Hydrate', icon: 'cup-water' },
                { habit_name: 'Read 15m', icon: 'book-open-page-variant' },
                { habit_name: 'Walk', icon: 'walk' },
                { habit_name: 'No Sugar', icon: 'food-off' },
              ];
              try {
                for (const h of defaults) {
                  await habitsAPI.createHabit(h);
                }
                loadDashboardData();
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
          >
            <LinearGradient
              colors={[colors.primaryLight, '#E0F2F1']}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20 }}
            >
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <MaterialCommunityIcons name="magic-staff" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Initialize Rituals</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Tap to add 5 starter habits</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            style={{ marginHorizontal: -24 }}
          >
            <View style={{ width: 24 }} />
            {data.habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={styles.habitCapsule}
                onPress={() => toggleHabit(habit.id)}
              >
                <View style={[
                  styles.habitIconContainer,
                  habit.completed && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}>
                  <MaterialCommunityIcons
                    name={habit.completed ? "check" : (habit.icon || "star") as any}
                    size={24}
                    color={habit.completed ? "#FFF" : colors.textSecondary}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.habitCapsuleText,
                    habit.completed && { color: colors.textPrimary, fontWeight: '700' }
                  ]}
                >
                  {habit.name}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 24 }} />
          </ScrollView>
        )}
      </FadeInView>

      {/* Daily Workout Card */}

      {/* Quick Actions Grid */}
      <FadeInView delay={800} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FoodLog', { initialMealType: getMealTypeByTime() })}
          >
            <View style={[styles.actionIconIds, { backgroundColor: colors.calories + '20' }]}>
              <MaterialCommunityIcons name="food-apple" size={24} color={colors.calories} />
            </View>
            <Text style={styles.actionLabel}>Log Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('WaterLog')}
          >
            <View style={[styles.actionIconIds, { backgroundColor: colors.water + '20' }]}>
              <MaterialCommunityIcons name="water" size={24} color={colors.water} />
            </View>
            <Text style={styles.actionLabel}>Add Water</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePlanWorkout}
          >
            <View style={[styles.actionIconIds, { backgroundColor: colors.steps + '20' }]}>
              <MaterialCommunityIcons name="dumbbell" size={24} color={colors.steps} />
            </View>
            <Text style={styles.actionLabel}>Plan Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowWeightModal(true)}
          >
            <View style={[styles.actionIconIds, { backgroundColor: colors.protein + '20' }]}>
              <MaterialCommunityIcons name="scale-bathroom" size={24} color={colors.protein} />
            </View>
            <Text style={styles.actionLabel}>Weight</Text>
          </TouchableOpacity>

          {/* New Buttons for Unused Screens */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ExerciseLog')}
          >
            <View style={[styles.actionIconIds, { backgroundColor: '#F59E0B20' }]}>
              <MaterialCommunityIcons name="run" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>Log Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Recipes')}
          >
            <View style={[styles.actionIconIds, { backgroundColor: '#8B5CF620' }]}>
              <MaterialCommunityIcons name="chef-hat" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Recipes</Text>
          </TouchableOpacity>
        </View>
      </FadeInView>

      {/* Weight Modal */}
      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter weight (kg)"
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowWeightModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleLogWeight}>
                <Text style={styles.modalButtonTextConfirm}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Habit Modal */}
      <Modal
        visible={showHabitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHabitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Habit</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Habit Name (e.g. Read 10 mins)"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />

            {/* Quick Pick Ideas */}
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>💡 Ideas (Quick Pick)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { name: 'Morning Walk', icon: 'walk' },
                  { name: 'Drink 3L Water', icon: 'cup-water' },
                  { name: 'No Sugar', icon: 'food-off' },
                  { name: 'Read 15m', icon: 'book-open-page-variant' },
                  { name: 'Meditate', icon: 'meditation' },
                  { name: 'Sleep 8h', icon: 'sleep' },
                  { name: 'Journal', icon: 'notebook' }
                ].map((idea) => (
                  <TouchableOpacity
                    key={idea.name}
                    style={{
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0'
                    }}
                    onPress={() => {
                      setNewHabitName(idea.name);
                      setNewHabitIcon(idea.icon);
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '500' }}>{idea.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>Choose Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 4 }}>
                {habitIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    onPress={() => setNewHabitIcon(icon)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: newHabitIcon === icon ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: newHabitIcon === icon ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={24}
                      color={newHabitIcon === icon ? '#fff' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowHabitModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={handleAddHabit}>
                <Text style={styles.modalButtonTextConfirm}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Daily Tip */}
      <LinearGradient
        colors={[colors.primaryLight, '#fff']}
        style={styles.tipCard}
      >
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>{data.tip}</Text>
      </LinearGradient>

      {/* Footer Spacer */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}



// Macro Donut Component for light themed card
// Macro Donut Component for light themed card
const MacroDonut = ({ fat, carbs, protein }: { fat: number; carbs: number; protein: number }) => {
  const size = 110;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke lengths based on percentages
  const total = fat + carbs + protein || 1; // Avoid division by zero
  const fatDash = (fat / total) * circumference;
  const carbsDash = (carbs / total) * circumference;
  const proteinDash = (protein / total) * circumference;

  const isEmpty = total <= 1;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background ring - light theme */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {!isEmpty && (
          <>
            {/* Fat segment - Amber */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${fatDash} ${circumference}`}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
            {/* Carbs segment - Blue */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#3B82F6"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${carbsDash} ${circumference}`}
              strokeDashoffset={-fatDash}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
            {/* Protein segment - Purple */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#8B5CF6"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${proteinDash} ${circumference}`}
              strokeDashoffset={-(fatDash + carbsDash)}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          </>
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5 }}>MACRO</Text>
        <Text style={{ fontSize: 16, color: '#1E293B', fontWeight: '800' }}>SPLIT</Text>
      </View>
    </View>
  );
};

// Helper to get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const FadeInView = ({ delay = 0, children, style }: any) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.poly(4)),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.poly(4)),
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
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
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F97316',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24, // increased padding for better spacing
    marginBottom: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  smallRingContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallRingTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallRingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  graphBarValue: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textTertiary,
    marginBottom: 4,
  },
  graphContainer: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 4,
    marginBottom: 12
  },
  graphColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    width: 32,
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: '85%',
  },
  graphBar: {
    width: 6,
    borderTopLeftRadius: 3, // slightly smoother
    borderTopRightRadius: 3,
    minHeight: 4, // visible even if 0
  },
  graphLabel: {
    marginTop: 10,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  graphLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  workoutCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  workoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  workoutTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workoutSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  workoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  emptyWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyWorkoutSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  actionIconIds: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonTextConfirm: {
    fontWeight: '600',
    color: '#fff',
  },
  statHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddButton: {
    backgroundColor: colors.water,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroBudgetRow: {
    gap: 16,
  },
  macroBudgetCol: {
    gap: 6,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBudgetLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  macroBudgetLeft: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tubeBackground: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tubeFill: {
    height: '100%',
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  habitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  habitChipCompleted: {
    backgroundColor: colors.primary,
  },
  habitText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  habitTextCompleted: {
    color: '#fff',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Macronutrients Dashboard - Light Theme
  // Macronutrients Dashboard - Luxurious Design
  macroDashboard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  macroDashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  macroDashboardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  macroDashboardSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  macroMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  donutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroDetailsCol: {
    flex: 1,
    gap: 16,
  },
  macroDetailItem: {
    gap: 6,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailProgressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    display: 'none', // Hidden for cleaner look, can enable if needed
  },

  // Posture Card
  postureCareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    gap: 12,
    shadowColor: '#2C696D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postureCareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postureCareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  postureCareSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  postureCareStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  postureStreakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },

  // New Innovative Nutrition Stats Styles
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: 130, // Fixed width for horizontal scroll items
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayCardHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dayCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayCardCal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  dayCardCalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  dayCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginBottom: 12,
  },
  macroRow: {
    marginBottom: 10,
  },
  macroInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  macroLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  macroValueProp: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.protein,
  },
  macroValueCarb: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.carbs,
  },
  macroValueFat: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.fat,
  },
  microBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  microBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // New Habits Styles
  emptyHabitCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  habitCapsule: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
    gap: 8,
  },
  habitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCapsuleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
