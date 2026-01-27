
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const { user, token } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [dailyWorkoutState, setDailyWorkoutState] = useState<any>(route.params?.dailyWorkout || null);
  const [programDataState, setProgramDataState] = useState<any>(route.params?.program || null);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  // Fetch templates when in generator view
  useEffect(() => {
    if (!dailyWorkoutState && !programDataState) {
      fetchTemplates();
    }
  }, [dailyWorkoutState, programDataState]);

  const fetchTemplates = async () => {
    try {
      const templates = await workoutAPI.getTemplates();
      setAvailableTemplates(templates);
    } catch (e) {
      console.log('Error fetching templates', e);
    }
  };

  // Auto-fetch if no params passed (e.g. from Dashboard "Today's Workout" tap)
  useEffect(() => {
    if (!dailyWorkoutState && !programDataState) {
      fetchDailyWorkout();
    }
  }, []);

  const fetchDailyWorkout = async () => {
    setLoading(true);

    // Guest Mode check
    if (!token) {
      loadMockWorkout();
      setLoading(false);
      return;
    }

    try {
      const res = await workoutAPI.getTodayWorkout();
      // Inspect response structure loosely
      if (res && res.split) {
        setDailyWorkoutState(res);
      } else if (res && res.program) {
        // Did we get a program but no specific daily split? 
        // Might be rest day or program overview
        setProgramDataState({ program: res.program, reasoning: 'Your current plan' });
      }
    } catch (e) {
      console.log('Error fetching daily workout:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMockWorkout = () => {
    setDailyWorkoutState({
      split: "Full Body Foundation",
      duration_minutes: 45,
      exercises: [
        { name: "Push-ups", sets: 3, reps: 10, rest: "60s" },
        { name: "Bodyweight Squats", sets: 3, reps: 15, rest: "60s" },
        { name: "Plank", sets: 3, reps: "30s", rest: "45s" },
        { name: "Lunges", sets: 3, reps: 12, rest: "60s" },
      ]
    });
  };

  const handleGenerate = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const result = await workoutAPI.recommendProgram(user.id);

      if (result && result.program) {
        Alert.alert(
          'Success',
          'Workout plan generated and saved!',
          [
            {
              text: 'View Plan',
              onPress: () => {
                setProgramDataState(result); // Update local state
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

  // Rendering Helper
  const renderExerciseCard = (ex: any, index: number) => {
    if (!ex) return null;
    return (
      <TouchableOpacity
        key={index}
        style={styles.exerciseCard}
        onPress={() => setSelectedExercise(ex)}
      >
        <View style={styles.exHeader}>
          <Text style={styles.exName}>{ex.name || 'Unknown Exercise'}</Text>
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
  };

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
    if (!dailyWorkoutState || !dailyWorkoutState.split) return null;

    const { split, warmup, cooldown, program_name, day } = dailyWorkoutState;
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.programTitle}>{program_name || 'Daily Workout'}</Text>
          <Text style={styles.programSubtitle}>Day {day || '-'}</Text>
          <Text style={styles.splitName}>{split?.name || 'Session'}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{dailyWorkoutState.estimated_calories || '-'}</Text>
              <Text style={styles.statLabel}>Kcal</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{split?.total_duration_min || '-'}</Text>
              <Text style={styles.statLabel}>Mins</Text>
            </View>
          </View>
        </View>

        {renderSection('Warmup', warmup, 'run-fast')}
        {renderSection('Main Workout', split?.exercises, 'dumbbell')}
        {renderSection('Cooldown', cooldown, 'meditation')}

        <TouchableOpacity
          style={styles.finishButton}
          disabled={loading}
          onPress={async () => {
            setLoading(true);
            try {
              const sessionData = {
                program_id: dailyWorkoutState.program_id,
                split_name: split?.name || 'Workout',
                duration_minutes: split?.total_duration_min || 45,
                exercises_completed: [
                  ...(warmup || []),
                  ...(split?.exercises || []),
                  ...(cooldown || [])
                ].map((ex: any) => ({
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
    // Safety check
    if (!programDataState || !programDataState.program) return null;

    const { program, reasoning } = programDataState;
    const p = program;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.programTitle}>{p.name || 'Recommended Plan'}</Text>
          <Text style={styles.programSubtitle}>{p.frequency ? `${p.frequency} Days / Week` : 'Custom Plan'}</Text>
          {reasoning && <Text style={styles.reasoning}>{reasoning}</Text>}
        </View>

        <Text style={styles.sectionHeaderTitle}>Routine Structure</Text>

        {(p.splits || []).map((split: any, i: number) => (
          <View key={i} style={styles.dayCard}>
            <Text style={styles.dayTitle}>Day {split.day}: {split.name}</Text>
            {(split.exercises || []).map((ex: any, idx: number) => (
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

  // Determine view mode
  const isDailyView = !!dailyWorkoutState && !!dailyWorkoutState.split;
  const isProgramView = !!programDataState && !!programDataState.program;
  const isGeneratorView = !isDailyView && !isProgramView && !loading;

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

      {loading && (
        <View style={[styles.scrollContent, { alignItems: 'center', marginTop: 40 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading workout details...</Text>
        </View>
      )}

      {isDailyView && renderDailyContent()}
      {isProgramView && renderProgramContent()}

      {isGeneratorView && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={availableTemplates}
            contentContainerStyle={styles.scrollContent}
            ListHeaderComponent={
              <View style={{ marginBottom: 24 }}>
                <View style={[styles.card, { alignItems: 'center', marginBottom: 24 }]}>
                  <MaterialCommunityIcons name="robot" size={48} color={colors.blue} style={{ marginBottom: 16 }} />
                  <Text style={styles.description}>
                    Not sure which to pick? Let AI design a custom workout for you based on your goals.
                  </Text>
                  <TouchableOpacity onPress={handleGenerate} disabled={loading} style={styles.button}>
                    <Text style={styles.buttonText}>{loading ? 'Generating...' : 'Generate For Me'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeaderTitle}>Explore Workout Styles</Text>
                <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
                  Browse our library of {availableTemplates.length} expert-designed splits.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.templateCard}>
                <View style={styles.templateHeaderRow}>
                  <Text style={styles.templateTitle}>{item.name}</Text>
                  <View style={styles.frequencyBadge}>
                    <Text style={styles.frequencyText}>{item.frequency}d/wk</Text>
                  </View>
                </View>

                <Text style={styles.templateDesc}>{item.description}</Text>

                {item.benefits && item.benefits.length > 0 && (
                  <View style={styles.benefitsContainer}>
                    <Text style={styles.benefitTitle}>Benefits:</Text>
                    {item.benefits.map((b: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
                        <Text style={{ color: colors.primary, marginRight: 6 }}>•</Text>
                        <Text style={styles.benefitText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.tagsRow}>
                  {item.level && item.level.map((lvl: string, i: number) => (
                    <View key={i} style={styles.tagSmall}>
                      <Text style={styles.tagSmallText}>{lvl}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
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
              <Text style={styles.modalTitle}>{selectedExercise?.name || 'Exercise Details'}</Text>
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
  tipText: { color: colors.textSecondary, marginBottom: 8, fontSize: 14, fontStyle: 'italic' },

  // Template Library Styles
  templateCard: { backgroundColor: colors.surfaceDark, padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  templateHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  templateTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, flex: 1, marginRight: 8 },
  templateDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  frequencyBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  frequencyText: { color: colors.primaryDark, fontWeight: 'bold', fontSize: 12 },
  benefitsContainer: { backgroundColor: colors.backgroundDark, padding: 12, borderRadius: 8, marginBottom: 12 },
  benefitTitle: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4, textTransform: 'uppercase' },
  benefitText: { fontSize: 13, color: colors.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagSmall: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagSmallText: { fontSize: 11, color: colors.textSub },
});
