import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { postureCareAPI } from '../services/api';

const { width } = Dimensions.get('window');

// Theme
const theme = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    primary: '#2C696D',
    secondary: '#4A9B9F',
    textMain: '#1E293B',
    textSub: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    accent: '#8B5CF6',
    calm: '#E0F2F1',
};

// Pain area options
const PAIN_AREAS = [
    { id: 'upper_back', label: 'Upper Back', icon: 'human-handsup' },
    { id: 'lower_back', label: 'Lower Back', icon: 'human' },
    { id: 'knee', label: 'Knee', icon: 'human-male' },
    { id: 'shoulder', label: 'Shoulder', icon: 'arm-flex' },
    { id: 'neck', label: 'Neck', icon: 'account' },
];

interface Exercise {
    id: number;
    name: string;
    target_area: string;
    instructions: string;
    duration_seconds: number;
    reps?: number;
    difficulty: string;
}

interface CarePlan {
    exercises: Exercise[];
    totalDuration: number;
    focusAreas: string[];
    exerciseCount: number;
}

const PostureCareScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [plan, setPlan] = useState<CarePlan | null>(null);
    const [completed, setCompleted] = useState(false);
    const [streak, setStreak] = useState({ current: 0, longest: 0, totalSessions: 0 });
    const [postureTip, setPostureTip] = useState('');
    const [painAreas, setPainAreas] = useState<string[]>([]);
    const [selectedPains, setSelectedPains] = useState<string[]>([]);
    const [showPainSelector, setShowPainSelector] = useState(false);
    const [disclaimer] = useState('Stop if you feel pain. This is not a substitute for medical care.');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await postureCareAPI.getDailyPlan();
            setPlan(data.plan);
            setCompleted(data.completed);
            setStreak(data.streak);
            setPostureTip(data.postureTip);
            setPainAreas(data.painAreas || []);
            setSelectedPains(data.painAreas || []);
        } catch (error) {
            console.error('Load posture care error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const togglePainArea = (areaId: string) => {
        setSelectedPains(prev =>
            prev.includes(areaId)
                ? prev.filter(p => p !== areaId)
                : [...prev, areaId]
        );
    };

    const savePainPreferences = async () => {
        try {
            const painTypes = selectedPains.map(p => ({ pain_type: p }));
            await postureCareAPI.setPainPreferences(painTypes);
            setShowPainSelector(false);
            Alert.alert('Saved', 'Your preferences have been updated.');
            loadData(); // Reload to get new plan
        } catch (error) {
            Alert.alert('Error', 'Failed to save preferences.');
        }
    };

    const startSession = () => {
        if (!plan || plan.exercises.length === 0) {
            Alert.alert('No exercises', 'No exercises available for today.');
            return;
        }
        navigation.navigate('CorrectiveSession', { exercises: plan.exercises });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading your care plan...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Posture & Pain Care</Text>
                    <Text style={styles.headerSubtitle}>Daily corrective exercises</Text>
                </View>
                {streak.current > 0 && (
                    <View style={styles.streakBadge}>
                        <MaterialCommunityIcons name="fire" size={16} color="#F97316" />
                        <Text style={styles.streakText}>{streak.current}</Text>
                    </View>
                )}
            </View>

            {/* Posture Tip */}
            <View style={styles.tipCard}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={theme.warning} />
                <Text style={styles.tipText}>{postureTip}</Text>
            </View>

            {/* Today's Care Plan */}
            <View style={styles.planCard}>
                <View style={styles.planHeader}>
                    <View>
                        <Text style={styles.planTitle}>Today's Care Plan</Text>
                        <Text style={styles.planMeta}>
                            {plan?.exerciseCount || 0} exercises • {plan?.totalDuration || 0} min
                        </Text>
                    </View>
                    {completed && (
                        <View style={styles.completedBadge}>
                            <MaterialCommunityIcons name="check-circle" size={18} color={theme.success} />
                            <Text style={styles.completedText}>Done</Text>
                        </View>
                    )}
                </View>

                {/* Focus Areas */}
                <View style={styles.focusRow}>
                    {plan?.focusAreas.map((area, i) => (
                        <View key={i} style={styles.focusChip}>
                            <Text style={styles.focusChipText}>{area.charAt(0).toUpperCase() + area.slice(1)}</Text>
                        </View>
                    ))}
                </View>

                {/* Exercises Preview */}
                <View style={styles.exercisesList}>
                    {plan?.exercises.slice(0, 4).map((ex, i) => (
                        <View key={i} style={styles.exerciseItem}>
                            <MaterialCommunityIcons
                                name={getExerciseIcon(ex.target_area) as any}
                                size={20}
                                color={theme.primary}
                            />
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDuration}>
                                {ex.reps ? `${ex.reps} reps` : `${ex.duration_seconds}s`}
                            </Text>
                        </View>
                    ))}
                    {(plan?.exercises.length || 0) > 4 && (
                        <Text style={styles.moreText}>+{(plan?.exercises.length || 0) - 4} more</Text>
                    )}
                </View>

                {/* Start Button */}
                <TouchableOpacity
                    style={[styles.startBtn, completed && styles.startBtnDisabled]}
                    onPress={startSession}
                >
                    <MaterialCommunityIcons name="play-circle" size={22} color="white" />
                    <Text style={styles.startBtnText}>
                        {completed ? 'Do Again' : 'Start Session'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Pain Areas */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Focus Areas</Text>
                    <TouchableOpacity onPress={() => setShowPainSelector(!showPainSelector)}>
                        <Text style={styles.editText}>{showPainSelector ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                </View>

                {showPainSelector ? (
                    <>
                        <Text style={styles.helpText}>Select areas you want to focus on:</Text>
                        <View style={styles.painGrid}>
                            {PAIN_AREAS.map(area => (
                                <TouchableOpacity
                                    key={area.id}
                                    style={[
                                        styles.painOption,
                                        selectedPains.includes(area.id) && styles.painOptionSelected
                                    ]}
                                    onPress={() => togglePainArea(area.id)}
                                >
                                    <MaterialCommunityIcons
                                        name={area.icon as any}
                                        size={24}
                                        color={selectedPains.includes(area.id) ? 'white' : theme.textSub}
                                    />
                                    <Text style={[
                                        styles.painOptionText,
                                        selectedPains.includes(area.id) && styles.painOptionTextSelected
                                    ]}>
                                        {area.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.saveBtn} onPress={savePainPreferences}>
                            <Text style={styles.saveBtnText}>Save Preferences</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.painTags}>
                        {painAreas.length > 0 ? (
                            painAreas.map((area, i) => (
                                <View key={i} style={styles.painTag}>
                                    <Text style={styles.painTagText}>
                                        {area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noPainText}>No specific areas selected (posture focus)</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{streak.current}</Text>
                    <Text style={styles.statLabel}>Current Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{streak.longest}</Text>
                    <Text style={styles.statLabel}>Longest Streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{streak.totalSessions}</Text>
                    <Text style={styles.statLabel}>Total Sessions</Text>
                </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
                <MaterialCommunityIcons name="shield-alert-outline" size={18} color={theme.textSub} />
                <Text style={styles.disclaimerText}>{disclaimer}</Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const getExerciseIcon = (targetArea: string): string => {
    const icons: Record<string, string> = {
        posture: 'human-handsup',
        back: 'human',
        knee: 'human-male',
        shoulder: 'arm-flex',
        neck: 'account',
    };
    return icons[targetArea] || 'run';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg,
    },
    loadingText: {
        marginTop: 12,
        color: theme.textSub,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backBtn: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.textMain,
    },
    headerSubtitle: {
        fontSize: 14,
        color: theme.textSub,
        marginTop: 2,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    streakText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F97316',
    },
    tipCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 14,
        borderRadius: 12,
        gap: 10,
        alignItems: 'flex-start',
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
    planCard: {
        backgroundColor: theme.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.textMain,
    },
    planMeta: {
        fontSize: 13,
        color: theme.textSub,
        marginTop: 4,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completedText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.success,
    },
    focusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    focusChip: {
        backgroundColor: theme.calm,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    focusChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.primary,
    },
    exercisesList: {
        marginBottom: 16,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        gap: 12,
    },
    exerciseName: {
        flex: 1,
        fontSize: 15,
        color: theme.textMain,
        fontWeight: '500',
    },
    exerciseDuration: {
        fontSize: 13,
        color: theme.textSub,
    },
    moreText: {
        fontSize: 13,
        color: theme.primary,
        textAlign: 'center',
        marginTop: 10,
    },
    startBtn: {
        backgroundColor: theme.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    startBtnDisabled: {
        backgroundColor: theme.secondary,
    },
    startBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    sectionCard: {
        backgroundColor: theme.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.textMain,
    },
    editText: {
        fontSize: 14,
        color: theme.primary,
        fontWeight: '600',
    },
    helpText: {
        fontSize: 13,
        color: theme.textSub,
        marginBottom: 12,
    },
    painGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    painOption: {
        width: (width - 80) / 3,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.bg,
    },
    painOptionSelected: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    painOptionText: {
        fontSize: 12,
        color: theme.textSub,
        marginTop: 6,
        textAlign: 'center',
    },
    painOptionTextSelected: {
        color: 'white',
    },
    saveBtn: {
        backgroundColor: theme.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 16,
    },
    saveBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    painTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    painTag: {
        backgroundColor: theme.calm,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    painTagText: {
        fontSize: 13,
        color: theme.primary,
        fontWeight: '500',
    },
    noPainText: {
        fontSize: 13,
        color: theme.textSub,
        fontStyle: 'italic',
    },
    statsCard: {
        backgroundColor: theme.surface,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.primary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.textSub,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: theme.border,
    },
    disclaimerCard: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        marginHorizontal: 20,
        padding: 14,
        borderRadius: 10,
        gap: 10,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: theme.border,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: theme.textSub,
        lineHeight: 18,
    },
});

export default PostureCareScreen;
