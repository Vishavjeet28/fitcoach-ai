import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthReady } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { analyticsAPI, foodAPI, exerciseAPI, waterAPI, handleAPIError } from '../services/api';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#13ec80',
  primaryDark: '#0fb863',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  warning: '#FBBF24',
  info: '#60A5FA',
  success: '#10B981',
  purple: '#A855F7',
  orange: '#FB7185',
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { isAuthReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    user: { 
      name: 'User',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'
    },
    dailyCalories: { 
      consumed: 0, 
      target: 2000, 
      burned: 0,
      remaining: 2000 
    },
    macros: {
      protein: { consumed: 0, target: 150 },
      carbs: { consumed: 0, target: 200 },
      fat: { consumed: 0, target: 65 },
    },
    water: { consumed: 0, target: 3.0 },
  });

  const fetchDashboardData = async () => {
    console.log('📊 [DASHBOARD] Fetching dashboard data...');
    try {
      // Fetch daily summary (contains all metrics in one call)
      const dailyData = await analyticsAPI.getDailySummary();
      const summary = dailyData.summary;

      const remaining = Math.max(0, summary.calorieTarget - summary.totalCalories + summary.totalExerciseCalories);

      setDashboardData({
        user: dashboardData.user, // Keep existing user data
        dailyCalories: {
          consumed: summary.totalCalories || 0,
          target: summary.calorieTarget || 2000,
          burned: summary.totalExerciseCalories || 0,
          remaining: remaining,
        },
        macros: {
          protein: { 
            consumed: Math.round(summary.totalProtein || 0), 
            target: Math.round((summary.calorieTarget * 0.3) / 4) // 30% of calories from protein
          },
          carbs: { 
            consumed: Math.round(summary.totalCarbs || 0), 
            target: Math.round((summary.calorieTarget * 0.4) / 4) // 40% of calories from carbs
          },
          fat: { 
            consumed: Math.round(summary.totalFat || 0), 
            target: Math.round((summary.calorieTarget * 0.3) / 9) // 30% of calories from fat
          },
        },
        water: { 
          consumed: (summary.totalWaterMl || 0) / 1000, // Convert ml to liters
          target: (summary.waterTargetMl || 3000) / 1000,
        },
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = handleAPIError(error);
      
      // Only show alert if it's not a session expired error (that's handled by AuthContext)
      if (error?.code !== 'SESSION_EXPIRED') {
        Alert.alert('Error Loading Data', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  }, []);

  // Fetch data only when auth is ready
  useEffect(() => {
    if (isAuthReady) {
      console.log('📊 [DASHBOARD] Auth ready, fetching dashboard data');
      fetchDashboardData();
    }
  }, [isAuthReady]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthReady) { fetchDashboardData(); }
    }, [isAuthReady])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogFood = () => {
    navigation.navigate('FoodLog');
  };

  const handleLogExercise = () => {
    navigation.navigate('ExerciseLog');
  };

  const handleLogWater = () => {
    navigation.navigate('WaterLog');
  };

  const handleAICoachPress = () => {
    navigation.navigate('Coach');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.textSecondary, { marginTop: 16 }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: dashboardData.user.avatar }} style={styles.avatar} />
              <View style={styles.avatarStatus}>
                <View style={styles.avatarStatusDot} />
              </View>
            </View>
            <View>
              <Text style={styles.greeting}>HELLO, {dashboardData.user.name.toUpperCase()}</Text>
              <Text style={styles.date}>Oct 24, Today</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Profile')}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Main Calorie Display */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.calorieRingContainer}>
              <View style={styles.calorieDisplay}>
                <Text style={styles.ringLabel}>Remaining</Text>
                <Text style={styles.ringValue}>{dashboardData.dailyCalories.remaining.toLocaleString()}</Text>
                <View style={styles.ringBadge}>
                  <Text style={styles.ringBadgeText}>kcal</Text>
                </View>
              </View>
              
              <View style={styles.ringLabels}>
                <View style={styles.ringLabelLeft}>
                  <View style={styles.ringLabelIndicator}>
                    <View style={[styles.ringDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.ringLabelText}>Eaten</Text>
                  </View>
                  <Text style={styles.ringLabelValue}>{dashboardData.dailyCalories.consumed.toLocaleString()}</Text>
                </View>
                <View style={styles.ringLabelRight}>
                  <View style={styles.ringLabelIndicator}>
                    <View style={[styles.ringDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.ringLabelText}>Burned</Text>
                  </View>
                  <Text style={styles.ringLabelValue}>{dashboardData.dailyCalories.burned}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8} onPress={handleLogFood}>
              <LinearGradient colors={[colors.success, '#059669']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Food</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8} onPress={handleLogExercise}>
              <LinearGradient colors={[colors.warning, '#D97706']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="dumbbell" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Exercise</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.8} onPress={handleLogWater}>
              <LinearGradient colors={[colors.info, '#2563EB']} style={styles.quickActionGradient}>
                <MaterialCommunityIcons name="water" size={24} color="white" />
              </LinearGradient>
              <Text style={styles.quickActionText}>Water</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY MACROS</Text>
          
          <View style={styles.macroGrid}>
            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroIcon, { backgroundColor: `${colors.warning}20` }]}>
                  <MaterialCommunityIcons name="egg" size={20} color={colors.warning} />
                </View>
                <Text style={styles.macroTitle}>Protein</Text>
              </View>
              
              <View style={styles.macroContent}>
                <View style={styles.macroValues}>
                  <Text style={styles.macroValue}>{dashboardData.macros.protein.consumed}</Text>
                  <Text style={styles.macroTarget}>/ {dashboardData.macros.protein.target}g</Text>
                </View>
                
                <View style={styles.macroProgressContainer}>
                  <View style={styles.macroProgressBackground}>
                    <View style={[styles.macroProgress, { 
                      width: `${Math.min((dashboardData.macros.protein.consumed / dashboardData.macros.protein.target) * 100, 100)}%`,
                      backgroundColor: colors.warning,
                    }]} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.macroCard}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroIcon, { backgroundColor: `${colors.info}20` }]}>
                  <MaterialCommunityIcons name="water" size={20} color={colors.info} />
                </View>
                <Text style={styles.macroTitle}>Hydration</Text>
              </View>
              
              <View style={styles.macroContent}>
                <View style={styles.macroValues}>
                  <Text style={styles.macroValue}>{dashboardData.water.consumed.toFixed(1)}</Text>
                  <Text style={styles.macroTarget}>/ {dashboardData.water.target}L</Text>
                </View>
                
                <View style={styles.waterIndicators}>
                  {[1, 2, 3, 4].map((drop, index) => (
                    <View 
                      key={index}
                      style={[styles.waterDrop, { 
                        backgroundColor: index < (dashboardData.water.consumed / dashboardData.water.target * 4) 
                          ? colors.info 
                          : `${colors.info}30` 
                      }]} 
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.smallMacroRow}>
            <TouchableOpacity style={styles.smallMacroCard} activeOpacity={0.7} onPress={handleLogFood}>
              <View style={styles.smallMacroContent}>
                <Text style={styles.smallMacroLabel}>CARBS</Text>
                <Text style={styles.smallMacroValue}>{dashboardData.macros.carbs.consumed}g</Text>
              </View>
              <View style={styles.circleProgress}>
                <Text style={styles.progressText}>
                  {Math.round((dashboardData.macros.carbs.consumed / dashboardData.macros.carbs.target) * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.smallMacroCard} activeOpacity={0.7} onPress={handleLogFood}>
              <View style={styles.smallMacroContent}>
                <Text style={styles.smallMacroLabel}>FAT</Text>
                <Text style={styles.smallMacroValue}>{dashboardData.macros.fat.consumed}g</Text>
              </View>
              <View style={styles.circleProgress}>
                <Text style={styles.progressText}>
                  {Math.round((dashboardData.macros.fat.consumed / dashboardData.macros.fat.target) * 100)}%
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Intake Trends */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>INTAKE TRENDS</Text>
          <TouchableOpacity 
            style={styles.trendsCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('History')}
          >
            <View style={styles.trendsHeader}>
              <View>
                <Text style={styles.trendsSubtitle}>Weekly Average</Text>
                <Text style={styles.trendsValue}>
                  2,150 <Text style={styles.trendsUnit}>kcal</Text>
                </Text>
              </View>
              <View style={styles.trendsLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>In</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
                  <Text style={styles.legendText}>Out</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <Text style={styles.chartPlaceholder}>📈 Weekly Trends</Text>
              <Text style={styles.chartSubtext}>Tap to view detailed history</Text>
            </View>
            
            <View style={styles.chartLabels}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <Text key={index} style={styles.chartLabel}>{day}</Text>
              ))}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* AI Coach FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAICoachPress}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.fabGradient}>
            <MaterialCommunityIcons name="robot-excited" size={28} color="white" />
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSecondary: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarStatus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.backgroundDark,
    borderRadius: 8,
    padding: 1,
  },
  avatarStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  greeting: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  heroSection: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  heroCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },

  calorieRingContainer: {
    alignItems: 'center',
  },
  calorieDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ringLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  ringValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: -2,
    marginTop: 8,
    marginBottom: 8,
  },
  ringBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  ringBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  ringLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  ringLabelLeft: {
    alignItems: 'flex-start',
  },
  ringLabelRight: {
    alignItems: 'flex-end',
  },
  ringLabelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ringLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ringLabelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickActionGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  macroGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  macroIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  macroContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  macroTarget: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  macroProgressContainer: {
    marginTop: 4,
  },
  macroProgressBackground: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroProgress: {
    height: '100%',
    borderRadius: 4,
  },
  waterIndicators: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  waterDrop: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  smallMacroRow: {
    flexDirection: 'row',
    gap: 16,
  },
  smallMacroCard: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  smallMacroContent: {
    flex: 1,
  },
  smallMacroLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  smallMacroValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  circleProgress: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },

  trendsCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  trendsSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  trendsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  trendsUnit: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'normal',
  },
  trendsLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  chartContainer: {
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
  },
  chartPlaceholder: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  chartSubtext: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },

  fabContainer: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    zIndex: 50,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
});

export default DashboardScreen;
