import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';

const colors = { primary: '#13ec80', background: '#102219', surface: '#16261f', text: '#ffffff', textSecondary: '#9CA3AF' };

export default function MealPlannerScreen() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const getMealPlan = async () => {
    setLoading(true);
    try {
      const result = await AIService.getMealSuggestions('dinner');
      setSuggestion(result);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch meal plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Meal Planner</Text>
      <TouchableOpacity onPress={getMealPlan} style={styles.button}>
        <Text style={styles.buttonText}>{loading ? 'Generating...' : 'Suggest Dinner'}</Text>
      </TouchableOpacity>
      <ScrollView style={styles.content}>
        {loading && <ActivityIndicator size='large' color={colors.primary} />}
        {suggestion && <Text style={styles.text}>{suggestion}</Text>}
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
