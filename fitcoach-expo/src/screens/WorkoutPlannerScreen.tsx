
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AIService from '../services/aiService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { workoutAPI } from '../services/api';

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  backgroundDark: '#FAFAFA', // Light BG
  surfaceDark: '#FFFFFF', // Light Surface
  textPrimary: '#1e293b', // Slate 800
  textSecondary: '#64748b', // Slate 500
  textTertiary: '#94a3b8',
  blue: '#3B82F6',
  blueDark: '#2563EB',
  orange: '#F97316'
};

export default function WorkoutPlannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null); // For legacy text mode
  const [selectedExercise, setSelectedExercise] = useState<any>(null); // For modal

  // Navigation Params
  const programData = route.params?.program; // Full program from AI/Generation (Generation Flow)
  const dailyWorkout = route.params?.dailyWorkout; // Single day from Dashboard (Consumption Flow)

  // Decide what to render
  const isDailyView = !!dailyWorkout;
  const isProgramView = !!programData;
  const isGeneratorView = !isDailyView && !isProgramView;

  const { user } = useAuth(); // Get user from context

  const handleGenerate = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // Use the correct backend API that saves to DB
      const result = await workoutAPI.recommendProgram(user.id);

      if (result && result.program) {
        Alert.alert(
          'Success',
          'Workout plan generated and saved!',
          [
            {
              text: 'View Plan',
              onPress: () => {
                // Navigate reload or set local state to show program
                // For now, we update the local route params or state to show it
                navigation.setParams({ program: result });
              }
            }
          ]
        );
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseCard = (ex: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.exerciseCard}
      onPress={() => setSelectedExercise(ex)}
    >
      <View style={styles.exHeader}>
        <Text style={styles.exName}>{ex.name}</Text>
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.exMetaRow}>
        <MaterialCommunityIcons name="weight-lifter" size={16} color={colors.textTertiary} />
        <Text style={styles.exMetaText}>
          {Array.isArray(ex.sets) ? ex.sets[0] : ex.sets} sets × {Array.isArray(ex.reps) ? ex.reps[0] : ex.reps} reps
        </Text>
      </View>
      {ex.met && (
        <Text style={styles.exSubMeta}>Intensity (MET): {ex.met}</Text>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, exercises: any[], icon: string) => {
    if (!exercises || exercises.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {exercises.map(renderExerciseCard)}
      </View>
    );
  };

  const renderDailyContent = () => {
    const { split, warmup, cooldown, program_name, day } = dailyWorkout;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.programTitle}>{program_name || 'Daily Workout'}</Text>
          <Text style={styles.programSubtitle}>Day {day}</Text>
          <Text style={styles.splitName}>{split.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{dailyWorkout.estimated_calories || '-'}</Text>
              <Text style={styles.statLabel}>Kcal</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{split.total_duration_min || '-'}</Text>
              <Text style={styles.statLabel}>Mins</Text>
            </View>
          </View>
        </View>

        {renderSection('Warmup', warmup, 'run-fast')}
        {renderSection('Main Workout', split.exercises, 'dumbbell')}
        {renderSection('Cooldown', cooldown, 'meditation')}

        <TouchableOpacity
          style={styles.finishButton}
          disabled={loading}
          onPress={async () => {
            setLoading(true);
            try {
              // Construct session log data
              const sessionData = {
                program_id: dailyWorkout.program_id,
                split_name: dailyWorkout.split.name,
                duration_minutes: dailyWorkout.split.total_duration_min || 45,
                exercises_completed: [
                  ...(dailyWorkout.warmup || []),
                  ...(dailyWorkout.split.exercises || []),
                  ...(dailyWorkout.cooldown || [])
                ].map(ex => ({
                  ...ex,
                  duration_min: ex.estimated_duration_min || 5
                })),
                notes: 'Completed via FitCoach App'
              };

              await workoutAPI.logSession(sessionData);

              Alert.alert('Great Job!', 'Workout logged successfully.', [
                { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }) }
              ]);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to log workout.');
              setLoading(false);
            }
          }}
        >
          <Text style={styles.finishButtonText}>{loading ? 'Saving...' : 'Finish Workout'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderProgramContent = () => {
    const { program, reasoning } = programData;
    // Backend recommendProgram returns { program: { splits: [], warmup: [], cooldown: [] }, reasoning }
    // Or structure might vary slightly, treating securely.
    const p = program || {};

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.programTitle}>{p.name || 'Recommended Plan'}</Text>
          <Text style={styles.programSubtitle}>{p.frequency ? `${p.frequency} Days / Week` : 'Custom Plan'}</Text>
          <Text style={styles.reasoning}>{reasoning}</Text>
        </View>

        <Text style={styles.sectionHeaderTitle}>Routine Structure</Text>

        {(p.splits || []).map((split: any, i: number) => (
          <View key={i} style={styles.dayCard}>
            <Text style={styles.dayTitle}>Day {split.day}: {split.name}</Text>
            {split.exercises.map((ex: any, idx: number) => (
              <Text key={idx} style={styles.dayEx}>• {ex.name}</Text>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={styles.finishButton}
          onPress={() => {
            navigation.navigate('Main', { screen: 'Dashboard' });
          }}
        >
          <Text style={styles.finishButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDailyView ? 'Today\'s Session' : 'Workout Plan'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {isDailyView && renderDailyContent()}
      {isProgramView && renderProgramContent()}
      {isGeneratorView && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { alignItems: 'center' }]}>
            <MaterialCommunityIcons name="robot" size={48} color={colors.blue} style={{ marginBottom: 16 }} />
            <Text style={styles.description}>
              No active plan found. Let AI design a workout for you.
            </Text>
            <TouchableOpacity onPress={handleGenerate} disabled={loading} style={styles.button}>
              <Text style={styles.buttonText}>{loading ? 'Generating...' : 'Generate New Plan'}</Text>
            </TouchableOpacity>
          </View>
          {generatedPlan && <Text style={styles.resultText}>{generatedPlan}</Text>}
        </ScrollView>
      )}

      {/* Exercise Details Modal */}
      <Modal
        visible={!!selectedExercise}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{selectedExercise?.difficulty_level || 'General'}</Text></View>
                <View style={[styles.tag, { backgroundColor: colors.blueDark }]}>
                  <Text style={styles.tagText}>{selectedExercise?.equipment || 'Equipment'}</Text>
                </View>
              </View>

              {selectedExercise?.target_muscles && selectedExercise.target_muscles.length > 0 && (
                <Text style={styles.modalSectionTitle}>Target Muscles</Text>
              )}
              <Text style={styles.modalText}>
                {selectedExercise?.target_muscles?.join(', ') || 'General Fitness'}
              </Text>

              <Text style={styles.modalSectionTitle}>Instructions</Text>
              {selectedExercise?.instructions ? (
                selectedExercise.instructions.map((step: string, i: number) => (
                  <View key={i} style={styles.stepRow}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.modalText}>No instructions available.</Text>
              )}

              <Text style={styles.modalSectionTitle}>Tips</Text>
              {selectedExercise?.tips ? (
                selectedExercise.tips.map((tip: string, i: number) => (
                  <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))
              ) : (
                <Text style={styles.modalText}>No tips available.</Text>
              )}

              <View style={{ height: 40 }} />

            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDark },
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceDark },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  scrollContent: { padding: 20 },

  headerCard: { backgroundColor: colors.surfaceDark, padding: 20, borderRadius: 16, marginBottom: 24 },
  programTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  programSubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
  splitName: { fontSize: 18, color: colors.primary, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },

  exerciseCard: { backgroundColor: colors.surfaceDark, padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  exMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exMetaText: { color: colors.textSecondary, fontSize: 14 },
  exSubMeta: { color: colors.textTertiary, fontSize: 12, marginTop: 4 },

  // Program View Styles
  reasoning: { color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  dayCard: { backgroundColor: colors.surfaceDark, padding: 16, borderRadius: 12, marginBottom: 12 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  dayEx: { color: colors.textSecondary, marginBottom: 4 },

  finishButton: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  finishButtonText: { color: colors.backgroundDark, fontWeight: 'bold', fontSize: 16 },

  // Legacy
  card: { backgroundColor: colors.surfaceDark, padding: 20, borderRadius: 16 },
  description: { color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: colors.blue, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  resultText: { color: colors.textSecondary, marginTop: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.backgroundDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tag: { backgroundColor: colors.surfaceDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  tagText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  modalSectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, marginTop: 12 },
  modalText: { color: colors.textSecondary, lineHeight: 24, fontSize: 16 },
  stepRow: { flexDirection: 'row', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceDark, color: colors.primary, textAlign: 'center', lineHeight: 24, marginRight: 12, fontWeight: 'bold' },
  stepText: { flex: 1, color: colors.textSecondary, lineHeight: 22, fontSize: 16 },
  tipText: { color: colors.textSecondary, marginBottom: 8, fontSize: 14, fontStyle: 'italic' }
});
