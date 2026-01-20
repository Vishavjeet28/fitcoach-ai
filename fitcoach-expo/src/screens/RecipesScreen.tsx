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
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

const theme = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#26d9bb',
  secondary: '#3b82f6',
  textMain: '#1e293b',
  textSub: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#10b981',
  macros: {
    calories: '#3b82f6',
    protein: '#10b981',
    carbs: '#f59e0b',
    fat: '#f97316',
  }
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

const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
      setLoading(true);
      const data = await api.recipe.getRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      Alert.alert('Error', 'Failed to load recipes. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const newRecipe = await api.recipe.generateRecipe(prompt);
      setRecipes(prev => [newRecipe, ...prev]);
      Alert.alert('Success', 'AI has generated a custom recipe for you!');
      setPrompt('');
      setShowModal(false);
      setSelectedRecipe(newRecipe);
    } catch (error) {
      console.error('Failed to generate recipe:', error);
      Alert.alert('Error', 'AI failed to generate recipe. Try a different prompt.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to remove this recipe from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.recipe.deleteRecipe(recipeId);
              setRecipes(prev => prev.filter(r => r.id !== recipeId));
              setSelectedRecipe(null);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading your collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Recipe Book</Text>
          <Text style={styles.headerSubtitle}>{recipes.length} healthy options</Text>
        </View>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => setShowModal(true)}
        >
          <MaterialCommunityIcons name="auto-fix" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <MaterialCommunityIcons name="food-variant" size={64} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your collection is empty</Text>
            <Text style={styles.emptySubtitle}>
              Tap the spark icon above to generate your first AI-powered healthy meal!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyBtnText}>Generate Recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {recipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => setSelectedRecipe(recipe)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName} numberOfLines={1}>{recipe.name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSub} />
                </View>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {recipe.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.macroRow}>
                    <View style={[styles.macroDot, { backgroundColor: theme.macros.calories }]} />
                    <Text style={styles.macroText}>{recipe.calories} kcal</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textSub} />
                    <Text style={styles.timeText}>{(recipe.prep_time || 0) + (recipe.cook_time || 0)}m</Text>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Recipe Generator</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              What are you in the mood for? Mention ingredients, goals, or time limits.
            </Text>

            <TextInput
              style={styles.promptInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g., Quick high-protein vegan lunch with chickpeas"
              placeholderTextColor={theme.textSub}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[
                styles.generateBtn,
                (!prompt.trim() || generating) && styles.generateBtnDisabled
              ]}
              onPress={handleGenerateRecipe}
              disabled={!prompt.trim() || generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="auto-fix" size={20} color="white" />
                  <Text style={styles.generateBtnText}>Generate Custom Recipe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal
        visible={!!selectedRecipe}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={styles.detailClose}>
                <MaterialCommunityIcons name="close" size={28} color={theme.textMain} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteRecipe(selectedRecipe.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color={theme.error} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedRecipe.name}</Text>
              <Text style={styles.detailDescription}>{selectedRecipe.description}</Text>

              <View style={styles.detailMacros}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{selectedRecipe.calories}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(selectedRecipe.protein)}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(selectedRecipe.carbs)}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(selectedRecipe.fat)}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>

              <View style={styles.timeSection}>
                <View style={styles.timeItem}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={theme.primary} />
                  <Text style={styles.timeVal}>{selectedRecipe.prep_time}m <Text style={styles.timeUnit}>Prep</Text></Text>
                </View>
                <View style={styles.timeItem}>
                  <MaterialCommunityIcons name="fire" size={20} color={theme.secondary} />
                  <Text style={styles.timeVal}>{selectedRecipe.cook_time}m <Text style={styles.timeUnit}>Cook</Text></Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <View style={styles.ingredientsCard}>
                  <Text style={styles.ingredientsText}>{selectedRecipe.ingredients}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preparation Steps</Text>
                <View style={styles.stepsCard}>
                  {selectedRecipe.instructions.split('\n').map((step, idx) => (
                    <View key={idx} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  loadingText: { marginTop: 16, color: theme.textSub, fontSize: 16, fontWeight: '500' },
  header: {
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: theme.textMain },
  headerSubtitle: { fontSize: 13, color: theme.textSub, fontWeight: '500' },
  aiButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  scrollContent: { paddingBottom: 40 },
  grid: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: theme.surface, borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: theme.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 18, fontWeight: '700', color: theme.textMain, flex: 1 },
  cardDesc: { fontSize: 14, color: theme.textSub, lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  macroText: { fontSize: 13, color: theme.textMain, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 13, color: theme.textSub, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIconBg: { width: 120, height: 120, borderRadius: 60, backgroundColor: `${theme.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textMain, marginBottom: 12 },
  emptySubtitle: { fontSize: 15, color: theme.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  emptyBtn: { backgroundColor: theme.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.textMain },
  modalSubtitle: { fontSize: 14, color: theme.textSub, lineHeight: 20, marginBottom: 24 },
  promptInput: { backgroundColor: theme.bg, borderRadius: 20, padding: 20, fontSize: 16, color: theme.textMain, height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
  generateBtn: { backgroundColor: theme.primary, borderRadius: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  generateBtnDisabled: { backgroundColor: theme.border },
  generateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  detailContainer: { flex: 1, backgroundColor: theme.bg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  detailClose: { padding: 5 },
  detailContent: { paddingHorizontal: 24 },
  detailTitle: { fontSize: 32, fontWeight: '900', color: theme.textMain, marginBottom: 12 },
  detailDescription: { fontSize: 16, color: theme.textSub, lineHeight: 24, marginBottom: 24 },
  detailMacros: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, justifyContent: 'space-around', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '800', color: theme.textMain },
  macroLabel: { fontSize: 11, color: theme.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  macroDivider: { width: 1, height: 30, backgroundColor: theme.border },
  timeSection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  timeItem: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border },
  timeVal: { fontSize: 16, fontWeight: '800', color: theme.textMain },
  timeUnit: { fontSize: 13, fontWeight: '500', color: theme.textSub },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.textMain, marginBottom: 12 },
  ingredientsCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border },
  ingredientsText: { fontSize: 15, color: theme.textMain, lineHeight: 24 },
  stepsCard: { gap: 16 },
  stepItem: { flexDirection: 'row', gap: 16 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: `${theme.primary}20`, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: theme.primary },
  stepText: { flex: 1, fontSize: 15, color: theme.textMain, lineHeight: 22, paddingTop: 3 },
});

export default RecipesScreen;
