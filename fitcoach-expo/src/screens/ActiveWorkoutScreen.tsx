/**
 * ============================================================================
 * ACTIVE WORKOUT SCREEN (LIVE)
 * FitCoach AI - Real-Time Workout Execution
 * 
 * CORE RULES:
 * - Frontend is a DUMB renderer
 * - ALL calculations come from backend (calories, rest, fatigue)
 * - Only displays what backend returns
 * - Uses liveWorkoutAPI for all operations
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Animated,
    Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { liveWorkoutAPI } from '../services/api';

// ============================================================================
// THEME CONSTANTS
// ============================================================================
const theme = {
    bg: '#111827',
    surface: '#1F2937',
    surfaceLight: '#374151',
    primary: '#26d9bb',
    primaryDark: '#1a9d8a',
    textMain: '#F9FAFB',
    textSub: '#9CA3AF',
    border: '#374151',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    calories: '#F97316',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
import { useAuth } from '../context/AuthContext';

export default function ActiveWorkoutScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { token } = useAuth();
    const isGuest = !token;

    // ============================================================================
    // STATE - All from backend (or simulated for Guest)
    // ============================================================================
    const [loading, setLoading] = useState(true);
    const [sessionData, setSessionData] = useState<any>(null);
    const [currentExercise, setCurrentExercise] = useState<any>(null);
    const [nextExercise, setNextExercise] = useState<any>(null);
    const [exercises, setExercises] = useState<any[]>([]);

    // Totals
    const [totalCalories, setTotalCalories] = useState(0);
    const [totalSets, setTotalSets] = useState(0);
    const [fatigue, setFatigue] = useState(0);

    // Session timing
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true);

    // Rest timer
    const [restTimerActive, setRestTimerActive] = useState(false);
    const [restTimeRemaining, setRestTimeRemaining] = useState(0);
    const [recommendedRest, setRecommendedRest] = useState(60); // Default

    // Input state
    const [repsInput, setRepsInput] = useState('');
    const [weightInput, setWeightInput] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // ============================================================================
    // EFFECTS
    // ============================================================================

    useEffect(() => {
        if (isGuest) {
            initializeGuestWorkout();
        } else {
            initializeLiveWorkout();
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && (sessionData || isGuest)) {
            interval = setInterval(() => {
                setElapsedSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, sessionData, isGuest]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (restTimerActive && restTimeRemaining > 0) {
            interval = setInterval(() => {
                setRestTimeRemaining(t => {
                    if (t <= 1) {
                        setRestTimerActive(false);
                        Vibration.vibrate([0, 200, 100, 200]);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [restTimerActive, restTimeRemaining]);

    useEffect(() => {
        if (restTimerActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [restTimerActive]);

    // ============================================================================
    // INIT FUNCTIONS
    // ============================================================================

    const initializeLiveWorkout = async () => {
        try {
            setLoading(true);
            const response = await liveWorkoutAPI.start();

            if (!response.success) {
                Alert.alert('Error', response.error || 'Could not start workout');
                navigation.goBack();
                return;
            }

            const { data } = response;
            applySessionData(data);

        } catch (error: any) {
            console.error('Init workout error:', error);
            Alert.alert('Error', 'Failed to start workout. Please try again.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const initializeGuestWorkout = () => {
        setLoading(true);
        // Simulate data from route params
        const { workout } = route.params || {};

        // Default exercises if none passed
        const rawExercises = workout?.split?.exercises || [
            { name: 'Push-ups', selected_sets: 3, selected_reps: 15, met: 3.8 },
            { name: 'Squats', selected_sets: 3, selected_reps: 20, met: 5.0 },
            { name: 'Plank', selected_sets: 3, selected_reps: 60, met: 3.0 }
        ];

        const preparedExercises = rawExercises.map((ex: any, i: number) => ({
            index: i,
            name: ex.name,
            met: ex.met || 5.0,
            target_sets: ex.selected_sets || 3,
            target_reps: ex.selected_reps || 12,
            rest_seconds: 60,
            completed_sets: 0
        }));

        const mockSession = {
            exercises: preparedExercises,
            current_exercise: preparedExercises[0],
            next_exercise: preparedExercises[1] || null,
            accumulated_calories: 0,
            total_sets_completed: 0,
            accumulated_fatigue: 0
        };

        setExercises(preparedExercises);
        setCurrentExercise(preparedExercises[0]);
        setNextExercise(preparedExercises[1] || null);
        if (preparedExercises[0]) {
            setRepsInput(String(preparedExercises[0].target_reps || 10));
        }

        setLoading(false);
    };

    const applySessionData = (data: any) => {
        setSessionData(data);
        setExercises(data.exercises || []);
        setCurrentExercise(data.current_exercise);
        setNextExercise(data.next_exercise);
        setTotalCalories(data.accumulated_calories || 0);
        setTotalSets(data.total_sets_completed || 0);
        setFatigue(data.accumulated_fatigue || 0);

        if (data.current_exercise) {
            setRepsInput(String(data.current_exercise.target_reps || 10));
        }
    };

    // ============================================================================
    // ACTIONS
    // ============================================================================

    const handleLogSet = async () => {
        if (!repsInput || parseInt(repsInput) <= 0) {
            Alert.alert('Invalid Input', 'Please enter the number of reps completed.');
            return;
        }

        if (isGuest) {
            handleGuestLogSet();
            return;
        }

        try {
            const currentIndex = currentExercise?.index ?? 0;

            const response = await liveWorkoutAPI.logSet({
                exercise_index: currentIndex,
                reps: parseInt(repsInput),
                weight_kg: weightInput ? parseFloat(weightInput) : undefined,
            });

            if (!response.success) {
                Alert.alert('Error', response.error || 'Failed to log set');
                return;
            }

            const { data } = response;
            setTotalCalories(data.session_totals.accumulated_calories);
            setTotalSets(data.session_totals.total_sets_completed);
            setFatigue(data.session_totals.accumulated_fatigue);
            setCurrentExercise(data.current_exercise);
            setNextExercise(data.next_exercise);
            setRecommendedRest(data.rest_timer.duration_sec);
            setRestTimeRemaining(data.rest_timer.duration_sec);
            setRestTimerActive(true);

            setExercises(prev => prev.map((ex, idx) => {
                if (idx === currentIndex) {
                    return { ...ex, completed_sets: (ex.completed_sets || 0) + 1 };
                }
                return ex;
            }));

            if (data.current_exercise) {
                setRepsInput(String(data.current_exercise.target_reps || 10));
            }

            setShowLogModal(false);

            if (data.workout_progress.is_final_exercise) {
                handleFinishWorkout();
            }

        } catch (error: any) {
            console.error('Log set error:', error);
            Alert.alert('Error', 'Failed to log set. Please try again.');
        }
    };

    const handleGuestLogSet = () => {
        const currentIndex = currentExercise?.index ?? 0;
        const reps = parseInt(repsInput);

        // Simulate calculations
        const cals = Math.floor((reps * 3 * 5.0 * 70) / 3600); // Rough est
        setTotalCalories(c => c + cals);
        setTotalSets(s => s + 1);
        setFatigue(f => Math.min(f + 0.2, 10));

        // Update exercises
        const updatedExercises = [...exercises];
        updatedExercises[currentIndex].completed_sets += 1;
        setExercises(updatedExercises);

        // Progress logic
        let nextIndex = currentIndex;
        if (updatedExercises[currentIndex].completed_sets >= updatedExercises[currentIndex].target_sets) {
            nextIndex = currentIndex + 1;
        }

        if (nextIndex >= updatedExercises.length) {
            handleFinishWorkout();
        } else {
            setCurrentExercise(updatedExercises[nextIndex]);
            setNextExercise(updatedExercises[nextIndex + 1] || null);
            if (updatedExercises[nextIndex]) {
                setRepsInput(String(updatedExercises[nextIndex].target_reps));
            }
        }

        setRecommendedRest(60);
        setRestTimeRemaining(60);
        setRestTimerActive(true);
        setShowLogModal(false);
    };

    const handleSkipExercise = async () => {
        if (isGuest) {
            const nextIndex = (currentExercise?.index ?? 0) + 1;
            if (nextIndex < exercises.length) {
                setCurrentExercise(exercises[nextIndex]);
                setNextExercise(exercises[nextIndex + 1] || null);
                setRepsInput(String(exercises[nextIndex].target_reps));
            } else {
                handleFinishWorkout();
            }
            return;
        }

        try {
            const response = await liveWorkoutAPI.skipExercise();
            if (!response.success) {
                Alert.alert('Info', response.error);
                return;
            }
            setCurrentExercise(response.data.current_exercise);
            setNextExercise(response.data.next_exercise);
            setRepsInput(String(response.data.current_exercise?.target_reps || 10));
        } catch (error) {
            console.error('Skip error:', error);
        }
    };

    const handleFinishWorkout = async () => {
        Alert.alert(
            'Finish Workout?',
            'Save your workout and see your summary?',
            [
                { text: 'Keep Going', style: 'cancel' },
                {
                    text: 'Finish',
                    style: 'default',
                    onPress: async () => {
                        if (isGuest) {
                            Alert.alert('Workout Complete', 'Great job! (Stats are not saved in Guest Mode)', [
                                { text: 'Done', onPress: () => navigation.goBack() }
                            ]);
                            return;
                        }
                        try {
                            setIsActive(false);
                            const response = await liveWorkoutAPI.end({ rating: 5 });
                            if (response.success) {
                                Alert.alert(
                                    '🎉 Workout Complete!',
                                    `Great job! You burned ${response.data.summary.total_calories} calories!`,
                                    [{ text: 'Done', onPress: () => navigation.goBack() }]
                                );
                            } else {
                                navigation.goBack();
                            }
                        } catch (error) {
                            navigation.goBack();
                        }
                    },
                },
            ]
        );
    };

    const handleCancelWorkout = () => {
        if (isGuest) {
            Alert.alert(
                'Exit Workout?',
                'Guest progress is lost if you exit.',
                [
                    { text: 'Keep Going', style: 'cancel' },
                    {
                        text: 'Exit',
                        style: 'destructive',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
            return;
        }

        Alert.alert(
            'Pause & Exit?',
            'Your progress will be saved so you can resume later.',
            [
                { text: 'Keep Going', style: 'cancel' },
                {
                    text: 'Discard Workout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await liveWorkoutAPI.cancel();
                        } catch (e) {
                            console.error(e);
                        }
                        navigation.goBack();
                    },
                },
                {
                    text: 'Save & Exit',
                    style: 'default',
                    onPress: () => {
                        // Simply navigating back preserves the active session in the database
                        // The user can resume by entering the screen again
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const skipRest = () => {
        setRestTimerActive(false);
        setRestTimeRemaining(0);
    };

    const addRestTime = (seconds: number) => {
        setRestTimeRemaining(t => t + seconds);
    };

    // ============================================================================
    // HELPERS
    // ============================================================================

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Preparing your workout...</Text>
            </View>
        );
    }
    return (
        <View style={styles.container}>
            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancelWorkout} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="close" size={24} color={theme.textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setIsActive(!isActive)}
                    style={{ alignItems: 'center' }}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.timerText, !isActive && { color: theme.textSub }]}>{formatTime(elapsedSeconds)}</Text>
                        <MaterialCommunityIcons
                            name={isActive ? "pause-circle" : "play-circle"}
                            size={24}
                            color={isActive ? theme.textSub : theme.success}
                        />
                    </View>
                    <Text style={[styles.subText, !isActive && { color: theme.warning }]}>
                        {isActive ? "ACTIVE TIME" : "WORKOUT PAUSED"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleFinishWorkout} style={styles.finishBtn}>
                    <Text style={styles.finishText}>Finish</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="fire" size={20} color={theme.calories} />
                    <Text style={styles.statValue}>{totalCalories}</Text>
                    <Text style={styles.statLabel}>cal</Text>
                </View>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="checkbox-multiple-marked" size={20} color={theme.primary} />
                    <Text style={styles.statValue}>{totalSets}</Text>
                    <Text style={styles.statLabel}>sets</Text>
                </View>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color={theme.warning} />
                    <Text style={styles.statValue}>{fatigue.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>fatigue</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Current Exercise Card */}
                {currentExercise && (
                    <View style={styles.currentExerciseCard}>
                        <LinearGradient
                            colors={[theme.primary, theme.primaryDark]}
                            style={styles.exerciseGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.exerciseHeader}>
                                <View style={styles.exerciseIndex}>
                                    <Text style={styles.exerciseIndexText}>
                                        {(currentExercise.index || 0) + 1}/{exercises.length}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={handleSkipExercise} style={styles.skipBtn}>
                                    <MaterialCommunityIcons name="skip-next" size={20} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.skipText}>Skip</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.exerciseName}>{currentExercise.name}</Text>

                            <View style={styles.exerciseTargets}>
                                <View style={styles.targetBadge}>
                                    <Text style={styles.targetLabel}>TARGET</Text>
                                    <Text style={styles.targetValue}>
                                        {currentExercise.target_sets} × {currentExercise.target_reps}
                                    </Text>
                                </View>
                                <View style={styles.targetBadge}>
                                    <Text style={styles.targetLabel}>COMPLETED</Text>
                                    <Text style={styles.targetValue}>
                                        {currentExercise.completed_sets || 0} / {currentExercise.target_sets}
                                    </Text>
                                </View>
                            </View>

                            {/* Log Set Button */}
                            <TouchableOpacity
                                style={styles.logSetButton}
                                onPress={() => setShowLogModal(true)}
                            >
                                <MaterialCommunityIcons name="plus-circle" size={24} color={theme.bg} />
                                <Text style={styles.logSetButtonText}>Log Set</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {/* Rest Timer Overlay */}
                {restTimerActive && (
                    <Animated.View style={[styles.restCard, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.restContent}>
                            <Text style={styles.restLabel}>REST</Text>
                            <Text style={styles.restTime}>{formatTime(restTimeRemaining)}</Text>
                            <View style={styles.restActions}>
                                <TouchableOpacity onPress={() => addRestTime(30)} style={styles.restActionBtn}>
                                    <Text style={styles.restActionText}>+30s</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={skipRest} style={[styles.restActionBtn, styles.restSkipBtn]}>
                                    <Text style={[styles.restActionText, { color: theme.bg }]}>Skip</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Next Exercise Preview */}
                {nextExercise && (
                    <View style={styles.nextExerciseCard}>
                        <Text style={styles.nextLabel}>UP NEXT</Text>
                        <Text style={styles.nextName}>{nextExercise.name}</Text>
                        <Text style={styles.nextDetails}>
                            {nextExercise.target_sets} sets × {nextExercise.target_reps} reps
                        </Text>
                    </View>
                )}

                {/* Exercise List */}
                <View style={styles.exerciseList}>
                    <Text style={styles.sectionTitle}>Exercises</Text>
                    {exercises.map((ex, idx) => (
                        <View
                            key={`ex-${idx}`}
                            style={[
                                styles.exerciseListItem,
                                idx === currentExercise?.index && styles.exerciseListItemActive,
                                (ex.completed_sets || 0) >= ex.target_sets && styles.exerciseListItemComplete,
                            ]}
                        >
                            <View style={styles.exerciseListIcon}>
                                {(ex.completed_sets || 0) >= ex.target_sets ? (
                                    <MaterialCommunityIcons name="check-circle" size={24} color={theme.success} />
                                ) : idx === currentExercise?.index ? (
                                    <MaterialCommunityIcons name="play-circle" size={24} color={theme.primary} />
                                ) : (
                                    <Text style={styles.exerciseListNumber}>{idx + 1}</Text>
                                )}
                            </View>
                            <View style={styles.exerciseListInfo}>
                                <Text style={styles.exerciseListName}>{ex.name}</Text>
                                <Text style={styles.exerciseListSets}>
                                    {ex.completed_sets || 0}/{ex.target_sets} sets
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Log Set Modal */}
            {showLogModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Log Set</Text>
                        <Text style={styles.modalExercise}>{currentExercise?.name}</Text>

                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Reps</Text>
                                <TextInput
                                    style={styles.input}
                                    value={repsInput}
                                    onChangeText={setRepsInput}
                                    keyboardType="numeric"
                                    placeholder="10"
                                    placeholderTextColor={theme.textSub}
                                    selectTextOnFocus
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={weightInput}
                                    onChangeText={setWeightInput}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={theme.textSub}
                                    selectTextOnFocus
                                />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowLogModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleLogSet}
                            >
                                <Text style={styles.modalConfirmText}>Log Set</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.textSub,
        marginTop: 16,
        fontSize: 16,
    },

    // Header
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    iconBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: theme.surfaceLight,
    },
    timerText: {
        color: theme.textMain,
        fontSize: 28,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    subText: {
        color: theme.textSub,
        fontSize: 10,
        letterSpacing: 1,
    },
    finishBtn: {
        backgroundColor: theme.success,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    finishText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        color: theme.textMain,
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        color: theme.textSub,
        fontSize: 12,
    },

    // Content
    content: {
        padding: 20,
    },

    // Current Exercise Card
    currentExerciseCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    exerciseGradient: {
        padding: 24,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    exerciseIndex: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    exerciseIndexText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    skipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    skipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    exerciseName: {
        color: 'white',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 20,
    },
    exerciseTargets: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    targetBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        flex: 1,
    },
    targetLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 4,
    },
    targetValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    logSetButton: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    logSetButtonText: {
        color: theme.bg,
        fontSize: 16,
        fontWeight: '700',
    },

    // Rest Card
    restCard: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: theme.primary,
    },
    restContent: {
        alignItems: 'center',
    },
    restLabel: {
        color: theme.textSub,
        fontSize: 14,
        letterSpacing: 2,
        marginBottom: 8,
    },
    restTime: {
        color: theme.primary,
        fontSize: 56,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    restActions: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 20,
    },
    restActionBtn: {
        backgroundColor: theme.surfaceLight,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    restSkipBtn: {
        backgroundColor: theme.primary,
    },
    restActionText: {
        color: theme.textMain,
        fontSize: 14,
        fontWeight: '600',
    },

    // Next Exercise
    nextExerciseCard: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: theme.warning,
    },
    nextLabel: {
        color: theme.warning,
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 8,
    },
    nextName: {
        color: theme.textMain,
        fontSize: 18,
        fontWeight: '600',
    },
    nextDetails: {
        color: theme.textSub,
        fontSize: 14,
        marginTop: 4,
    },

    // Exercise List
    exerciseList: {
        marginTop: 8,
    },
    sectionTitle: {
        color: theme.textSub,
        fontSize: 14,
        letterSpacing: 1,
        marginBottom: 16,
    },
    exerciseListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        gap: 16,
    },
    exerciseListItemActive: {
        borderWidth: 1,
        borderColor: theme.primary,
    },
    exerciseListItemComplete: {
        opacity: 0.5,
    },
    exerciseListIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseListNumber: {
        color: theme.textSub,
        fontSize: 14,
        fontWeight: '600',
    },
    exerciseListInfo: {
        flex: 1,
    },
    exerciseListName: {
        color: theme.textMain,
        fontSize: 16,
        fontWeight: '500',
    },
    exerciseListSets: {
        color: theme.textSub,
        fontSize: 13,
        marginTop: 2,
    },

    // Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: theme.surface,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        color: theme.textMain,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalExercise: {
        color: theme.primary,
        fontSize: 18,
        marginBottom: 24,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        color: theme.textSub,
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.bg,
        borderRadius: 12,
        padding: 16,
        color: theme.textMain,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.surfaceLight,
        alignItems: 'center',
    },
    modalCancelText: {
        color: theme.textSub,
        fontSize: 16,
        fontWeight: '600',
    },
    modalConfirmBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.primary,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: theme.bg,
        fontSize: 16,
        fontWeight: '700',
    },
});
