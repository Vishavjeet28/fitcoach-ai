
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { workoutAPI } from '../services/api';

const theme = {
    bg: '#FAFAFA',
    primary: '#F59E0B', // Amber for Pain/Caution
    textMain: '#1e293b',
    textSub: '#64748b',
    surface: '#FFFFFF',
    blueLight: '#E0F2FE',
};

const BodyParts = [
    { id: 'back_pain_rehab', label: 'Lower Back', icon: 'human-handsdown' },
    { id: 'knee_pain_friendly', label: 'Knee Pain', icon: 'human-male' }, // approximate icon
    { id: 'shoulder_rehab', label: 'Shoulder', icon: 'arm-flex' },
    { id: 'posture_correction', label: 'Neck / Posture', icon: 'head-dots-horizontal' },
];

const PainReliefScreen = () => {
    const navigation = useNavigation();
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [template, setTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSelectPart = async (partId: string) => {
        setSelectedPart(partId);
        setLoading(true);
        try {
            const data = await workoutAPI.getTemplateById(partId);
            setTemplate(data.data || data);
        } catch (error) {
            console.error('Failed to fetch plan', error);
        } finally {
            setLoading(false);
        }
    };

    const resetSelection = () => {
        setSelectedPart(null);
        setTemplate(null);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => selectedPart ? resetSelection() : navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{selectedPart ? 'Pain Rehab Plan' : 'Pain Management'}</Text>
            </View>

            {!selectedPart ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.title}>Where does it hurt?</Text>
                    <Text style={styles.subtitle}>Select a body area to get a focused rehabilitation plan.</Text>

                    <View style={styles.grid}>
                        {BodyParts.map((part) => (
                            <TouchableOpacity key={part.id} style={styles.card} onPress={() => handleSelectPart(part.id)}>
                                <View style={styles.iconCircle}>
                                    <MaterialCommunityIcons name={part.icon as any} size={32} color={theme.primary} />
                                </View>
                                <Text style={styles.cardLabel}>{part.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text>Generating Plan...</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.content}>
                            {template && (
                                <>
                                    <View style={styles.planHeader}>
                                        <Text style={styles.planTitle}>{template.name}</Text>
                                        <Text style={styles.planDesc}>{template.description}</Text>
                                    </View>

                                    <Text style={styles.sectionTitle}>Rehabilitation Routine</Text>

                                    {template.splits?.map((day: any, index: number) => (
                                        <View key={index} style={styles.dayCard}>
                                            <Text style={styles.dayTitle}>{day.name}</Text>
                                            {day.exercises.map((ex: any, i: number) => (
                                                <View key={i} style={styles.exerciseRow}>
                                                    <View style={styles.exerciseInfo}>
                                                        <Text style={styles.exerciseName}>{ex.name}</Text>
                                                        <Text style={styles.exerciseMeta}>
                                                            {ex.sets} sets × {Array.isArray(ex.reps) ? ex.reps.join('-') : ex.ex || '12'} reps
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: theme.surface },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textMain },
    content: { padding: 24 },
    title: { fontSize: 28, fontWeight: '800', color: theme.textMain, marginBottom: 8 },
    subtitle: { fontSize: 16, color: theme.textSub, marginBottom: 32 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    card: { width: '47%', backgroundColor: theme.surface, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    cardLabel: { fontSize: 16, fontWeight: '700', color: theme.textMain },

    planHeader: { marginBottom: 24 },
    planTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textMain, marginBottom: 8 },
    planDesc: { fontSize: 16, color: theme.textSub, lineHeight: 22 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textMain, marginBottom: 16 },
    dayCard: { backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: theme.primary },
    dayTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textMain, marginBottom: 12 },
    exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    exerciseInfo: { flex: 1 },
    exerciseName: { fontSize: 15, fontWeight: '600', color: theme.textMain },
    exerciseMeta: { fontSize: 13, color: theme.textSub },
});

export default PainReliefScreen;
