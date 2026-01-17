import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { analyticsAPI, handleAPIError, userAPI } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const colors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#26d9bb',
  text: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  progressBg: '#e2e8f0',
  lowValue: '#ef4444',
  goodValue: '#10b981',
  orange: '#F97316'
};

interface TodayData {
  userName: string;
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  water: { consumed: number; target: number };
  exercise: number;
  streak: number;
}

// --- ANIMATED COMPONENTS ---

const GlowingScore = ({ score }: { score: number }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.scoreContainer}>
      <Animated.View style={[
        styles.scoreCircle,
        { transform: [{ scale: pulseAnim }] }
      ]}>
        <View style={styles.innerScoreCircle}>
          <Text style={styles.scoreText}>{score}</Text>
          <Text style={styles.scoreLabel}>VITALITY</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const AnimatedProgressBar = ({ value, max, color }: { value: number, max: number, color: string }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const percent = Math.min((value / max) * 100, 100);
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 1000,
      useNativeDriver: false
    }).start();
  }, [value, max]);

  return (
    <View style={styles.progressBar}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%']
            })
          }
        ]}
      />
    </View>
  );
};

const StreakFlame = ({ streak }: { streak: number }) => {
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  if (streak === 0) return null;

  return (
    <View style={styles.streakContainer}>
      <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
        <MaterialCommunityIcons name="fire" size={24} color={colors.orange} />
      </Animated.View>
      <Text style={styles.streakText}>{streak} Day Streak!</Text>
    </View>
  );
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayData, setTodayData] = useState<TodayData>({
    userName: 'User',
    calories: { consumed: 0, target: 2000 },
    protein: { consumed: 0, target: 150 },
    water: { consumed: 0, target: 3.0 },
    exercise: 0,
    streak: 0,
  });
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [vitalityScore, setVitalityScore] = useState(0);

  const fetchHomeData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [dailyData, profileData, progressData] = await Promise.all([
        analyticsAPI.getDailySummary(),
        userAPI.getProfile().catch(() => ({ user: { name: 'User' } })),
        analyticsAPI.getProgress().catch(() => ({ currentStreak: 0 })),
      ]);

      const summary = dailyData.summary;

      // Calculate targets
      const calorieTarget = summary.calorieTarget || 2000;
      const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
      const waterTarget = (summary.waterTargetMl || 3000) / 1000;

      const data: TodayData = {
        userName: ((profileData as any).user?.name || (profileData as any).name || 'User'),
        calories: {
          consumed: summary.totalCalories || 0,
          target: calorieTarget,
        },
        protein: {
          consumed: Math.round(summary.totalProtein || 0),
          target: proteinTarget,
        },
        water: {
          consumed: (summary.totalWaterMl || 0) / 1000,
          target: waterTarget,
        },
        exercise: summary.totalExerciseCalories || 0,
        streak: progressData.currentStreak || 0,
      };

      setTodayData(data);

      // Score Calculation
      const cP = Math.min(data.calories.consumed / data.calories.target, 1);
      const pP = Math.min(data.protein.consumed / data.protein.target, 1);
      const wP = Math.min(data.water.consumed / data.water.target, 1);
      const score = Math.round(((cP + pP + wP) / 3) * 100);
      setVitalityScore(score);

      // Generate AI hint if needed
      const proteinPercent = (data.protein.consumed / data.protein.target) * 100;
      const waterPercent = (data.water.consumed / data.water.target) * 100;
      const caloriePercent = (data.calories.consumed / data.calories.target) * 100;

      let hint: string | null = null;
      if (proteinPercent < 50 && caloriePercent > 20) {
        hint = 'Protein is low today — add curd, eggs, or dal.';
      } else if (waterPercent < 40 && caloriePercent > 20) {
        hint = 'Remember to stay hydrated — drink more water.';
      } else if (caloriePercent > 100) {
        hint = 'You have hit your calorie goal. Nice work!';
      } else if (caloriePercent < 20 && getCurrentHour() > 18) {
        hint = 'Log your evening meal to track your full day.';
      }
      setAiHint(hint);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        console.error('Error fetching home data:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHomeData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  const getGreeting = (): string => {
    const hour = getCurrentHour();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentHour = (): number => {
    return new Date().getHours();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{todayData.userName.split(' ')[0]}</Text>
        </View>
        <StreakFlame streak={todayData.streak} />
      </View>

      {/* Vitality Score */}
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <GlowingScore score={vitalityScore} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {/* Calories */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="fire" size={20} color={colors.orange} />
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <Text style={styles.statValue}>{todayData.calories.consumed}</Text>
          <Text style={styles.statTarget}>/ {todayData.calories.target} kcal</Text>
          <View style={{ marginTop: 8 }}>
            <AnimatedProgressBar
              value={todayData.calories.consumed}
              max={todayData.calories.target}
              color={colors.orange}
            />
          </View>
        </View>

        {/* Protein */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="dumbbell" size={20} color={colors.primary} />
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <Text style={styles.statValue}>{todayData.protein.consumed}g</Text>
          <Text style={styles.statTarget}>/ {todayData.protein.target}g</Text>
          <View style={{ marginTop: 8 }}>
            <AnimatedProgressBar
              value={todayData.protein.consumed}
              max={todayData.protein.target}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      {/* Water & Exercise Row */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 4 }]}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Navigating to WaterLog');
            navigation.navigate('WaterLog' as never);
          }}
        >
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="water" size={20} color="#ef4444" />
            <Text style={[styles.statLabel, { color: '#b91c1c', fontWeight: '900' }]}>LOG WATER</Text>
          </View>
          <Text style={styles.statValue}>{todayData.water.consumed.toFixed(1)}L</Text>
          <View style={{ marginTop: 8 }}>
            <AnimatedProgressBar
              value={todayData.water.consumed * 1000}
              max={todayData.water.target * 1000}
              color="#3B82F6"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => {
            console.log('Navigating to ExerciseLog');
            navigation.navigate('ExerciseLog' as never);
          }}
        >
          <View style={styles.statHeader}>
            <MaterialCommunityIcons name="run" size={20} color="#A855F7" />
            <Text style={styles.statLabel}>Move</Text>
          </View>
          <Text style={styles.statValue}>{todayData.exercise}</Text>
          <Text style={styles.statTarget}>kcal burned</Text>
        </TouchableOpacity>
      </View>


      {/* AI Insight */}
      {aiHint && (
        <View style={styles.aiHintCard}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color={colors.primary} style={{ marginRight: 12 }} />
          <Text style={styles.aiHintText}>{aiHint}</Text>
        </View>
      )}

      {/* Primary Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={() => navigation.navigate('FoodLog' as never)}
      >
        <Text style={styles.primaryButtonText}>+ Log Meal</Text>
      </Pressable>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 16, color: colors.textSecondary },
  userName: { fontSize: 24, fontWeight: '700', color: colors.text },

  streakContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FED7AA' },
  streakText: { color: colors.orange, fontWeight: '700', marginLeft: 4, fontSize: 13 },

  // Glowing Score
  scoreContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  scoreCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  innerScoreCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.primary, elevation: 5, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
  scoreText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  scoreLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },

  // Grid
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.progressBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    zIndex: 10 // Ensure it sits on top  
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statTarget: { fontSize: 11, color: colors.textTertiary, marginBottom: 4 },

  progressBar: { height: 6, backgroundColor: colors.progressBg, borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 3 },

  aiHintCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.progressBg,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    marginTop: 12
  },
  aiHintText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

export default HomeScreen;
