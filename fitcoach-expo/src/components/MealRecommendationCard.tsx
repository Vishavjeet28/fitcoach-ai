import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FoodItem {
  name: string;
  quantity?: number;
  unit?: string;
  portion?: string;
  calories: number;
  protein?: number;
  protein_g?: number;
  carbs?: number;
  carbs_g?: number;
  fat?: number;
  fat_g?: number;
}

interface MealRecommendationCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recommendation: {
    foodItems: FoodItem[];
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    aiReasoning?: string;
    generationMethod?: string;
    swapCount?: number;
  } | null;
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  logged: {
    items: any[];
    totals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  onSwap: () => void;
  onLogMeal: () => void;
  isSwapping?: boolean;
  isGenerating?: boolean;
  onViewDetails?: () => void;
}

// Light Theme Colors
const theme = {
  bg: '#f6f7f7',
  surface: '#FFFFFF',
  primary: '#2c696d',
  textMain: '#111418',
  textSub: '#637588',
  border: '#e2e8f0',
  greenBg: '#eef3f3',
  macros: {
    calories: '#111418',
    protein: '#2c696d',
    carbs: '#2c696d',
    fat: '#2c696d'
  }
};

const MealRecommendationCard: React.FC<MealRecommendationCardProps> = ({
  mealType,
  recommendation,
  logged,
  onSwap,
  onViewDetails,
  isSwapping = false,
  isGenerating = false,
}) => {
  const isLogged = logged?.items?.length > 0;

  // Meal Title logic
  const getMealName = () => {
    if (isLogged) return 'Logged Recommendation'; // Or specific item name if logged
    if (!recommendation) return `Planned ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
    return recommendation.foodItems?.[0]?.name || 'Recommended Meal';
  };

  if (isGenerating) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 200 }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={{ marginTop: 12, color: theme.textSub }}>Generating recommendation...</Text>
      </View>
    );
  }

  // If nothing recommended and nothing logged, show placeholder or return null
  if (!recommendation && !isLogged) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContent}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.textSub} />
          <Text style={styles.emptyText}>No recommendation yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Strip */}
      <View style={styles.headerStrip}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#8D9E2E" />
        <Text style={styles.headerTitle}>{isLogged ? 'Completed' : 'Recommended'}</Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* Meal Title & Serving */}
        <Text style={styles.mealTitle}>{getMealName()}</Text>
        <Text style={styles.servingText}>1 serving</Text>

        {/* Macros Grid */}
        <View style={styles.macrosRow}>
          {/* Calories */}
          <View style={styles.macroItem}>
            <MaterialCommunityIcons name="fire" size={16} color={theme.textMain} />
            <Text style={styles.macroValue}>{isLogged ? logged.totals.calories : recommendation?.calories || 0}</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>

          {/* Protein */}
          <View style={styles.macroItem}>
            <MaterialCommunityIcons name="food-drumstick" size={16} color={theme.textMain} />
            <Text style={styles.macroValue}>{isLogged ? logged.totals.protein : recommendation?.protein_g || 0}g</Text>
            <Text style={styles.macroLabel}>protein</Text>
          </View>

          {/* Carbs */}
          <View style={styles.macroItem}>
            <MaterialCommunityIcons name="barley" size={16} color={theme.textMain} />
            <Text style={styles.macroValue}>{isLogged ? logged.totals.carbs : recommendation?.carbs_g || 0}g</Text>
            <Text style={styles.macroLabel}>carbs</Text>
          </View>

          {/* Fat */}
          <View style={styles.macroItem}>
            <MaterialCommunityIcons name="water" size={16} color={theme.textMain} />
            <Text style={styles.macroValue}>{isLogged ? logged.totals.fat : recommendation?.fat_g || 0}g</Text>
            <Text style={styles.macroLabel}>fat</Text>
          </View>
        </View>

        {/* Action Button */}
        {!isLogged && (
          <TouchableOpacity style={styles.actionBtn} onPress={onViewDetails}>
            <Text style={styles.actionBtnText}>View & Log</Text>
          </TouchableOpacity>
        )}

        {isLogged && (
          <TouchableOpacity style={styles.completedBtn} onPress={onViewDetails}>
            <Text style={styles.completedBtnText}>Logged</Text>
            <MaterialCommunityIcons name="check" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}

        {/* Swap Option (only if not logged) */}
        {!isLogged && (
          <TouchableOpacity style={styles.swapBtn} onPress={onSwap} disabled={isSwapping}>
            {isSwapping ? <ActivityIndicator size="small" color={theme.textSub} /> : (
              <Text style={styles.swapText}>Swap</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    overflow: 'hidden', // for header strip
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.greenBg,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 14, fontWeight: '600', color: '#3f4e18' // Darker green text
  },
  mealTitle: {
    fontSize: 18, fontWeight: '600', color: theme.textMain, marginBottom: 4
  },
  servingText: {
    fontSize: 14, color: theme.textSub, marginBottom: 20
  },
  macrosRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4
  },
  macroItem: {
    alignItems: 'center', gap: 4
  },
  macroValue: {
    fontSize: 16, fontWeight: '700', color: theme.textMain
  },
  macroLabel: {
    fontSize: 12, color: theme.textSub
  },
  actionBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12
  },
  actionBtnText: {
    fontSize: 16, fontWeight: '600', color: 'white'
  },
  completedBtn: {
    backgroundColor: theme.greenBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12
  },
  completedBtnText: {
    fontSize: 16, fontWeight: '600', color: theme.primary
  },
  swapBtn: {
    alignItems: 'center',
    paddingVertical: 8
  },
  swapText: {
    fontSize: 13, color: theme.textSub, textDecorationLine: 'underline'
  },
  emptyContent: {
    padding: 24, alignItems: 'center', gap: 8
  },
  emptyText: {
    color: theme.textSub
  }
});

export default MealRecommendationCard;
