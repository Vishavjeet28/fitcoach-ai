import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { exerciseAPI, handleAPIError } from '../services/api';
import apiClient from '../services/api';

const colors = {
  primary: '#13ec80',
  primaryDark: '#0fb863',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  warning: '#FBBF24',
  info: '#60A5FA',
  success: '#10B981',
  error: '#EF4444',
};

const ExerciseLogScreen = () => {
  const navigation = useNavigation();
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [exerciseType, setExerciseType] = useState('cardio');
  const [intensity, setIntensity] = useState('moderate');
  const [loading, setLoading] = useState(false);

  const exerciseTypes = [
    { id: 'cardio', label: 'Cardio', icon: 'run', color: colors.warning },
    { id: 'strength', label: 'Strength', icon: 'dumbbell', color: colors.error },
    { id: 'flexibility', label: 'Flexibility', icon: 'yoga', color: colors.info },
    { id: 'sports', label: 'Sports', icon: 'basketball', color: colors.success },
  ];

  const intensityLevels = [
    { id: 'light', label: 'Light', color: colors.success },
    { id: 'moderate', label: 'Moderate', color: colors.warning },
    { id: 'intense', label: 'Intense', color: colors.error },
  ];

  const handleSaveExercise = async () => {
    if (!exerciseName || !duration) return;

    try {
      setLoading(true);

      const durationValue = parseInt(duration);
      
      const payload = {
        exerciseName: exerciseName.trim(),
        customExerciseName: exerciseName.trim(),
        duration: durationValue, // For validator
        durationMinutes: durationValue, // For controller
        intensity: intensity as 'light' | 'moderate' | 'vigorous',
        caloriesBurned: parseInt(caloriesBurned) || undefined,
      };

      console.log('Sending exercise log payload:', JSON.stringify(payload, null, 2));

      await apiClient.post('/exercise/logs', payload);

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = handleAPIError(error);
      Alert.alert('Save Failed', `${errorMessage}\n\n(Status: ${error.response?.status || 'Unknown'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = () => {
    navigation.navigate('Coach' as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Exercise</Text>
          <Text style={styles.headerSubtitle}>Track your workout</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={handleAskAI}
        >
          <MaterialCommunityIcons name="robot-excited" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Quick AI Assistant Banner */}
          <TouchableOpacity 
            style={styles.aiAssistantBanner}
            onPress={handleAskAI}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '10']}
              style={styles.aiBannerGradient}
            >
              <View style={styles.aiIconContainer}>
                <MaterialCommunityIcons name="robot-excited" size={28} color={colors.primary} />
              </View>
              <View style={styles.aiBannerContent}>
                <Text style={styles.aiBannerTitle}>Let AI Track Your Workout!</Text>
                <Text style={styles.aiBannerText}>Tell me what you did, I'll calculate calories burned</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Exercise Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXERCISE TYPE</Text>
            <View style={styles.typeGrid}>
              {exerciseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    exerciseType === type.id && styles.typeCardActive,
                  ]}
                  onPress={() => setExerciseType(type.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                    <MaterialCommunityIcons 
                      name={type.icon} 
                      size={24} 
                      color={exerciseType === type.id ? type.color : colors.textTertiary} 
                    />
                  </View>
                  <Text style={[
                    styles.typeLabel,
                    exerciseType === type.id && { color: type.color }
                  ]}>
                    {type.label}
                  </Text>
                  {exerciseType === type.id && (
                    <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                      <MaterialCommunityIcons name="check" size={12} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercise Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXERCISE DETAILS</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialCommunityIcons name="clipboard-text" size={20} color={colors.primary} />
                <Text style={styles.inputLabelText}>Exercise Name</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g., Running, Push-ups, Yoga"
                placeholderTextColor={colors.textTertiary}
                value={exerciseName}
                onChangeText={setExerciseName}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainerHalf}>
                <View style={styles.inputLabel}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={colors.info} />
                  <Text style={styles.inputLabelText}>Duration (min)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={colors.textTertiary}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainerHalf}>
                <View style={styles.inputLabel}>
                  <MaterialCommunityIcons name="fire" size={20} color={colors.warning} />
                  <Text style={styles.inputLabelText}>Calories Burned</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="200"
                  placeholderTextColor={colors.textTertiary}
                  value={caloriesBurned}
                  onChangeText={setCaloriesBurned}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Intensity Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INTENSITY LEVEL</Text>
            <View style={styles.intensityRow}>
              {intensityLevels.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.intensityCard,
                    intensity === level.id && [styles.intensityCardActive, { borderColor: level.color + '50' }]
                  ]}
                  onPress={() => setIntensity(level.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.intensityLabel,
                    intensity === level.id && { color: level.color }
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Add Workouts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK ADD</Text>
            <View style={styles.quickAddGrid}>
              {[
                { name: 'Running 30min', cal: 300, icon: 'run', type: 'cardio' },
                { name: 'Cycling 45min', cal: 350, icon: 'bike', type: 'cardio' },
                { name: 'Weight Training', cal: 200, icon: 'dumbbell', type: 'strength' },
                { name: 'Yoga 60min', cal: 180, icon: 'yoga', type: 'flexibility' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickAddCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    setExerciseName(item.name);
                    setCaloriesBurned(item.cal.toString());
                    setExerciseType(item.type);
                  }}
                >
                  <MaterialCommunityIcons 
                    name={item.icon} 
                    size={32} 
                    color={colors.warning} 
                  />
                  <Text style={styles.quickAddName}>{item.name}</Text>
                  <Text style={styles.quickAddCal}>-{item.cal} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Summary */}
          {(caloriesBurned || duration) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Workout Summary</Text>
              <View style={styles.summaryGrid}>
                {duration && (
                  <View style={styles.summaryItem}>
                    <MaterialCommunityIcons name="clock-outline" size={24} color={colors.info} />
                    <Text style={styles.summaryValue}>{duration} min</Text>
                    <Text style={styles.summaryLabel}>Duration</Text>
                  </View>
                )}
                {caloriesBurned && (
                  <View style={styles.summaryItem}>
                    <MaterialCommunityIcons name="fire" size={24} color={colors.warning} />
                    <Text style={styles.summaryValue}>{caloriesBurned}</Text>
                    <Text style={styles.summaryLabel}>Calories Burned</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (!exerciseName || !duration) && styles.saveButtonDisabled]}
          onPress={handleSaveExercise}
          disabled={!exerciseName || !duration}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!exerciseName || !duration) 
              ? [colors.textTertiary, colors.textTertiary] 
              : [colors.warning, '#D97706']
            }
            style={styles.saveButtonGradient}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Exercise</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },

  aiAssistantBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 16,
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiBannerContent: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  aiBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  typeCardActive: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '10',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputContainer: {
    marginBottom: 16,
  },
  inputContainerHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },

  intensityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  intensityCard: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  intensityCardActive: {
    backgroundColor: colors.primary + '10',
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAddCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickAddName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  quickAddCal: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 4,
    fontWeight: 'bold',
  },

  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default ExerciseLogScreen;
