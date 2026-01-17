import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api, WeightLog } from '../services/api';
import { WeightChart } from '../components/ui/analytics-charts';

const DataCard = ({ value, label, subtext, icon, color = '#13ec80' }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardLabel}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.cardValue, { color }]}>{value}</Text>
    {subtext && <Text style={styles.cardSubtext}>{subtext}</Text>}
  </View>
);

export default function WeightScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [period, setPeriod] = useState<'1w'|'1m'|'3m'|'1y'>('1m');
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  const loadData = async () => {
    try {
      const [weightRes, chartRes] = await Promise.all([
          api.weight.getWeightData(),
          api.analytics.getChartData(period)
      ]);
      
      setData(weightRes);
      
      // Transform chart data
      const formattedChart = chartRes.data.map((d: any) => ({
          date: d.date,
          value: parseFloat(d.weight || 0),
          value2: parseFloat(d.trend || 0)
      }));
      setChartData(formattedChart);

    } catch (error) {
      console.error('Failed to load weight data', error);
      // Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleLogWeight = async () => {
    if (!newWeight) return;
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal) || weightVal <= 0 || weightVal > 500) {
      Alert.alert('Invalid Input', 'Please enter a valid weight.');
      return;
    }

    try {
      setLoading(true);
      await api.weight.logWeight(weightVal);
      setNewWeight('');
      setLogModalVisible(false);
      Alert.alert('Success', 'Weight logged successfully!');
      loadData(); // Reload to get updated trends
    } catch (error) {
      console.error('Failed to log weight', error);
      Alert.alert('Error', 'Failed to save weight');
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'losing': return 'trending-down';
      case 'gaining': return 'trending-up';
      case 'stable': return 'minus';
      default: return 'help-circle-outline';
    }
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'losing') return '#13ec80'; // Good? Depends on goal. Assuming loss is good for now or neutral green.
    if (trend === 'gaining') return '#ef4444';
    return '#6B7280';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#13ec80" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Tracker</Text>
        <TouchableOpacity onPress={() => setLogModalVisible(!logModalVisible)}>
             <MaterialCommunityIcons name={logModalVisible ? "close" : "plus"} size={28} color="#13ec80" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#13ec80" />}
      >
        {/* LOG INPUT AREA (Expandable) */}
        {logModalVisible && (
            <View style={styles.logContainer}>
                <Text style={styles.logTitle}>Log Weigh-in</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="kg"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={newWeight}
                        onChangeText={setNewWeight}
                    />
                    <TouchableOpacity style={styles.logConfirmButton} onPress={handleLogWeight}>
                        <Text style={styles.logConfirmText}>Save</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>Enter your weight in kg.</Text>
            </View>
        )}

        {/* PLATEAU ALERT */}
        {data?.plateau?.isPlateau && (
          <LinearGradient colors={['#b91c1c', '#7f1d1d']} style={styles.alertBox}>
            <MaterialCommunityIcons name="speedometer-slow" size={32} color="#FFF" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Plateau Detected</Text>
              <Text style={styles.alertDesc}>
                Your weight has been stable for over 14 days. The app will adjust your plan automatically.
                {data.plateau.reason === 'rebound' && ' (Possible Rebound)'}
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          <DataCard
            label="Current"
            value={`${data?.currentWeight || '--'} kg`}
            icon="scale-bathroom"
          />
          <DataCard
            label="Trend (7d)"
            value={data?.trend?.direction ? data.trend.direction.toUpperCase() : '--'}
            subtext={data?.trend?.rate ? `${data.trend.rate > 0 ? '+' : ''}${data.trend.rate} kg/week` : 'Insuff. data'}
            icon={getTrendIcon(data?.trend?.direction)}
            color={getTrendColor(data?.trend?.direction)}
          />
        </View>

        {/* EXPLANATION PANEL - STRICT ENGINEERING MODE */}
        {data?.trend?.direction && (
          <View style={styles.explanationPanel}>
            <View style={styles.explanationHeader}>
              <MaterialCommunityIcons name="information" size={24} color="#13ec80" />
              <Text style={styles.explanationTitle}>Why This Trend?</Text>
            </View>
            
            <View style={styles.explanationContent}>
              {/* Trend Reasoning */}
              <View style={styles.reasoningSection}>
                <Text style={styles.reasoningLabel}>📊 Trend Analysis</Text>
                <Text style={styles.reasoningText}>
                  {data.trend.direction === 'losing' && (
                    `Your 7-day rolling average shows weight loss of ${Math.abs(data.trend.rate || 0).toFixed(2)} kg/week. ${
                      data.trend.rate && Math.abs(data.trend.rate) > 1 
                        ? '⚠️ This is faster than recommended (0.5-1 kg/week). Consider increasing calories slightly.' 
                        : '✅ This is a healthy rate of loss.'
                    }`
                  )}
                  {data.trend.direction === 'gaining' && (
                    `Your 7-day rolling average shows weight gain of ${Math.abs(data.trend.rate || 0).toFixed(2)} kg/week. ${
                      data.dailyDecision?.decision === 'surplus' 
                        ? '✅ This aligns with your muscle gain goal.' 
                        : '⚠️ This exceeds your calorie target. Review your food logs for accuracy.'
                    }`
                  )}
                  {data.trend.direction === 'stable' && (
                    `Your weight has been stable (±0.2 kg/week). ${
                      data.plateau?.isPlateau 
                        ? '⚠️ Plateau detected - we\'ll adjust your plan automatically.' 
                        : '✅ This indicates good calorie balance.'
                    }`
                  )}
                </Text>
              </View>

              {/* Daily Decision */}
              {data.dailyDecision && (
                <View style={styles.reasoningSection}>
                  <Text style={styles.reasoningLabel}>🎯 Today's Calorie Target</Text>
                  <View style={styles.decisionBox}>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionLabel}>Decision:</Text>
                      <Text style={[styles.decisionValue, {
                        color: data.dailyDecision.decision === 'deficit' ? '#ef4444' : 
                               data.dailyDecision.decision === 'surplus' ? '#13ec80' : '#6B7280'
                      }]}>
                        {data.dailyDecision.decision.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionLabel}>Target Calories:</Text>
                      <Text style={styles.decisionValue}>
                        {data.dailyDecision.targetCalories || '--'} kcal
                      </Text>
                    </View>
                    <Text style={styles.decisionReason}>
                      {data.dailyDecision.reason || 'Calculated based on your goals and recent progress.'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Plateau Logic */}
              {data.plateau?.isPlateau && (
                <View style={styles.reasoningSection}>
                  <Text style={styles.reasoningLabel}>⏸️ Plateau Detection</Text>
                  <View style={styles.plateauBox}>
                    <Text style={styles.plateauText}>
                      <Text style={styles.plateauBold}>Detected:</Text> {data.plateau.detectedDate ? new Date(data.plateau.detectedDate).toLocaleDateString() : 'N/A'}
                    </Text>
                    <Text style={styles.plateauText}>
                      <Text style={styles.plateauBold}>Duration:</Text> {data.plateau.durationDays || 0} days
                    </Text>
                    <Text style={styles.plateauText}>
                      <Text style={styles.plateauBold}>Reason:</Text> {
                        data.plateau.reason === 'metabolic' ? 'Metabolic adaptation detected' :
                        data.plateau.reason === 'rebound' ? 'Possible rebound from aggressive cut' :
                        'Natural weight stabilization'
                      }
                    </Text>
                    {data.plateau.actionTaken && (
                      <View style={styles.actionBox}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#13ec80" />
                        <Text style={styles.actionText}>
                          Action: {data.plateau.actionTaken}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Math Behind It */}
              <View style={styles.reasoningSection}>
                <Text style={styles.reasoningLabel}>🔢 The Math</Text>
                <Text style={styles.mathText}>
                  • <Text style={styles.mathBold}>7-day rolling average</Text>: Smooths daily fluctuations (water retention, food timing)
                  {'\n'}• <Text style={styles.mathBold}>Trend rate</Text>: (Current avg - Last week avg) / 7 days
                  {'\n'}• <Text style={styles.mathBold}>Plateau threshold</Text>: &lt;0.2 kg change over 14 days
                  {'\n'}• <Text style={styles.mathBold}>Calorie adjustment</Text>: Based on 3500 kcal per 0.5kg rule
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CHART PERIOD SELECTOR */}
        <View style={styles.periodSelector}>
          {['1w', '1m', '3m', '1y'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p as '1w'|'1m'|'3m'|'1y')}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p === '1w' ? '1 Week' : p === '1m' ? '1 Month' : p === '3m' ? '3 Months' : '1 Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* WEIGHT CHART */}
        <View style={styles.chartContainer}>
          <WeightChart data={chartData} period={period} />
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>History</Text>
        </View>

        {/* HISTORY LIST */}
        <View style={styles.historyList}>
            {data?.logs?.map((log: WeightLog) => (
                <View key={log.id} style={styles.historyItem}>
                    <View>
                        <Text style={styles.historyWeight}>{log.weight_kg} kg</Text>
                        <Text style={styles.historyDate}>{new Date(log.logged_at).toLocaleDateString()}</Text>
                    </View>
                    <View>
                         {/* Could show change here if computed */}
                    </View>
                </View>
            ))}
            {(!data?.logs || data.logs.length === 0) && (
                <Text style={styles.emptyText}>No logs yet. Start tracking today!</Text>
            )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#102219',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#102219',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: '#16261f',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  alertContent: {
    marginLeft: 15,
    flex: 1,
  },
  alertTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  alertDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  logContainer: {
    backgroundColor: '#1c3329',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  logTitle: {
    color: '#FFF',
    marginBottom: 10,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#102219',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  logConfirmButton: {
    backgroundColor: '#13ec80',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  logConfirmText: {
    color: '#000',
    fontWeight: 'bold',
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    backgroundColor: '#16261f',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyWeight: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  periodButton: {
    backgroundColor: '#16261f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#13ec80',
  },
  periodButtonText: {
    color: '#FFF',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#16261f',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  // EXPLANATION PANEL STYLES - STRICT ENGINEERING MODE
  explanationPanel: {
    backgroundColor: '#1c3329',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(19, 236, 128, 0.2)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  explanationContent: {
    gap: 16,
  },
  reasoningSection: {
    marginBottom: 12,
  },
  reasoningLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#13ec80',
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  decisionBox: {
    backgroundColor: '#102219',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  decisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  decisionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  decisionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  decisionReason: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  plateauBox: {
    backgroundColor: '#102219',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  plateauText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  plateauBold: {
    fontWeight: 'bold',
    color: '#13ec80',
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 236, 128, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#13ec80',
    flex: 1,
  },
  mathText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  mathBold: {
    fontWeight: 'bold',
    color: '#13ec80',
  },
});
