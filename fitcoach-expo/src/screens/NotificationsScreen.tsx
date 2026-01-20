
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const theme = {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
};

const MOCK_NOTIFICATIONS = [
    { id: '1', title: 'Water Goal Met!', message: 'You drank 3L water yesterday. Keep it up!', time: '2h ago', icon: 'cup-water', color: '#3B82F6' },
    { id: '2', title: 'New Workout Plan', message: 'Your "Full Body Power" plan is ready.', time: '5h ago', icon: 'dumbbell', color: '#F59E0B' },
    { id: '3', title: 'Weekly Report', message: 'Review your progress for last week.', time: '1d ago', icon: 'chart-bar', color: '#10B981' },
];

export default function NotificationsScreen() {
    const navigation = useNavigation();

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity>
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={MOCK_NOTIFICATIONS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
    backBtn: { padding: 4 },
    list: { padding: 20 },
    card: {
        flexDirection: 'row', backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 12,
        borderWidth: 1, borderColor: theme.border, alignItems: 'center', gap: 16
    },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 15, fontWeight: 'bold', color: theme.textMain },
    time: { fontSize: 12, color: theme.textSub },
    message: { fontSize: 14, color: theme.textSub, lineHeight: 20 }
});
