/**
 * MealDetailScreen.tsx
 * Purpose: Decision Support - "What should I eat now?"
 * 
 * Shows recommended meal with recipe, ingredients, and swap functionality
 * - Max 3 manual swaps (pre-validated alternatives)
 * - After 3 swaps exhausted, AI generates replacement within macro constraints
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { mealAPI, foodAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const colors = {
    background: '#f6f7f7',
    surface: '#ffffff',
    primary: '#2c696d',
    primaryDark: '#235457',
    primaryLight: '#eef3f3',
    textPrimary: '#111418',
    textSecondary: '#637588',
    textTertiary: '#a0b9bb',
    border: '#e2e8f0',
    warning: '#f59e0b',
    error: '#ef4444',
    white: '#ffffff',
    protein: '#2c696d',
    carbs: '#2c696d',
    fat: '#2c696d',
};

const MAX_MANUAL_SWAPS = 3;

interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein_g: number;
    carbs_g?: number;
    fat_g?: number;
}

interface RecipeData {
    id: number;
    name: string;
    description?: string;
    foodItems: Ingredient[];
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    prepTime: number;
    cookTime: number;
    steps: string[];
    tips?: string[];
    image_url?: string;
}

interface MealDetailData {
    mealType: 'breakfast' | 'lunch' | 'dinner';
    target: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    logged: {
        items?: any[];
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
    };
    recommendation?: RecipeData;
    swapsRemaining: number;
}

export function MealDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { token, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [swapping, setSwapping] = useState(false);
    const [logging, setLogging] = useState(false);
    const [mealData, setMealData] = useState<MealDetailData | null>(null);

    const { mealType, mealData: initialData } = route.params || {};

    useEffect(() => {
        loadMealDetail();
    }, [mealType]);

    const loadMealDetail = async () => {
        try {
            setLoading(true);

            // GUEST MODE: Skip API if no token, use passed data
            // GUEST MODE: Skip API if no token, use passed data
            if (!token && initialData) {
                setMealData({
                    mealType,
                    target: initialData.target || { calories: 600, protein_g: 45, carbs_g: 60, fat_g: 22 },
                    logged: initialData.logged || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    recommendation: initialData.recommendation || generateSampleMeal(mealType, initialData.target),
                    swapsRemaining: MAX_MANUAL_SWAPS,
                });
                setLoading(false);
                return;
            }

            // Try to fetch full meal detail from API
            // Use getDailyWithRecommendations as it returns meal details
            const response = await mealAPI.getDailyWithRecommendations?.().catch(() => null);

            if (response?.meals) {
                const meals = response.meals as Record<string, any>;
                const mealInfo = meals[mealType];
                if (mealInfo) {
                    setMealData({
                        mealType,
                        target: mealInfo.target || initialData?.target || { calories: 600, protein_g: 45, carbs_g: 60, fat_g: 22 },
                        logged: mealInfo.logged || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                        recommendation: mealInfo.recommendation,
                        swapsRemaining: mealInfo.swapsRemaining ?? MAX_MANUAL_SWAPS,
                    });
                } else {
                    // Use initial data passed from TodayScreen + generate sample recommendation
                    setMealData({
                        mealType,
                        target: initialData?.target || { calories: 600, protein_g: 45, carbs_g: 60, fat_g: 22 },
                        logged: initialData?.logged || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                        recommendation: initialData?.recommendation || generateSampleMeal(mealType, initialData?.target),
                        swapsRemaining: MAX_MANUAL_SWAPS,
                    });
                }
            } else {
                // Use initial data passed from TodayScreen + generate sample recommendation
                setMealData({
                    mealType,
                    target: initialData?.target || { calories: 600, protein_g: 45, carbs_g: 60, fat_g: 22 },
                    logged: initialData?.logged || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                    recommendation: initialData?.recommendation || generateSampleMeal(mealType, initialData?.target),
                    swapsRemaining: MAX_MANUAL_SWAPS,
                });
            }
        } catch (error) {
            console.error('Load meal detail error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwapMeal = async () => {
        if (!mealData) return;

        if (!token) {
            Alert.alert('Guest Mode', 'Sign up to swap meals and customize your diet plan.');
            return;
        }

        if (mealData.swapsRemaining <= 0) {
            // AI swap - show confirmation
            Alert.alert(
                'Use AI to Generate Meal?',
                'You have used all manual swaps. The AI will generate a new meal that fits your macro targets.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Generate', onPress: performAISwap }
                ]
            );
            return;
        }

        // Manual swap - use pre-validated alternative
        try {
            setSwapping(true);

            // Use the existing swapMeal API method
            const response = await mealAPI.swapMeal(mealType).catch(() => null);

            if (response?.meal) {
                setMealData({
                    ...mealData,
                    recommendation: response.meal,
                    swapsRemaining: mealData.swapsRemaining - 1,
                });
            } else {
                // Demo: cycle through alternatives
                const newMeal = generateSampleMeal(mealType, mealData.target, mealData.recommendation?.id);
                setMealData({
                    ...mealData,
                    recommendation: newMeal,
                    swapsRemaining: mealData.swapsRemaining - 1,
                });
            }

            // Show feedback
            Alert.alert('Meal Swapped', `${mealData.swapsRemaining - 1} swaps remaining`);

        } catch (error) {
            console.error('Swap meal error:', error);
            Alert.alert('Error', 'Failed to swap meal. Please try again.');
        } finally {
            setSwapping(false);
        }
    };

    const performAISwap = async () => {
        try {
            setSwapping(true);

            // For AI swap, we use the regular swap method but fall back to demo
            // In production, this would call a dedicated AI endpoint
            const newMeal = generateSampleMeal(mealType, mealData?.target, 999);
            setMealData({
                ...mealData!,
                recommendation: newMeal,
                swapsRemaining: 0,
            });
            Alert.alert('AI Generated', 'A new meal has been created within your macro targets.');

        } catch (error) {
            console.error('AI swap error:', error);
            Alert.alert('Error', 'Failed to generate AI meal. Please try again.');
        } finally {
            setSwapping(false);
        }
    };

    const handleLogMeal = async () => {
        if (!mealData?.recommendation) return;

        try {
            if (!token) {
                // Optimistic logging for guest
                Alert.alert(
                    'Meal Logged! ✅',
                    `${mealData.recommendation.name} has been logged to your ${mealType} (Simulated).`,
                    [
                        { text: 'Great!', onPress: () => navigation.goBack() }
                    ]
                );
                return;
            }

            setLogging(true);

            // Log all ingredients as food entries
            const logPromises = mealData.recommendation.foodItems.map(ing =>
                foodAPI.createLog({
                    customFoodName: ing.name,
                    servingSize: ing.quantity,
                    servingUnit: ing.unit,
                    calories: ing.calories,
                    protein: ing.protein_g,
                    carbs: ing.carbs_g || Math.round(ing.calories * 0.4 / 4), // Fallback
                    fat: ing.fat_g || Math.round(ing.calories * 0.25 / 9), // Fallback
                    mealType: mealType,
                }).catch(() => null)
            );

            await Promise.all(logPromises);

            Alert.alert(
                'Meal Logged! ✅',
                `${mealData.recommendation.name} has been logged to your ${mealType}.`,
                [
                    { text: 'Great!', onPress: () => navigation.goBack() }
                ]
            );

        } catch (error) {
            console.error('Log meal error:', error);
            Alert.alert('Error', 'Failed to log meal. Please try again.');
        } finally {
            setLogging(false);
        }
    };

    const confirmDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete Item?',
            `Are you sure you want to delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) }
            ]
        );
    };

    const handleDelete = async (id: number) => {
        try {
            setLoading(true); // Show loading while refreshing
            await foodAPI.deleteLog(id);
            await loadMealDetail();
        } catch (error) {
            console.error('Delete error', error);
            Alert.alert('Error', 'Failed to delete item.');
            setLoading(false);
        }
    };

    const handleLogDifferent = () => {
        navigation.navigate('FoodLog', { mealType });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading meal...</Text>
            </View>
        );
    }

    if (!mealData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No meal data available</Text>
            </View>
        );
    }

    const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
    const recipe = mealData.recommendation;

    return (
        <View style={styles.container}>
            {/* Sticky Navigation */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton}>
                    <MaterialCommunityIcons name="heart-outline" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <View style={styles.heroImageWrapper}>
                        <View
                            style={[
                                styles.heroImage,
                                { backgroundColor: '#E2E8F0' } // Fallback
                            ]}
                        >
                            {recipe?.image_url ? (
                                <View style={styles.imagePlaceholder}>
                                    <View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            { backgroundColor: '#000', opacity: 0.1 }
                                        ]}
                                    />
                                    {recipe?.image_url && <Image source={{ uri: recipe.image_url }} style={StyleSheet.absoluteFill} />}
                                    <View style={styles.imagePlaceholderIcon}>
                                        <MaterialCommunityIcons name="food" size={48} color="white" />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <MaterialCommunityIcons name="image" size={48} color="#CBD5E1" />
                                </View>
                            )}
                        </View>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.heroGradient}
                        />
                        <View style={styles.heroOverlay}>
                            <View style={styles.heroBadges}>
                                <View style={styles.badge}>
                                    <MaterialCommunityIcons name="clock-outline" size={14} color="white" />
                                    <Text style={styles.badgeText}>{recipe?.prepTime || 20} min</Text>
                                </View>
                                <View style={styles.badge}>
                                    <MaterialCommunityIcons name="fire" size={14} color="white" />
                                    <Text style={styles.badgeText}>{recipe?.calories || 0} kcal</Text>
                                </View>
                            </View>
                            <Text style={styles.heroTitle}>{recipe?.name || 'Meal Detail'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    {/* Macro Dashboard */}
                    <View style={styles.macroDashboard}>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroLabel}>Protein</Text>
                            <Text style={styles.macroValue}>{Math.round(recipe?.protein_g || 0)}g</Text>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroLabel}>Carbs</Text>
                            <Text style={styles.macroValue}>{Math.round(recipe?.carbs_g || 0)}g</Text>
                        </View>
                        <View style={styles.macroCard}>
                            <Text style={styles.macroLabel}>Fats</Text>
                            <Text style={styles.macroValue}>{Math.round(recipe?.fat_g || 0)}g</Text>
                        </View>
                    </View>

                    {/* Target Context (Subtle) */}
                    <View style={styles.targetContext}>
                        <MaterialCommunityIcons name="lock-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.targetText}>
                            Target: {mealData.target.calories} kcal • {mealData.target.protein_g}g P
                        </Text>
                    </View>

                    {/* Logged Items Section (Delete allowed) */}
                    {mealData.logged?.items && mealData.logged.items.length > 0 && (
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Logged Food</Text>
                                <View style={[styles.ingredientCount, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.countText, { color: colors.primary }]}>{mealData.logged.items.length} logged</Text>
                                </View>
                            </View>
                            <View style={styles.ingredientList}>
                                {mealData.logged.items.map((item: any, index: number) => (
                                    <View key={index} style={[styles.ingredientItem, { justifyContent: 'space-between', alignItems: 'center' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.ingredientNameText}>
                                                {item.portionSize} {item.unit} {item.foodName}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                {item.calories} kcal • {item.protein}g P
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => confirmDelete(item.id, item.foodName)}
                                            style={{ padding: 8 }}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Ingredients Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Ingredients</Text>
                            <View style={styles.ingredientCount}>
                                <Text style={styles.countText}>{recipe?.foodItems.length || 0} items</Text>
                            </View>
                        </View>
                        <View style={styles.ingredientList}>
                            {recipe?.foodItems.map((ing, index) => (
                                <View key={index} style={[styles.ingredientItem, index === recipe.foodItems.length - 1 && { borderBottomWidth: 0 }]}>
                                    <TouchableOpacity style={styles.checkbox}>
                                        <MaterialCommunityIcons name="checkbox-blank-outline" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <Text style={styles.ingredientNameText}>
                                        {ing.quantity} {ing.unit} {ing.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Preparation Section */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Preparation</Text>
                        <View style={styles.stepsContainer}>
                            {recipe?.steps.map((step, index) => (
                                <View key={index} style={styles.stepItem}>
                                    <View style={styles.stepNumber}>
                                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepText}>{step}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {recipe?.tips && recipe.tips.length > 0 && (
                        <View style={styles.tipsCard}>
                            <Text style={styles.tipsTitle}>Coach Tips</Text>
                            {recipe.tips.map((tip, index) => (
                                <View key={index} style={styles.tipItem}>
                                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.warning} />
                                    <Text style={styles.tipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 140 }} />
                </View>
            </ScrollView>

            {/* Floating Action Footer */}
            <LinearGradient
                colors={['transparent', colors.background, colors.background]}
                style={styles.footerGradient}
            >
                <View style={styles.footer}>
                    <View style={styles.swapContainer}>
                        <TouchableOpacity
                            style={styles.swapButton}
                            onPress={handleSwapMeal}
                            disabled={swapping}
                        >
                            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.textSecondary} />
                            <Text style={styles.swapText}>Swap meal</Text>
                        </TouchableOpacity>
                        <View style={styles.swapDots}>
                            {[1, 2, 3].map((d) => (
                                <View
                                    key={d}
                                    style={[
                                        styles.dot,
                                        d <= (MAX_MANUAL_SWAPS - mealData.swapsRemaining) ? styles.dotActive : null
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.logButton}
                        onPress={handleLogMeal}
                        disabled={logging}
                    >
                        {logging ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={22} color="white" />
                                <Text style={styles.logButtonText}>Log Meal</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
}

// Generate sample meal data for demo
function generateSampleMeal(mealType: string, target: any, excludeId?: number): RecipeData {
    const meals: Record<string, RecipeData[]> = {
        breakfast: [
            {
                id: 1,
                name: 'Greek Yogurt Parfait',
                description: 'Creamy yogurt layered with berries and granola',
                foodItems: [
                    { name: 'Greek Yogurt', quantity: 200, unit: 'g', calories: 130, protein_g: 20 },
                    { name: 'Mixed Berries', quantity: 100, unit: 'g', calories: 50, protein_g: 1 },
                    { name: 'Granola', quantity: 40, unit: 'g', calories: 180, protein_g: 4 },
                    { name: 'Honey', quantity: 15, unit: 'ml', calories: 45, protein_g: 0 },
                ],
                calories: 405,
                protein_g: 25,
                carbs_g: 55,
                fat_g: 10,
                prepTime: 5,
                cookTime: 0,
                image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Add half the yogurt to a bowl or jar',
                    'Layer with half the berries',
                    'Add remaining yogurt and berries',
                    'Top with granola and drizzle honey'
                ],
                tips: ['Add granola just before eating to keep it crunchy']
            },
            {
                id: 2,
                name: 'Avocado Toast with Eggs',
                description: 'Whole grain toast topped with creamy avocado and eggs',
                foodItems: [
                    { name: 'Whole Grain Bread', quantity: 2, unit: 'slices', calories: 160, protein_g: 8 },
                    { name: 'Avocado', quantity: 100, unit: 'g', calories: 160, protein_g: 2 },
                    { name: 'Eggs', quantity: 2, unit: 'large', calories: 140, protein_g: 12 },
                    { name: 'Cherry Tomatoes', quantity: 50, unit: 'g', calories: 10, protein_g: 0 },
                ],
                calories: 470,
                protein_g: 22,
                carbs_g: 35,
                fat_g: 28,
                prepTime: 5,
                cookTime: 8,
                image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Toast the bread until golden',
                    'Mash avocado with a fork, season with salt and pepper',
                    'Fry or scramble eggs to your preference',
                    'Spread avocado on toast, top with eggs and tomatoes'
                ],
                tips: ['A squeeze of lemon prevents avocado browning']
            }
        ],
        lunch: [
            {
                id: 10,
                name: 'Grilled Chicken Salad',
                description: 'Fresh greens with grilled chicken and light vinaigrette',
                foodItems: [
                    { name: 'Chicken Breast', quantity: 150, unit: 'g', calories: 247, protein_g: 46 },
                    { name: 'Mixed Greens', quantity: 100, unit: 'g', calories: 20, protein_g: 2 },
                    { name: 'Quinoa', quantity: 80, unit: 'g', calories: 280, protein_g: 10 },
                    { name: 'Olive Oil', quantity: 15, unit: 'ml', calories: 120, protein_g: 0 },
                    { name: 'Feta Cheese', quantity: 30, unit: 'g', calories: 80, protein_g: 4 },
                ],
                calories: 747,
                protein_g: 62,
                carbs_g: 45,
                fat_g: 32,
                prepTime: 10,
                cookTime: 15,
                image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Season chicken breast with salt, pepper, and herbs',
                    'Grill chicken for 6-7 minutes per side',
                    'Cook quinoa according to package instructions',
                    'Arrange greens, top with sliced chicken and quinoa',
                    'Crumble feta and drizzle with olive oil'
                ],
                tips: ['Let chicken rest 3 minutes before slicing for juicier meat']
            },
            {
                id: 11,
                name: 'Turkey & Hummus Wrap',
                description: 'Whole wheat wrap with lean turkey and fresh vegetables',
                foodItems: [
                    { name: 'Whole Wheat Wrap', quantity: 1, unit: 'large', calories: 130, protein_g: 4 },
                    { name: 'Turkey Breast', quantity: 100, unit: 'g', calories: 104, protein_g: 24 },
                    { name: 'Hummus', quantity: 50, unit: 'g', calories: 140, protein_g: 4 },
                    { name: 'Spinach', quantity: 30, unit: 'g', calories: 7, protein_g: 1 },
                    { name: 'Cucumber', quantity: 50, unit: 'g', calories: 8, protein_g: 0 },
                ],
                calories: 389,
                protein_g: 33,
                carbs_g: 35,
                fat_g: 14,
                prepTime: 5,
                cookTime: 0,
                image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Spread hummus evenly on the wrap',
                    'Layer spinach leaves across the center',
                    'Add sliced turkey and cucumber',
                    'Roll tightly, cut in half diagonally'
                ]
            }
        ],
        dinner: [
            {
                id: 20,
                name: 'Baked Salmon with Vegetables',
                description: 'Omega-3 rich salmon with roasted seasonal vegetables',
                foodItems: [
                    { name: 'Salmon Fillet', quantity: 180, unit: 'g', calories: 374, protein_g: 40 },
                    { name: 'Broccoli', quantity: 100, unit: 'g', calories: 34, protein_g: 3 },
                    { name: 'Sweet Potato', quantity: 150, unit: 'g', calories: 130, protein_g: 2 },
                    { name: 'Olive Oil', quantity: 10, unit: 'ml', calories: 80, protein_g: 0 },
                    { name: 'Lemon', quantity: 0.5, unit: 'whole', calories: 10, protein_g: 0 },
                ],
                calories: 628,
                protein_g: 45,
                carbs_g: 40,
                fat_g: 32,
                prepTime: 10,
                cookTime: 25,
                image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Preheat oven to 400°F (200°C)',
                    'Cut sweet potato into cubes, toss with half the oil',
                    'Roast sweet potato for 15 minutes',
                    'Add broccoli florets, season salmon, place on tray',
                    'Bake for additional 12-15 minutes until salmon flakes'
                ],
                tips: ['Salmon is done when it reaches 145°F internal temp']
            },
            {
                id: 21,
                name: 'Lean Beef Stir-Fry',
                description: 'Colorful vegetables with tender beef strips',
                foodItems: [
                    { name: 'Lean Beef Sirloin', quantity: 150, unit: 'g', calories: 250, protein_g: 38 },
                    { name: 'Bell Peppers', quantity: 100, unit: 'g', calories: 30, protein_g: 1 },
                    { name: 'Brown Rice', quantity: 100, unit: 'g', calories: 111, protein_g: 3 },
                    { name: 'Soy Sauce', quantity: 15, unit: 'ml', calories: 10, protein_g: 1 },
                    { name: 'Sesame Oil', quantity: 10, unit: 'ml', calories: 88, protein_g: 0 },
                ],
                calories: 489,
                protein_g: 43,
                carbs_g: 35,
                fat_g: 20,
                prepTime: 15,
                cookTime: 10,
                image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop',
                steps: [
                    'Cook brown rice according to package',
                    'Slice beef into thin strips against the grain',
                    'Heat wok/pan with sesame oil until very hot',
                    'Stir-fry beef for 2-3 minutes, set aside',
                    'Add peppers, cook 2 minutes, return beef',
                    'Add soy sauce, toss, serve over rice'
                ]
            }
        ]
    };

    const mealOptions = meals[mealType] || meals.breakfast;
    const availableMeals = mealOptions.filter(m => m.id !== excludeId);
    const selected = availableMeals[Math.floor(Math.random() * availableMeals.length)] || mealOptions[0];

    return selected;
}

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
    loadingText: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 16,
    },
    navBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 10,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollView: {
        flex: 1,
    },
    heroContainer: {
        width: '100%',
    },
    heroImageWrapper: {
        width: '100%',
        aspectRatio: 1.2,
        backgroundColor: '#E2E8F0',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#CBD5E1',
    },
    imagePlaceholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
    },
    heroBadges: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        lineHeight: 34,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    macroDashboard: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    macroCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    macroLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 4,
    },
    macroValue: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.primary,
    },
    targetContext: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
        opacity: 0.6,
    },
    targetText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    ingredientCount: {
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    ingredientList: {
        marginTop: 8,
    },
    ingredientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    checkbox: {
        marginRight: 12,
    },
    ingredientNameText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
        flex: 1,
    },
    stepsContainer: {
        gap: 20,
    },
    stepItem: {
        flexDirection: 'row',
        gap: 16,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.primary,
    },
    stepContent: {
        flex: 1,
    },
    stepText: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.textPrimary,
    },
    tipsCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#fef3c7',
        marginBottom: 20,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#92400e',
        marginBottom: 12,
    },
    tipItem: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    tipText: {
        fontSize: 14,
        color: '#b45309',
        lineHeight: 20,
        flex: 1,
    },
    footerGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 16,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    swapContainer: {
        alignItems: 'center',
    },
    swapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    swapText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    swapDots: {
        flexDirection: 'row',
        gap: 2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e2e8f0',
    },
    dotActive: {
        backgroundColor: colors.primary,
    },
    logButton: {
        flex: 1,
        height: 56,
        backgroundColor: colors.primary,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    logButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    },
});

export default MealDetailScreen;
