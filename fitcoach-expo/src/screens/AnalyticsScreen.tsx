
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
// @ts-ignore
import { LineChart, BarChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { analyticsAPI } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

const colors = {
    primary: '#13ec80',
    primaryDark: '#0fb863',
    backgroundDark: '#102219',
    surfaceDark: '#16261f',
    textPrimary: '#ffffff',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    blue: '#60A5FA',
    blueDark: '#3B82F6',
    error: '#EF4444'
};

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
    backgroundGradientFrom: colors.surfaceDark,
    backgroundGradientTo: colors.surfaceDark,
    color: (opacity = 1) => `rgba(19, 236, 128, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: colors.primary
    }
};

export default function AnalyticsScreen({ navigation }: any) {
    const [period, setPeriod] = useState<'1w' | '1m' | '3m'>('1w');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await analyticsAPI.getChartData(period);
            setData(result);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const Periods = [
        { label: '1 Week', value: '1w' },
        { label: '1 Month', value: '1m' },
        { label: '3 Months', value: '3m' },
    ];

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Progress & Analytics</Text>
            <TouchableOpacity onPress={fetchData}>
                <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderPeriodSelector = () => (
        <View style={styles.periodParams}>
            {Periods.map((p) => (
                <TouchableOpacity
                    key={p.value}
                    style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
                    onPress={() => setPeriod(p.value as any)}
                >
                    <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>{p.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderWeightChart = () => {
        if (!data || !data.data || data.data.length === 0) return null;

        // Filter points to avoid clutter
        const points = data.data.filter((d: any) => d.weight !== null && d.weight > 0);
        if (points.length < 2) return (
            <View style={styles.chartCard}><Text style={styles.noDataText}>Not enough weight data logged.</Text></View>
        );

        const labels = points.map((d: any) => {
            const date = new Date(d.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        });

        // Reduce label density
        const visibleLabels = labels.filter((_: any, i: number) => i === 0 || i === labels.length - 1 || i % Math.ceil(labels.length / 5) === 0);

        const chartData = {
            labels: visibleLabels,
            datasets: [{
                data: points.map((d: any) => parseFloat(d.weight)),
                color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`, // Blue
                strokeWidth: 2
            }]
        };

        return (
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <MaterialCommunityIcons name="scale-bathroom" size={20} color={colors.blue} />
                    <Text style={styles.chartTitle}>Weight History</Text>
                </View>
                <LineChart
                    data={chartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>
        );
    };

    const renderCalorieChart = () => {
        if (!data || !data.data || data.data.length === 0) return null;

        const limitedData = data.data.slice(-7); // Last 7 points for bar chart clarify

        const chartData = {
            labels: limitedData.map((d: any) => {
                const date = new Date(d.date);
                return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            }),
            datasets: [{
                data: limitedData.map((d: any) => d.calories || 0)
            }]
        };

        return (
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <MaterialCommunityIcons name="fire" size={20} color={colors.primary} />
                    <Text style={styles.chartTitle}>Calories Intake (Last 7 Days)</Text>
                </View>
                <BarChart
                    data={chartData}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                />
            </View>
        );
    };

    const renderComparisons = () => {
        // Logic for Cards (Avg calories vs Target)
        if (!data || !data.data) return null;

        // Calculate averages
        const totalCals = data.data.reduce((sum: number, d: any) => sum + (parseInt(d.calories) || 0), 0);
        const avgCals = Math.round(totalCals / (data.data.length || 1));

        const totalWorkouts = data.data.filter((d: any) => d.workout_completed).length;

        return (
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Avg Calories</Text>
                    <Text style={styles.statValue}>{avgCals}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Workouts</Text>
                    <Text style={styles.statValue}>{totalWorkouts}</Text>
                    <Text style={styles.statSub}>In Period</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderPeriodSelector()}

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {renderComparisons()}
                        {renderWeightChart()}
                        {renderCalorieChart()}
                        <View style={{ height: 40 }} />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundDark },
    header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceDark },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
    scrollContent: { padding: 20 },

    periodParams: { flexDirection: 'row', backgroundColor: colors.surfaceDark, borderRadius: 12, padding: 4, marginBottom: 24 },
    periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    periodBtnActive: { backgroundColor: colors.primary },
    periodText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
    periodTextActive: { color: colors.backgroundDark },

    chartCard: { backgroundColor: colors.surfaceDark, borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
    chartHeader: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', marginBottom: 16, gap: 8 },
    chartTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
    chart: { marginVertical: 8, borderRadius: 16 },

    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.surfaceDark, padding: 16, borderRadius: 16, alignItems: 'center' },
    statLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 8 },
    statValue: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
    statSub: { color: colors.textTertiary, fontSize: 12, marginTop: 4 },

    noDataText: { color: colors.textSecondary, fontStyle: 'italic' }
});
