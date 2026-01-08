// ExerciseLogScreen.tsx - Complete Implementation Template
// Location: /fitcoach-expo/src/screens/ExerciseLogScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { exerciseAPI, handleAPIError, ExerciseLog, CreateExerciseLog } from '../services/api';

const INTENSITY_LEVELS = [
  { id: 'light', label: 'Light', color: '#10B981', icon: 'walk' },
  { id: 'moderate', label: 'Moderate', color: '#F59E0B', icon: 'run' },
  { id: 'vigorous', label: 'Vigorous', color: '#EF4444', icon: 'run-fast' },
];

const ExerciseLogScreen = () => {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Form state
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Optional fields
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const data = await exerciseAPI.getLogs();
      setLogs(data || []);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        Alert.alert('Error Loading Logs', handleAPIError(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // Search exercises
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await exerciseAPI.searchExercise(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add exercise log
  const handleAddExercise = async () => {
    try {
      const durationNum = parseInt(duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid duration in minutes');
        return;
      }

      const logData: CreateExerciseLog = {
        durationMinutes: durationNum,
        intensity: intensity as any,
        notes: notes || undefined,
      };

      if (selectedExercise) {
        logData.exerciseId = selectedExercise.id;
      } else if (customExerciseName) {
        logData.customExerciseName = customExerciseName;
      } else {
        Alert.alert('Incomplete', 'Please select an exercise or enter a custom exercise name');
        return;
      }

      // Optional fields
      if (sets) logData.sets = parseInt(sets);
      if (reps) logData.reps = parseInt(reps);
      if (weight) logData.weightKg = parseFloat(weight);

      await exerciseAPI.createLog(logData);
      setShowAddModal(false);
      resetForm();
      await fetchLogs();
      Alert.alert('Success', 'Exercise logged successfully!');
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };

  // Delete exercise log
  const handleDelete = async (logId: number) => {
    Alert.alert(
      'Delete Exercise Log',
      'Are you sure you want to delete this log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await exerciseAPI.deleteLog(logId);
              setLogs(logs.filter(log => log.id !== logId));
              Alert.alert('Deleted', 'Exercise log deleted successfully');
            } catch (error) {
              Alert.alert('Error', handleAPIError(error));
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedExercise(null);
    setDuration('');
    setIntensity('moderate');
    setSearchQuery('');
    setSearchResults([]);
    setCustomExerciseName('');
    setNotes('');
    setSets('');
    setReps('');
    setWeight('');
  };

  // Calculate totals
  const dailyTotals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories_burned || 0),
      duration: acc.duration + (log.duration_minutes || 0),
      count: acc.count + 1,
    }),
    { calories: 0, duration: 0, count: 0 }
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#13ec80" />
        <Text style={styles.loadingText}>Loading exercise logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with totals */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Exercise</Text>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(dailyTotals.calories)}</Text>
            <Text style={styles.totalLabel}>Calories Burned</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{dailyTotals.duration}</Text>
            <Text style={styles.totalLabel}>Minutes</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{dailyTotals.count}</Text>
            <Text style={styles.totalLabel}>Workouts</Text>
          </View>
        </View>
      </View>

      {/* Exercise logs */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="dumbbell" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>No exercises logged today</Text>
            <Text style={styles.emptySubtext}>Tap the + button to log your first workout</Text>
          </View>
        ) : (
          logs.map(log => (
            <TouchableOpacity
              key={log.id}
              style={styles.logCard}
              onLongPress={() => handleDelete(log.id)}
            >
              <View style={styles.logIcon}>
                <MaterialCommunityIcons
                  name={
                    log.intensity === 'vigorous' ? 'run-fast' :
                    log.intensity === 'moderate' ? 'run' : 'walk'
                  }
                  size={24}
                  color={
                    log.intensity === 'vigorous' ? '#EF4444' :
                    log.intensity === 'moderate' ? '#F59E0B' : '#10B981'
                  }
                />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logName}>
                  {log.custom_exercise_name || log.exercise_name || 'Unknown Exercise'}
                </Text>
                <Text style={styles.logDetails}>
                  {log.duration_minutes} min • {log.intensity} • {log.calories_burned} cal burned
                </Text>
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
                {(log.sets || log.reps || log.weight_kg) && (
                  <Text style={styles.logMeta}>
                    {log.sets && `${log.sets} sets`}
                    {log.reps && ` × ${log.reps} reps`}
                    {log.weight_kg && ` @ ${log.weight_kg}kg`}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(log.id)}>
                <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Search exercise */}
              <Text style={styles.label}>Search Exercise</Text>
              <TextInput
                style={styles.input}
                placeholder="Search exercise database..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={handleSearch}
              />

              {searching && <ActivityIndicator style={styles.searchLoading} />}

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((exercise, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResult}
                      onPress={() => {
                        setSelectedExercise(exercise);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.searchResultName}>{exercise.name}</Text>
                      <Text style={styles.searchResultInfo}>
                        {exercise.category} • MET: {exercise.met_value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected exercise or custom */}
              {selectedExercise ? (
                <View style={styles.selectedExercise}>
                  <Text style={styles.selectedExerciseName}>{selectedExercise.name}</Text>
                  <Text style={styles.selectedExerciseInfo}>
                    {selectedExercise.category} • MET: {selectedExercise.met_value}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                    <Text style={styles.clearButton}>Clear selection</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Or Enter Custom Exercise</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Exercise name (e.g., Morning Run)"
                    placeholderTextColor="#6B7280"
                    value={customExerciseName}
                    onChangeText={setCustomExerciseName}
                  />
                </>
              )}

              {/* Duration */}
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
              />

              {/* Intensity */}
              <Text style={styles.label}>Intensity *</Text>
              <View style={styles.intensityRow}>
                {INTENSITY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.intensityButton,
                      intensity === level.id && { borderColor: level.color, borderWidth: 2 },
                    ]}
                    onPress={() => setIntensity(level.id)}
                  >
                    <MaterialCommunityIcons name={level.icon as any} size={20} color={level.color} />
                    <Text style={styles.intensityText}>{level.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Optional fields */}
              <Text style={styles.label}>Optional Details</Text>
              <View style={styles.optionalRow}>
                <TextInput
                  style={[styles.input, styles.optionalInput]}
                  placeholder="Sets"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={sets}
                  onChangeText={setSets}
                />
                <TextInput
                  style={[styles.input, styles.optionalInput]}
                  placeholder="Reps"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={reps}
                  onChangeText={setReps}
                />
                <TextInput
                  style={[styles.input, styles.optionalInput]}
                  placeholder="Weight (kg)"
                  placeholderTextColor="#6B7280"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              {/* Notes */}
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes about your workout..."
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />

              {/* Add button */}
              <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}>
                <Text style={styles.addButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#102219' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#102219' },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  header: { padding: 20, backgroundColor: '#16261f', borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#F59E0B' },
  totalLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  scrollView: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#9CA3AF', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  logCard: { flexDirection: 'row', padding: 16, backgroundColor: '#16261f', marginHorizontal: 16, marginVertical: 8, borderRadius: 12, alignItems: 'center' },
  logIcon: { marginRight: 12 },
  logInfo: { flex: 1 },
  logName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  logDetails: { fontSize: 14, color: '#9CA3AF', marginBottom: 2 },
  logNotes: { fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  logMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16261f', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalScroll: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#102219', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#1f3329', marginBottom: 12 },
  searchLoading: { marginVertical: 8 },
  searchResults: { maxHeight: 200, backgroundColor: '#102219', borderRadius: 8, marginBottom: 12 },
  searchResult: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  searchResultName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  searchResultInfo: { fontSize: 12, color: '#9CA3AF' },
  selectedExercise: { padding: 16, backgroundColor: '#F59E0B20', borderRadius: 8, marginBottom: 12 },
  selectedExerciseName: { fontSize: 16, fontWeight: 'bold', color: '#F59E0B', marginBottom: 4 },
  selectedExerciseInfo: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  clearButton: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  intensityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  intensityButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#102219', borderRadius: 8, borderWidth: 1, borderColor: '#1f3329' },
  intensityText: { fontSize: 14, color: '#fff', marginLeft: 8 },
  optionalRow: { flexDirection: 'row', gap: 8 },
  optionalInput: { flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  addButton: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#102219' },
});

export default ExerciseLogScreen;
