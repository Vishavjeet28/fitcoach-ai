import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import API from '../lib/api';

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
interface Recipe {
  id: number;
  name: string;
  description: string;
  ingredients: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  cook_time: number;
}
export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  useEffect(() => {
    loadRecipes();
  }, []);
  const loadRecipes = async () => {
    try {
      const data = await API.getRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };
  const handleGenerateRecipe = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const newRecipe = await API.generateRecipe(prompt);
      setRecipes(prev => [newRecipe, ...prev]);
      Alert.alert('Success', 'Recipe generated successfully!');
      setPrompt('');
      setShowModal(false);
    } catch (error) {
      console.error('Failed to generate recipe:', error);
      Alert.alert('Error', 'Failed to generate recipe');
    } finally {
      setGenerating(false);
    }
  };
  const handleDeleteRecipe = async (recipeId: number) => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await API.deleteRecipe(recipeId);
              setRecipes(prev => prev.filter(r => r.id !== recipeId));
              Alert.alert('Success', 'Recipe deleted');
              setSelectedRecipe(null);
            } catch (error) {
              console.error('Failed to delete recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Recipe Collection</Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowModal(true)}
          >
            <LinearGradient 
              colors={[colors.primary, colors.primaryDark]} 
              style={styles.generateButtonGradient}
            >
              <MaterialCommunityIcons name="magic-staff" size={20} color={colors.backgroundDark} />
              <Text style={styles.generateButtonText}>Generate Recipe</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {recipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="food-off" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptySubtitle}>Generate your first recipe with AI!</Text>
          </View>
        ) : (
          <View style={styles.recipesGrid}>
            {recipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                onPress={() => setSelectedRecipe(recipe)}
              >
                <View style={styles.recipeCard}>
                  <View>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeDescription} numberOfLines={2}>
                      {recipe.description}
                    </Text>
                    <View style={styles.recipeMacros}>
                      <View style={styles.macroChip}>
                        <Text style={styles.macroChipText}>{recipe.calories} cal</Text>
                      </View>
                      <View style={styles.macroChip}>
                        <Text style={styles.macroChipText}>{recipe.protein}g P</Text>
                      </View>
                    </View>
                    <View style={styles.recipeTime}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                      <Text style={styles.recipeTimeText}>
                        {recipe.prep_time + recipe.cook_time} min
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      {/* Generate Recipe Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Recipe</Text>
            <Text style={styles.modalSubtitle}>
              Describe what you want to cook, dietary preferences, or ingredients
            </Text>
            <TextInput
              style={styles.promptInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g., High protein chicken recipe under 500 calories"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
                disabled={generating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.generateModalButton]}
                onPress={handleGenerateRecipe}
                disabled={!prompt.trim() || generating}
              >
                {(!prompt.trim() || generating) ? (
                  <View style={[styles.disabledButton, { paddingVertical: 16, borderRadius: 16, alignItems: 'center' }]}>
                    {generating ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Text style={[styles.generateModalButtonText, { color: colors.textSecondary }]}>Generate</Text>
                    )}
                  </View>
                ) : (
                  <LinearGradient 
                    colors={[colors.primary, colors.primaryDark]} 
                    style={styles.generateModalButtonGradient}
                  >
                    <Text style={styles.generateModalButtonText}>Generate</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Recipe Detail Modal */}
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteRecipe(selectedRecipe.id)}>
                <MaterialCommunityIcons name="delete" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedRecipe.name}</Text>
              <Text style={styles.detailDescription}>{selectedRecipe.description}</Text>
              <View style={styles.detailMacros}>
                <View style={styles.detailMacroItem}>
                  <Text style={styles.detailMacroValue}>{selectedRecipe.calories}</Text>
                  <Text style={styles.detailMacroLabel}>Calories</Text>
                </View>
                <View style={styles.detailMacroItem}>
                  <Text style={styles.detailMacroValue}>{selectedRecipe.protein}g</Text>
                  <Text style={styles.detailMacroLabel}>Protein</Text>
                </View>
                <View style={styles.detailMacroItem}>
                  <Text style={styles.detailMacroValue}>{selectedRecipe.carbs}g</Text>
                  <Text style={styles.detailMacroLabel}>Carbs</Text>
                </View>
                <View style={styles.detailMacroItem}>
                  <Text style={styles.detailMacroValue}>{selectedRecipe.fat}g</Text>
                  <Text style={styles.detailMacroLabel}>Fat</Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.sectionContent}>{selectedRecipe.ingredients}</Text>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.sectionContent}>{selectedRecipe.instructions}</Text>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  generateButtonText: {
    color: colors.backgroundDark,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
  },
  recipesGrid: {
    padding: 20,
  },
  recipeCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recipeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  recipeMacros: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  macroChip: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  macroChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  recipeTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeTimeText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 24,
    padding: 28,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  promptInput: {
    backgroundColor: colors.backgroundDark,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  generateModalButton: {
    overflow: 'hidden',
  },
  generateModalButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateModalButtonText: {
    color: colors.backgroundDark,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.textTertiary,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailContent: {
    flex: 1,
    padding: 24,
  },
  detailTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  detailMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  detailMacroItem: {
    alignItems: 'center',
  },
  detailMacroValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  detailMacroLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
});
