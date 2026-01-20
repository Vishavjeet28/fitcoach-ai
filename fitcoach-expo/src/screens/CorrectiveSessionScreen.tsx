import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { postureCareAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// Theme
const theme = {
    bg: '#0F172A',
    surface: '#1E293B',
    primary: '#2C696D',
    accent: '#4AE3B5',
    textMain: '#F8FAFC',
    textSub: '#94A3B8',
    success: '#10B981',
    warning: '#F59E0B',
};

interface Exercise {
    id: number;
    name: string;
    target_area: string;
    instructions: string;
    duration_seconds: number;
    reps?: number;
    rest_seconds?: number;
    difficulty: string;
}

const CorrectiveSessionScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { exercises } = route.params as { exercises: Exercise[] };

    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<'exercise' | 'rest' | 'complete'>('exercise');
    const [timeLeft, setTimeLeft] = useState(exercises[0]?.duration_seconds || 60);
    const [isPaused, setIsPaused] = useState(false);
    const [sessionStartTime] = useState(Date.now());

    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const currentExercise = exercises[currentIndex];
    const isLastExercise = currentIndex === exercises.length - 1;

    // Timer effect
    useEffect(() => {
        if (phase === 'complete' || isPaused) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleTimerComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase, isPaused, currentIndex]);

    // Progress animation
    useEffect(() => {
        const totalTime = phase === 'rest'
            ? (currentExercise?.rest_seconds || 15)
            : (currentExercise?.duration_seconds || 60);

        const progress = 1 - (timeLeft / totalTime);
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [timeLeft]);

    // Pulse animation for timer
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handleTimerComplete = () => {
        if (phase === 'exercise') {
            if (isLastExercise) {
                setPhase('complete');
                completeSession();
            } else {
                // Start rest phase
                setPhase('rest');
                setTimeLeft(currentExercise?.rest_seconds || 15);
            }
        } else if (phase === 'rest') {
            // Move to next exercise
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setPhase('exercise');
            setTimeLeft(exercises[nextIndex]?.duration_seconds || 60);
        }
    };

    const skipExercise = () => {
        if (isLastExercise && phase === 'exercise') {
            setPhase('complete');
            completeSession();
        } else if (phase === 'exercise') {
            setPhase('rest');
            setTimeLeft(currentExercise?.rest_seconds || 15);
        } else {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setPhase('exercise');
            setTimeLeft(exercises[nextIndex]?.duration_seconds || 60);
        }
    };

    const completeSession = async () => {
        const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

        try {
            const result = await postureCareAPI.completeSession({
                duration_seconds: durationSeconds,
                exercises_completed: exercises.length,
            });

            // Show success with positive message
            Alert.alert(
                '🎉 Great Job!',
                result.message || 'Session completed!',
                [
                    {
                        text: 'Share Feedback',
                        onPress: () => showFeedbackPrompt(durationSeconds),
                    },
                    {
                        text: 'Done',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error) {
            console.error('Complete session error:', error);
            navigation.goBack();
        }
    };

    const showFeedbackPrompt = async (durationSeconds: number) => {
        Alert.alert(
            'How do you feel?',
            'Your feedback helps improve your plan',
            [
                { text: 'Better 😊', onPress: () => submitFeedback('better', durationSeconds) },
                { text: 'Same 😐', onPress: () => submitFeedback('same', durationSeconds) },
                { text: 'Skip', onPress: () => navigation.goBack() },
            ]
        );
    };

    const submitFeedback = async (feedback: string, durationSeconds: number) => {
        try {
            await postureCareAPI.completeSession({
                duration_seconds: durationSeconds,
                exercises_completed: exercises.length,
                feedback,
            });
        } catch (e) {
            // Silently fail
        }
        navigation.goBack();
    };

    const exitSession = () => {
        Alert.alert(
            'Exit Session?',
            'Your progress won\'t be saved.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
            ]
        );
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}`;
    };

    if (phase === 'complete') {
        return (
            <View style={styles.completeContainer}>
                <MaterialCommunityIcons name="check-decagram" size={80} color={theme.accent} />
                <Text style={styles.completeTitle}>Session Complete!</Text>
                <Text style={styles.completeSubtitle}>Your body thanks you 🙌</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={exitSession}>
                    <MaterialCommunityIcons name="close" size={28} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {phase === 'rest' ? 'Rest' : `${currentIndex + 1} / ${exercises.length}`}
                </Text>
                <TouchableOpacity onPress={skipExercise}>
                    <MaterialCommunityIcons name="skip-next" size={28} color={theme.textMain} />
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                {exercises.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i < currentIndex && styles.progressDotComplete,
                            i === currentIndex && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Timer Circle */}
            <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.timerCircle}>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                    <Text style={styles.timerLabel}>{phase === 'rest' ? 'REST' : 'seconds'}</Text>
                </View>
            </Animated.View>

            {/* Exercise Info */}
            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>
                    {phase === 'rest' ? 'Get Ready...' : currentExercise?.name}
                </Text>
                {phase !== 'rest' && (
                    <Text style={styles.exerciseInstructions}>
                        {currentExercise?.instructions}
                    </Text>
                )}
                {phase === 'rest' && currentIndex + 1 < exercises.length && (
                    <Text style={styles.upNextText}>
                        Up next: {exercises[currentIndex + 1]?.name}
                    </Text>
                )}
            </View>

            {/* Target Area Badge */}
            {phase !== 'rest' && (
                <View style={styles.targetBadge}>
                    <MaterialCommunityIcons name="target" size={16} color={theme.accent} />
                    <Text style={styles.targetText}>
                        {currentExercise?.target_area.charAt(0).toUpperCase() +
                            currentExercise?.target_area.slice(1)}
                    </Text>
                </View>
            )}

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.pauseBtn}
                    onPress={() => setIsPaused(!isPaused)}
                >
                    <MaterialCommunityIcons
                        name={isPaused ? 'play' : 'pause'}
                        size={32}
                        color={theme.textMain}
                    />
                </TouchableOpacity>
            </View>

            {/* Safety Reminder */}
            <View style={styles.safetyReminder}>
                <MaterialCommunityIcons name="shield-check" size={14} color={theme.textSub} />
                <Text style={styles.safetyText}>Stop if you feel pain</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.textSub,
    },
    progressBarContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 40,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.surface,
    },
    progressDotComplete: {
        backgroundColor: theme.accent,
    },
    progressDotActive: {
        backgroundColor: theme.accent,
        width: 24,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    timerCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.accent,
    },
    timerText: {
        fontSize: 56,
        fontWeight: '700',
        color: theme.textMain,
    },
    timerLabel: {
        fontSize: 14,
        color: theme.textSub,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    exerciseInfo: {
        paddingHorizontal: 30,
        alignItems: 'center',
    },
    exerciseName: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.textMain,
        textAlign: 'center',
        marginBottom: 12,
    },
    exerciseInstructions: {
        fontSize: 15,
        color: theme.textSub,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    upNextText: {
        fontSize: 15,
        color: theme.accent,
        marginTop: 8,
    },
    targetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: theme.surface,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 20,
        gap: 6,
    },
    targetText: {
        fontSize: 13,
        color: theme.accent,
        fontWeight: '600',
    },
    controls: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pauseBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    safetyReminder: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingBottom: 40,
    },
    safetyText: {
        fontSize: 12,
        color: theme.textSub,
    },
    completeContainer: {
        flex: 1,
        backgroundColor: theme.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    completeTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.textMain,
        marginTop: 24,
    },
    completeSubtitle: {
        fontSize: 16,
        color: theme.textSub,
        marginTop: 8,
    },
    doneBtn: {
        backgroundColor: theme.accent,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 40,
    },
    doneBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.bg,
    },
});

export default CorrectiveSessionScreen;
