// src/screens/ProfileSetupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userAPI, fitnessAPI, handleAPIError } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const colors = {
  background: '#102219',
  surface: '#16261f',
  primary: '#13ec80',
  primaryDark: '#0fb863',
  text: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#EF4444',
};

type FormData = {
  age: string;
  gender: string;
  height: string;
  weight: string;
  activityLevel: string;
  goal: string;
  // Advanced
  goalStyle: string;
  mealStyle: string;
  workoutLevel: string;
  aiControl: string;
  dietaryRestrictions: string;
  allergies: string;
  preferredCuisines: string;
};

const STEPS = [
  { id: 'basics', title: 'The Basics' },
  { id: 'body', title: 'Body Stats' },
  { id: 'goals', title: 'Your Goals' },
  { id: 'preferences', title: 'Preferences' }
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { id: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
  { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
  { id: 'active', label: 'Active', desc: '6-7 days/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Physical job or training' }
];

const GOALS = [
  { id: 'fat_loss', label: 'Fat Loss', desc: 'Lose weight safely' },
  { id: 'maintenance', label: 'Maintenance', desc: 'Stay at current weight' },
  { id: 'muscle_gain', label: 'Muscle Gain', desc: 'Build mass & strength' },
  { id: 'recomposition', label: 'Recomposition', desc: 'Lose fat, build muscle' }
];

const GOAL_STYLES = [
  { id: 'conservative', label: 'Conservative', desc: 'Slow & Steady' },
  { id: 'balanced', label: 'Balanced', desc: 'Standard Approach' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Faster Results' }
];

const MEAL_STYLES = [
  { id: 'fixed', label: 'Fixed Menu', desc: 'Same meals, simpler planning' },
  { id: 'swap_friendly', label: 'Flexible', desc: 'Mix & match options' }
];

const WORKOUT_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: '3-4 days/week' },
  { id: 'mixed', label: 'Intermediate', desc: '4-5 days/week' },
  { id: 'advanced', label: 'Advanced', desc: '5-6 days/week' }
];

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    age: '',
    gender: '', // 'male' | 'female'
    height: '',
    weight: '',
    activityLevel: '',
    goal: '',
    goalStyle: 'balanced', // Default
    mealStyle: 'fixed', // Default
    workoutLevel: 'beginner', // Default
    aiControl: 'suggest_only', // Default/Fixed
    dietaryRestrictions: '',
    allergies: '',
    preferredCuisines: ''
  });

  const updateForm = (key: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const isStepValid = () => {
    switch (step) {
      case 0: // Basics
        return formData.age && parseInt(formData.age) > 10 && parseInt(formData.age) < 100 && formData.gender;
      case 1: // Body
        return formData.height && parseInt(formData.height) > 50 && formData.weight && parseFloat(formData.weight) > 20;
      case 2: // Goals
        return formData.activityLevel && formData.goal;
      case 3: // Preferences
        return formData.goalStyle && formData.mealStyle && formData.workoutLevel;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid()) return;

    setLoading(true);
    try {
      console.log('📝 [PROFILE SETUP] Submitting profile setup to /api/user/profile-setup...');

      // Call the ONE-TIME profile setup endpoint
      const setupResponse = await userAPI.setupProfile({
        age: parseInt(formData.age),
        gender: formData.gender,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        goal_aggressiveness: formData.goalStyle,
        workout_level: formData.workoutLevel,
        meal_style: formData.mealStyle,
        dietary_restrictions: formData.dietaryRestrictions,
        allergies: formData.allergies,
        preferred_cuisines: formData.preferredCuisines
      });

      console.log('✅ [PROFILE SETUP] Backend response:', setupResponse);
      console.log('✅ [PROFILE SETUP] profile_completed =', setupResponse.user.profile_completed);

      // 2. Refresh user context to update auth state to 'authenticated'
      console.log('🔄 [PROFILE SETUP] Calling refreshUser to update auth context...');
      await refreshUser();

      // 3. Show success alert
      Alert.alert('Success!', 'Your profile is complete. Welcome to FitCoach AI!');

      // Navigation will automatically happen when AuthContext updates auth status to 'authenticated'
      console.log('📱 [PROFILE SETUP] AppNavigator will automatically route to Dashboard');

    } catch (error: any) {
      console.error('❌ [PROFILE SETUP] Error:', error);

      // Check if it's a 409 Conflict (profile already completed)
      if (error.response?.status === 409) {
        console.warn('⚠️ [PROFILE SETUP] Profile already completed');
        Alert.alert('Already Completed', 'Your profile has already been set up. Redirecting to dashboard...');
        // Refresh and let AppNavigator handle routing
        await refreshUser();
      } else {
        Alert.alert('Setup Failed', handleAPIError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderOption = (
    key: keyof FormData,
    value: string,
    label: string,
    description?: string
  ) => {
    const isSelected = formData[key] === value;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.optionCard,
          isSelected && styles.optionCardSelected
        ]}
        onPress={() => updateForm(key, value)}
      >
        <View style={styles.optionHeader}>
          <View style={[
            styles.radioOuter,
            isSelected && styles.radioOuterSelected
          ]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.optionLabel, isSelected && styles.textSelected]}>
            {label}
          </Text>
        </View>
        {description && (
          <Text style={styles.optionDesc}>{description}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 0: // Basics
        return (
          <View style={styles.stepContent}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(t) => updateForm('age', t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="e.g. 30"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.row}>
              {renderOption('gender', 'male', 'Male')}
            </View>
            <View style={styles.row}>
              {renderOption('gender', 'female', 'Female')}
            </View>
          </View>
        );
      case 1: // Body Stats
        return (
          <View style={styles.stepContent}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(t) => updateForm('height', t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="e.g. 175"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(t) => updateForm('weight', t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="e.g. 70"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        );
      case 2: // Goals & Activity
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Activity Level</Text>
            {ACTIVITY_LEVELS.map(l => renderOption('activityLevel', l.id, l.label, l.desc))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Primary Goal</Text>
            {GOALS.map(g => renderOption('goal', g.id, g.label, g.desc))}
            <View style={{ height: 40 }} />
          </ScrollView>
        );
      case 3: // Advanced Preferences
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Strategy</Text>
            {GOAL_STYLES.map(s => renderOption('goalStyle', s.id, s.label, s.desc))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Meal Planning</Text>
            {MEAL_STYLES.map(s => renderOption('mealStyle', s.id, s.label, s.desc))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Workout Schedule</Text>
            {WORKOUT_LEVELS.map(s => renderOption('workoutLevel', s.id, s.label, s.desc))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Diet & Allergies</Text>
            <Text style={styles.inputLabel}>Restrictions</Text>
            <TextInput
              style={styles.input}
              value={formData.dietaryRestrictions}
              onChangeText={(t) => updateForm('dietaryRestrictions', t)}
              placeholder="e.g. Vegan, Keto (Optional)"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.inputLabel}>Allergies</Text>
            <TextInput
              style={styles.input}
              value={formData.allergies}
              onChangeText={(t) => updateForm('allergies', t)}
              placeholder="e.g. Peanuts, Gluten (Optional)"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.inputLabel}>Preferred Cuisines</Text>
            <TextInput
              style={styles.input}
              value={formData.preferredCuisines}
              onChangeText={(t) => updateForm('preferredCuisines', t)}
              placeholder="e.g. Italian, Indian (Optional)"
              placeholderTextColor={colors.textTertiary}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile Setup</Text>
        <View style={styles.progressContainer}>
          {STEPS.map((s, i) => (
            <View key={s.id} style={[
              styles.progressBar,
              { backgroundColor: i <= step ? colors.primary : colors.surface }
            ]} />
          ))}
        </View>
        <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={nextStep}
          disabled={!isStepValid() || loading}
          style={[
            styles.nextButton,
            (!isStepValid() || loading) && styles.disabledButton,
            step === 0 && { flex: 1 } // Full width on first step
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === STEPS.length - 1 ? 'Finish Setup' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    color: colors.text,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 32, // Align with text
  },
  textSelected: {
    color: colors.primary,
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    padding: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  nextButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
