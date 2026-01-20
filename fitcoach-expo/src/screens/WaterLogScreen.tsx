import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { waterAPI, handleAPIError } from '../services/api';

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  backgroundDark: '#FAFAFA', // Light BG
  surfaceDark: '#FFFFFF',    // White Surface
  textPrimary: '#1e293b',    // Slate 800
  textSecondary: '#64748b',  // Slate 500
  textTertiary: '#94a3b8',   // Slate 400
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  border: '#e2e8f0',
};

const WaterLogScreen = () => {
  const navigation = useNavigation();
  const [waterConsumed, setWaterConsumed] = useState(0); // in liters (will be fetched)
  const [dailyGoal, setDailyGoal] = useState(3.0); // liters
  const [scaleAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const quickAmounts = [
    { amount: 250, label: '250ml', icon: 'cup', color: colors.info },
    { amount: 500, label: '500ml', icon: 'glass-mug-variant', color: colors.success },
    { amount: 750, label: '750ml', icon: 'bottle-tonic', color: colors.warning },
    { amount: 1000, label: '1L', icon: 'bottle-soda', color: colors.primary },
  ];

  // Fetch existing water data on mount
  const fetchWaterData = async () => {
    try {
      setLoading(true);
      const totals = await waterAPI.getTotals();
      if (totals) {
        setWaterConsumed((totals.totals?.amountMl || 0) / 1000); // Convert ml to L
        setDailyGoal((totals.goal?.amountMl || 3000) / 1000);
      }
    } catch (error) {
      console.error('Error fetching water data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWaterData();
    }, [])
  );

  const handleAddWater = async (amountMl: number) => {
    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Save to backend
    try {
      setSaving(true);
      await waterAPI.createLog(amountMl);
      // Update local state
      setWaterConsumed(prev => prev + (amountMl / 1000));
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    } finally {
      setSaving(false);
    }
  };

  // Custom amount state
  const [customAmount, setCustomAmount] = useState(100);

  const handleRemoveWater = () => {
    setCustomAmount(prev => Math.max(prev - 50, 50));
  };

  const handleAddCustom = () => {
    setCustomAmount(prev => Math.min(prev + 50, 1000));
  };

  const percentage = Math.min((waterConsumed / dailyGoal) * 100, 100);
  const isGoalReached = waterConsumed >= dailyGoal;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading water data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Water Intake</Text>
          <Text style={styles.headerSubtitle}>Stay hydrated</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setWaterConsumed(0)}
        >
          <MaterialCommunityIcons name="refresh" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Water Progress Circle */}
        <View style={styles.heroSection}>
          <View style={styles.progressCard}>
            <View style={styles.progressCircle}>
              <View style={[styles.waterFill, { height: `${percentage}%` }]}>
                <LinearGradient
                  colors={[colors.info, colors.primary]}
                  style={styles.waterGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </View>

              <View style={styles.progressContent}>
                <MaterialCommunityIcons
                  name="water"
                  size={48}
                  color={isGoalReached ? colors.primary : colors.info}
                />
                <Text style={styles.progressValue}>{waterConsumed.toFixed(1)}L</Text>
                <Text style={styles.progressLabel}>of {dailyGoal}L goal</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressPercent}>{Math.round(percentage)}%</Text>
                </View>
              </View>
            </View>

            {isGoalReached && (
              <View style={styles.goalBanner}>
                <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                <Text style={styles.goalText}>Daily Goal Achieved! 🎉</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ADD</Text>
          <View style={styles.quickGrid}>
            {quickAmounts.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickCard}
                activeOpacity={0.7}
                onPress={() => handleAddWater(item.amount)}
              >
                <LinearGradient
                  colors={[item.color + '20', item.color + '10']}
                  style={styles.quickGradient}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={32} color={item.color} />
                  <Text style={styles.quickLabel}>{item.label}</Text>
                  <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: item.color }]}
                    onPress={() => handleAddWater(item.amount)}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="white" />
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S LOG</Text>
          <View style={styles.logCard}>
            <View style={styles.logRow}>
              <View style={styles.logItem}>
                <MaterialCommunityIcons name="water-plus" size={24} color={colors.success} />
                <View style={styles.logContent}>
                  <Text style={styles.logLabel}>Total Intake</Text>
                  <Text style={styles.logValue}>{waterConsumed.toFixed(2)}L</Text>
                </View>
              </View>
              <View style={styles.logItem}>
                <MaterialCommunityIcons name="target" size={24} color={colors.warning} />
                <View style={styles.logContent}>
                  <Text style={styles.logLabel}>Remaining</Text>
                  <Text style={styles.logValue}>
                    {Math.max(dailyGoal - waterConsumed, 0).toFixed(2)}L
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOM AMOUNT</Text>
          <View style={[styles.customCard, { flexDirection: 'column', paddingVertical: 24, gap: 16 }]}>
            <Text style={styles.customValue}>{customAmount}ml</Text>

            {/* Amount Presets */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 }}>
              {[100, 200, 300, 500, 750, 1000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setCustomAmount(amount)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: customAmount === amount ? colors.info : colors.border + '40',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: customAmount === amount ? '#fff' : colors.textSecondary
                  }}>
                    {amount >= 1000 ? `${amount / 1000}L` : amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fine Tune Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <TouchableOpacity
                onPress={() => setCustomAmount(prev => Math.max(50, prev - 50))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.error + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="minus" size={24} color={colors.error} />
              </TouchableOpacity>

              <Text style={{ fontSize: 14, color: colors.textTertiary }}>Fine tune</Text>

              <TouchableOpacity
                onPress={() => setCustomAmount(prev => Math.min(2000, prev + 50))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.success + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="plus" size={24} color={colors.success} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hydration Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HYDRATION TIPS</Text>
          <View style={styles.tipsContainer}>
            {[
              { icon: 'clock-outline', text: 'Drink water every 2 hours', color: colors.info },
              { icon: 'run', text: 'Extra water during exercise', color: colors.warning },
              { icon: 'weather-sunny', text: 'More on hot days', color: colors.error },
              { icon: 'food-apple', text: 'Drink before meals', color: colors.success },
            ].map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <View style={[styles.tipIcon, { backgroundColor: tip.color + '20' }]}>
                  <MaterialCommunityIcons name={tip.icon as any} size={20} color={tip.color} />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Add Custom Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleAddWater(customAmount)}
          activeOpacity={0.8}
          disabled={saving}
        >
          <LinearGradient
            colors={[colors.info, '#2563EB']}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="water-plus" size={20} color="white" />
                <Text style={styles.saveButtonText}>Add {customAmount}ml</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: colors.info + '30',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 100,
  },
  waterGradient: {
    flex: 1,
    opacity: 0.3,
  },
  progressContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  progressBadge: {
    backgroundColor: colors.info + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.info + '50',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.info,
  },
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  goalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    position: 'relative',
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  quickAction: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logRow: {
    flexDirection: 'row',
    gap: 16,
  },
  logItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logContent: {
    flex: 1,
  },
  logLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  logValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  tipsContainer: {
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceDark,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDisplay: {
    alignItems: 'center',
  },
  customValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  customLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default WaterLogScreen;
