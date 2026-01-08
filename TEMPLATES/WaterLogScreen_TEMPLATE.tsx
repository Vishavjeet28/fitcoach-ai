// WaterLogScreen.tsx - Complete Implementation Template
// Location: /fitcoach-expo/src/screens/WaterLogScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { waterAPI, handleAPIError, WaterLog, CreateWaterLog } from '../services/api';

const QUICK_ADD_AMOUNTS = [
  { ml: 250, label: 'Glass', icon: 'cup' },
  { ml: 500, label: 'Bottle', icon: 'bottle-soda' },
  { ml: 750, label: 'Large', icon: 'bottle-tonic-plus' },
  { ml: 1000, label: '1 Liter', icon: 'water' },
];

const WaterLogScreen = () => {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [todayTotals, setTodayTotals] = useState<any>(null);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const data = await waterAPI.getLogs();
      setLogs(data || []);
      
      // Fetch totals
      const totals = await waterAPI.getTotals();
      setTodayTotals(totals);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        Alert.alert('Error Loading Logs', handleAPIError(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // Quick add water
  const handleQuickAdd = async (ml: number) => {
    try {
      await waterAPI.createLog({ amountMl: ml });
      await fetchLogs();
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };

  // Add custom amount
  const handleCustomAdd = async () => {
    try {
      const ml = parseInt(customAmount);
      if (isNaN(ml) || ml <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid amount in ml');
        return;
      }

      await waterAPI.createLog({ amountMl: ml });
      setShowCustomModal(false);
      setCustomAmount('');
      await fetchLogs();
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };

  // Delete water log
  const handleDelete = async (logId: number) => {
    Alert.alert(
      'Delete Water Log',
      'Are you sure you want to delete this log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await waterAPI.deleteLog(logId);
              setLogs(logs.filter(log => log.id !== logId));
              await fetchLogs(); // Refresh totals
              Alert.alert('Deleted', 'Water log deleted successfully');
            } catch (error) {
              Alert.alert('Error', handleAPIError(error));
            }
          },
        },
      ]
    );
  };

  // Calculate progress
  const totalMl = todayTotals?.totals?.totalMl || 0;
  const goalMl = todayTotals?.goal?.targetMl || 2000;
  const progress = Math.min((totalMl / goalMl) * 100, 100);
  const progressColor = progress >= 100 ? '#10B981' : progress >= 75 ? '#3B82F6' : progress >= 50 ? '#F59E0B' : '#6B7280';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading water logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Water Intake</Text>
        
        {/* Progress circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <MaterialCommunityIcons name="water" size={48} color={progressColor} />
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressText}>
            <Text style={styles.progressValue}>
              {(totalMl / 1000).toFixed(1)}L / {(goalMl / 1000).toFixed(1)}L
            </Text>
            <Text style={styles.progressLabel}>Daily Goal</Text>
            {todayTotals?.remaining && (
              <Text style={styles.progressRemaining}>
                {(todayTotals.remaining.remainingMl / 1000).toFixed(1)}L remaining
              </Text>
            )}
          </View>
        </View>

        {/* Quick add buttons */}
        <View style={styles.quickAddContainer}>
          {QUICK_ADD_AMOUNTS.map((amount, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickAddButton}
              onPress={() => handleQuickAdd(amount.ml)}
            >
              <MaterialCommunityIcons name={amount.icon as any} size={24} color="#3B82F6" />
              <Text style={styles.quickAddLabel}>{amount.label}</Text>
              <Text style={styles.quickAddAmount}>{amount.ml}ml</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Water logs */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.logsHeader}>
          <Text style={styles.logsHeaderText}>Today's Logs</Text>
          <TouchableOpacity onPress={() => setShowCustomModal(true)}>
            <Text style={styles.customButton}>+ Custom Amount</Text>
          </TouchableOpacity>
        </View>

        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="water-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>No water logged today</Text>
            <Text style={styles.emptySubtext}>Tap a quick add button to start tracking</Text>
          </View>
        ) : (
          logs.map(log => {
            const logDate = new Date(log.logged_at);
            const timeStr = logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            
            return (
              <TouchableOpacity
                key={log.id}
                style={styles.logCard}
                onLongPress={() => handleDelete(log.id)}
              >
                <View style={styles.logIcon}>
                  <MaterialCommunityIcons name="water" size={24} color="#3B82F6" />
                </View>
                <View style={styles.logInfo}>
                  <Text style={styles.logAmount}>{log.amount_ml}ml</Text>
                  <Text style={styles.logTime}>{timeStr}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(log.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        {/* Daily summary */}
        {logs.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Daily Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Intake:</Text>
              <Text style={styles.summaryValue}>{(totalMl / 1000).toFixed(1)}L</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Number of Logs:</Text>
              <Text style={styles.summaryValue}>{logs.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average per Log:</Text>
              <Text style={styles.summaryValue}>
                {Math.round(totalMl / logs.length)}ml
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Amount</Text>
              <TouchableOpacity onPress={() => { setShowCustomModal(false); setCustomAmount(''); }}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Amount (ml)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount in ml"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
                autoFocus
              />

              <View style={styles.conversionHints}>
                <Text style={styles.hintText}>💡 Quick conversions:</Text>
                <Text style={styles.hintText}>1 cup = 240ml</Text>
                <Text style={styles.hintText}>1 pint = 473ml</Text>
                <Text style={styles.hintText}>1 liter = 1000ml</Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleCustomAdd}>
                <Text style={styles.addButtonText}>Add Water</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#102219' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#102219' },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  header: { padding: 20, backgroundColor: '#16261f', borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#102219', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  progressPercent: { fontSize: 14, fontWeight: 'bold', color: '#9CA3AF', marginTop: 4 },
  progressText: { flex: 1 },
  progressValue: { fontSize: 28, fontWeight: 'bold', color: '#3B82F6', marginBottom: 4 },
  progressLabel: { fontSize: 14, color: '#9CA3AF', marginBottom: 4 },
  progressRemaining: { fontSize: 12, color: '#F59E0B' },
  quickAddContainer: { flexDirection: 'row', gap: 10 },
  quickAddButton: { flex: 1, backgroundColor: '#102219', padding: 12, borderRadius: 8, alignItems: 'center' },
  quickAddLabel: { fontSize: 12, color: '#fff', marginTop: 4, fontWeight: '600' },
  quickAddAmount: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  scrollView: { flex: 1 },
  logsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  logsHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  customButton: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#9CA3AF', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  logCard: { flexDirection: 'row', padding: 16, backgroundColor: '#16261f', marginHorizontal: 16, marginVertical: 6, borderRadius: 12, alignItems: 'center' },
  logIcon: { marginRight: 12 },
  logInfo: { flex: 1 },
  logAmount: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  logTime: { fontSize: 14, color: '#9CA3AF' },
  summaryCard: { margin: 16, padding: 16, backgroundColor: '#16261f', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#9CA3AF' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16261f', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  input: { backgroundColor: '#102219', color: '#fff', padding: 16, borderRadius: 8, fontSize: 18, borderWidth: 1, borderColor: '#1f3329', marginBottom: 16 },
  conversionHints: { backgroundColor: '#102219', padding: 12, borderRadius: 8, marginBottom: 20 },
  hintText: { fontSize: 12, color: '#9CA3AF', marginVertical: 2 },
  addButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 8, alignItems: 'center' },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});

export default WaterLogScreen;
