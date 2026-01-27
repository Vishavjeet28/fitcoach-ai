import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YOGA_POSES, YOGA_THEME, YogaPose } from '../../services/yoga_data';

export default function YogaCategoryScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { categoryId, categoryName, title } = route.params || {};

    const [poses, setPoses] = useState<YogaPose[]>([]);

    useEffect(() => {
        const allPoses = Object.values(YOGA_POSES);
        let filtered = allPoses;

        // Filter Logic
        if (categoryId) {
            const search = categoryId.toLowerCase().replace('_', ' ');
            filtered = allPoses.filter(p =>
                p.category.toLowerCase().includes(search) ||
                (categoryId === 'stress' && p.category === 'Stress & Relaxation') ||
                (categoryId === 'knee' && p.category === 'Knee Care')
            );
        }

        // Sorting (Beginner -> Advanced)
        const difficultySort = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };
        filtered.sort((a, b) => {
            return (difficultySort[a.difficulty as keyof typeof difficultySort] || 0) - (difficultySort[b.difficulty as keyof typeof difficultySort] || 0);
        });

        setPoses(filtered);
    }, [categoryId]);

    const renderItem = ({ item }: { item: YogaPose }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('YogaSession', { poseId: item.id })}
        >
            <Image source={item.hero_image} style={styles.image} />
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.categoryTag}>{item.category}</Text>
                    <View style={styles.durationBadge}>
                        <MaterialCommunityIcons name="clock-outline" size={12} color={YOGA_THEME.colors.secondary} />
                        <Text style={styles.durationText}>{item.duration_minutes}m</Text>
                    </View>
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDiff}>{item.difficulty}</Text>

                <View style={styles.benefitsRow}>
                    {item.benefits.slice(0, 2).map((b, i) => (
                        <Text key={i} style={styles.benefitTag} numberOfLines={1}>• {b}</Text>
                    ))}
                </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={YOGA_THEME.colors.secondary} style={{ alignSelf: 'center' }} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={YOGA_THEME.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title || categoryName || 'Poses'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={poses}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="yoga" size={48} color={YOGA_THEME.colors.secondary} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyText}>No poses found for this filter.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: YOGA_THEME.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: YOGA_THEME.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: YOGA_THEME.colors.divider,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
    },
    list: {
        padding: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        padding: 12,
        // Premium Shadow
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F2F2F2',
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    content: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    categoryTag: {
        fontSize: 10,
        color: YOGA_THEME.colors.accent,
        fontWeight: '700',
        textTransform: 'uppercase',
        flex: 1,
        marginRight: 8,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    durationText: {
        fontSize: 12,
        color: YOGA_THEME.colors.secondary,
        marginLeft: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: YOGA_THEME.colors.primary,
        marginBottom: 2,
    },
    cardDiff: {
        fontSize: 12,
        color: YOGA_THEME.colors.secondary,
        marginBottom: 6,
    },
    benefitsRow: {
        flexDirection: 'column',
    },
    benefitTag: {
        fontSize: 11,
        color: '#718096',
        maxWidth: '96%',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: YOGA_THEME.colors.secondary,
        marginTop: 16,
        textAlign: 'center',
    },
});
