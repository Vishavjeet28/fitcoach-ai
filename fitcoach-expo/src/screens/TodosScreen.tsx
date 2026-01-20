
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { todosAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const theme = {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
};

const MOCK_TODOS = [
    { id: '1', title: 'Buy groceries', completed: false },
    { id: '2', title: 'Call Nutritionist', completed: true },
    { id: '3', title: 'Meal Prep for Week', completed: false },
];

export default function TodosScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [todos, setTodos] = useState<any[]>([]);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        // Ideally fetch from backend
        if (!user || user.email === 'guest@fitcoach.ai') {
            setTodos(MOCK_TODOS);
        } else {
            try {
                const res = await todosAPI.getTodayTodos();
                setTodos(res.data || MOCK_TODOS);
            } catch (e) { setTodos(MOCK_TODOS); }
        }
    };

    const toggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        todosAPI.completeTodo(id).catch(() => { });
    };

    const addTask = () => {
        if (!newTask.trim()) return;
        const t = { id: Date.now().toString(), title: newTask, completed: false };
        setTodos([...todos, t]);
        setNewTask('');
        // API call to create not in interface but imply logic
    };

    const deleteTodo = (id: string) => {
        setTodos(prev => prev.filter(t => t.id !== id));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>To-Do List</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a new task..."
                    value={newTask}
                    onChangeText={setNewTask}
                    onSubmitEditing={addTask}
                />
                <TouchableOpacity onPress={addTask} style={styles.addBtn}>
                    <MaterialCommunityIcons name="plus" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={todos}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.checkArea}>
                            <MaterialCommunityIcons
                                name={item.completed ? "checkbox-marked" : "checkbox-blank-outline"}
                                size={24}
                                color={item.completed ? theme.primary : theme.textSub}
                            />
                            <Text style={[styles.taskText, item.completed && styles.taskCompleted]}>{item.title}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTodo(item.id)}>
                            <MaterialCommunityIcons name="close" size={20} color={theme.textSub} />
                        </TouchableOpacity>
                    </View>
                )}
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
    inputRow: { flexDirection: 'row', padding: 20, gap: 12 },
    input: { flex: 1, backgroundColor: theme.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    addBtn: { width: 56, backgroundColor: theme.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.surface, padding: 16, borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: theme.border
    },
    checkArea: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    taskText: { fontSize: 16, color: theme.textMain },
    taskCompleted: { textDecorationLine: 'line-through', color: theme.textSub }
});
