import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    YOGA_FOCUS_AREAS,
    YOGA_EXERCISES,
    YOGA_THEME,
    YogaPose,
    getTodayRoutine,
    getAllRoutines,
    YogaRoutine,
    getExercisesByCategory,
} from '../../services/yoga_data_expanded';

const { width } = Dimensions.get('window');

// Mock Stats (Frontend Cache)
const YOGA_STATS = {
    streak_days: 3,
};

export default function YogaHomeScreen() {
    const navigation = useNavigation<any>();

    // Get today's recommended routine based on time of day
    const todayRoutine = getTodayRoutine();
    const allRoutines = getAllRoutines();

    // Get poses for today's routine preview
    const routinePoses = todayRoutine.pose_ids
        .slice(0, 3) // Show first 3
        .map(id => YOGA_EXERCISES[id])
        .filter(Boolean);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroTextContainer}>
                        <View style={styles.badge}>
                            <MaterialCommunityIcons name="leaf" size={12} color={YOGA_THEME.colors.success} />
                            <Text style={styles.badgeText}>Beginner-safe • Calm instructor</Text>
                        </View>
                        <Text style={styles.heroTitle}>Gentle Movement for a Healthier Body</Text>
                        <Text style={styles.heroSubtitle}>Stretch • Heal • Relax</Text>
                    </View>
                    <Image
                        source={require('../../../assets/yoga_hero.png')}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.8)', '#FFFFFF']}
                        style={styles.heroGradient}
                    />
                </View>

                {/* ═══════════════ TODAY'S ROUTINE SECTION ═══════════════ */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>TODAY'S RECOMMENDATION</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AllRoutines')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.routineCard, { backgroundColor: todayRoutine.gradient[0] }]}
                        onPress={() => navigation.navigate('YogaRoutine', { routineId: todayRoutine.id })}
                    >
                        {/* Routine Header */}
                        <View style={styles.routineHeader}>
                            <View style={styles.routineIconCircle}>
                                <MaterialCommunityIcons
                                    name={todayRoutine.icon as any}
                                    size={28}
                                    color={YOGA_THEME.colors.primary}
                                />
                            </View>
                            <View style={styles.routineHeaderText}>
                                <Text style={styles.routineName}>{todayRoutine.name}</Text>
                                <Text style={styles.routineSubtitle}>{todayRoutine.subtitle}</Text>
                            </View>
                        </View>

                        {/* Meta Info */}
                        <View style={styles.routineMeta}>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="clock-outline" size={16} color="#555" />
                                <Text style={styles.metaItemText}>{todayRoutine.total_duration_minutes} min</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="yoga" size={16} color="#555" />
                                <Text style={styles.metaItemText}>{todayRoutine.pose_ids.length} exercises</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Text style={styles.metaItemText}>{todayRoutine.difficulty}</Text>
                            </View>
                        </View>

                        {/* Benefits Preview */}
                        <View style={styles.benefitsPreview}>
                            <Text style={styles.benefitsLabel}>Why practice this today:</Text>
                            {todayRoutine.benefits.slice(0, 2).map((benefit, i) => (
                                <View key={i} style={styles.benefitRow}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color="#48BB78" />
                                    <Text style={styles.benefitPreviewText}>{benefit}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Exercise Thumbnails */}
                        <View style={styles.exerciseThumbnails}>
                            {routinePoses.map((pose, i) => (
                                <Image
                                    key={pose.id}
                                    source={pose.hero_image}
                                    style={[
                                        styles.exerciseThumb,
                                        { marginLeft: i > 0 ? -12 : 0, zIndex: routinePoses.length - i }
                                    ]}
                                />
                            ))}
                            {todayRoutine.pose_ids.length > 3 && (
                                <View style={styles.moreExercises}>
                                    <Text style={styles.moreExercisesText}>+{todayRoutine.pose_ids.length - 3}</Text>
                                </View>
                            )}
                        </View>

                        {/* Start Button */}
                        <View style={styles.startRoutineBtn}>
                            <Text style={styles.startRoutineBtnText}>Start Routine</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 2. Focus Areas (Category Cards) - REDESIGNED */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Choose Your Focus</Text>
                    <Text style={styles.sectionSubtitle}>
                        Select a focus area to see 20+ targeted exercises
                    </Text>
                    <View style={styles.focusAreasContainer}>
                        {YOGA_FOCUS_AREAS.map((area) => (
                            <TouchableOpacity
                                key={area.id}
                                style={[styles.focusCard, { backgroundColor: area.gradient[0] }]}
                                onPress={() => navigation.navigate('YogaCategory', { categoryId: area.id, title: area.title })}
                            >
                                <View style={[styles.focusIconCircle, { backgroundColor: area.color }]}>
                                    <MaterialCommunityIcons name={area.icon as any} size={28} color="#fff" />
                                </View>
                                <View style={styles.focusContent}>
                                    <Text style={styles.focusTitle}>{area.title}</Text>
                                    <Text style={styles.focusSubtitle}>{area.subtitle}</Text>
                                    <View style={styles.focusCountBadge}>
                                        <Text style={styles.focusCountText}>{area.exerciseCount} exercises</Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 3. All Routines */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Routines</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.routinesScroll}
                    >
                        {allRoutines.map((routine) => (
                            <TouchableOpacity
                                key={routine.id}
                                style={[styles.miniRoutineCard, { backgroundColor: routine.gradient[0] }]}
                                onPress={() => navigation.navigate('YogaRoutine', { routineId: routine.id })}
                            >
                                <MaterialCommunityIcons
                                    name={routine.icon as any}
                                    size={24}
                                    color={YOGA_THEME.colors.primary}
                                />
                                <Text style={styles.miniRoutineName}>{routine.name}</Text>
                                <Text style={styles.miniRoutineDuration}>{routine.total_duration_minutes} min</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* 4. Gentle Progress */}
                <View style={styles.section}>
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <MaterialCommunityIcons name="flower-tulip" size={24} color={YOGA_THEME.colors.success} />
                            <Text style={styles.progressTitle}>Gentle Consistency</Text>
                        </View>
                        <Text style={styles.progressMainText}>You've practiced yoga {YOGA_STATS.streak_days} days this week.</Text>
                        <Text style={styles.progressSubText}>Consistency matters more than intensity 🌱</Text>

                        <View style={styles.weekRow}>
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                                <View key={index} style={[styles.dayDot, index < 3 && styles.dayDotActive]}>
                                    <Text style={[styles.dayText, index < 3 && { color: 'white' }]}>{day}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80,
    },

    // Hero
    heroSection: {
        position: 'relative',
        marginBottom: 32,
    },
    heroImage: {
        width: '100%',
        height: 320,
        resizeMode: 'cover',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    heroTextContainer: {
        position: 'absolute',
        top: 64,
        left: 24,
        right: 24,
        zIndex: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // Solid color for shadow efficiency
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2F855A',
        marginLeft: 6,
        textTransform: 'uppercase',
    },
    heroTitle: {
        fontSize: 34,
        fontWeight: '300',
        color: '#2D3748',
        lineHeight: 42,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#4A5568',
        marginTop: 12,
        fontWeight: '500',
        letterSpacing: 1,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
    },

    // Categories
    section: {
        paddingHorizontal: 24,
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 20,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },
    catCard: {
        width: (width - 64) / 2, // 2 column with padding
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    catIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'F7FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    catTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        textAlign: 'center',
        marginBottom: 4,
    },
    catBenefit: {
        fontSize: 12,
        color: YOGA_THEME.colors.secondary,
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 12,
    },
    countBadge: {
        backgroundColor: '#F0FFF4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        fontSize: 10,
        fontWeight: '700',
        color: YOGA_THEME.colors.success,
    },

    // Recommended
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#A0AEC0',
        marginBottom: 16,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    recCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    recImageContainer: {
        height: 200,
        position: 'relative',
    },
    recImage: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recContent: {
        padding: 24,
    },
    recTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 12,
    },
    recMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recMetaText: {
        fontSize: 13,
        color: YOGA_THEME.colors.secondary,
        marginLeft: 4,
    },
    startBtn: {
        backgroundColor: YOGA_THEME.colors.primary,
        paddingVertical: 16,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    startBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },

    // Progress
    progressCard: {
        backgroundColor: '#EAF4FF', // Light pastel blue
        borderRadius: 24,
        padding: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        marginLeft: 8,
    },
    progressMainText: {
        fontSize: 18,
        color: YOGA_THEME.colors.primary,
        marginBottom: 6,
        lineHeight: 26,
    },
    progressSubText: {
        fontSize: 14,
        color: '#4A5568',
        fontStyle: 'italic',
        marginBottom: 24,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayDotActive: {
        backgroundColor: '#1E88E5',
    },
    dayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#718096',
    },

    // ═══════════════ TODAY'S ROUTINE SECTION STYLES ═══════════════
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: YOGA_THEME.colors.accent,
    },
    routineCard: {
        backgroundColor: '#FFFFFF', // Fallback color
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    routineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    routineIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    routineHeaderText: {
        flex: 1,
    },
    routineName: {
        fontSize: 20,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
    },
    routineSubtitle: {
        fontSize: 14,
        color: '#555',
        marginTop: 2,
    },
    routineMeta: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    metaItemText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    benefitsPreview: {
        marginBottom: 16,
    },
    benefitsLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 8,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    benefitPreviewText: {
        fontSize: 14,
        color: '#444',
    },
    exerciseThumbnails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    exerciseThumb: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fff',
    },
    moreExercises: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -12,
    },
    moreExercisesText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
    },
    startRoutineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#48BB78',
        paddingVertical: 14,
        borderRadius: 30,
    },
    startRoutineBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // Quick Routines Scroll
    routinesScroll: {
        paddingRight: 24,
    },
    miniRoutineCard: {
        width: 140,
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        alignItems: 'center',
    },
    miniRoutineName: {
        fontSize: 13,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        textAlign: 'center',
        marginTop: 8,
    },
    miniRoutineDuration: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },

    // ═══════════════ REDESIGNED FOCUS AREAS STYLES ═══════════════
    sectionSubtitle: {
        fontSize: 14,
        color: YOGA_THEME.colors.secondary,
        marginBottom: 20,
        marginTop: -12,
    },
    focusAreasContainer: {
        gap: 12,
    },
    focusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
    },
    focusIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    focusContent: {
        flex: 1,
    },
    focusTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        marginBottom: 4,
    },
    focusSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    focusCountBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    focusCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
    },
});
