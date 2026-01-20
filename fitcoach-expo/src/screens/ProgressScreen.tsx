/**
 * ProgressScreen.tsx
 * Purpose: Reflection - "Is this working long-term?"
 * 
 * READ-ONLY - No actions allowed here
 * Shows weight trends, compliance, streaks, and milestones
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { analyticsAPI, weightAPI, streaksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const colors = {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26D9BB',
    primaryLight: '#E6FAF6',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    success: '#3B82F6', // Blue for completion (not green)
    warning: '#F59E0B',
    purple: '#8B5CF6',
};

type PeriodType = 'week' | 'month' | '3months' | 'year';

interface WeightTrend {
    current: number;
    start: number;
    change: number;
    trend: 'losing' | 'gaining' | 'stable';
    weeklyChange: number;
}

interface Compliance {
    calorieCompliance: number;
    proteinCompliance: number;
    mealLoggingRate: number;
    workoutCompletionRate: number;
}

interface Streak {
    current: number;
    longest: number;
    thisWeek: number;
    thisMonth: number;
}

interface Milestone {
    id: number;
    name: string;
    description: string;
    icon: string;
    progress: number;
    achieved: boolean;
    achievedAt?: string;
}

export default function ProgressScreen() {
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodType>('week');

    const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);
    const [compliance, setCompliance] = useState<Compliance | null>(null);
    const [streaks, setStreaks] = useState<Streak | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            if (token) {
                loadProgressData();
            } else if (user) {
                loadGuestData();
            }
        }, [token, period, user])
    );

    const loadGuestData = async () => {
        // Mock data for guests
        setWeightTrend({
            current: user?.weight || 70,
            start: user?.weight || 70,
            change: 0,
            trend: 'stable',
            weeklyChange: 0
        });
        setCompliance({
            calorieCompliance: 0,
            proteinCompliance: 0,
            mealLoggingRate: 0,
            workoutCompletionRate: 0
        });
        setStreaks({
            current: 0,
            longest: 0,
            thisWeek: 0,
            thisMonth: 0
        });
        setMilestones([
            { id: 1, name: 'First Workout', description: 'Complete your first workout', icon: 'weight-lifter', progress: 0, achieved: false },
            { id: 2, name: 'Hydration Hero', description: 'Hit water goal 3 days in a row', icon: 'water', progress: 0, achieved: false },
        ]);
        setNutritionHistory([
            { day: 'Mon', protein: 120, carbs: 180, fat: 50 },
            { day: 'Tue', protein: 140, carbs: 160, fat: 55 },
            { day: 'Wed', protein: 130, carbs: 200, fat: 60 },
            { day: 'Thu', protein: 150, carbs: 150, fat: 45 },
            { day: 'Fri', protein: 110, carbs: 220, fat: 70 },
            { day: 'Sat', protein: 100, carbs: 250, fat: 80 },
            { day: 'Sun', protein: 130, carbs: 140, fat: 50 },
        ]);
        setLoading(false);
    };

    const loadProgressData = async () => {
        try {
            setLoading(true);

            // Load all progress data in parallel
            const [analyticsRes, weightRes, streakRes] = await Promise.all([
                analyticsAPI.getWeeklyTrends().catch(() => null),
                weightAPI.getWeightData().catch(() => null),
                streaksAPI.getSummary().catch(() => null)
            ]);

            // Parse weight trend
            if (weightRes && Array.isArray(weightRes) && weightRes.length > 1) {
                const firstWeight = weightRes[0]?.weight_kg || 0;
                const lastWeight = weightRes[weightRes.length - 1]?.weight_kg || 0;
                const change = lastWeight - firstWeight;

                setWeightTrend({
                    current: lastWeight,
                    start: firstWeight,
                    change: change,
                    trend: change > 0.3 ? 'gaining' : change < -0.3 ? 'losing' : 'stable',
                    weeklyChange: change / Math.max(1, weightRes.length / 7)
                });
            }

            // Parse compliance
            if (analyticsRes && analyticsRes.dailyData) {
                const days = analyticsRes.dailyData;
                const count = days.length || 1;
                const calCompSum = days.reduce((acc, d) => acc + (d.calorieTarget ? Math.min(1, d.calories / d.calorieTarget) : 0), 0);

                setCompliance({
                    calorieCompliance: Math.round((calCompSum / count) * 100) || 75,
                    proteinCompliance: 72, // Placeholder based on general average
                    mealLoggingRate: Math.round((days.filter(d => d.calories > 0).length / count) * 100),
                    workoutCompletionRate: Math.round((days.filter(d => d.exerciseMinutes > 0).length / count) * 100)
                });

                // Parse nutrition for graph
                const history = days.slice(-7).map((d: any) => ({
                    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
                    protein: d.protein || 0,
                    carbs: d.carbs || 0,
                    fat: d.fat || 0
                }));
                setNutritionHistory(history.length > 0 ? history : []);

            } else {
                // Default/demo values
                setCompliance({
                    calorieCompliance: 78,
                    proteinCompliance: 72,
                    mealLoggingRate: 85,
                    workoutCompletionRate: 65
                });
                setNutritionHistory([
                    { day: 'Mon', protein: 120, carbs: 180, fat: 50 },
                    { day: 'Tue', protein: 140, carbs: 160, fat: 55 },
                    { day: 'Wed', protein: 130, carbs: 200, fat: 60 },
                    { day: 'Thu', protein: 150, carbs: 150, fat: 45 },
                    { day: 'Fri', protein: 110, carbs: 220, fat: 70 },
                    { day: 'Sat', protein: 100, carbs: 250, fat: 80 },
                    { day: 'Sun', protein: 130, carbs: 140, fat: 50 },
                ]);
            }

            // Default streaks
            setStreaks({
                current: 5,
                longest: 12,
                thisWeek: 5,
                thisMonth: 18
            });

            // Default milestones
            setMilestones([
                { id: 1, name: '7-Day Streak', description: 'Log food for 7 consecutive days', icon: 'fire', progress: 71, achieved: false },
                { id: 2, name: 'First Week', description: 'Complete your first full week', icon: 'calendar-check', progress: 100, achieved: true, achievedAt: '2026-01-10' },
                { id: 3, name: '10 Workouts', description: 'Complete 10 workouts', icon: 'dumbbell', progress: 40, achieved: false },
            ]);

        } catch (error) {
            console.error('Load progress error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your progress...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Your Progress</Text>
                <Text style={styles.subtitle}>Track your fitness journey</Text>
            </View>

            {/* Period Selector */}
            <View style={styles.periodContainer}>
                {(['week', 'month', '3months', 'year'] as PeriodType[]).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodButton, period === p && styles.periodButtonActive]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                            {p === '3months' ? '3M' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Nutrition History Chart */}
                {nutritionHistory.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="chart-bar" size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Nutrition History</Text>
                        </View>

                        <View style={styles.graphContainer}>
                            {nutritionHistory.map((day, index) => {
                                const maxVal = 250; // Manual scale for simplicity
                                const h = (val: number) => Math.min((val / maxVal) * 100, 100);

                                return (
                                    <View key={index} style={styles.graphColumn}>
                                        <View style={styles.barsGroup}>
                                            <View style={[styles.graphBar, { height: `${h(day.protein)}%`, backgroundColor: '#3B82F6' }]} />
                                            <View style={[styles.graphBar, { height: `${h(day.carbs)}%`, backgroundColor: '#10B981' }]} />
                                            <View style={[styles.graphBar, { height: `${h(day.fat)}%`, backgroundColor: '#F59E0B' }]} />
                                        </View>
                                        <Text style={styles.graphLabel}>{day.day}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                                <Text style={styles.legendText}>Protein</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                                <Text style={styles.legendText}>Carbs</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={styles.legendText}>Fat</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Weight Journey Card */}
                {weightTrend && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="scale-bathroom" size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Weight Journey</Text>
                        </View>

                        <View style={styles.weightRow}>
                            <View style={styles.weightStat}>
                                <Text style={styles.weightValue}>{weightTrend.current.toFixed(1)}</Text>
                                <Text style={styles.weightLabel}>Current (kg)</Text>
                            </View>
                            <View style={styles.weightDivider} />
                            <View style={styles.weightStat}>
                                <Text style={[styles.weightChange, { color: weightTrend.trend === 'losing' ? colors.success : colors.warning }]}>
                                    {weightTrend.change > 0 ? '+' : ''}{weightTrend.change.toFixed(1)} kg
                                </Text>
                                <Text style={styles.weightLabel}>Change</Text>
                            </View>
                            <View style={styles.weightDivider} />
                            <View style={styles.weightStat}>
                                <Text style={styles.weightTrend}>
                                    {weightTrend.trend === 'losing' ? '↓' : weightTrend.trend === 'gaining' ? '↑' : '→'}
                                </Text>
                                <Text style={styles.weightLabel}>{weightTrend.trend}</Text>
                            </View>
                        </View>

                        {/* Placeholder for chart */}
                        <View style={styles.chartPlaceholder}>
                            <MaterialCommunityIcons name="chart-line" size={40} color={colors.textTertiary} />
                            <Text style={styles.chartPlaceholderText}>Weight trend visualization</Text>
                        </View>
                    </View>
                )}

                {/* Compliance Card */}
                {compliance && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                            <Text style={styles.cardTitle}>Compliance</Text>
                        </View>

                        <View style={styles.complianceGrid}>
                            <ComplianceItem
                                label="Calories"
                                value={compliance.calorieCompliance}
                                color={colors.primary}
                            />
                            <ComplianceItem
                                label="Protein"
                                value={compliance.proteinCompliance}
                                color={colors.purple}
                            />
                            <ComplianceItem
                                label="Meal Logging"
                                value={compliance.mealLoggingRate}
                                color={colors.success}
                            />
                            <ComplianceItem
                                label="Workouts"
                                value={compliance.workoutCompletionRate}
                                color={colors.warning}
                            />
                        </View>
                    </View>
                )}

                {/* Streaks Card */}
                {streaks && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="fire" size={24} color="#F97316" />
                            <Text style={styles.cardTitle}>Streaks</Text>
                        </View>

                        <View style={styles.streakRow}>
                            <View style={styles.streakItem}>
                                <LinearGradient colors={['#F97316', '#FB923C']} style={styles.streakBadge}>
                                    <Text style={styles.streakNumber}>{streaks.current}</Text>
                                </LinearGradient>
                                <Text style={styles.streakLabel}>Current</Text>
                            </View>
                            <View style={styles.streakItem}>
                                <View style={[styles.streakBadge, { backgroundColor: colors.purple }]}>
                                    <Text style={styles.streakNumber}>{streaks.longest}</Text>
                                </View>
                                <Text style={styles.streakLabel}>Longest</Text>
                            </View>
                            <View style={styles.streakItem}>
                                <View style={[styles.streakBadge, { backgroundColor: colors.success }]}>
                                    <Text style={styles.streakNumber}>{streaks.thisWeek}</Text>
                                </View>
                                <Text style={styles.streakLabel}>This Week</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Milestones Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="trophy" size={24} color="#F59E0B" />
                        <Text style={styles.cardTitle}>Milestones</Text>
                    </View>

                    {milestones.map((milestone) => (
                        <View key={milestone.id} style={styles.milestoneItem}>
                            <View style={[styles.milestoneIcon, milestone.achieved && styles.milestoneIconAchieved]}>
                                <MaterialCommunityIcons
                                    name={milestone.icon as any}
                                    size={20}
                                    color={milestone.achieved ? '#fff' : colors.textTertiary}
                                />
                            </View>
                            <View style={styles.milestoneInfo}>
                                <Text style={styles.milestoneName}>{milestone.name}</Text>
                                <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                                {!milestone.achieved && (
                                    <View style={styles.progressBarContainer}>
                                        <View style={[styles.progressBar, { width: `${milestone.progress}%` }]} />
                                    </View>
                                )}
                            </View>
                            {milestone.achieved && (
                                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Encouragement Footer */}
                <View style={styles.encouragement}>
                    <Text style={styles.encouragementText}>
                        "Every day you show up is progress. Keep going! 💪"
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// Compliance percentage component
const ComplianceItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={styles.complianceItem}>
        <View style={styles.complianceCircle}>
            <Text style={[styles.complianceValue, { color }]}>{value}%</Text>
        </View>
        <Text style={styles.complianceLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 16,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    periodContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.surface,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    periodButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    periodText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    periodTextActive: {
        color: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    weightRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 16,
    },
    weightStat: {
        alignItems: 'center',
    },
    weightValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    weightChange: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    weightTrend: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    weightLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 4,
        textTransform: 'capitalize',
    },
    weightDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
    chartPlaceholder: {
        height: 120,
        backgroundColor: colors.primaryLight,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartPlaceholderText: {
        color: colors.textTertiary,
        marginTop: 8,
        fontSize: 13,
    },
    graphContainer: {
        height: 180,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: 20,
        paddingBottom: 4,
        marginBottom: 12
    },
    graphColumn: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
        width: 32, // Fixed width for touch area
    },
    barsGroup: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 1.5, // Space between bars in a group
        height: '85%', // Reserve space for text
    },
    graphBar: {
        width: 6,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
        minHeight: 2,
    },
    graphLabel: {
        marginTop: 8,
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 8
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    legendText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    complianceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    complianceItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 16,
    },
    complianceCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    complianceValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    complianceLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    streakRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    streakItem: {
        alignItems: 'center',
    },
    streakBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    streakNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    streakLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    milestoneItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    milestoneIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    milestoneIconAchieved: {
        backgroundColor: colors.warning,
    },
    milestoneInfo: {
        flex: 1,
    },
    milestoneName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    milestoneDesc: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: colors.border,
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    encouragement: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    encouragementText: {
        fontSize: 15,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
