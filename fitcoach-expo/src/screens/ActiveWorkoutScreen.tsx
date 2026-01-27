/**
 * ActiveWorkoutScreen.tsx
 * Premium Live Workout Execution
 * 
 * Design Philosophy:
 * - Matching the "Luxury White" theme of Log Exercise
 * - High contrast for gym visibility
 * - Large touch targets
 * - Focus on "Flow State"
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
    StatusBar,
    Platform,
    Modal,
    Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { liveWorkoutAPI } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient'; // Added LinearGradient
import { useAuth } from '../context/AuthContext';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

// Premium Design System (Pro Pitch Black Theme)
const colors = {
    background: '#000000',
    surface: '#111111',
    surfaceAlt: '#1C1C1E',
    accent: '#3B82F6',        // Electric Blue
    accentDark: '#1E40AF',
    accentLight: '#1E293B',   // Dark Blue Gray
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    success: '#10B981',       // Emerald
    successLight: '#064E3B',
    warning: '#F59E0B',       // Amber
    warningLight: '#451A03',
    error: '#EF4444',
    border: '#27272A',
    calories: '#F97316',
};

// Types
interface Exercise {
    index: number;
    name: string;
    target_sets: number;
    target_reps: number;
    completed_sets: number;
    met?: number;
}

export default function ActiveWorkoutScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { token } = useAuth();
    // Simple check: if explicit guest param OR no token
    const isGuest = route.params?.isGuest || !token;

    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // State
    const [loading, setLoading] = useState(true);
    const [sessionData, setSessionData] = useState<any>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);

    // Pointers
    const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
    const [nextExercise, setNextExercise] = useState<Exercise | null>(null);

    // Totals
    const [totalCalories, setTotalCalories] = useState(0);
    const [totalSets, setTotalSets] = useState(0);
    const [fatigue, setFatigue] = useState(0);

    // Timers
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [restTimerActive, setRestTimerActive] = useState(false);
    const [restTimeRemaining, setRestTimeRemaining] = useState(0);

    // Inputs
    const [repsInput, setRepsInput] = useState('');
    const [weightInput, setWeightInput] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);

    // ============================================================================
    // EFFECTS
    // ============================================================================

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        if (isGuest) {
            initializeGuestWorkout();
        } else {
            initializeLiveWorkout();
        }
    }, []);

    // Session Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && (sessionData || isGuest)) {
            interval = setInterval(() => {
                setElapsedSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, sessionData, isGuest]);

    // Rest Timer
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

    // Pulse Animation for Rest
    useEffect(() => {
        if (restTimerActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [restTimerActive]);

    // ============================================================================
    // LOGIC
    // ============================================================================

    const initializeLiveWorkout = async () => {
        try {
            setLoading(true);
            const response = await liveWorkoutAPI.start();
            if (!response.success) throw new Error(response.error);
            applySessionData(response.data);
        } catch (error: any) {
            // Fallback to guest mode on failure
            console.log('Live workout init failed, falling back to guest mode logic');
            initializeGuestWorkout();
        } finally {
            setLoading(false);
        }
    };

    const initializeGuestWorkout = () => {
        setLoading(true);
        // Mock data
        const mockExercises = [
            { index: 0, name: 'Push-ups', target_sets: 3, target_reps: 15, completed_sets: 0, met: 3.8 },
            { index: 1, name: 'Squats', target_sets: 3, target_reps: 20, completed_sets: 0, met: 5.0 },
            { index: 2, name: 'Plank', target_sets: 3, target_reps: 60, completed_sets: 0, met: 3.0 }
        ];
        setExercises(mockExercises);
        setCurrentExercise(mockExercises[0]);
        setNextExercise(mockExercises[1]);
        setRepsInput('15');
        setLoading(false);
    };

    const applySessionData = (data: any) => {
        setSessionData(data);
        setExercises(data.exercises || []);
        setCurrentExercise(data.current_exercise);
        setNextExercise(data.next_exercise);
        setTotalCalories(data.accumulated_calories || 0);
        setTotalSets(data.total_sets_completed || 0);

        if (data.current_exercise) {
            setRepsInput(String(data.current_exercise.target_reps || 10));
        }
    };

    const handleLogSet = async () => {
        if (!repsInput) return;

        // Optimistic Update
        const reps = parseInt(repsInput);
        const newSets = totalSets + 1;
        setTotalSets(newSets);
        setTotalCalories(c => c + Math.round(reps * 0.5)); // Fake cal math for instant feedback

        // Rest Timer Start
        setRestTimeRemaining(60);
        setRestTimerActive(true);
        setShowLogModal(false);

        // Update Exercises List locally
        if (currentExercise) {
            const updatedExercises = [...exercises];
            const idx = currentExercise.index;
            if (updatedExercises[idx]) {
                updatedExercises[idx].completed_sets += 1;

                // Check flow
                if (updatedExercises[idx].completed_sets >= updatedExercises[idx].target_sets) {
                    // Move to next
                    const nextIdx = idx + 1;
                    if (nextIdx < updatedExercises.length) {
                        setCurrentExercise(updatedExercises[nextIdx]);
                        setNextExercise(updatedExercises[nextIdx + 1] || null);
                        setRepsInput(String(updatedExercises[nextIdx].target_reps));
                    } else {
                        handleFinishWorkout();
                    }
                }
            }
            setExercises(updatedExercises);
        }

        // Backend Sync (Fire & Forget mostly)
        if (!isGuest) {
            try {
                await liveWorkoutAPI.logSet({
                    exercise_index: currentExercise?.index || 0,
                    reps,
                    weight_kg: parseFloat(weightInput) || undefined
                });
            } catch (e) {
                console.log('Background sync failed', e);
            }
        }
    };

    const handleFinishWorkout = () => {
        setIsActive(false);
        Alert.alert(
            'Workout Complete! 🎉',
            `You crushed ${totalSets} sets and burned ~${totalCalories} calories.`,
            [{ text: 'Finish', onPress: () => navigation.goBack() }]
        );
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
                    <View style={[styles.timerDot, { backgroundColor: isActive ? colors.success : colors.textTertiary }]} />
                </View>

                <TouchableOpacity
                    style={styles.finishButton}
                    onPress={handleFinishWorkout}
                >
                    <Text style={styles.finishButtonText}>Finish</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Dashboard Grid */}
                <View style={styles.dashboardGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalCalories}</Text>
                        <Text style={styles.statLabel}>CALORIES</Text>
                        <MaterialCommunityIcons name="fire" size={16} color={colors.calories} style={styles.statIcon} />
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalSets}</Text>
                        <Text style={styles.statLabel}>SETS</Text>
                        <MaterialCommunityIcons name="dumbbell" size={16} color={colors.accent} style={styles.statIcon} />
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{(fatigue * 10).toFixed(0)}%</Text>
                        <Text style={styles.statLabel}>INTENSITY</Text>
                        <MaterialCommunityIcons name="lightning-bolt" size={16} color={colors.warning} style={styles.statIcon} />
                    </View>
                </View>

                {/* Rest Timer Overlay Card */}
                {restTimerActive && (
                    <Animated.View style={[styles.restCard, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.restHeader}>
                            <MaterialCommunityIcons name="timer-sand" size={20} color={colors.accent} />
                            <Text style={styles.restTitle}>Rest & Recover</Text>
                        </View>
                        <Text style={styles.restTime}>{formatTime(restTimeRemaining)}</Text>
                        <View style={styles.restControls}>
                            <TouchableOpacity style={styles.restButton} onPress={() => setRestTimeRemaining(t => t + 30)}>
                                <Text style={styles.restButtonText}>+30s</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.restButton, styles.restButtonPrimary]} onPress={() => {
                                setRestTimerActive(false);
                                setRestTimeRemaining(0);
                            }}>
                                <Text style={[styles.restButtonText, { color: '#FFF' }]}>Skip</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}

                {/* Active Exercise Card - NEW DESIGN */}
                {currentExercise && (
                    <LinearGradient
                        colors={['#1F2937', '#0F172A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.exerciseCard}
                    >
                        {/* Status Badge */}
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.exerciseTypeBadge}>
                                <Text style={styles.exerciseTypeText}>STRENGTH</Text>
                            </View>
                            <View style={styles.progressPill}>
                                <Text style={styles.progressPillText}>
                                    Set {currentExercise.completed_sets + 1} of {currentExercise.target_sets}
                                </Text>
                            </View>
                        </View>

                        {/* Title Section */}
                        <View style={styles.cardTitleSection}>
                            <Text style={styles.exerciseNameMain}>{currentExercise.name}</Text>
                        </View>

                        {/* Data Grid */}
                        <View style={styles.dataGrid}>
                            <View style={styles.dataCell}>
                                <Text style={styles.dataLabel}>REPS</Text>
                                <Text style={styles.dataValue}>{currentExercise.target_reps}</Text>
                            </View>
                            <View style={styles.dataDivider} />
                            <View style={styles.dataCell}>
                                <Text style={styles.dataLabel}>WEIGHT</Text>
                                <Text style={styles.dataValue}>-</Text>
                            </View>
                            <View style={styles.dataDivider} />
                            <View style={styles.dataCell}>
                                <Text style={styles.dataLabel}>REST</Text>
                                <Text style={styles.dataValue}>60s</Text>
                            </View>
                        </View>

                        {/* Quick Log Action */}
                        <TouchableOpacity
                            style={styles.logButtonMain}
                            activeOpacity={0.8}
                            onPress={() => setShowLogModal(true)}
                        >
                            <LinearGradient
                                colors={[colors.accent, colors.accentDark]}
                                style={styles.logButtonGradient}
                            >
                                <MaterialCommunityIcons name="check" size={24} color="#FFF" />
                                <Text style={styles.logButtonText}>LOG SET</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                )}

                {/* Up Next Preview */}
                {nextExercise && (
                    <View style={styles.nextCard}>
                        <View style={styles.nextLeft}>
                            <Text style={styles.nextLabel}>UP NEXT</Text>
                            <Text style={styles.nextName}>{nextExercise.name}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
                    </View>
                )}

                {/* Workout List */}
                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Workout Plan</Text>
                    {exercises.map((ex, i) => (
                        <View key={i} style={[
                            styles.listItem,
                            i === currentExercise?.index && styles.listItemActive
                        ]}>
                            <View style={[
                                styles.listIndex,
                                i === currentExercise?.index && { backgroundColor: colors.accentLight },
                                ex.completed_sets >= ex.target_sets && { backgroundColor: colors.successLight }
                            ]}>
                                {ex.completed_sets >= ex.target_sets ? (
                                    <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                                ) : (
                                    <Text style={[
                                        styles.listIndexText,
                                        i === currentExercise?.index && { color: colors.accent }
                                    ]}>{i + 1}</Text>
                                )}
                            </View>
                            <Text style={[
                                styles.listName,
                                i === currentExercise?.index && { fontWeight: '700', color: colors.textPrimary },
                                ex.completed_sets >= ex.target_sets && { color: colors.textTertiary, textDecorationLine: 'line-through' }
                            ]}>{ex.name}</Text>
                            <Text style={styles.listMeta}>{ex.target_sets} × {ex.target_reps}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action / Modal for Logging */}
            <Modal
                visible={showLogModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Log Set</Text>
                        <Text style={styles.modalSubtitle}>{currentExercise?.name}</Text>

                        <View style={styles.modalInputContainer}>
                            <View style={styles.modalInputWrapper}>
                                <Text style={styles.modalInputLabel}>REPS</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={repsInput}
                                    onChangeText={setRepsInput}
                                    keyboardType="numeric"
                                    autoFocus
                                    selectTextOnFocus
                                />
                            </View>
                            <View style={styles.modalInputWrapper}>
                                <Text style={styles.modalInputLabel}>WEIGHT (KG)</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={weightInput}
                                    onChangeText={setWeightInput}
                                    keyboardType="numeric"
                                    placeholder="-"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={handleLogSet}
                        >
                            <Text style={styles.modalButtonText}>Complete Set</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => setShowLogModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceAlt,
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
        color: colors.textPrimary,
    },
    timerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    finishButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.successLight,
    },
    finishButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
    },

    // Dashboard
    dashboardGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        position: 'relative',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    statIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        opacity: 0.2,
    },

    // Exercise Card - LUXURY REDESIGN
    exerciseCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    exerciseTypeBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    exerciseTypeText: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    progressPill: {
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    progressPillText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardTitleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    exerciseNameMain: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        flex: 1,
        lineHeight: 32,
    },
    infoIcon: {
        padding: 4,
    },
    dataGrid: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dataCell: {
        flex: 1,
        alignItems: 'center',
    },
    dataDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
    },
    dataLabel: {
        color: colors.textTertiary,
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    dataValue: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    logButtonMain: {
        borderRadius: 16,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    logButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        gap: 8,
    },
    logButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Rest Card
    restCard: {
        backgroundColor: colors.accentLight,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.accent + '20',
        alignItems: 'center',
    },
    restHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    restTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.accent,
    },
    restTime: {
        fontSize: 48,
        fontWeight: '800',
        color: colors.accentDark,
        fontVariant: ['tabular-nums'],
        marginBottom: 16,
    },
    restControls: {
        flexDirection: 'row',
        gap: 12,
    },
    restButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        minWidth: 80,
        alignItems: 'center',
    },
    restButtonPrimary: {
        backgroundColor: colors.accent,
    },
    restButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.accent,
    },

    // Next Card
    nextCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    nextLeft: {
        flex: 1,
    },
    nextLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        marginBottom: 4,
    },
    nextName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // List
    listSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 16,
        marginLeft: 4,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceAlt,
    },
    listItemActive: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: -12,
        borderBottomWidth: 0,
    },
    listIndex: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listIndexText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textTertiary,
    },
    listName: {
        flex: 1,
        fontSize: 15,
        color: colors.textSecondary,
    },
    listMeta: {
        fontSize: 13,
        color: colors.textTertiary,
        fontVariant: ['tabular-nums'],
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    modalInputContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
        width: '100%',
    },
    modalInputWrapper: {
        flex: 1,
    },
    modalInputLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: colors.textPrimary,
    },
    modalButton: {
        backgroundColor: colors.accent,
        borderRadius: 16,
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalCancel: {
        padding: 12,
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textTertiary,
    },
});
