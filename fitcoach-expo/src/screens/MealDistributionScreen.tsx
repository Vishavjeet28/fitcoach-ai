import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MealDistributionService, MealDistributionResponse, Macros } from '../services/mealDistribution.service';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: '#13ec80',
  secondary: '#2563EB',
  background: '#102219',
  surface: '#16261f',
  surfaceHighlight: '#1F342B',
  text: '#ffffff',
  textSecondary: '#9CA3AF',
  border: '#1F342B',
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EF4444',
};

const MacroRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.macroRow}>
    <View style={styles.macroLabelContainer}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
    <Text style={styles.macroValue}>{value}g</Text>
  </View>
);

const MealCard = ({ title, macros, icon }: { title: string; macros: Macros; icon: string }) => {
  return (
    <LinearGradient
      colors={[colors.surface, colors.surfaceHighlight]}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <View style={styles.caloriesContainer}>
            <Text style={styles.caloriesValue}>{macros.calories}</Text>
            <Text style={styles.caloriesLabel}>kcal</Text>
        </View>
      </View>
      
      <View style={styles.divider} />

      <View style={styles.macrosContainer}>
        <MacroRow label="Protein" value={macros.protein} color={colors.protein} />
        <MacroRow label="Carbs" value={macros.carbs} color={colors.carbs} />
        <MacroRow label="Fats" value={macros.fat} color={colors.fat} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    padding: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 12,
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(19, 236, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  caloriesContainer: {
    alignItems: 'flex-end',
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  caloriesLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  macrosContainer: {
    gap: 12,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  infoText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 32,
  }
});

export const MealDistributionScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MealDistributionResponse | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [goalStyle, setGoalStyle] = useState<'balanced' | 'aggressive' | 'conservative'>('balanced');

    const fetchData = async () => {
        // Guest Mode Handling
        if (user?.email === 'guest@fitcoach.ai') {
            console.log('👤 [MEAL DIST] Guest mode detected - using Demo data');
            setLoading(false);
            setRefreshing(false);
            setData({
                meta: { date: new Date().toISOString(), goal_style: 'balanced', meal_style: 'fixed' },
                meals: {
                    breakfast: { calories: 500, protein: 30, carbs: 50, fat: 15 },
                    lunch: { calories: 700, protein: 40, carbs: 70, fat: 25 },
                    dinner: { calories: 600, protein: 35, carbs: 60, fat: 20 }
                }
            });
            return;
        }

        try {
            const result = await MealDistributionService.getDailyDistribution();
            setData(result);
            setGoalStyle(result.meta.goal_style);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load meal distribution');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleGoalChange = async (style: 'balanced' | 'aggressive' | 'conservative') => {
        setGoalStyle(style);
        
        // Guest Mode Handling for Recalculation
        if (user?.email === 'guest@fitcoach.ai') {
             // Simulate recalculation locally
             let demoData;
             if (style === 'aggressive') {
                 demoData = {
                    breakfast: { calories: 600, protein: 45, carbs: 40, fat: 20 },
                    lunch: { calories: 700, protein: 45, carbs: 50, fat: 25 },
                    dinner: { calories: 500, protein: 30, carbs: 30, fat: 25 }
                 };
             } else if (style === 'conservative') {
                 demoData = {
                    breakfast: { calories: 600, protein: 35, carbs: 60, fat: 20 },
                    lunch: { calories: 600, protein: 35, carbs: 60, fat: 20 },
                    dinner: { calories: 600, protein: 35, carbs: 60, fat: 20 }
                 };
             } else { // balanced
                 demoData = {
                    breakfast: { calories: 500, protein: 30, carbs: 50, fat: 15 },
                    lunch: { calories: 700, protein: 40, carbs: 70, fat: 25 },
                    dinner: { calories: 600, protein: 35, carbs: 60, fat: 20 }
                 };
             }
             
             setData({
                meta: { date: new Date().toISOString(), goal_style: style, meal_style: 'fixed' },
                meals: demoData
            });
            return;
        }

        setLoading(true);
        try {
            const result = await MealDistributionService.recalculate(style);
            setData(result);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update goal style');
            // Revert state if needed, simplified here
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    if (loading && !data) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{marginBottom: 16}}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Daily Meal Split</Text>
                <Text style={styles.subtitle}>
                    AI-Optimized Nutrition Distribution
                </Text>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={styles.tabsContainer}>
                    {(['balanced', 'aggressive', 'conservative'] as const).map((style) => (
                        <TouchableOpacity
                            key={style}
                            style={[styles.tab, goalStyle === style && styles.activeTab]}
                            onPress={() => handleGoalChange(style)}
                        >
                            <Text style={[styles.tabText, goalStyle === style && styles.activeTabText]}>
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {data && (
                    <>
                        <MealCard 
                            title="Breakfast" 
                            macros={data.meals.breakfast} 
                            icon="weather-sunny" 
                        />
                        <MealCard 
                            title="Lunch" 
                            macros={data.meals.lunch} 
                            icon="food-turkey" 
                        />
                        <MealCard 
                            title="Dinner" 
                            macros={data.meals.dinner} 
                            icon="moon-waning-crescent" 
                        />
                    </>
                )}

                <Text style={styles.infoText}>
                    * Values derived from your daily calorie & macro targets.
                </Text>
            </ScrollView>
        </View>
    );
};
