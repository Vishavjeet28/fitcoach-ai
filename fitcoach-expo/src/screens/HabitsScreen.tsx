
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { habitsAPI } from '../services/api'; // Ensure this endpoint exists or mock it
import { useAuth } from '../context/AuthContext';

const theme = {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
    red: '#EF4444',
    green: '#10B981',
};

// Mock data for initial render
const MOCK_HABITS = [
    { id: '1', name: 'Drink 3L Water', completed: false, icon: 'water', streak: 5 },
    { id: '2', name: 'Read 20 mins', completed: true, icon: 'book', streak: 12 },
    { id: '3', name: 'Meditation', completed: false, icon: 'meditation', streak: 0 },
];

export default function HabitsScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();

    const [habits, setHabits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitIcon, setNewHabitIcon] = useState('check-circle-outline');

    const icons = ['water', 'run', 'book', 'meditation', 'sleep', 'food-apple', 'weight-lifter', 'yoga', 'check-circle-outline', 'clock-outline'];

    useEffect(() => {
        fetchHabits();
    }, []);

    const fetchHabits = async () => {
        try {
            if (!user || user.email === 'guest@fitcoach.ai') {
                setHabits(MOCK_HABITS);
                setLoading(false);
                return;
            }
            const data = await habitsAPI.getUserHabits();
            setHabits(data && data.length > 0 ? data : MOCK_HABITS); // Fallback if empty to show something
        } catch (e) {
            console.log(e);
            setHabits(MOCK_HABITS);
        } finally {
            setLoading(false);
        }
    };

    const toggleHabit = async (id: string) => {
        // Optimistic Update
        setHabits(prev => prev.map(h =>
            h.id === id ? { ...h, completed: !h.completed, streak: !h.completed ? h.streak + 1 : h.streak } : h
        ));

        try {
            if (user && user.email !== 'guest@fitcoach.ai') {
                await habitsAPI.toggleHabit(id);
            }
        } catch (e) {
            console.error(e);
            // Revert if failed (omitted for brevity)
        }
    };

    const addHabit = async () => {
        if (!newHabitName.trim()) return;

        const newHabit = {
            id: Date.now().toString(),
            name: newHabitName,
            completed: false,
            icon: newHabitIcon,
            streak: 0
        };

        setHabits([...habits, newHabit]);
        setModalVisible(false);
        setNewHabitName('');

        try {
            if (user && user.email !== 'guest@fitcoach.ai') {
                await habitsAPI.createHabit({ habit_name: newHabitName, icon: newHabitIcon });
                fetchHabits(); // Refresh to get real ID
            }
        } catch (e) { console.error(e); }
    };

    const deleteHabit = (id: string) => {
        Alert.alert('Delete Habit', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    setHabits(prev => prev.filter(h => h.id !== id));
                    if (user && user.email !== 'guest@fitcoach.ai') {
                        try {
                            await habitsAPI.deleteHabit(id);
                        } catch (e) { console.error(e); }
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.habitCard, item.completed && styles.habitCardCompleted]}
            onPress={() => toggleHabit(item.id)}
            onLongPress={() => deleteHabit(item.id)}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.iconBox, item.completed && { backgroundColor: theme.primary }]}>
                    <MaterialCommunityIcons
                        name={item.icon}
                        size={24}
                        color={item.completed ? 'white' : theme.primary}
                    />
                </View>
                <View>
                    <Text style={[styles.habitName, item.completed && { textDecorationLine: 'line-through', color: theme.textSub }]}>{item.name}</Text>
                    <Text style={styles.streakText}>🔥 {item.streak} day streak</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <MaterialCommunityIcons
                    name={item.completed ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                    size={28}
                    color={item.completed ? theme.primary : theme.border}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Habits</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <MaterialCommunityIcons name="plus" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={habits}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No habits yet. Add one to start tracking!</Text>
                    }
                />
            )}

            {/* Add Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Habit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E.g. Morning Stretch"
                            value={newHabitName}
                            onChangeText={setNewHabitName}
                            autoFocus
                        />

                        <Text style={styles.label}>Choose Icon</Text>
                        <View style={styles.iconGrid}>
                            {icons.map(icon => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[styles.iconSelect, newHabitIcon === icon && styles.iconSelectActive]}
                                    onPress={() => setNewHabitIcon(icon)}
                                >
                                    <MaterialCommunityIcons name={icon as any} size={24} color={newHabitIcon === icon ? 'white' : theme.textSub} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}>
                                <Text style={styles.btnTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addHabit} style={styles.btnSave}>
                                <Text style={styles.btnTextSave}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    addBtn: { padding: 4 },
    list: { padding: 20 },
    habitCard: {
        backgroundColor: theme.surface, padding: 16, borderRadius: 16, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2
    },
    habitCardCompleted: { opacity: 0.8 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary + '15',
        alignItems: 'center', justifyContent: 'center'
    },
    habitName: { fontSize: 16, fontWeight: '600', color: theme.textMain },
    streakText: { fontSize: 12, color: theme.textSub, marginTop: 4 },
    cardRight: {},
    emptyText: { textAlign: 'center', marginTop: 40, color: theme.textSub },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.textMain },
    input: { backgroundColor: theme.bg, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    label: { fontWeight: '600', color: theme.textSub, marginBottom: 12 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    iconSelect: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
    iconSelectActive: { backgroundColor: theme.primary },
    modalButtons: { flexDirection: 'row', gap: 16 },
    btnCancel: { flex: 1, padding: 16, backgroundColor: theme.bg, borderRadius: 12, alignItems: 'center' },
    btnSave: { flex: 1, padding: 16, backgroundColor: theme.primary, borderRadius: 12, alignItems: 'center' },
    btnTextCancel: { fontWeight: '600', color: theme.textSub },
    btnTextSave: { fontWeight: 'bold', color: 'white' },
});
