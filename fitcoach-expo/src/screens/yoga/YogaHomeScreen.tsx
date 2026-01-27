import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YOGA_CATEGORIES, YOGA_POSES, YOGA_THEME, YogaPose } from '../../services/yoga_data';

const { width } = Dimensions.get('window');

// Mock Stats (Frontend Cache)
const YOGA_STATS = {
    streak_days: 3,
};

export default function YogaHomeScreen() {
    const navigation = useNavigation<any>();

    // Mock Recommendation (Rotation Logic)
    const recommendedPose = YOGA_POSES['butterfly_reclined'];

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

                {/* 2. Focus Areas (Category Cards) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Focus Areas</Text>
                    <View style={styles.categoriesGrid}>
                        {YOGA_CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={styles.catCard}
                                onPress={() => navigation.navigate('YogaCategory', { categoryId: cat.id, title: cat.title })}
                            >
                                <View style={styles.catIconContainer}>
                                    <MaterialCommunityIcons name={cat.icon as any} size={24} color={YOGA_THEME.colors.primary} />
                                </View>
                                <Text style={styles.catTitle}>{cat.title}</Text>
                                <Text style={styles.catBenefit}>{cat.benefit}</Text>
                                {/* Exercise Count Badge */}
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{cat.count} Exercises</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 3. Today's Recommendation - Updated for Slide Detail Page */}
                {recommendedPose && (
                    <View style={styles.section}>
                        <Text style={styles.label}>RECOMMENDED TODAY</Text>
                        <TouchableOpacity
                            style={styles.recCard}
                            onPress={() => navigation.navigate('YogaSession', { poseId: recommendedPose.id })}
                        >
                            <View style={styles.recImageContainer}>
                                <Image source={recommendedPose.hero_image} style={styles.recImage} />
                                {/* Changed Play Icon to "Open" icon since it's a slider now */}
                                <View style={styles.playOverlay}>
                                    <MaterialCommunityIcons name="arrow-right-circle" size={48} color="white" />
                                </View>
                            </View>
                            <View style={styles.recContent}>
                                <Text style={styles.recTitle}>{recommendedPose.name}</Text>
                                <View style={styles.recMetaRow}>
                                    <View style={styles.pill}>
                                        <MaterialCommunityIcons name="clock-outline" size={12} color={YOGA_THEME.colors.secondary} />
                                        <Text style={styles.recMetaText}>{recommendedPose.duration_minutes} min</Text>
                                    </View>
                                    <View style={styles.pill}>
                                        <Text style={styles.recMetaText}>{recommendedPose.difficulty}</Text>
                                    </View>
                                </View>
                                <View style={styles.startBtn}>
                                    <Text style={styles.startBtnText}>Start Session</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={16} color="white" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 4. Gentle Progress */}
                <View style={styles.section}>
                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <MaterialCommunityIcons name="flower-tulip" size={24} color={YOGA_THEME.colors.success} />
                            <Text style={styles.progressTitle}>Gentle Consistency</Text>
                        </View>
                        <Text style={styles.progressMainText}>You’ve practiced yoga {YOGA_STATS.streak_days} days this week.</Text>
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
        backgroundColor: 'rgba(255,255,255,0.95)',
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
        backgroundColor: '#F7FAFC',
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
});
