import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';

const colors = { primary: '#13ec80', background: '#102219', surface: '#16261f', text: '#ffffff', textSecondary: '#9CA3AF' };

export default function WorkoutPlannerScreen() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const getWorkout = async () => {
    setLoading(true);
    try {
      const result = await AIService.getWorkoutPlan('weight_loss', 'beginner');
      setPlan(result);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch workout plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Workout Coach</Text>
      <TouchableOpacity onPress={getWorkout} style={styles.button}>
        <Text style={styles.buttonText}>{loading ? 'Generating...' : 'Create Today\'s Plan'}</Text>
      </TouchableOpacity>
      <ScrollView style={styles.content}>
        {loading && <ActivityIndicator size='large' color={colors.primary} />}
        {plan && <Text style={styles.text}>{plan}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, color: colors.text, fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: colors.background, fontWeight: 'bold' },
  content: { marginTop: 20 },
  text: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 }
});
