import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface DashboardData {
  user: {
    name: string;
    avatar?: string;
  };
  dailyCalories: {
    consumed: number;
    target: number;
    burned: number;
    remaining: number;
  };
  macros: {
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  water: {
    consumed: number;
    target: number;
  };
}

// Premium Color Palette
const colors = {
  primary: '#13ec80',
  primaryDark: '#0fb863',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  surfaceHighlight: '#1E332A',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    user: { 
      name: 'Alex',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format'
    },
    dailyCalories: { 
      consumed: 1250, 
      target: 2700, 
      burned: 400,
      remaining: 1450 
    },
    macros: {
      protein: { consumed: 112, target: 180 },
      carbs: { consumed: 145, target: 250 },
      fat: { consumed: 45, target: 80 },
    },
    water: { consumed: 1.2, target: 3.0 },
  });

  useEffect(() => {
    // Set status bar to light content for dark theme
    StatusBar.setBarStyle('light-content');
  }, []);

  const getProgressPercentage = (consumed: number, target: number) => {
    return Math.min((consumed / target) * 100, 100);
  };

  // 3D Calorie Ring Component
  const CalorieRing = () => {
    const percentage = getProgressPercentage(dashboardData.dailyCalories.consumed, dashboardData.dailyCalories.target);
    const circumference = 2 * Math.PI * 40;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <View style={styles.calorieRingContainer}>
        <View style={styles.ringGlow}>
          <Svg height="260" width="260" style={styles.ring}>
            <Defs>
              <SvgLinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors.primaryDark} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            
            {/* Background Circle */}
            <Circle
              cx="130"
              cy="130"
              r="40"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="8"
              fill="transparent"
            />
            
            {/* Progress Circle */}
            <Circle
              cx="130"
              cy="130"
              r="40"
              stroke="url(#ringGradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform="rotate(-90 130 130)"
              style={{ filter: 'drop-shadow(0px 0px 10px rgba(19, 236, 128, 0.4))' }}
            />
          </Svg>
          
          {/* Inner Content */}
          <View style={styles.ringInnerContent}>
            <Text style={styles.ringLabel}>Remaining</Text>
            <Text style={styles.ringValue}>{dashboardData.dailyCalories.remaining.toLocaleString()}</Text>
            <View style={styles.ringBadge}>
              <Text style={styles.ringBadgeText}>kcal</Text>
            </View>
          </View>
        </View>
        
        {/* Ring Labels */}
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
              <View style={[styles.ringDot, { backgroundColor: colors.error }]} />
              <Text style={styles.ringLabelText}>Burned</Text>
            </View>
            <Text style={styles.ringLabelValue}>{dashboardData.dailyCalories.burned}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Premium Macro Card Component
  const MacroCard = ({ 
    title, 
    consumed, 
    target, 
    color, 
    icon,
    large = false
  }: {
    title: string;
    consumed: number;
    target: number;
    color: string;
    icon: string;
    large?: boolean;
  }) => {
    const percentage = getProgressPercentage(consumed, target);
    
    return (
      <View style={[styles.macroCard, large && styles.macroCardLarge]}>
        <View style={styles.macroHeader}>
          <View style={[styles.macroIcon, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon as any} size={20} color={color} />
          </View>
          <Text style={styles.macroTitle}>{title}</Text>
        </View>
        
        <View style={styles.macroContent}>
          <View style={styles.macroValues}>
            <Text style={styles.macroValue}>{consumed}</Text>
            <Text style={styles.macroTarget}>/ {target}{title === 'Water' ? 'L' : 'g'}</Text>
          </View>
          
          {title === 'Water' ? (
            <View style={styles.waterIndicators}>
              {[1, 2, 3, 4].map((drop, index) => (
                <View 
                  key={index}
                  style={[
                    styles.waterDrop, 
                    { 
                      backgroundColor: index < (consumed / target * 4) ? color : `${color}30` 
                    }
                  ]} 
                />
              ))}
            </View>
          ) : (
            <View style={styles.macroProgressContainer}>
              <View style={styles.macroProgressBackground}>
                <View 
                  style={[
                    styles.macroProgress, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: color,
                      shadowColor: color,
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Quick Action Button Component
  const QuickActionButton = ({ 
    title, 
    icon, 
    colors: buttonColors, 
    onPress 
  }: {
    title: string;
    icon: string;
    colors: string[];
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={buttonColors} style={styles.quickActionGradient}>
        <MaterialCommunityIcons name={icon as any} size={24} color="white" />
      </LinearGradient>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.greeting}>Hello, {dashboardData.user.name}</Text>
              <Text style={styles.date}>Oct 24, Today</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.settingsButton}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Main Calorie Ring */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <CalorieRing />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <QuickActionButton
              title="Food"
              icon="silverware-fork-knife"
              colors={['#10B981', '#059669']}
              onPress={() => {}}
            />
            <QuickActionButton
              title="Exercise"
              icon="dumbbell"
              colors={['#F59E0B', '#D97706']}
              onPress={() => {}}
            />
            <QuickActionButton
              title="Water"
              icon="water"
              colors={['#3B82F6', '#2563EB']}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Daily Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY MACROS</Text>
          
          {/* Main Macro Cards */}
          <View style={styles.macroGrid}>
            <MacroCard
              title="Protein"
              consumed={dashboardData.macros.protein.consumed}
              target={dashboardData.macros.protein.target}
              color="#FBBF24"
              icon="egg"
              large
            />
            <MacroCard
              title="Water"
              consumed={dashboardData.water.consumed}
              target={dashboardData.water.target}
              color="#60A5FA"
              icon="water"
              large
            />
          </View>
          
          {/* Small Macro Row */}
          <View style={styles.smallMacroRow}>
            <View style={styles.smallMacroCard}>
              <View style={styles.smallMacroContent}>
                <Text style={styles.smallMacroLabel}>CARBS</Text>
                <Text style={styles.smallMacroValue}>{dashboardData.macros.carbs.consumed}g</Text>
              </View>
              <View style={styles.smallMacroRing}>
                <Svg height="32" width="32">
                  <Circle cx="16" cy="16" r="12" stroke="#374151" strokeWidth="3" fill="transparent" />
                  <Circle 
                    cx="16" 
                    cy="16" 
                    r="12" 
                    stroke="#A855F7" 
                    strokeWidth="3" 
                    fill="transparent"
                    strokeDasharray={`${(dashboardData.macros.carbs.consumed / dashboardData.macros.carbs.target) * 75} 75`}
                    strokeLinecap="round"
                    transform="rotate(-90 16 16)"
                  />
                </Svg>
              </View>
            </View>
            
            <View style={styles.smallMacroCard}>
              <View style={styles.smallMacroContent}>
                <Text style={styles.smallMacroLabel}>FAT</Text>
                <Text style={styles.smallMacroValue}>{dashboardData.macros.fat.consumed}g</Text>
              </View>
              <View style={styles.smallMacroRing}>
                <Svg height="32" width="32">
                  <Circle cx="16" cy="16" r="12" stroke="#374151" strokeWidth="3" fill="transparent" />
                  <Circle 
                    cx="16" 
                    cy="16" 
                    r="12" 
                    stroke="#FB7185" 
                    strokeWidth="3" 
                    fill="transparent"
                    strokeDasharray={`${(dashboardData.macros.fat.consumed / dashboardData.macros.fat.target) * 75} 75`}
                    strokeLinecap="round"
                    transform="rotate(-90 16 16)"
                  />
                </Svg>
              </View>
            </View>
          </View>
        </View>

        {/* Intake Trends */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>INTAKE TRENDS</Text>
          <View style={styles.trendsCard}>
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
            
            {/* Simple Chart Representation */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartPlaceholder}>📈 Chart visualization would go here</Text>
            </View>
            
            <View style={styles.chartLabels}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <Text key={index} style={styles.chartLabel}>{day}</Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* AI Coach FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
          <View style={styles.fabGlow} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  
  // Header Styles
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
    textTransform: 'uppercase',
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

  // Hero Section Styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Calorie Ring Styles
  calorieRingContainer: {
    alignItems: 'center',
  },
  ringGlow: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    transform: [{ rotate: '-90deg' }],
  },
  ringInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  ringValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 2,
  },
  ringBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    marginTop: 8,
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

  // Section Styles
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
    marginBottom: 12,
  },

  // Quick Actions Styles
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
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Macro Card Styles
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
  },
  macroCardLarge: {
    height: 160,
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
    marginBottom: 4,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  waterIndicators: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  waterDrop: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Small Macro Row Styles
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smallMacroValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  smallMacroRing: {
    width: 32,
    height: 32,
  },

  // Trends Section Styles
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
    borderRadius: 8,
    marginBottom: 8,
  },
  chartPlaceholder: {
    color: colors.textTertiary,
    fontSize: 16,
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

  // FAB Styles
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
    position: 'relative',
  },
  fabGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 32,
    backgroundColor: colors.primary,
    opacity: 0.2,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default DashboardScreen;