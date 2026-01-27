import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { analyticsAPI, mealAPI, workoutAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MealRecommendationCard from '../components/MealRecommendationCard';

// Light Theme Constants
const theme = {
  bg: '#f6f7f7',
  surface: '#FFFFFF',
  primary: '#2c696d',
  textMain: '#111418',
  textSub: '#637588',
  border: '#e2e8f0',
  progress: {
    calories: '#3b82f6',
    protein: '#10b981',
    carbs: '#d97706',
    carbsBar: '#fcd34d',
    fat: '#f59e0b',
    fatBar: '#fde68a'
  }
};

interface NutritionGoals {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  completed?: boolean;
}

const GUEST_MEALS = [
  {
    id: 901,
    name: 'Quinoa Salad with Chickpeas',
    calories: 450,
    protein_g: 15,
    carbs_g: 65,
    fat_g: 12,
    foodItems: [{ name: 'Quinoa Salad with Chickpeas', calories: 450, protein_g: 15, carbs_g: 65, fat_g: 12 }],
    steps: ['Cook quinoa', 'Mix with chickpeas', 'Add lemon dressing'],
    prepTime: 10,
    cookTime: 15
  },
  {
    id: 902,
    name: 'Grilled Salmon with Asparagus',
    calories: 550,
    protein_g: 35,
    carbs_g: 10,
    fat_g: 25,
    foodItems: [{ name: 'Grilled Salmon with Asparagus', calories: 550, protein_g: 35, carbs_g: 10, fat_g: 25 }],
    steps: ['Grill salmon', 'Steam asparagus', 'Serve with lemon'],
    prepTime: 5,
    cookTime: 15
  },
  {
    id: 903,
    name: 'Lentil Soup',
    calories: 400,
    protein_g: 18,
    carbs_g: 50,
    fat_g: 8,
    foodItems: [{ name: 'Lentil Soup', calories: 400, protein_g: 18, carbs_g: 50, fat_g: 8 }],
    steps: ['Sauté veggies', 'Add lentils and broth', 'Simmer 30 mins'],
    prepTime: 10,
    cookTime: 30
  },
  {
    id: 904,
    name: 'Turkey & Avocado Wrap',
    calories: 500,
    protein_g: 28,
    carbs_g: 45,
    fat_g: 20,
    foodItems: [{ name: 'Turkey & Avocado Wrap', calories: 500, protein_g: 28, carbs_g: 45, fat_g: 20 }],
    steps: ['Spread avocado on tortilla', 'Lay turkey slices', 'Roll and cut'],
    prepTime: 10,
    cookTime: 0
  },
  {
    id: 905,
    name: 'Oatmeal with Almonds',
    calories: 350,
    protein_g: 12,
    carbs_g: 55,
    fat_g: 10,
    foodItems: [{ name: 'Oatmeal with Almonds', calories: 350, protein_g: 12, carbs_g: 55, fat_g: 10 }],
    steps: ['Boil water/milk', 'Add oats and cook', 'Top with almonds'],
    prepTime: 5,
    cookTime: 5
  }
];

const TodayScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null);
  const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);

  // Guest Mode State
  const [guestMealIndices, setGuestMealIndices] = useState({ breakfast: 0, lunch: 1, dinner: 2 });

  // Meal data state
  const [mealData, setMealData] = useState<any>(null);

  // Nutrition goals
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({
    calories: { current: 0, target: 2000 },
    protein: { current: 0, target: 150 },
    carbs: { current: 0, target: 200 },
    fat: { current: 0, target: 65 },
  });

  const [workout, setWorkout] = useState<{
    scheduled?: { name: string; exercises: WorkoutExercise[] };
    completed?: boolean;
  }>({});
  const [fullWorkoutData, setFullWorkoutData] = useState<any>(null);

  const [generatingWorkout, setGeneratingWorkout] = useState(false);



  const handleGenerateDailyPlan = async () => {
    try {
      setGeneratingPlan(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await mealAPI.generateDailyPlan(today);
      if (response.success) {
        Alert.alert('Success', 'Daily meal plan generated!', [{ text: 'OK', onPress: fetchTodayData }]);
      } else {
        Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
      }
    } catch (error) {
      console.error('Generate meal plan error:', error);
      Alert.alert('Error', 'Failed to generate meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSwapMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      setSwappingMeal(mealType);

      if (!user || user.email === 'guest@fitcoach.ai') {
        // Guest mode simulation - cycle through mock meals
        setTimeout(async () => {
          setGuestMealIndices(prev => {
            const nextIdx = (prev[mealType] + 1) % GUEST_MEALS.length;
            const newIndices = { ...prev, [mealType]: nextIdx };

            // Update local mealData immediately for guest
            setMealData((prevData: any) => ({
              ...prevData,
              [mealType]: {
                ...prevData?.[mealType],
                recommendation: GUEST_MEALS[nextIdx]
              }
            }));

            return newIndices;
          });
          setSwappingMeal(null);
          Alert.alert('Guest Mode', 'Meal swapped with a new suggestion (Preview)');
        }, 800);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const response = await mealAPI.swapMeal(mealType, today);
      if (response.success) {
        await fetchTodayData();
      } else {
        Alert.alert('Error', 'Failed to swap meal. Please try again.');
      }
    } catch (error) {
      console.error('Swap meal error:', error);
      Alert.alert('Error', 'Failed to swap meal. Please try again.');
    } finally {
      if (user && user.email !== 'guest@fitcoach.ai') {
        setSwappingMeal(null);
      }
    }
  };



  const handleGenerateWorkout = async () => {
    try {
      setGeneratingWorkout(true);

      if (!user || user.email === 'guest@fitcoach.ai') {
        // Guest mode simulation
        setTimeout(() => {
          setWorkout({
            scheduled: {
              name: "Full Body Foundation",
              exercises: [
                { name: "Pushups", sets: 3, reps: 12 },
                { name: "Bodyweight Squats", sets: 3, reps: 15 },
                { name: "Plank", sets: 3, reps: 45 },
              ]
            },
            completed: false
          });
          Alert.alert('Guest Mode', 'Local workout plan generated for preview.');
          setGeneratingWorkout(false);
        }, 1200);
        return;
      }

      if (!user?.id) return;
      const response = await workoutAPI.recommendProgram(user.id);

      // The API returns response.data which usually contains the generated program or success indicator
      if (response) {
        Alert.alert('Success', 'Workout generated for today based on your profile!');
        await fetchTodayData();
      } else {
        Alert.alert('Error', 'Failed to generate workout.');
      }
    } catch (e) {
      console.error('Generate workout error', e);
      Alert.alert('Error', 'Failed to generate workout.');
    } finally {
      if (user && user.email !== 'guest@fitcoach.ai') {
        setGeneratingWorkout(false);
      }
    }
  };

  const handleLogMeal = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    navigation.navigate('FoodLog', { mealType });
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodayData();
    }, [user])
  );

  const fetchTodayData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      if (user?.email === 'guest@fitcoach.ai' || !user) {
        // Guest Logic - Show mock recommendations
        setNutritionGoals({
          calories: { current: 1450, target: 2000 },
          protein: { current: 110, target: 150 },
          carbs: { current: 160, target: 200 },
          fat: { current: 50, target: 65 },
        });

        // Initialize guest meal data if not already set or refreshing
        setMealData({
          breakfast: {
            recommendation: GUEST_MEALS[guestMealIndices.breakfast],
            targets: { calories: 500, protein_g: 35, carbs_g: 50, fat_g: 15 },
            logged: { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
          },
          lunch: {
            recommendation: GUEST_MEALS[guestMealIndices.lunch],
            targets: { calories: 700, protein_g: 50, carbs_g: 70, fat_g: 25 },
            logged: { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
          },
          dinner: {
            recommendation: GUEST_MEALS[guestMealIndices.dinner],
            targets: { calories: 800, protein_g: 65, carbs_g: 80, fat_g: 25 },
            logged: { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
          }
        });

        if (!workout.scheduled) {
          setWorkout({
            scheduled: {
              name: "Initial Assessment Workout",
              exercises: [
                { name: "Squats", sets: 3, reps: 10 },
                { name: "Push ups", sets: 3, reps: 8 }
              ]
            }
          });
        }

        // Mock history for guest
        setNutritionHistory([
          { day: 'Mon', protein: 120, carbs: 180, fat: 50 },
          { day: 'Tue', protein: 140, carbs: 160, fat: 55 },
          { day: 'Wed', protein: 130, carbs: 200, fat: 60 },
          { day: 'Thu', protein: 150, carbs: 150, fat: 45 },
          { day: 'Fri', protein: 110, carbs: 220, fat: 70 },
          { day: 'Sat', protein: 100, carbs: 250, fat: 80 },
          { day: 'Sun', protein: 130, carbs: 140, fat: 50 },
        ]);

        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch Meal Data
      try {
        const mealsResponse = await mealAPI.getDailyWithRecommendations(today);
        if (mealsResponse.success) {
          setMealData(mealsResponse.meals);

          // Calculate Totals logic
          const totalTarget =
            (mealsResponse.meals.breakfast.targets?.calories || 0) +
            (mealsResponse.meals.lunch.targets?.calories || 0) +
            (mealsResponse.meals.dinner.targets?.calories || 0);

          const totalCurrent =
            mealsResponse.meals.breakfast.logged.totals.calories +
            mealsResponse.meals.lunch.logged.totals.calories +
            mealsResponse.meals.dinner.logged.totals.calories;

          const agg = (key: 'protein' | 'carbs' | 'fat', targetKey: 'protein_g' | 'carbs_g' | 'fat_g') => {
            const c = mealsResponse.meals.breakfast.logged.totals[key] +
              mealsResponse.meals.lunch.logged.totals[key] +
              mealsResponse.meals.dinner.logged.totals[key];
            const t = (mealsResponse.meals.breakfast.targets?.[targetKey] || 0) +
              (mealsResponse.meals.lunch.targets?.[targetKey] || 0) +
              (mealsResponse.meals.dinner.targets?.[targetKey] || 0);
            return { current: Math.round(c), target: Math.round(t) };
          };

          setNutritionGoals({
            calories: { current: Math.round(totalCurrent), target: Math.round(totalTarget) || 2000 },
            protein: agg('protein', 'protein_g'),
            carbs: agg('carbs', 'carbs_g'),
            fat: agg('fat', 'fat_g'),
          });
        }

        // Fetch History for Graph
        try {
          const analyticsRes = await analyticsAPI.getWeeklyTrends();
          if (analyticsRes && analyticsRes.dailyData) {
            const history = analyticsRes.dailyData.slice(-7).map((d: any) => ({
              day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
              protein: d.protein || 0,
              carbs: d.carbs || 0,
              fat: d.fat || 0
            }));
            setNutritionHistory(history);
          } else {
            // Fallback mock if no history
            setNutritionHistory([
              { day: 'Mon', protein: 120, carbs: 180, fat: 50 },
              { day: 'Tue', protein: 140, carbs: 160, fat: 55 },
              { day: 'Wed', protein: 130, carbs: 200, fat: 60 },
              { day: 'Thu', protein: 150, carbs: 150, fat: 45 },
              { day: 'Fri', protein: 110, carbs: 220, fat: 70 },
              { day: 'Sat', protein: 100, carbs: 250, fat: 80 },
              { day: 'Sun', protein: 130, carbs: 140, fat: 50 },
            ]);
          }
        } catch (e) {
          console.log('Stats fetch error', e);
          // Fallback
          setNutritionHistory([
            { day: 'Mon', protein: 120, carbs: 180, fat: 50, isFallback: true },
            { day: 'Sun', protein: 130, carbs: 140, fat: 50, isFallback: true },
          ]);
        }

      } catch (e) { console.log('Meal fetch error', e); }

      // Fetch Workout
      try {
        const wRes = await workoutAPI.getTodayWorkout();
        const data = wRes.data || wRes;
        const exercises = data.split ? data.split.exercises : data.exercises;
        if (exercises) {
          setFullWorkoutData(data);
          setWorkout({
            scheduled: { name: data.program_name || data.name || 'Today\'s Workout', exercises },
            completed: data.completed
          });
        }
      } catch (e) { console.log('Workout fetch error', e); }



    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayData();
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Execution</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Daily Progress Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={styles.cardTitle}>Daily Progress</Text>
            <Text style={{ fontSize: 20 }}>🔥</Text>
          </View>

          <View style={{ gap: 16 }}>
            {/* Calories */}
            <View
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel="Calories process"
              accessibilityValue={{ min: 0, max: nutritionGoals.calories.target, now: nutritionGoals.calories.current }}
            >
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Calories</Text>
                <Text style={styles.progressValue}>{nutritionGoals.calories.current} / {nutritionGoals.calories.target}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${calculateProgress(nutritionGoals.calories.current, nutritionGoals.calories.target)}%`, backgroundColor: theme.progress.calories }]} />
              </View>
            </View>

            {/* Protein */}
            <View
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel="Protein progress"
              accessibilityValue={{ min: 0, max: nutritionGoals.protein.target, now: nutritionGoals.protein.current }}
            >
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Protein</Text>
                <Text style={styles.progressValue}>{nutritionGoals.protein.current}g / {nutritionGoals.protein.target}g</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${calculateProgress(nutritionGoals.protein.current, nutritionGoals.protein.target)}%`, backgroundColor: theme.progress.protein }]} />
              </View>
            </View>

            {/* Carbs */}
            <View
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel="Carbs progress"
              accessibilityValue={{ min: 0, max: nutritionGoals.carbs.target, now: nutritionGoals.carbs.current }}
            >
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Carbs</Text>
                <Text style={styles.progressValue}>{nutritionGoals.carbs.current}g / {nutritionGoals.carbs.target}g</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${calculateProgress(nutritionGoals.carbs.current, nutritionGoals.carbs.target)}%`, backgroundColor: theme.progress.carbsBar }]} />
              </View>
            </View>

            {/* Fat */}
            <View
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel="Fat progress"
              accessibilityValue={{ min: 0, max: nutritionGoals.fat.target, now: nutritionGoals.fat.current }}
            >
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Fat</Text>
                <Text style={styles.progressValue}>{nutritionGoals.fat.current}g / {nutritionGoals.fat.target}g</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${calculateProgress(nutritionGoals.fat.current, nutritionGoals.fat.target)}%`, backgroundColor: theme.progress.fatBar }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Daily Tools Shortcuts */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => navigation.navigate('Habits')}
              accessibilityRole="button"
              accessibilityLabel="Habits Tracker"
              accessibilityHint="Navigates to your daily habits list"
            >
              <View style={[styles.toolIcon, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name="check-all" size={24} color="#0EA5E9" />
              </View>
              <Text style={styles.toolText}>Habits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => navigation.navigate('Todos')}
              accessibilityRole="button"
              accessibilityLabel="To-Do List"
              accessibilityHint="Navigates to your daily tasks"
            >
              <View style={[styles.toolIcon, { backgroundColor: '#F0FDF4' }]}>
                <MaterialCommunityIcons name="format-list-checks" size={24} color="#22C55E" />
              </View>
              <Text style={styles.toolText}>To-Dos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => navigation.navigate('Planner')}
              accessibilityRole="button"
              accessibilityLabel="Weekly Planner"
              accessibilityHint="Navigates to your weekly schedule"
            >
              <View style={[styles.toolIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="calendar-month" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.toolText}>Planner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => navigation.navigate('ActiveWorkout', { workout: workout.scheduled })}
              accessibilityRole="button"
              accessibilityLabel="Start Live Workout"
              accessibilityHint="Starts the active workout session"
            >
              <View style={[styles.toolIcon, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#EF4444" />
              </View>
              <Text style={styles.toolText}>Live</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Generate Button if empty */}
        {(!mealData || (mealData && (!mealData.breakfast || !mealData.breakfast.recommendation))) && (
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateDailyPlan} disabled={generatingPlan}>
            {generatingPlan ? <ActivityIndicator color="white" /> : (
              <>
                <MaterialCommunityIcons name="magic-staff" size={20} color="white" />
                <Text style={styles.generateBtnText}>Generate Today's Plan</Text>
              </>
            )}
          </TouchableOpacity>
        )}



        {/* Meal Cards */}
        {mealData && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            {/* Breakfast */}
            <MealRecommendationCard
              mealType="breakfast"
              recommendation={mealData.breakfast?.recommendation}
              targets={mealData.breakfast?.targets}
              logged={mealData.breakfast?.logged}
              onSwap={() => handleSwapMeal('breakfast')}
              onLogMeal={() => handleLogMeal('breakfast')}
              onViewDetails={() => navigation.navigate('MealDetail', { mealData: mealData.breakfast, mealType: 'breakfast', date: new Date().toISOString().split('T')[0] })}
              isSwapping={swappingMeal === 'breakfast'}
              isGenerating={generatingPlan}
            />

            {/* Lunch */}
            <MealRecommendationCard
              mealType="lunch"
              recommendation={mealData.lunch?.recommendation}
              targets={mealData.lunch?.targets}
              logged={mealData.lunch?.logged}
              onSwap={() => handleSwapMeal('lunch')}
              onLogMeal={() => handleLogMeal('lunch')}
              onViewDetails={() => navigation.navigate('MealDetail', { mealData: mealData.lunch, mealType: 'lunch', date: new Date().toISOString().split('T')[0] })}
              isSwapping={swappingMeal === 'lunch'}
              isGenerating={generatingPlan}
            />

            {/* Dinner */}
            <MealRecommendationCard
              mealType="dinner"
              recommendation={mealData.dinner?.recommendation}
              targets={mealData.dinner?.targets}
              logged={mealData.dinner?.logged}
              onSwap={() => handleSwapMeal('dinner')}
              onLogMeal={() => handleLogMeal('dinner')}
              onViewDetails={() => navigation.navigate('MealDetail', { mealData: mealData.dinner, mealType: 'dinner', date: new Date().toISOString().split('T')[0] })}
              isSwapping={swappingMeal === 'dinner'}
              isGenerating={generatingPlan}
            />
          </View>
        )}

        {/* Workout Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons name="dumbbell" size={24} color={theme.progress.calories} />
            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Today's Workout</Text>
          </View>

          {workout.scheduled ? (
            <View>
              <Text style={styles.workoutName}>{workout.scheduled.name}</Text>
              <View style={{ marginLeft: 8, marginBottom: 16 }}>
                {workout.scheduled.exercises.slice(0, 3).map((ex, i) => (
                  <Text key={i} style={styles.exerciseText}>• {ex.name} ({ex.sets}x{ex.reps})</Text>
                ))}
              </View>
              <TouchableOpacity
                style={styles.viewWorkoutBtn}
                onPress={() => navigation.navigate('WorkoutPlanner', { dailyWorkout: fullWorkoutData || workout })}
              >
                <Text style={styles.viewWorkoutText}>View Routine</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewWorkoutBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, marginTop: 10 }]}
                onPress={handleGenerateWorkout}
                disabled={generatingWorkout}
              >
                {generatingWorkout ? (
                  <ActivityIndicator color={theme.primary} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="sync" size={16} color={theme.textSub} />
                    <Text style={[styles.viewWorkoutText, { color: theme.textSub }]}>Re-Plan Workout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: theme.textSub, marginBottom: 12 }}>No workout planned.</Text>
              <TouchableOpacity
                style={[styles.viewWorkoutBtn, { width: '100%' }]}
                onPress={handleGenerateWorkout}
                disabled={generatingWorkout}
              >
                {generatingWorkout ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="dumbbell" size={16} color="white" />
                    <Text style={styles.viewWorkoutText}>Generate Workout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20
  },
  headerTitle: {
    fontSize: 32, fontWeight: '800', color: theme.textMain, letterSpacing: -0.5, marginBottom: 4
  },
  headerDate: {
    fontSize: 15, color: theme.textSub, fontWeight: '500'
  },
  card: {
    backgroundColor: theme.surface,
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  cardTitle: {
    fontSize: 18, fontWeight: '700', color: theme.textMain
  },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8
  },
  progressLabel: {
    fontSize: 14, fontWeight: '500', color: theme.textMain
  },
  progressValue: {
    fontSize: 14, fontWeight: '600', color: theme.textMain
  },
  progressBarBg: {
    height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%', borderRadius: 4
  },
  generateBtn: {
    marginHorizontal: 20, backgroundColor: theme.primary, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16
  },
  generateBtnText: {
    color: 'white', fontSize: 16, fontWeight: '700'
  },
  workoutName: {
    fontSize: 16, fontWeight: '600', color: theme.textMain, marginBottom: 8
  },
  exerciseText: {
    fontSize: 14, color: theme.textSub, marginBottom: 4
  },
  viewWorkoutBtn: {
    backgroundColor: theme.textMain, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8
  },
  viewWorkoutText: {
    color: 'white', fontWeight: '600'
  },
  toolBtn: { alignItems: 'center', width: 70 },
  toolIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  toolText: { fontSize: 12, fontWeight: '600', color: theme.textMain },


});

export default TodayScreen;
