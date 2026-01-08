// FoodLogScreen.tsx - Complete Implementation Template
// Location: /fitcoach-expo/src/screens/FoodLogScreen.tsx

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
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { foodAPI, handleAPIError, FoodLog, CreateFoodLog } from '../services/api';

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: 'weather-sunny', color: '#FBBF24' },
  { id: 'lunch', label: 'Lunch', icon: 'white-balance-sunny', color: '#F59E0B' },
  { id: 'dinner', label: 'Dinner', icon: 'weather-night', color: '#7C3AED' },
  { id: 'snack', label: 'Snack', icon: 'food-apple', color: '#10B981' },
];

const FoodLogScreen = () => {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Form state
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [servings, setServings] = useState('1');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [customFoodName, setCustomFoodName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const data = await foodAPI.getLogs();
      setLogs(data || []);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        Alert.alert('Error Loading Logs', handleAPIError(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // Search food database
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await foodAPI.searchFood(query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add food log
  const handleAddFood = async () => {
    try {
      const servingsNum = parseFloat(servings);
      if (isNaN(servingsNum) || servingsNum <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid serving size');
        return;
      }

      const logData: CreateFoodLog = {
        servings: servingsNum,
        mealType: selectedMealType as any,
      };

      if (selectedFood) {
        // Using database food
        logData.foodId = selectedFood.id;
      } else if (customFoodName && customCalories) {
        // Using custom food
        logData.customFoodName = customFoodName;
        logData.calories = parseFloat(customCalories);
        logData.protein = customProtein ? parseFloat(customProtein) : 0;
        logData.carbs = customCarbs ? parseFloat(customCarbs) : 0;
        logData.fat = customFat ? parseFloat(customFat) : 0;
      } else {
        Alert.alert('Incomplete', 'Please select a food or enter custom food details');
        return;
      }

      await foodAPI.createLog(logData);
      setShowAddModal(false);
      resetForm();
      await fetchLogs();
      Alert.alert('Success', 'Food logged successfully!');
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };

  // Delete food log
  const handleDelete = async (logId: number) => {
    Alert.alert(
      'Delete Food Log',
      'Are you sure you want to delete this log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await foodAPI.deleteLog(logId);
              setLogs(logs.filter(log => log.id !== logId));
              Alert.alert('Deleted', 'Food log deleted successfully');
            } catch (error) {
              Alert.alert('Error', handleAPIError(error));
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedFood(null);
    setServings('1');
    setSearchQuery('');
    setSearchResults([]);
    setCustomFoodName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
  };

  // Group logs by meal type
  const groupedLogs = MEAL_TYPES.map(mealType => ({
    ...mealType,
    logs: logs.filter(log => log.meal_type === mealType.id),
  }));

  // Calculate totals
  const dailyTotals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#13ec80" />
        <Text style={styles.loadingText}>Loading food logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with totals */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Food</Text>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(dailyTotals.calories)}</Text>
            <Text style={styles.totalLabel}>Calories</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(dailyTotals.protein)}g</Text>
            <Text style={styles.totalLabel}>Protein</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(dailyTotals.carbs)}g</Text>
            <Text style={styles.totalLabel}>Carbs</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>{Math.round(dailyTotals.fat)}g</Text>
            <Text style={styles.totalLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Food logs by meal type */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groupedLogs.map(meal => (
          <View key={meal.id} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <MaterialCommunityIcons name={meal.icon as any} size={20} color={meal.color} />
              <Text style={styles.mealTitle}>{meal.label}</Text>
              <Text style={styles.mealCount}>
                {meal.logs.reduce((sum, log) => sum + (log.calories || 0), 0)} cal
              </Text>
            </View>

            {meal.logs.length === 0 ? (
              <Text style={styles.emptyText}>No {meal.label.toLowerCase()} logged yet</Text>
            ) : (
              meal.logs.map(log => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logCard}
                  onLongPress={() => handleDelete(log.id)}
                >
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>
                      {log.custom_food_name || log.food_name || 'Unknown Food'}
                    </Text>
                    <Text style={styles.logDetails}>
                      {log.servings} serving(s) • {log.calories} cal
                    </Text>
                    <Text style={styles.logMacros}>
                      P: {log.protein}g • C: {log.carbs}g • F: {log.fat}g
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(log.id)}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Food Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Food</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Meal type selector */}
              <Text style={styles.label}>Meal Type</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map(meal => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[
                      styles.mealTypeButton,
                      selectedMealType === meal.id && { borderColor: meal.color, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedMealType(meal.id)}
                  >
                    <MaterialCommunityIcons name={meal.icon as any} size={20} color={meal.color} />
                    <Text style={styles.mealTypeText}>{meal.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Search food */}
              <Text style={styles.label}>Search Food</Text>
              <TextInput
                style={styles.input}
                placeholder="Search food database..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={handleSearch}
              />

              {searching && <ActivityIndicator style={styles.searchLoading} />}

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((food, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResult}
                      onPress={() => {
                        setSelectedFood(food);
                        setSearchResults([]);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.searchResultName}>{food.name}</Text>
                      <Text style={styles.searchResultInfo}>
                        {food.calories} cal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected food or custom entry */}
              {selectedFood ? (
                <View style={styles.selectedFood}>
                  <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                  <Text style={styles.selectedFoodInfo}>
                    {selectedFood.calories} cal per serving
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFood(null)}>
                    <Text style={styles.clearButton}>Clear selection</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Or Enter Custom Food</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Food name"
                    placeholderTextColor="#6B7280"
                    value={customFoodName}
                    onChangeText={setCustomFoodName}
                  />
                  <View style={styles.macroRow}>
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Calories"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={customCalories}
                      onChangeText={setCustomCalories}
                    />
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Protein (g)"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={customProtein}
                      onChangeText={setCustomProtein}
                    />
                  </View>
                  <View style={styles.macroRow}>
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Carbs (g)"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={customCarbs}
                      onChangeText={setCustomCarbs}
                    />
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Fat (g)"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                      value={customFat}
                      onChangeText={setCustomFat}
                    />
                  </View>
                </>
              )}

              {/* Servings */}
              <Text style={styles.label}>Servings</Text>
              <TextInput
                style={styles.input}
                placeholder="1.0"
                placeholderTextColor="#6B7280"
                keyboardType="decimal-pad"
                value={servings}
                onChangeText={setServings}
              />

              {/* Add button */}
              <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
                <Text style={styles.addButtonText}>Add Food</Text>
              </TouchableOpacity>
            </ScrollView>
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#13ec80' },
  totalLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  scrollView: { flex: 1 },
  mealSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8, flex: 1 },
  mealCount: { fontSize: 14, color: '#9CA3AF' },
  emptyText: { color: '#6B7280', fontStyle: 'italic', paddingVertical: 8 },
  logCard: { flexDirection: 'row', padding: 12, backgroundColor: '#16261f', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  logInfo: { flex: 1 },
  logName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  logDetails: { fontSize: 14, color: '#9CA3AF', marginBottom: 2 },
  logMacros: { fontSize: 12, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#13ec80', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16261f', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalScroll: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8, marginTop: 16 },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  mealTypeButton: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#102219', borderRadius: 8, borderWidth: 1, borderColor: '#1f3329' },
  mealTypeText: { fontSize: 14, color: '#fff', marginLeft: 8 },
  input: { backgroundColor: '#102219', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#1f3329', marginBottom: 12 },
  searchLoading: { marginVertical: 8 },
  searchResults: { maxHeight: 200, backgroundColor: '#102219', borderRadius: 8, marginBottom: 12 },
  searchResult: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#1f3329' },
  searchResultName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  searchResultInfo: { fontSize: 12, color: '#9CA3AF' },
  selectedFood: { padding: 16, backgroundColor: '#13ec8020', borderRadius: 8, marginBottom: 12 },
  selectedFoodName: { fontSize: 16, fontWeight: 'bold', color: '#13ec80', marginBottom: 4 },
  selectedFoodInfo: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  clearButton: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: 12 },
  macroInput: { flex: 1 },
  addButton: { backgroundColor: '#13ec80', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  addButtonText: { fontSize: 16, fontWeight: 'bold', color: '#102219' },
});

export default FoodLogScreen;
