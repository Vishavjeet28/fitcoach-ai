/**
 * ExerciseLogScreen.tsx
 * Premium Luxury Exercise Logging Experience
 * 
 * Design Philosophy:
 * - Dark, immersive, premium fitness aesthetic
 * - Glassmorphism & Vivid Gradients
 * - Real-time feedback with visual punch
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../services/api';
import { workoutAPI } from '../services/api';

// Light, Minimalist Theme (Matching HomeScreen)
const THEME = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#26D9BB',             // Teal (from Home)
  secondary: '#8B5CF6',           // Purple (from Home)
  text: '#1E293B',                // Dark Slate
  textDim: '#64748B',             // Medium Slate
  textLight: '#94A3B8',           // Light Slate
  border: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  cardio: '#EC4899',              // Pink
  inputBg: '#F1F5F9',             // Light Gray for inputs
};

// Exercise Categories
const EXERCISE_CATEGORIES = [
  { id: 'strength', label: 'Strength', icon: 'dumbbell', color: THEME.primary },
  { id: 'cardio', label: 'Cardio', icon: 'run', color: THEME.cardio },
];

const QUICK_ACCESS_EXERCISES = [
  { id: 's1', name: 'Bench Press', muscleGroup: 'Chest', met: 6.0, restSeconds: 90, type: 'strength', defaultSets: 3, defaultReps: 10 },
  { id: 's2', name: 'Squats', muscleGroup: 'Legs', met: 6.0, restSeconds: 120, type: 'strength', defaultSets: 3, defaultReps: 10 },
  { id: 'c1', name: 'Running', muscleGroup: 'Cardio', met: 9.8, restSeconds: 0, type: 'cardio', defaultDuration: 30 },
  { id: 's3', name: 'Deadlift', muscleGroup: 'Back', met: 6.0, restSeconds: 120, type: 'strength', defaultSets: 3, defaultReps: 5 },
  { id: 's4', name: 'Pushups', muscleGroup: 'Chest', met: 3.8, restSeconds: 60, type: 'strength', defaultSets: 3, defaultReps: 15 },
];

// Common exercises library (fallback)
const COMMON_EXERCISES = {
  strength: [
    { id: 's1', name: 'Bench Press', muscleGroup: 'Chest', met: 6.0, restSeconds: 90 },
    { id: 's2', name: 'Squats', muscleGroup: 'Legs', met: 6.0, restSeconds: 120 },
    { id: 's3', name: 'Deadlift', muscleGroup: 'Back', met: 6.0, restSeconds: 120 },
    { id: 's4', name: 'Shoulder Press', muscleGroup: 'Shoulders', met: 5.0, restSeconds: 90 },
    { id: 's5', name: 'Bicep Curls', muscleGroup: 'Arms', met: 4.0, restSeconds: 60 },
    { id: 's6', name: 'Tricep Dips', muscleGroup: 'Arms', met: 4.0, restSeconds: 60 },
    { id: 's7', name: 'Lat Pulldown', muscleGroup: 'Back', met: 5.0, restSeconds: 90 },
    { id: 's8', name: 'Leg Press', muscleGroup: 'Legs', met: 5.5, restSeconds: 90 },
    { id: 's9', name: 'Lunges', muscleGroup: 'Legs', met: 5.0, restSeconds: 60 },
    { id: 's10', name: 'Plank', muscleGroup: 'Core', met: 3.5, restSeconds: 45 },
  ],
  cardio: [
    { id: 'c1', name: 'Running', muscleGroup: 'Full Body', met: 9.8, restSeconds: 0 },
    { id: 'c2', name: 'Cycling', muscleGroup: 'Legs', met: 7.5, restSeconds: 0 },
    { id: 'c3', name: 'Swimming', muscleGroup: 'Full Body', met: 8.0, restSeconds: 0 },
    { id: 'c4', name: 'Rowing', muscleGroup: 'Full Body', met: 7.0, restSeconds: 0 },
    { id: 'c5', name: 'Jump Rope', muscleGroup: 'Full Body', met: 11.0, restSeconds: 0 },
    { id: 'c6', name: 'Elliptical', muscleGroup: 'Full Body', met: 5.0, restSeconds: 0 },
    { id: 'c7', name: 'Stair Climbing', muscleGroup: 'Legs', met: 9.0, restSeconds: 0 },
    { id: 'c8', name: 'Walking (Brisk)', muscleGroup: 'Full Body', met: 4.3, restSeconds: 0 },
  ],
};

interface SelectedExercise {
  id: string;
  name: string;
  muscleGroup: string;
  type: 'strength' | 'cardio';
  met: number;
  restSeconds: number;
}

interface TodayWorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

const ExerciseLogScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const feedbackScale = useRef(new Animated.Value(0.95)).current;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'strength' | 'cardio'>('strength');

  // Exercise selection
  const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null);

  // Strength inputs
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');

  // Cardio inputs
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');

  // Computed values
  const [estimatedCalories, setEstimatedCalories] = useState(0);
  const [restTime, setRestTime] = useState(0);

  // Today's workout exercises (for quick pick)
  const [todayExercises, setTodayExercises] = useState<TodayWorkoutExercise[]>([]);

  // User weight for calorie calc (default 70kg)
  const [userWeight, setUserWeight] = useState(70);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load today's workout
  useFocusEffect(
    useCallback(() => {
      loadTodayWorkout();
    }, [])
  );

  const loadTodayWorkout = async () => {
    try {
      const response = await workoutAPI.getTodayWorkout();
      if (response?.program?.exercises) {
        setTodayExercises(response.program.exercises.slice(0, 4));
      }
    } catch (e) {
      console.log('No today workout available');
    }
  };

  // Real-time Calculation
  useEffect(() => {
    if (!selectedExercise) {
      setEstimatedCalories(0);
      setRestTime(0);
      return;
    }

    const met = selectedExercise.met;
    let durationHours = 0;

    if (selectedExercise.type === 'strength') {
      const setsNum = parseInt(sets) || 0;
      const repsNum = parseInt(reps) || 0;
      const restSec = selectedExercise.restSeconds || 60;
      const totalSeconds = (setsNum * repsNum * 3) + ((setsNum - 1) * restSec);
      durationHours = totalSeconds / 3600;
      setRestTime(restSec);
    } else {
      durationHours = (parseInt(duration) || 0) / 60;
      const intensityMultiplier = intensity === 'light' ? 0.7 : intensity === 'vigorous' ? 1.3 : 1.0;
      const adjustedMet = met * intensityMultiplier;
      setEstimatedCalories(Math.round(adjustedMet * userWeight * durationHours));
      setRestTime(0);
      return;
    }

    const calories = Math.round(met * userWeight * durationHours);
    setEstimatedCalories(calories);

    // Pulse animation on stats update
    Animated.sequence([
      Animated.timing(feedbackScale, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(feedbackScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedExercise, sets, reps, weight, duration, intensity, userWeight]);

  const handleSelectExercise = (exercise: any, type: 'strength' | 'cardio') => {
    setSelectedExercise({ ...exercise, type });
    setShowExercisePicker(false);
    setSelectedCategory(type);

    // Smooth transition
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 150, animated: true });
    }, 400);
  };

  const handleQuickSelect = (exercise: any) => {
    setSelectedExercise({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      type: exercise.type as 'strength' | 'cardio',
      met: exercise.met,
      restSeconds: exercise.restSeconds || 60
    });

    if (exercise.type === 'strength') {
      setSets(exercise.defaultSets?.toString() || '3');
      setReps(exercise.defaultReps?.toString() || '10');
    } else {
      setDuration(exercise.defaultDuration?.toString() || '30');
    }

    setSelectedCategory(exercise.type as 'strength' | 'cardio');

    // Auto scroll down
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 200, animated: true });
    }, 300);
  };

  const getFilteredExercises = () => {
    const exercises = COMMON_EXERCISES[selectedCategory] || [];
    if (!searchQuery.trim()) return exercises;
    return exercises.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Helper for Stepper
  const updateValue = (setter: any, currentVal: string, delta: number) => {
    const num = parseInt(currentVal) || 0;
    const newVal = Math.max(0, num + delta);
    setter(newVal.toString());
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise) return;

    try {
      setSaving(true);
      const durationMinutes = selectedExercise.type === 'strength'
        ? Math.ceil(((parseInt(sets) || 0) * (parseInt(reps) || 0) * 3 + ((parseInt(sets) || 1) - 1) * restTime) / 60)
        : parseInt(duration) || 0;

      const payload = {
        exerciseName: selectedExercise.name,
        customExerciseName: selectedExercise.name,
        duration: durationMinutes,
        durationMinutes: durationMinutes,
        intensity: selectedExercise.type === 'cardio' ? intensity : 'moderate',
        sets: selectedExercise.type === 'strength' ? parseInt(sets) || null : null,
        reps: selectedExercise.type === 'strength' ? parseInt(reps) || null : null,
        weightKg: selectedExercise.type === 'strength' ? parseFloat(weight) || null : null,
        caloriesBurned: estimatedCalories
      };

      try {
        await apiClient.post('/exercise/logs', payload);
      } catch (error: any) {
        // Fallback logic remains same
        const isFallbackScenario = error?.response?.status === 401 ||
          error?.code === 'SESSION_EXPIRED' ||
          error?.message?.includes('No refresh token') ||
          !error?.response;

        if (isFallbackScenario) {
          const existingLogs = await SecureStore.getItemAsync('guest_exercise_logs');
          const logs = existingLogs ? JSON.parse(existingLogs) : [];
          logs.push({
            ...payload,
            id: Date.now(),
            logged_at: new Date().toISOString(),
            status: 'pending_sync'
          });
          await SecureStore.setItemAsync('guest_exercise_logs', JSON.stringify(logs));
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          throw error;
        }
      }

      Alert.alert(
        'Workout Logged 🚀',
        `Great job! You crushed ${selectedExercise.name}.`,
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to log exercise.');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    if (!selectedExercise) return false;
    if (selectedExercise.type === 'strength') return parseInt(sets) > 0 && parseInt(reps) > 0;
    return parseInt(duration) > 0;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Workout</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >

            {/* QUICK ACCESS CHIPS */}
            <View style={styles.quickAccessContainer}>
              <Text style={styles.sectionLabel}>QUICK ADD</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
                {QUICK_ACCESS_EXERCISES.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.quickChip}
                    onPress={() => handleQuickSelect(ex)}
                  >
                    <View
                      style={[styles.quickChipContent, {
                        backgroundColor: ex.type === 'strength' ? THEME.primary + '15' : THEME.cardio + '15',
                        borderColor: ex.type === 'strength' ? THEME.primary : THEME.cardio
                      }]}
                    >
                      <MaterialCommunityIcons
                        name={ex.type === 'strength' ? 'dumbbell' : 'run'}
                        size={14}
                        color={ex.type === 'strength' ? THEME.primary : THEME.cardio}
                      />
                      <Text style={[styles.quickChipText, { color: ex.type === 'strength' ? THEME.primary : THEME.cardio }]}>
                        {ex.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* HERO SELECTOR CARD */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowExercisePicker(true)}
              style={[
                styles.selectorCard,
                selectedExercise ? { borderColor: THEME.primary, borderWidth: 1 } : {}
              ]}
            >
              {selectedExercise ? (
                <View style={styles.selectedContent}>
                  <View style={[styles.iconCircle, { backgroundColor: selectedExercise.type === 'strength' ? THEME.primary + '20' : THEME.cardio + '20' }]}>
                    <MaterialCommunityIcons
                      name={selectedExercise.type === 'strength' ? 'dumbbell' : 'run-fast'}
                      size={32}
                      color={selectedExercise.type === 'strength' ? THEME.primary : THEME.cardio}
                    />
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedLabel}>SELECTED EXERCISE</Text>
                    <Text style={styles.selectedName}>{selectedExercise.name}</Text>
                    <Text style={styles.selectedMeta}>{selectedExercise.muscleGroup}</Text>
                  </View>
                  <MaterialCommunityIcons name="pencil" size={20} color={THEME.textDim} />
                </View>
              ) : (
                <View style={styles.emptyContent}>
                  <View style={styles.plusIcon}>
                    <MaterialCommunityIcons name="plus" size={30} color={THEME.primary} />
                  </View>
                  <Text style={styles.emptyText}>Tap to select exercise</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* INPUTS CONTAINER */}
            {selectedExercise && (
              <View style={styles.inputsContainer}>
                <Text style={styles.sectionTitle}>
                  {selectedExercise.type === 'strength' ? 'PERFORMANCE METRICS' : 'SESSION DETAILS'}
                </Text>

                {selectedExercise.type === 'strength' ? (
                  <View style={styles.strengthGrid}>
                    {/* SETS with Stepper */}
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>SETS</Text>
                      <View style={styles.stepperRow}>
                        <TouchableOpacity onPress={() => updateValue(setSets, sets, -1)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="minus" size={16} color={THEME.textDim} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.heavyInput}
                          value={sets}
                          onChangeText={setSets}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={THEME.textDim}
                          maxLength={2}
                        />
                        <TouchableOpacity onPress={() => updateValue(setSets, sets, 1)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="plus" size={16} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* REPS with Stepper */}
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>REPS</Text>
                      <View style={styles.stepperRow}>
                        <TouchableOpacity onPress={() => updateValue(setReps, reps, -1)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="minus" size={16} color={THEME.textDim} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.heavyInput}
                          value={reps}
                          onChangeText={setReps}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={THEME.textDim}
                          maxLength={3}
                        />
                        <TouchableOpacity onPress={() => updateValue(setReps, reps, 1)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="plus" size={16} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* WEIGHT (Standard Input) */}
                    <View style={[styles.inputCard, { flex: 1.2 }]}>
                      <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                      <View style={styles.stepperRow}>
                        <TextInput
                          style={styles.heavyInput}
                          value={weight}
                          onChangeText={setWeight}
                          keyboardType="numeric"
                          placeholder="--"
                          placeholderTextColor={THEME.textDim}
                          maxLength={4}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cardioContainer}>
                    <View style={styles.inputCard}>
                      <Text style={styles.inputLabel}>DURATION (MIN)</Text>
                      <View style={styles.stepperRow}>
                        <TouchableOpacity onPress={() => updateValue(setDuration, duration, -5)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="minus" size={16} color={THEME.textDim} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.heavyInput}
                          value={duration}
                          onChangeText={setDuration}
                          keyboardType="numeric"
                          placeholder="30"
                          placeholderTextColor={THEME.textDim}
                          maxLength={3}
                        />
                        <TouchableOpacity onPress={() => updateValue(setDuration, duration, 5)} style={styles.stepperBtn}>
                          <MaterialCommunityIcons name="plus" size={16} color={THEME.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 12 }]}>INTENSITY</Text>
                    <View style={styles.intensityRow}>
                      {(['light', 'moderate', 'vigorous'] as const).map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.intensityBtn,
                            intensity === level && { backgroundColor: THEME.primary, borderColor: THEME.primary }
                          ]}
                          onPress={() => setIntensity(level)}
                        >
                          <Text style={[
                            styles.intensityText,
                            intensity === level && { color: '#0F172A', fontWeight: '800' }
                          ]}>
                            {level.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* LIVE FEEDBACK STATS */}
            {selectedExercise && (
              <Animated.View style={[styles.statsCard, { transform: [{ scale: feedbackScale }] }]}>
                <View style={styles.statsGradient}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{estimatedCalories}</Text>
                    <Text style={styles.statLabel}>KCAL</Text>
                  </View>
                  <View style={styles.statDivider} />
                  {selectedExercise.type === 'strength' ? (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{restTime}s</Text>
                      <Text style={styles.statLabel}>REST</Text>
                    </View>
                  ) : (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{duration}</Text>
                      <Text style={styles.statLabel}>MINS</Text>
                    </View>
                  )}
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="fire" size={24} color={THEME.cardio} />
                    <Text style={[styles.statLabel, { marginTop: 4 }]}>BURN</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            <View style={{ height: 100 }} />
          </Animated.ScrollView>
        </KeyboardAvoidingView>

        {/* BOTTOM ACTION BAR */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!isFormValid() || saving) && { opacity: 0.5 }]}
            onPress={handleSaveExercise}
            disabled={!isFormValid() || saving}
          >
            <LinearGradient
              colors={[THEME.primary, THEME.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.saveText}>LOG WORKOUT</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* MODERN EXERCISE PICKER MODAL */}
        <Modal visible={showExercisePicker} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Exercise</Text>
                <TouchableOpacity onPress={() => setShowExercisePicker(false)} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={24} color={THEME.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={THEME.textDim} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={THEME.textDim}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>

              <View style={styles.tabsRow}>
                {EXERCISE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.tabBtn, selectedCategory === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color }]}
                    onPress={() => setSelectedCategory(cat.id as any)}
                  >
                    <MaterialCommunityIcons name={cat.icon as any} size={18} color={selectedCategory === cat.id ? cat.color : THEME.textDim} />
                    <Text style={[styles.tabText, selectedCategory === cat.id && { color: cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView contentContainerStyle={styles.listContent}>
                {getFilteredExercises().map((ex, i) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.listItem}
                    onPress={() => handleSelectExercise(ex, selectedCategory)}
                  >
                    <View style={[styles.listIcon, { backgroundColor: selectedCategory === 'strength' ? THEME.primary + '20' : THEME.cardio + '20' }]}>
                      <MaterialCommunityIcons
                        name={selectedCategory === 'strength' ? 'dumbbell' : 'run'}
                        size={20}
                        color={selectedCategory === 'strength' ? THEME.primary : THEME.cardio}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName}>{ex.name}</Text>
                      <Text style={styles.listMeta}>{ex.muscleGroup}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.textDim} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  // Quick Access
  quickAccessContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textLight,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  quickScroll: {
    gap: 12,
  },
  quickChip: {
    borderRadius: 20,
  },
  quickChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickChipText: {
    fontWeight: '600',
    fontSize: 13,
  },

  // Selector Card
  selectorCard: {
    height: 120,
    borderRadius: 24,
    marginBottom: 30,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  plusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textDim,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.textLight,
    marginBottom: 4,
    letterSpacing: 1,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  selectedMeta: {
    fontSize: 14,
    color: THEME.textDim,
  },

  // Inputs
  inputsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textLight,
    marginBottom: 16,
    letterSpacing: 1,
    marginLeft: 4,
  },
  strengthGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textDim,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepperBtn: {
    padding: 8,
    backgroundColor: THEME.inputBg,
    borderRadius: 12,
  },
  heavyInput: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
    flex: 1,
    textAlign: 'center',
    padding: 0,
  },
  cardioContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  intensityBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.inputBg,
  },
  intensityText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textDim,
  },

  // Stats
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statsGradient: {
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textLight,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(250,250,250,0.9)', // blur effect wrapper
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Lighter overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    backgroundColor: '#FFFFFF', // Light modal
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: THEME.inputBg,
    borderRadius: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: THEME.text,
    fontSize: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
    backgroundColor: THEME.surface,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textDim,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 13,
    color: THEME.textDim,
  },
});

export default ExerciseLogScreen;
