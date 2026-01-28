/**
 * YogaRoutineScreen.tsx
 * Multi-exercise flow screen with auto-progression timer
 * When timer ends, automatically moves to next exercise
 * Logs completed routine to database
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    FlatList,
    Alert,
    Vibration,
    Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    YOGA_EXERCISES,
    YOGA_ROUTINES,
    YOGA_THEME,
    YogaPose,
    YogaRoutine,
    YogaStep,
} from '../../services/yoga_data_expanded';

const { width } = Dimensions.get('window');


interface CompletedPose {
    pose_id: string;
    pose_name: string;
    duration_seconds: number;
    completed_at: string;
}

export default function YogaRoutineScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { routineId } = route.params || {};

    // Routine data
    const [routine, setRoutine] = useState<YogaRoutine | null>(null);
    const [poses, setPoses] = useState<YogaPose[]>([]);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Timer state
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isRoutineStarted, setIsRoutineStarted] = useState(false);
    const [isRoutineComplete, setIsRoutineComplete] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Progress tracking
    const [completedPoses, setCompletedPoses] = useState<CompletedPose[]>([]);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Load routine and poses
    useEffect(() => {
        if (routineId && YOGA_ROUTINES[routineId]) {
            const loadedRoutine = YOGA_ROUTINES[routineId];
            setRoutine(loadedRoutine);

            // Load all poses for this routine
            const routinePoses = loadedRoutine.pose_ids
                .map((id) => YOGA_EXERCISES[id])
                .filter(Boolean);
            setPoses(routinePoses);

            // Set initial timer
            if (routinePoses.length > 0) {
                setTimerSeconds(routinePoses[0].duration_minutes * 60);
            }
        }
    }, [routineId]);

    // Timer countdown effect
    useEffect(() => {
        if (isTimerRunning && timerSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimerSeconds((prev) => {
                    if (prev <= 1) {
                        handlePoseComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, timerSeconds]);

    // Handle single pose completion
    const handlePoseComplete = useCallback(() => {
        if (!poses[currentPoseIndex]) return;

        // Stop timer
        setIsTimerRunning(false);
        Vibration.vibrate([200, 100, 200]);

        // Log completed pose
        const completedPose: CompletedPose = {
            pose_id: poses[currentPoseIndex].id,
            pose_name: poses[currentPoseIndex].name,
            duration_seconds: poses[currentPoseIndex].duration_minutes * 60,
            completed_at: new Date().toISOString(),
        };
        setCompletedPoses((prev) => [...prev, completedPose]);

        // Check if more poses remain
        if (currentPoseIndex < poses.length - 1) {
            // Move to next pose
            const nextIndex = currentPoseIndex + 1;
            setCurrentPoseIndex(nextIndex);
            setCurrentStepIndex(0);
            setTimerSeconds(poses[nextIndex].duration_minutes * 60);

            // Brief pause then auto-start next
            setTimeout(() => {
                setIsTimerRunning(true);
            }, 1500);
        } else {
            // Routine complete!
            handleRoutineComplete([...completedPoses, completedPose]);
        }
    }, [currentPoseIndex, poses, completedPoses]);

    // Handle full routine completion
    const handleRoutineComplete = async (allCompletedPoses: CompletedPose[]) => {
        setIsRoutineComplete(true);
        Vibration.vibrate([500, 200, 500, 200, 500]);

        // Log completed routine data
        const logEntry = {
            routine_id: routine?.id,
            routine_name: routine?.name,
            completed_at: new Date().toISOString(),
            total_duration_minutes: routine?.total_duration_minutes,
            poses_completed: allCompletedPoses.length,
            poses: allCompletedPoses,
        };

        // Log to console (storage will be handled by backend API in production)
        console.log('✅ Yoga routine completed:', JSON.stringify(logEntry, null, 2));

        Alert.alert(
            'Routine Complete! 🎉',
            `Amazing work! You completed ${allCompletedPoses.length} exercises in ${routine?.total_duration_minutes} minutes.`,
            [
                {
                    text: 'Return to Home',
                    onPress: () => navigation.navigate('YogaMain'),
                },
            ]
        );
    };

    // Start the routine
    const startRoutine = () => {
        setIsRoutineStarted(true);
        setIsTimerRunning(true);
    };

    // Pause/Resume
    const toggleTimer = () => {
        setIsTimerRunning(!isTimerRunning);
    };

    // Skip to next pose
    const skipPose = () => {
        handlePoseComplete();
    };

    // Format time
    const formatTime = (totalSeconds: number): string => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const getProgress = (): number => {
        if (!poses[currentPoseIndex]) return 0;
        const totalSeconds = poses[currentPoseIndex].duration_minutes * 60;
        return ((totalSeconds - timerSeconds) / totalSeconds) * 100;
    };

    // Loading state
    if (!routine || poses.length === 0) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading routine...</Text>
            </SafeAreaView>
        );
    }

    const currentPose = poses[currentPoseIndex];

    // ═══════════════ COMPLETION SCREEN ═══════════════
    if (isRoutineComplete) {
        return (
            <SafeAreaView style={styles.completionContainer}>
                <MaterialCommunityIcons name="check-circle" size={80} color="#48BB78" />
                <Text style={styles.completionTitle}>Namaste! 🙏</Text>
                <Text style={styles.completionSubtitle}>
                    You completed {routine.name}
                </Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{completedPoses.length}</Text>
                        <Text style={styles.statLabel}>Exercises</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{routine.total_duration_minutes}</Text>
                        <Text style={styles.statLabel}>Minutes</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => navigation.navigate('YogaMain')}
                >
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ═══════════════ START SCREEN ═══════════════
    if (!isRoutineStarted) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView contentContainerStyle={styles.startScrollContent}>
                    {/* Header */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color={YOGA_THEME.colors.primary}
                        />
                    </TouchableOpacity>

                    {/* Routine Info */}
                    <View style={styles.routineHeader}>
                        <View
                            style={[
                                styles.routineIconCircle,
                                { backgroundColor: routine.gradient[0] },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={routine.icon as any}
                                size={40}
                                color={YOGA_THEME.colors.primary}
                            />
                        </View>
                        <Text style={styles.routineTitle}>{routine.name}</Text>
                        <Text style={styles.routineSubtitle}>{routine.subtitle}</Text>

                        <View style={styles.routineMeta}>
                            <View style={styles.metaPill}>
                                <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                                <Text style={styles.metaText}>
                                    {routine.total_duration_minutes} min
                                </Text>
                            </View>
                            <View style={styles.metaPill}>
                                <MaterialCommunityIcons name="yoga" size={16} color="#666" />
                                <Text style={styles.metaText}>{poses.length} exercises</Text>
                            </View>
                            <View style={styles.metaPill}>
                                <Text style={styles.metaText}>{routine.difficulty}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>About This Routine</Text>
                        <Text style={styles.descriptionText}>{routine.description}</Text>
                    </View>

                    {/* Benefits */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.sectionTitle}>Benefits</Text>
                        {routine.benefits.map((benefit, i) => (
                            <View key={i} style={styles.benefitItem}>
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={20}
                                    color="#48BB78"
                                />
                                <Text style={styles.benefitText}>{benefit}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Exercise List */}
                    <View style={styles.exerciseListSection}>
                        <Text style={styles.sectionTitle}>Exercises in This Routine</Text>
                        {poses.map((pose, index) => (
                            <View key={pose.id} style={styles.exerciseListItem}>
                                <View style={styles.exerciseNumber}>
                                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{pose.name}</Text>
                                    <Text style={styles.exerciseDuration}>
                                        {pose.duration_minutes} minutes
                                    </Text>
                                </View>
                                <Image
                                    source={pose.hero_image}
                                    style={styles.exerciseThumb}
                                />
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Start Button */}
                <View style={styles.startButtonContainer}>
                    <TouchableOpacity style={styles.startButton} onPress={startRoutine}>
                        <MaterialCommunityIcons name="play" size={24} color="#fff" />
                        <Text style={styles.startButtonText}>Begin Routine</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ═══════════════ ACTIVE SESSION SCREEN ═══════════════
    const renderSlide = ({ item, index }: { item: YogaStep; index: number }) => (
        <View style={styles.slideContainer}>
            <View style={styles.imageWrapper}>
                <Image source={item.image_url} style={styles.slideImage} resizeMode="cover" />
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step {index + 1}</Text>
                </View>
            </View>
            <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideInstruction}>{item.instruction}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Progress Header */}
            <View style={styles.progressHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color={YOGA_THEME.colors.primary}
                    />
                </TouchableOpacity>
                <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                        Exercise {currentPoseIndex + 1} of {poses.length}
                    </Text>
                    <View style={styles.progressDots}>
                        {poses.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i < currentPoseIndex && styles.progressDotCompleteStyle,
                                    i === currentPoseIndex && styles.progressDotActive,
                                ]}
                            />
                        ))}
                    </View>
                </View>
                <TouchableOpacity onPress={skipPose}>
                    <Text style={styles.skipText}>Skip →</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sessionScrollContent}>
                {/* Current Pose Name */}
                <View style={styles.currentPoseHeader}>
                    <Text style={styles.currentPoseName}>{currentPose.name}</Text>
                    <Text style={styles.currentPoseSanskrit}>{currentPose.sanskrit_name}</Text>
                </View>

                {/* Illustration Slider */}
                <View style={styles.sliderContainer}>
                    <FlatList
                        data={currentPose.steps}
                        renderItem={renderSlide}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentStepIndex(index);
                        }}
                    />
                    <View style={styles.dotsOverlay}>
                        {currentPose.steps.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    currentStepIndex === i ? styles.activeDot : styles.inactiveDot,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Timer Section */}
                <View style={styles.timerSection}>
                    <Text style={styles.timerLabel}>TIME REMAINING</Text>
                    <Text
                        style={[
                            styles.timerText,
                            timerSeconds <= 10 && { color: '#E53E3E' },
                        ]}
                    >
                        {formatTime(timerSeconds)}
                    </Text>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${getProgress()}%` }]} />
                    </View>

                    {/* Controls */}
                    <View style={styles.timerControls}>
                        <TouchableOpacity
                            style={[
                                styles.controlButton,
                                isTimerRunning ? styles.pauseButton : styles.playButton,
                            ]}
                            onPress={toggleTimer}
                        >
                            <MaterialCommunityIcons
                                name={isTimerRunning ? 'pause' : 'play'}
                                size={32}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Instructor Cues */}
                <View style={styles.cuesSection}>
                    <Text style={styles.cuesSectionTitle}>Focus On</Text>
                    {currentPose.instructor_cues.map((cue, i) => (
                        <View key={i} style={styles.cueItem}>
                            <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#ED8936" />
                            <Text style={styles.cueText}>{cue}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        fontSize: 16,
        color: YOGA_THEME.colors.secondary,
    },

    // ═══════════════ START SCREEN STYLES ═══════════════
    startScrollContent: {
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    routineHeader: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 32,
    },
    routineIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    routineTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        textAlign: 'center',
    },
    routineSubtitle: {
        fontSize: 16,
        color: YOGA_THEME.colors.secondary,
        marginTop: 4,
    },
    routineMeta: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    metaText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    descriptionSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#555',
    },
    benefitsSection: {
        marginBottom: 24,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    benefitText: {
        fontSize: 15,
        color: '#444',
    },
    exerciseListSection: {
        marginBottom: 24,
    },
    exerciseListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    exerciseNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: YOGA_THEME.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    exerciseNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },
    exerciseDuration: {
        fontSize: 13,
        color: YOGA_THEME.colors.secondary,
        marginTop: 2,
    },
    exerciseThumb: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    startButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#48BB78',
        paddingVertical: 16,
        borderRadius: 30,
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },

    // ═══════════════ ACTIVE SESSION STYLES ═══════════════
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    progressInfo: {
        alignItems: 'center',
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },
    progressDots: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    progressDotCompleteStyle: {
        backgroundColor: '#48BB78',
    },
    progressDotActive: {
        backgroundColor: YOGA_THEME.colors.accent,
        width: 20,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
        color: YOGA_THEME.colors.secondary,
    },
    sessionScrollContent: {
        paddingBottom: 20,
    },
    currentPoseHeader: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    currentPoseName: {
        fontSize: 24,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
    },
    currentPoseSanskrit: {
        fontSize: 14,
        fontStyle: 'italic',
        color: YOGA_THEME.colors.secondary,
        marginTop: 4,
    },

    // Slider
    sliderContainer: {
        width: '100%',
        backgroundColor: '#000',
        marginBottom: 20,
    },
    slideContainer: {
        width: width,
        alignItems: 'center',
    },
    imageWrapper: {
        width: width,
        height: 300,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideImage: {
        width: '100%',
        height: '100%',
    },
    stepBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    stepBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    slideContent: {
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: '#fff',
        width: '100%',
    },
    slideTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 6,
    },
    slideInstruction: {
        fontSize: 14,
        lineHeight: 22,
        color: '#555',
        textAlign: 'center',
    },
    dotsOverlay: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 20,
    },
    inactiveDot: {
        backgroundColor: 'rgba(255,255,255,0.4)',
        width: 6,
    },

    // Timer
    timerSection: {
        alignItems: 'center',
        paddingVertical: 24,
        marginHorizontal: 20,
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
        marginBottom: 20,
    },
    timerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: YOGA_THEME.colors.secondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    timerText: {
        fontSize: 56,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        fontVariant: ['tabular-nums'],
    },
    progressBarContainer: {
        width: '80%',
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 16,
        marginBottom: 20,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#48BB78',
        borderRadius: 4,
    },
    timerControls: {
        flexDirection: 'row',
        gap: 16,
    },
    controlButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        backgroundColor: '#48BB78',
    },
    pauseButton: {
        backgroundColor: '#ED8936',
    },

    // Cues
    cuesSection: {
        paddingHorizontal: 20,
    },
    cuesSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 12,
    },
    cueItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    cueText: {
        fontSize: 14,
        color: '#555',
        flex: 1,
    },

    // ═══════════════ COMPLETION SCREEN ═══════════════
    completionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 40,
    },
    completionTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        marginTop: 24,
    },
    completionSubtitle: {
        fontSize: 16,
        color: YOGA_THEME.colors.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 40,
        marginTop: 40,
    },
    statBox: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 40,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
    },
    statLabel: {
        fontSize: 14,
        color: YOGA_THEME.colors.secondary,
    },
    doneButton: {
        marginTop: 48,
        backgroundColor: YOGA_THEME.colors.primary,
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 30,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
