/**
 * ExerciseLogScreen.tsx
 * Premium Luxury Exercise Logging Experience
 * 
 * Design Philosophy:
 * - Calm, minimal, white-space-rich
 * - Card-based adaptive UI
 * - Real-time feedback
 * - Feels like Apple Fitness+ / WHOOP
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exerciseAPI, workoutAPI } from '../services/api';
import apiClient from '../services/api';

const { width } = Dimensions.get('window');

// Premium Design System - Strict White/Neutral Theme
const colors = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  accent: '#3B82F6',        // Soft premium blue
  accentLight: '#EFF6FF',
  accentDark: '#2563EB',
  textPrimary: '#1E293B',   // Dark neutral (not pure black)
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textMuted: '#CBD5E1',
  border: '#E2E8F0',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  error: '#EF4444',
  protein: '#8B5CF6',
  cardio: '#EC4899',
};

// Exercise Categories with MET values
const EXERCISE_CATEGORIES = [
  { id: 'strength', label: 'Strength', icon: 'dumbbell', color: colors.accent },
  { id: 'cardio', label: 'Cardio', icon: 'run', color: colors.cardio },
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
  const slideAnim = useRef(new Animated.Value(30)).current;
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
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.poly(4)),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.poly(4)),
      }),
    ]).start();
  }, []);

  // Load today's workout for quick pick
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
      // Silently fail - today's workout is optional
      console.log('No today workout available');
    }
  };

  // Calculate calories in real-time
  useEffect(() => {
    if (!selectedExercise) {
      setEstimatedCalories(0);
      setRestTime(0);
      return;
    }

    const met = selectedExercise.met;
    let durationHours = 0;

    if (selectedExercise.type === 'strength') {
      // Estimate duration: sets * reps * 3 seconds + rest between sets
      const setsNum = parseInt(sets) || 0;
      const repsNum = parseInt(reps) || 0;
      const restSec = selectedExercise.restSeconds || 60;
      const totalSeconds = (setsNum * repsNum * 3) + ((setsNum - 1) * restSec);
      durationHours = totalSeconds / 3600;
      setRestTime(restSec);
    } else {
      durationHours = (parseInt(duration) || 0) / 60;
      // Adjust MET for intensity
      const intensityMultiplier = intensity === 'light' ? 0.7 : intensity === 'vigorous' ? 1.3 : 1.0;
      const adjustedMet = met * intensityMultiplier;
      setEstimatedCalories(Math.round(adjustedMet * userWeight * durationHours));
      setRestTime(0);
      return;
    }

    // Calories = MET × weight(kg) × time(hours)
    const calories = Math.round(met * userWeight * durationHours);
    setEstimatedCalories(calories);

    // Animate feedback card
    Animated.sequence([
      Animated.timing(feedbackScale, {
        toValue: 1.02,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedExercise, sets, reps, weight, duration, intensity, userWeight]);

  // Select exercise from picker
  const handleSelectExercise = (exercise: any, type: 'strength' | 'cardio') => {
    setSelectedExercise({
      ...exercise,
      type,
    });
    setShowExercisePicker(false);
    setSelectedCategory(type);

    // Auto-scroll to inputs
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 200, animated: true });
    }, 300);
  };

  // Get filtered exercises
  const getFilteredExercises = () => {
    const exercises = COMMON_EXERCISES[selectedCategory] || [];
    if (!searchQuery.trim()) return exercises;
    return exercises.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get encouraging micro-copy
  const getEncouragingText = () => {
    if (!selectedExercise) return '';
    if (selectedExercise.type === 'strength') {
      const setsNum = parseInt(sets) || 0;
      const repsNum = parseInt(reps) || 0;
      if (setsNum >= 4 && repsNum >= 8) return 'Strong set 💪';
      if (setsNum >= 3) return 'Solid volume';
      return 'Every rep counts';
    } else {
      const dur = parseInt(duration) || 0;
      if (dur >= 45) return 'Excellent endurance 🔥';
      if (dur >= 30) return 'Great session';
      return 'Keep moving';
    }
  };

  // Save exercise
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
        // Attempt API log
        await apiClient.post('/exercise/logs', payload);
      } catch (error: any) {
        console.log('API call failed, checking if auth/guest issue:', error?.message);

        // If API fails with Auth error (401), Session Expired, or Network Error, assume Guest/Offline mode
        const isFallbackScenario = error?.response?.status === 401 ||
          error?.code === 'SESSION_EXPIRED' ||
          error?.message?.includes('No refresh token') ||
          !error?.response; // Network error fallback

        if (isFallbackScenario) {
          console.log('Guest/Offline fallback triggered');
          const existingLogs = await SecureStore.getItemAsync('guest_exercise_logs');
          const logs = existingLogs ? JSON.parse(existingLogs) : [];
          logs.push({
            ...payload,
            id: Date.now(),
            logged_at: new Date().toISOString(),
            status: 'pending_sync'
          });
          await SecureStore.setItemAsync('guest_exercise_logs', JSON.stringify(logs));

          // Mimic network delay for UX
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // It's a real server error (500) or bad request (400)
          throw error;
        }
      }

      // Success feedback
      Alert.alert(
        'Logged! 🎉',
        `${selectedExercise.name} - ${estimatedCalories} cal burned`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Save exercise error:', error);
      Alert.alert('Error', 'Failed to log exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!selectedExercise) return false;
    if (selectedExercise.type === 'strength') {
      return parseInt(sets) > 0 && parseInt(reps) > 0;
    }
    return parseInt(duration) > 0;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Track Your Workout</Text>
          <Text style={styles.headerSubtitle}>Every rep counts today.</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Exercise Selection Card */}
          <TouchableOpacity
            style={styles.exerciseCard}
            onPress={() => setShowExercisePicker(true)}
            activeOpacity={0.8}
          >
            {selectedExercise ? (
              <View style={styles.selectedExerciseContent}>
                <View style={[styles.exerciseIconBg, { backgroundColor: selectedExercise.type === 'strength' ? colors.accentLight : '#FDF2F8' }]}>
                  <MaterialCommunityIcons
                    name={selectedExercise.type === 'strength' ? 'dumbbell' : 'run'}
                    size={28}
                    color={selectedExercise.type === 'strength' ? colors.accent : colors.cardio}
                  />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{selectedExercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {selectedExercise.muscleGroup} • {selectedExercise.type === 'strength' ? 'Strength' : 'Cardio'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
              </View>
            ) : (
              <View style={styles.emptyExerciseContent}>
                <View style={styles.emptyExerciseIcon}>
                  <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.emptyExerciseTitle}>Select Exercise</Text>
                  <Text style={styles.emptyExerciseSubtitle}>Tap to choose from library</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
              </View>
            )}
          </TouchableOpacity>

          {/* Smart Input Section - Adaptive UI */}
          {selectedExercise && (
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>
                {selectedExercise.type === 'strength' ? 'SET DETAILS' : 'SESSION DETAILS'}
              </Text>

              {selectedExercise.type === 'strength' ? (
                // Strength Inputs
                <View style={styles.inputGrid}>
                  <View style={styles.inputItem}>
                    <Text style={styles.inputLabel}>Sets</Text>
                    <TextInput
                      style={styles.inputField}
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="numeric"
                      placeholder="3"
                      placeholderTextColor={colors.textMuted}
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.inputItem}>
                    <Text style={styles.inputLabel}>Reps</Text>
                    <TextInput
                      style={styles.inputField}
                      value={reps}
                      onChangeText={setReps}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.inputItem}>
                    <Text style={styles.inputLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.inputField}
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      maxLength={4}
                    />
                  </View>
                </View>
              ) : (
                // Cardio Inputs
                <View style={styles.cardioInputs}>
                  <View style={styles.durationInput}>
                    <Text style={styles.inputLabel}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.inputFieldLarge}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={colors.textMuted}
                      maxLength={3}
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 20 }]}>Intensity</Text>
                  <View style={styles.intensityRow}>
                    {(['light', 'moderate', 'vigorous'] as const).map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.intensityButton,
                          intensity === level && styles.intensityButtonActive,
                        ]}
                        onPress={() => setIntensity(level)}
                      >
                        <Text style={[
                          styles.intensityLabel,
                          intensity === level && styles.intensityLabelActive,
                        ]}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Live Feedback Card */}
          {selectedExercise && (estimatedCalories > 0 || restTime > 0) && (
            <Animated.View style={[styles.feedbackCard, { transform: [{ scale: feedbackScale }] }]}>
              <View style={styles.feedbackHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.accent} />
                <Text style={styles.feedbackTitle}>Live Stats</Text>
              </View>

              <View style={styles.feedbackStats}>
                <View style={styles.feedbackStat}>
                  <Text style={styles.feedbackValue}>{estimatedCalories}</Text>
                  <Text style={styles.feedbackLabel}>Calories</Text>
                </View>

                {selectedExercise.type === 'strength' && restTime > 0 && (
                  <View style={styles.feedbackStat}>
                    <Text style={styles.feedbackValue}>{restTime}s</Text>
                    <Text style={styles.feedbackLabel}>Rest Time</Text>
                  </View>
                )}

                <View style={styles.feedbackStat}>
                  <Text style={styles.feedbackValue}>{selectedExercise.muscleGroup}</Text>
                  <Text style={styles.feedbackLabel}>Target</Text>
                </View>
              </View>

              <View style={styles.encouragementRow}>
                <Text style={styles.encouragementText}>{getEncouragingText()}</Text>
              </View>
            </Animated.View>
          )}

          {/* Bottom Spacer */}
          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logButton, !isFormValid() && styles.logButtonDisabled]}
          onPress={handleSaveExercise}
          disabled={!isFormValid() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.logButtonText}>Log Exercise</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowExercisePicker(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {EXERCISE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === cat.id && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(cat.id as 'strength' | 'cardio')}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={18}
                  color={selectedCategory === cat.id ? colors.accent : colors.textTertiary}
                />
                <Text style={[
                  styles.categoryTabLabel,
                  selectedCategory === cat.id && styles.categoryTabLabelActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Workout Shortcut */}
          {todayExercises.length > 0 && (
            <View style={styles.todaySection}>
              <Text style={styles.todaySectionLabel}>FROM TODAY'S WORKOUT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {todayExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.todayExerciseChip}
                    onPress={() => handleSelectExercise({
                      id: ex.id,
                      name: ex.name,
                      muscleGroup: 'Planned',
                      met: 5.0,
                      restSeconds: 60,
                    }, 'strength')}
                  >
                    <Text style={styles.todayExerciseText}>{ex.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Exercise List */}
          <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
            {getFilteredExercises().map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseListItem}
                onPress={() => handleSelectExercise(exercise, selectedCategory)}
              >
                <View style={[styles.exerciseListIcon, { backgroundColor: selectedCategory === 'strength' ? colors.accentLight : '#FDF2F8' }]}>
                  <MaterialCommunityIcons
                    name={selectedCategory === 'strength' ? 'dumbbell' : 'run'}
                    size={20}
                    color={selectedCategory === 'strength' ? colors.accent : colors.cardio}
                  />
                </View>
                <View style={styles.exerciseListInfo}>
                  <Text style={styles.exerciseListName}>{exercise.name}</Text>
                  <Text style={styles.exerciseListMeta}>{exercise.muscleGroup}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Exercise Card
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 16,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyExerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  emptyExerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyExerciseSubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  // Input Section
  inputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputItem: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardioInputs: {},
  durationInput: {},
  inputFieldLarge: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  intensityButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  intensityButtonActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  intensityLabelActive: {
    color: colors.accent,
  },

  // Feedback Card
  feedbackCard: {
    backgroundColor: colors.successLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.5,
  },
  feedbackStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  feedbackStat: {
    alignItems: 'center',
  },
  feedbackValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  feedbackLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  encouragementRow: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  encouragementText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  logButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 14,
  },

  // Category Tabs
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  categoryTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTabLabelActive: {
    color: colors.accent,
  },

  // Today's Workout Section
  todaySection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  todaySectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  todayExerciseChip: {
    backgroundColor: colors.warningLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  todayExerciseText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },

  // Exercise List
  exerciseList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  exerciseListIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseListInfo: {
    flex: 1,
    marginLeft: 14,
  },
  exerciseListName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  exerciseListMeta: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});

export default ExerciseLogScreen;
