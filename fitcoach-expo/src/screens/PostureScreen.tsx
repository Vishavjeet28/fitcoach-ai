
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { workoutAPI } from '../services/api';

const theme = {
    bg: '#FAFAFA',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    surface: '#FFFFFF',
};

const PostureScreen = () => {
    const navigation = useNavigation();
    const [template, setTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPostureRoutine();
    }, []);

    const fetchPostureRoutine = async () => {
        try {
            const data = await workoutAPI.getTemplateById('posture_correction');
            // API returns the template object directly or inside data
            setTemplate(data.data || data); // Handle potential wrapper
        } catch (error) {
            console.error('Failed to fetch posture routine', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 12, color: theme.textSub }}>Loading Posture Routine...</Text>
            </View>
        );
    }

    if (!template) {
        return (
            <View style={styles.container}>
                <Text>Failed to load routine.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Posture Correction</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroCard}>
                    <MaterialCommunityIcons name="human-handsup" size={48} color={theme.primary} />
                    <Text style={styles.heroTitle}>{template.name}</Text>
                    <Text style={styles.heroDesc}>{template.description}</Text>

                    <View style={styles.benefitsRow}>
                        {template.benefits?.map((b: string, i: number) => (
                            <View key={i} style={styles.badge}>
                                <Text style={styles.badgeText}>{b}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Routine Details</Text>

                {template.splits?.map((day: any, index: number) => (
                    <View key={index} style={styles.dayCard}>
                        <Text style={styles.dayTitle}>Day {day.day}: {day.name}</Text>
                        {day.exercises.map((ex: any, i: number) => (
                            <View key={i} style={styles.exerciseRow}>
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{ex.name}</Text>
                                    <Text style={styles.exerciseMeta}>
                                        {ex.sets} sets × {Array.isArray(ex.reps) ? ex.reps.join('-') : ex.reps} reps
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="play-circle-outline" size={24} color={theme.primary} />
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: theme.surface },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textMain },
    content: { padding: 20 },
    heroCard: { backgroundColor: theme.surface, padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    heroTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textMain, marginTop: 12, marginBottom: 8, textAlign: 'center' },
    heroDesc: { fontSize: 14, color: theme.textSub, textAlign: 'center', marginBottom: 16 },
    benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    badge: { backgroundColor: theme.primary + '15', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 100 },
    badgeText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textMain, marginBottom: 16 },
    dayCard: { backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 16 },
    dayTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textMain, marginBottom: 12 },
    exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    exerciseInfo: { flex: 1 },
    exerciseName: { fontSize: 15, fontWeight: '600', color: theme.textMain },
    exerciseMeta: { fontSize: 13, color: theme.textSub, marginTop: 2 }
});

export default PostureScreen;
