/**
 * ============================================================================
 * WORKOUT RECOMMENDATION SCREEN
 * FitCoach AI Mobile - React Native + TypeScript
 * 
 * STRICT ENGINEERING MODE REQUIREMENTS:
 * - Template-first workout recommendations
 * - Display 5 templates: Push/Pull/Legs, Upper/Lower, Full Body, Bro Split, HIIT
 * - Show daily workout with exercise details
 * - MET-based calorie calculations
 * - Personal record tracking
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
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface Exercise {
  exercise_id: number;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  met_value: number;
  category: string;
  primary_muscle: string;
  equipment?: string;
}

interface DailyWorkout {
  day_name: string;
  exercises: Exercise[];
  total_exercises: number;
  estimated_duration_minutes: number;
  estimated_calories: number;
}

interface WorkoutProgram {
  program_id: number;
  template_id: string;
  template_name: string;
  frequency: number;
  split: string[];
  description: string;
  tuning_notes: string;
  start_date: string;
}

export default function WorkoutRecommendationScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'program'>('today');
  const [dailyWorkout, setDailyWorkout] = useState<DailyWorkout | null>(null);
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      // Get daily workout
      const workoutResponse = await axios.get(
        `${API_URL}/api/workout/daily`,
        {
          params: { user_id: userId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (workoutResponse.data.success) {
        setDailyWorkout(workoutResponse.data.data);
      }
    } catch (error: any) {
      console.error('Load workout error:', error);
      if (error.response?.status === 404) {
        // No active program - prompt to generate one
        Alert.alert(
          'No Active Program',
          'Would you like to generate a personalized workout program?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Generate', onPress: () => generateProgram() },
          ]
        );
      } else {
        Alert.alert('Error', error.response?.data?.error || 'Failed to load workout');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateProgram = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const response = await axios.post(
        `${API_URL}/api/workout/recommend`,
        { user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          'Program Generated!',
          `Your personalized ${response.data.data.template_name} program is ready.`,
          [{ text: 'OK', onPress: () => loadData() }]
        );
      }
    } catch (error: any) {
      console.error('Generate program error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate program');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startWorkout = () => {
    if (!dailyWorkout) return;

    Alert.alert(
      'Start Workout',
      `Ready to start ${dailyWorkout.day_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            // Navigate to workout session screen
            Alert.alert('Success', 'Workout session started! (Session tracking to be implemented)');
          },
        },
      ]
    );
  };

  const renderExerciseCard = (exercise: Exercise, index: number) => {
    const isExpanded = expandedExercise === index;
    const muscleColors: { [key: string]: string[] } = {
      chest: ['#FF6B6B', '#EE5A52'],
      back: ['#4ECDC4', '#44A8A1'],
      legs: ['#FFD93D', '#FAC213'],
      shoulders: ['#A8E6CF', '#8FD9B6'],
      arms: ['#95E1D3', '#7BC9BC'],
      core: ['#F38181', '#E76E6E'],
      cardio: ['#6C5CE7', '#5F4FD1'],
    };

    const colors = muscleColors[exercise.primary_muscle.toLowerCase()] || ['#9E9E9E', '#757575'];

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.8}
        onPress={() => setExpandedExercise(isExpanded ? null : index)}
        style={styles.exerciseCard}
      >
        <LinearGradient colors={colors} style={styles.exerciseGradient}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseTarget}>{exercise.primary_muscle}</Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#FFF"
            />
          </View>

          <View style={styles.exerciseStats}>
            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{exercise.sets} sets</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="repeat-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{exercise.reps} reps</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{exercise.rest_seconds}s rest</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.exerciseDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{exercise.category}</Text>
              </View>
              {exercise.equipment && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Equipment:</Text>
                  <Text style={styles.detailValue}>{exercise.equipment}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>MET Value:</Text>
                <Text style={styles.detailValue}>{exercise.met_value} METs</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your workout...</Text>
      </View>
    );
  }

  if (!dailyWorkout) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Program</Text>
        </LinearGradient>

        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No Active Program</Text>
          <Text style={styles.emptyText}>
            Generate a personalized workout program based on your goals and experience level.
          </Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateProgram}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.generateGradient}>
              <Ionicons name="sparkles" size={24} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate Program</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Today's Workout</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Workout Summary Card */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.summaryCard}
        >
          <Text style={styles.dayName}>{dailyWorkout.day_name}</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Ionicons name="barbell" size={24} color="#FFF" />
              <Text style={styles.summaryStatValue}>{dailyWorkout.total_exercises}</Text>
              <Text style={styles.summaryStatLabel}>Exercises</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Ionicons name="time" size={24} color="#FFF" />
              <Text style={styles.summaryStatValue}>{dailyWorkout.estimated_duration_minutes}</Text>
              <Text style={styles.summaryStatLabel}>Minutes</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Ionicons name="flame" size={24} color="#FFF" />
              <Text style={styles.summaryStatValue}>{dailyWorkout.estimated_calories}</Text>
              <Text style={styles.summaryStatLabel}>Calories</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
            <Ionicons name="play-circle" size={24} color="#6366F1" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color="#333" /> Exercise List
          </Text>
          {dailyWorkout.exercises.map((exercise, index) => 
            renderExerciseCard(exercise, index)
          )}
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={24} color="#FFB800" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.tipsTitle}>Workout Tips</Text>
            <Text style={styles.tipsText}>
              • Warm up for 5-10 minutes before starting{'\n'}
              • Focus on proper form over heavy weight{'\n'}
              • Rest adequately between sets{'\n'}
              • Stay hydrated throughout your workout{'\n'}
              • Cool down and stretch after finishing
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
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dayName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  summaryStatLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  exercisesSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  exerciseCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  exerciseGradient: {
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  exerciseTarget: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  exerciseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  exerciseDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  generateButton: {
    marginTop: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
