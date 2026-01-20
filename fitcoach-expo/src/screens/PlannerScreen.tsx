
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const theme = {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
    cardBg: '#F8FAFC'
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlannerScreen() {
    const navigation = useNavigation();
    const [selectedDay, setSelectedDay] = useState('Mon');

    // Hardcoded plan for demo
    const PLAN = {
        Mon: { workout: 'Push Day', meals: ['Oatmeal', 'Chicken Salad', 'Grilled Salmon'] },
        Tue: { workout: 'Pull Day', meals: ['Eggs & Toast', 'Turkey Wrap', 'Steak & Veggies'] },
        Wed: { workout: 'Rest Day', meals: ['Smoothie', 'Lentil Soup', 'Tofu Stir-fry'] },
        Thu: { workout: 'Leg Day', meals: ['Greek Yogurt', 'Quinoa Bowl', 'Fish Tacos'] },
        Fri: { workout: 'Upper Body', meals: ['Pancakes', 'Tuna Sandwich', 'Pasta'] },
        Sat: { workout: 'Active Recovery', meals: ['Omelette', 'Chicken Rice', 'Pizza (Cheat)'] },
        Sun: { workout: 'Rest Day', meals: ['Bagel', 'Salad', 'Roast Chicken'] },
    };

    const currentPlan = PLAN[selectedDay as keyof typeof PLAN];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weekly Planner</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.calendarStrip}>
                {DAYS.map(day => (
                    <TouchableOpacity
                        key={day}
                        style={[styles.dayBtn, selectedDay === day && styles.dayBtnActive]}
                        onPress={() => setSelectedDay(day)}
                    >
                        <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Workout Plan</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <MaterialCommunityIcons name={currentPlan.workout.includes('Rest') ? 'bed' : 'dumbbell'} size={24} color={theme.primary} />
                        <Text style={styles.cardTitle}>{currentPlan.workout}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Meal Plan</Text>
                <View style={styles.card}>
                    {currentPlan.meals.map((meal, i) => (
                        <View key={i} style={styles.mealRow}>
                            <Text style={styles.mealLabel}>{['Breakfast', 'Lunch', 'Dinner'][i]}</Text>
                            <Text style={styles.mealName}>{meal}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
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
    calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: theme.surface },
    dayBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    dayBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    dayText: { fontSize: 13, fontWeight: '600', color: theme.textSub },
    dayTextActive: { color: 'white' },
    content: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textMain, marginBottom: 12, marginTop: 8 },
    card: { backgroundColor: theme.surface, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: theme.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: theme.textMain },
    mealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.bg },
    mealLabel: { color: theme.textSub, fontWeight: '500' },
    mealName: { color: theme.textMain, fontWeight: '600' }
});
