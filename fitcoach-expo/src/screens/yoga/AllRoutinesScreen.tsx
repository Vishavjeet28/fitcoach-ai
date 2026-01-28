/**
 * AllRoutinesScreen.tsx
 * Lists all available curated yoga routines
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YOGA_ROUTINES, YOGA_THEME, getAllRoutines } from '../../services/yoga_data_expanded';

export default function AllRoutinesScreen() {
    const navigation = useNavigation<any>();
    const routines = getAllRoutines();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={YOGA_THEME.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Routines</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>Curated sequences for every goal</Text>

                <View style={styles.listContainer}>
                    {routines.map((routine) => (
                        <TouchableOpacity
                            key={routine.id}
                            style={[styles.card, { backgroundColor: routine.gradient[0] }]}
                            onPress={() => navigation.navigate('YogaRoutine', { routineId: routine.id })}
                        >
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons
                                    name={routine.icon as any}
                                    size={32}
                                    color={YOGA_THEME.colors.primary}
                                />
                            </View>

                            <View style={styles.cardContent}>
                                <Text style={styles.routineName}>{routine.name}</Text>
                                <Text style={styles.routineSubtitle}>{routine.subtitle}</Text>

                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <MaterialCommunityIcons name="clock-outline" size={14} color="#555" />
                                        <Text style={styles.metaText}>{routine.total_duration_minutes} min</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <MaterialCommunityIcons name="yoga" size={14} color="#555" />
                                        <Text style={styles.metaText}>{routine.pose_ids.length} poses</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.arrowContainer}>
                                <MaterialCommunityIcons name="chevron-right" size={24} color={YOGA_THEME.colors.primary} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    subtitle: {
        fontSize: 16,
        color: YOGA_THEME.colors.secondary,
        marginBottom: 24,
    },
    listContainer: {
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    routineName: {
        fontSize: 18,
        fontWeight: '700',
        color: YOGA_THEME.colors.primary,
        marginBottom: 4,
    },
    routineSubtitle: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#444',
    },
    arrowContainer: {
        marginLeft: 8,
    },
});
