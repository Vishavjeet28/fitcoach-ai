import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import foodData from '../data/completeFoodDatabase.json';
import { foodAPI, handleAPIError, CreateFoodLog } from '../services/api';
import apiClient from '../services/api';
import { Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#1fbda1',
  backgroundDark: '#FAFAFA', // Mapped to Light BG
  surfaceDark: '#FFFFFF',    // Mapped to White Surface
  textPrimary: '#1e293b',    // Slate 800
  textSecondary: '#64748b',  // Slate 500
  textTertiary: '#94a3b8',   // Slate 400
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  error: '#EF4444',
  border: '#e2e8f0',
};

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const FoodLogScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [mealType, setMealType] = useState('Breakfast');
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const mealTypes = [
    { name: 'Breakfast', icon: 'bread-slice', color: colors.warning },
    { name: 'Lunch', icon: 'food-variant', color: colors.success },
    { name: 'Dinner', icon: 'food-turkey', color: colors.info },
    { name: 'Snack', icon: 'food-apple', color: colors.error },
  ];

  useEffect(() => {
    // Load popular foods initially
    const popular = ['Roti', 'Chapati', 'Plain Rice Cooked', 'Toor Dal', 'Idli', 'Dosa', 'Paneer Tikka', 'Butter Chicken'];
    const popularFoods = popular.map(name =>
      foodData.foods.find(food => food.name === name)
    ).filter(Boolean) as FoodItem[];
    setSearchResults(popularFoods);
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      const results = foodData.foods.filter(food =>
        food.name.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 20);
      setSearchResults(results);
      setShowResults(true);
    } else {
      const popular = ['Roti', 'Chapati', 'Plain Rice Cooked', 'Toor Dal', 'Idli', 'Dosa', 'Paneer Tikka', 'Butter Chicken'];
      const popularFoods = popular.map(name =>
        foodData.foods.find(food => food.name === name)
      ).filter(Boolean) as FoodItem[];
      setSearchResults(popularFoods);
      setShowResults(false);
    }
  };

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setFoodName(food.name);
    setSearchQuery(food.name);
    setShowResults(false);

    // Calculate for serving size
    const serving = parseFloat(servingSize) || 100;
    const multiplier = serving / 100;

    setCalories(Math.round(food.calories * multiplier).toString());
    setProtein((food.protein * multiplier).toFixed(1));
    setCarbs((food.carbs * multiplier).toFixed(1));
    setFat((food.fat * multiplier).toFixed(1));
  };

  const handleServingSizeChange = (text: string) => {
    setServingSize(text);
    if (selectedFood && text) {
      const serving = parseFloat(text) || 100;
      const multiplier = serving / 100;

      setCalories(Math.round(selectedFood.calories * multiplier).toString());
      setProtein((selectedFood.protein * multiplier).toFixed(1));
      setCarbs((selectedFood.carbs * multiplier).toFixed(1));
      setFat((selectedFood.fat * multiplier).toFixed(1));
    }
  };

  const handleSaveFood = async () => {
    if (!foodName || !calories) return;

    // Check for guest mode
    if (user?.email === 'guest@fitcoach.ai' || !user) {
      Alert.alert(
        'Demo Mode',
        'Food logging is disabled in demo mode. Please sign up to track your nutrition!',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);

      // Get local date nicely formatted as YYYY-MM-DD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;

      // Send both foodName (for validator) and customFoodName (for controller)
      // This handles backend inconsistency between validator and controller
      const payload = {
        foodName: foodName.trim(), // Validator checks this
        customFoodName: foodName.trim(), // Controller uses this
        servingSize: parseFloat(servingSize) || 100,
        servingUnit: 'g',
        mealType: mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        calories: Math.round(parseFloat(calories)),
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
      };

      console.log('Sending food log payload:', JSON.stringify(payload, null, 2));

      await apiClient.post('/food/logs', payload);

      // Alert.alert('Success', 'Food logged successfully'); 
      navigation.goBack();

    } catch (error: any) {
      console.error('Error saving food:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMessage = handleAPIError(error);
      Alert.alert('Save Failed', `${errorMessage}\n\n(Status: ${error.response?.status || 'Unknown'})`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = foodName && calories;

  const renderSearchResult = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSelectFood(item)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultLeft}>
        <MaterialCommunityIcons name="food" size={20} color={colors.primary} />
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName}>{item.name}</Text>
          <Text style={styles.searchResultDetails}>
            {item.calories} kcal • P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g (per 100g)
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
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
          <Text style={styles.headerTitle}>Log Food</Text>
          <Text style={styles.headerSubtitle}>Track your nutrition</Text>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <MaterialCommunityIcons name="history" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 SEARCH FOOD DATABASE</Text>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="database-search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Indian foods (e.g., Roti, Dal, Biryani)"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setShowResults(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setShowResults(false);
                const popular = ['Roti', 'Chapati', 'Plain Rice Cooked', 'Toor Dal', 'Idli', 'Dosa'];
                const popularFoods = popular.map(name =>
                  foodData.foods.find(food => food.name === name)
                ).filter(Boolean) as FoodItem[];
                setSearchResults(popularFoods);
              }}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {(showResults || searchQuery.length === 0) && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>
                {searchQuery.length > 0 ? `Found ${searchResults.length} foods` : 'Popular Foods'}
              </Text>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                style={styles.searchResultsList}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        {/* AI Assistant Banner */}
        <TouchableOpacity
          style={styles.aiCard}
          onPress={() => navigation.navigate('Coach' as never)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary + '30', colors.primary + '10']}
            style={styles.aiGradient}
          >
            <MaterialCommunityIcons name="robot-excited" size={32} color={colors.primary} />
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>Need help identifying food?</Text>
              <Text style={styles.aiSubtitle}>Ask AI Coach for assistance</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Meal Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEAL TYPE</Text>
          <View style={styles.mealTypeGrid}>
            {mealTypes.map((meal) => (
              <TouchableOpacity
                key={meal.name}
                style={[
                  styles.mealTypeCard,
                  mealType === meal.name && styles.mealTypeCardActive,
                ]}
                onPress={() => setMealType(meal.name)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={meal.icon as any}
                  size={24}
                  color={mealType === meal.name ? meal.color : colors.textTertiary}
                />
                <Text style={[
                  styles.mealTypeName,
                  mealType === meal.name && { color: meal.color }
                ]}>
                  {meal.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Food Details Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FOOD DETAILS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Food Name *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="food" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter or search food name"
                placeholderTextColor={colors.textTertiary}
                value={foodName}
                onChangeText={setFoodName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Serving Size (grams) *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="weight-gram" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={colors.textTertiary}
                value={servingSize}
                onChangeText={handleServingSizeChange}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Calories (kcal) *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="fire" size={20} color={colors.warning} />
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                editable={!selectedFood}
              />
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  editable={!selectedFood}
                />
              </View>
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  editable={!selectedFood}
                />
              </View>
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <View style={styles.macroInputContainer}>
                <TextInput
                  style={styles.macroInput}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                  editable={!selectedFood}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Nutritional Summary */}
        {(calories || protein || carbs || fat) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NUTRITIONAL SUMMARY</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="fire" size={24} color={colors.warning} />
                  <Text style={styles.summaryValue}>{calories || '0'}</Text>
                  <Text style={styles.summaryLabel}>Calories</Text>
                </View>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="egg" size={24} color={colors.info} />
                  <Text style={styles.summaryValue}>{protein || '0'}g</Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="pasta" size={24} color={colors.success} />
                  <Text style={styles.summaryValue}>{carbs || '0'}g</Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="water" size={24} color={colors.error} />
                  <Text style={styles.summaryValue}>{fat || '0'}g</Text>
                  <Text style={styles.summaryLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (!isFormValid || loading) && styles.saveButtonDisabled]}
          onPress={handleSaveFood}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isFormValid ? [colors.primary, colors.primaryDark] : ['#374151', '#1F2937']}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={isFormValid ? 'white' : colors.textTertiary}
                />
                <Text style={[
                  styles.saveButtonText,
                  !isFormValid && { color: colors.textTertiary }
                ]}>
                  Save Food
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },

  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  searchResultDetails: {
    fontSize: 11,
    color: colors.textTertiary,
  },

  aiCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  aiGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  mealTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  mealTypeCard: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeCardActive: {
    borderWidth: 2,
  },
  mealTypeName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },

  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInputGroup: {
    flex: 1,
  },
  macroInputContainer: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroInput: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  summaryCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
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

export default FoodLogScreen;
