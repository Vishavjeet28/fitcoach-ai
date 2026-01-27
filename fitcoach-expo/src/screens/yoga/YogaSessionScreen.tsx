import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions, FlatList, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YOGA_POSES, YOGA_THEME, YogaPose, YogaStep } from '../../services/yoga_data';

const { width } = Dimensions.get('window');
const SLIDER_height = 400;

export default function YogaSessionScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { poseId } = route.params || {};

    const [pose, setPose] = useState<YogaPose | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (poseId && YOGA_POSES[poseId]) {
            setPose(YOGA_POSES[poseId]);
        }
    }, [poseId]);

    const handleComplete = () => {
        Alert.alert(
            "Namaste 🙏",
            "Great job prioritizing your wellness.",
            [{ text: "Return to Home", onPress: () => navigation.navigate('YogaMain') }]
        );
    };

    if (!pose) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    const renderSlide = ({ item, index }: { item: YogaStep, index: number }) => (
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={YOGA_THEME.colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Practice</Text>
                </View>
                <TouchableOpacity style={styles.iconButton}>
                    <MaterialCommunityIcons name="heart-outline" size={24} color={YOGA_THEME.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ILLUSTRATION SLIDER - Cinematic Look */}
                <View style={styles.sliderContainer}>
                    <FlatList
                        data={pose.steps}
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

                    {/* Dots Indicator Overlay */}
                    <View style={styles.dotsOverlay}>
                        {pose.steps.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    currentStepIndex === i ? styles.activeDot : styles.inactiveDot
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.bodyContent}>
                    {/* Header Info */}
                    <View style={styles.titleSection}>
                        <Text style={styles.poseName}>{pose.name}</Text>
                        <Text style={styles.sanskritName}>{pose.sanskrit_name}</Text>

                        <View style={styles.metaRow}>
                            <View style={styles.metaPill}>
                                <Text style={styles.metaText}>{pose.duration_minutes} min</Text>
                            </View>
                            <View style={styles.metaPill}>
                                <Text style={styles.metaText}>{pose.difficulty}</Text>
                            </View>
                            <View style={[styles.metaPill, { backgroundColor: '#F0FFF4' }]}>
                                <Text style={[styles.metaText, { color: 'green' }]}>{pose.category}</Text>
                            </View>
                        </View>
                    </View>

                    {/* GUIDANCE CARDS */}
                    <View style={styles.guidanceSection}>

                        {/* Safety Disclaimer */}
                        <View style={styles.safetyBanner}>
                            <MaterialCommunityIcons name="shield-check" size={20} color="#744210" />
                            <Text style={styles.safetyText}>
                                Stop if you feel pain. Stretch should feel gentle, never sharp.
                            </Text>
                        </View>

                        {/* Instructor Cues */}
                        <View style={[styles.card, { borderLeftColor: YOGA_THEME.colors.accent }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="account-voice" size={20} color={YOGA_THEME.colors.primary} />
                                <Text style={styles.cardTitle}>Internal Cues</Text>
                            </View>
                            {pose.instructor_cues.map((cue, i) => (
                                <View key={i} style={styles.bulletItem}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.cardText}>{cue}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Benefits */}
                        <View style={[styles.card, { borderLeftColor: YOGA_THEME.colors.success }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="star-outline" size={20} color={YOGA_THEME.colors.primary} />
                                <Text style={styles.cardTitle}>Why Practice This?</Text>
                            </View>
                            {pose.benefits.map((item, i) => (
                                <View key={i} style={styles.bulletItem}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.cardText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Common Mistakes */}
                        <View style={[styles.card, { borderLeftColor: '#FEB2B2' }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={YOGA_THEME.colors.primary} />
                                <Text style={styles.cardTitle}>Watch Out For</Text>
                            </View>
                            {pose.mistakes.map((item, i) => (
                                <View key={i} style={styles.bulletItem}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.cardText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Modifications */}
                        <View style={[styles.card, { borderLeftColor: '#FBD38D' }]}>
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="human-handsup" size={20} color={YOGA_THEME.colors.primary} />
                                <Text style={styles.cardTitle}>Modifications</Text>
                            </View>
                            {pose.modifications.map((item, i) => (
                                <View key={i} style={styles.bulletItem}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.cardText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Actions Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
                    <Text style={styles.primaryButtonText}>Finish Session</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: YOGA_THEME.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: YOGA_THEME.colors.secondary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    iconButton: {
        padding: 8,
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // SLIDER - Cinematic
    sliderContainer: {
        width: '100%',
        backgroundColor: '#000', // Black background for cinematic feel
        marginBottom: 20,
        position: 'relative',
        height: 400, // Explicit height container
    },
    slideContainer: {
        width: width,
        height: 400,
        alignItems: 'center',
    },
    imageWrapper: {
        width: width,
        height: '100%', // Fill container
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
        top: 20,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    stepBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
    },
    slideContent: {
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 32,
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // White text area
        width: '100%',
    },
    slideTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    slideInstruction: {
        fontSize: 16,
        lineHeight: 24,
        color: '#495057',
        textAlign: 'center',
    },
    dotsOverlay: {
        position: 'absolute',
        bottom: 80, // Position above text area, on image? Or below text? 
        // Let's position it inside the slideContent area or overlay.
        // Actually, let's put it on the image bottom.
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    activeDot: {
        backgroundColor: '#FFFFFF',
        width: 24,
    },
    inactiveDot: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },

    // Body
    bodyContent: {
        paddingHorizontal: 0, // Cards have their own padding
    },
    titleSection: {
        marginBottom: 24,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    poseName: {
        fontSize: 26,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 4,
        textAlign: 'center',
    },
    sanskritName: {
        fontSize: 16,
        color: YOGA_THEME.colors.secondary,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    metaPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },

    // Guidance Section
    guidanceSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFAF0',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
    },
    safetyText: {
        fontSize: 14,
        color: '#744210',
        flex: 1,
        lineHeight: 20,
    },
    card: {
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bulletDot: {
        fontSize: 18,
        color: YOGA_THEME.colors.secondary,
        marginRight: 8,
        lineHeight: 22,
    },
    cardText: {
        fontSize: 15,
        color: '#495057',
        lineHeight: 22,
        flex: 1,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
    },
    primaryButton: {
        backgroundColor: YOGA_THEME.colors.primary,
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
