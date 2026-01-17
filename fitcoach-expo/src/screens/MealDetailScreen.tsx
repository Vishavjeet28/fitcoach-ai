import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ImageBackground, StatusBar, Image, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { mealAPI, foodAPI } from '../services/api';

// Theme Configuration from HTML
const theme = {
    bg: '#f6f7f7', // background-light
    surface: '#ffffff', // surface-light
    primary: '#2c696d', // primary
    primaryDark: '#235457', // primary-dark
    textMain: '#111418', // text-main-light
    textSub: '#637588', // text-secondary-light
    placeholder: '#e5e7eb',
    shadow: 'rgba(0, 0, 0, 0.04)',
    floatShadow: 'rgba(0, 0, 0, 0.08)',
};

// Interface for Meal Data
interface FoodItem {
    name: string;
    quantity: number | string;
    unit: string;
    calories: number;
}

export const MealDetailScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { meal, mealType, date } = route.params;

    const [loading, setLoading] = useState(false);
    const [currentMeal, setCurrentMeal] = useState(meal);
    const [checkedIngredients, setCheckedIngredients] = useState<{ [key: number]: boolean }>({ 0: true }); // First item checked by default as per mockup

    // Parse details safely
    let details: any = {};
    if (currentMeal.details) {
        if (typeof currentMeal.details === 'string') {
            try { details = JSON.parse(currentMeal.details); } catch (e) { }
        } else {
            details = currentMeal.details;
        }
    }

    const foodItems = currentMeal.foodItems || [];
    const instructions = details.recipe_instructions || [];

    const handleSwap = async () => {
        setLoading(true);
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const response = await mealAPI.swapMeal(mealType, targetDate);
            if (response && response.meal) {
                setCurrentMeal(response.meal);
                Alert.alert('Swapped', 'Meal updated successfully.');
            } else {
                Alert.alert('Error', 'Failed to swap meal.');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Swap failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleLog = async () => {
        setLoading(true);
        try {
            if (foodItems.length > 0) {
                const logPromises = foodItems.map((item: any) => {
                    return foodAPI.createLog({
                        foodName: item.name,
                        servingSize: parseFloat(item.quantity) || 1,
                        servingUnit: item.unit || 'serving',
                        calories: item.calories,
                        protein: item.protein_g || 0,
                        carbs: item.carbs_g || 0,
                        fat: item.fat_g || 0,
                        mealType: mealType,
                        mealDate: date || new Date().toISOString().split('T')[0]
                    });
                });

                await Promise.all(logPromises);
                Alert.alert('Success', 'Meal logged successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', 'No items to log.');
            }
        } catch (error) {
            console.error('Logging error:', error);
            Alert.alert('Error', 'Failed to log meal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleIngredient = (idx: number) => {
        setCheckedIngredients(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Derived Data
    const mealName = foodItems.length > 0 ? foodItems[0].name : (currentMeal.name || 'Recommended Meal');
    const displayImage = currentMeal.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB53o6YALmg6YeWUMdC7kccGillO0Y7TzF-7rBv3-gC9sTm6ls4w8BjykyG8SwcayOVIg_iXFmVnC2-YzJBBygZ7ePWCLNf4ajigpiOCWeCUVIqoCu7waazuhyVvd5a9PL3DflE9mu3d7Mo2VTCKO0lEpSIuiCMDAa4Wt6IH4sM1Ic09ZDUEwbmR4Ibd6o_YXxniCPs9RYIfOUvcc6ZK94uzyetGl0BofIMYGfljFj6140Rwt3XAbrySJyf130EAiNt-zzwLt0kOuqR';
    const prepTime = details.prep_time || '15 min';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Sticky Top Navigation */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
                    <MaterialIcons name="arrow-back-ios" size={18} color={theme.textMain} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
                <Text style={[styles.navTitle, { opacity: 0 }]}>Meal Detail</Text>
                <TouchableOpacity style={[styles.navBtn, styles.heartBtn]}>
                    <MaterialCommunityIcons name="heart-outline" size={24} color={theme.textMain} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header Image & Title Card */}
                <View style={styles.heroCard}>
                    <ImageBackground source={{ uri: displayImage }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.heroOverlay}
                            start={{ x: 0.5, y: 0.4 }}
                            end={{ x: 0.5, y: 1 }}
                        />
                        <View style={styles.heroContent}>
                            <View style={styles.chipsRow}>
                                <View style={styles.chip}>
                                    <MaterialIcons name="schedule" size={14} color="white" />
                                    <Text style={styles.chipText}>{prepTime}</Text>
                                </View>
                                <View style={styles.chip}>
                                    <MaterialIcons name="local-fire-department" size={14} color="white" />
                                    <Text style={styles.chipText}>{currentMeal.calories} kcal</Text>
                                </View>
                            </View>
                            <Text style={styles.heroTitle} numberOfLines={2}>{mealName}</Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* Macro Dashboard */}
                <View style={styles.macroGrid}>
                    <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroValue}>{currentMeal.protein_g}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroValue}>{currentMeal.carbs_g}g</Text>
                    </View>
                    <View style={styles.macroCard}>
                        <Text style={styles.macroLabel}>Fats</Text>
                        <Text style={styles.macroValue}>{currentMeal.fat_g}g</Text>
                    </View>
                </View>

                {/* Ingredients Section */}
                <View style={[styles.sectionCard, { marginTop: 8 }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{foodItems.length} items</Text>
                        </View>
                    </View>
                    <View style={styles.ingredientsList}>
                        {foodItems.map((item: any, idx: number) => (
                            <TouchableOpacity key={idx} style={styles.ingredientRow} onPress={() => toggleIngredient(idx)} activeOpacity={0.7}>
                                <MaterialCommunityIcons
                                    name={checkedIngredients[idx] ? "checkbox-marked" : "checkbox-blank-outline"}
                                    size={22}
                                    color={checkedIngredients[idx] ? theme.primary : '#d1d5db'}
                                />
                                <Text style={[styles.ingredientText, checkedIngredients[idx] && { color: theme.textMain }]}>
                                    {item.quantity && item.quantity > 0 ? `${item.quantity} ${item.unit || ''} ` : ''}{item.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {foodItems.length === 0 && (
                            <Text style={{ color: theme.textSub, fontStyle: 'italic' }}>No detailed ingredients available.</Text>
                        )}
                    </View>
                </View>

                {/* Preparation Section */}
                <View style={[styles.sectionCard, { marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>Preparation</Text>
                    <View style={styles.stepsList}>
                        {instructions.length > 0 ? (
                            instructions.map((step: string, idx: number) => (
                                <View key={idx} style={styles.stepRow}>
                                    <View style={styles.stepCircle}>
                                        <Text style={styles.stepNumber}>{idx + 1}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: theme.textSub, fontStyle: 'italic' }}>No preparation steps available.</Text>
                        )}
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Floating Action Footer */}
            <View style={styles.footerContainer}>
                <LinearGradient
                    colors={['rgba(246,247,247,0)', 'rgba(246,247,247,0.95)', '#f6f7f7']}
                    style={styles.footerGradient}
                    pointerEvents="none"
                />
                <View style={styles.footerContent}>
                    {/* Swap Logic */}
                    <View style={{ gap: 4 }}>
                        <TouchableOpacity style={styles.swapAction} onPress={handleSwap} disabled={loading}>
                            <MaterialIcons name="sync-alt" size={20} color={theme.textSub} />
                            <Text style={styles.swapText}>Swap meal</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 4, paddingLeft: 4 }}>
                            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                            <View style={[styles.dot, { backgroundColor: '#d1d5db' }]} />
                        </View>
                    </View>

                    {/* Main Action */}
                    <TouchableOpacity style={styles.logButton} onPress={handleLog} activeOpacity={0.9}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <MaterialIcons name="check-circle" size={24} color="white" />
                                <Text style={styles.logButtonText}>Log Meal</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    topNav: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 10,
    },
    navBtn: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: theme.surface,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
    },
    heartBtn: {
        // Heart specific
    },
    navTitle: {
        fontWeight: 'bold', fontSize: 16
    },
    scrollContent: {
        paddingTop: 100, // Space for nav
        paddingHorizontal: 16,
    },
    heroCard: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
        backgroundColor: theme.surface // Placeholder while loading
    },
    heroImage: {
        width: '100%', height: '100%',
        borderRadius: 24,
        justifyContent: 'flex-end',
    },
    heroImageRadius: {
        borderRadius: 24,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    heroContent: {
        padding: 24,
    },
    chipsRow: {
        flexDirection: 'row', gap: 10, marginBottom: 12
    },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 5, paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    chipText: {
        color: 'white', fontWeight: 'bold', fontSize: 12
    },
    heroTitle: {
        fontSize: 28, fontWeight: '800', color: 'white', lineHeight: 34
    },
    macroGrid: {
        flexDirection: 'row', gap: 12, marginBottom: 16
    },
    macroCard: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2
    },
    macroLabel: {
        fontSize: 14, color: theme.textSub, fontWeight: '500', marginBottom: 4
    },
    macroValue: {
        fontSize: 20, color: theme.primary, fontWeight: 'bold'
    },
    sectionCard: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        marginBottom: 8
    },
    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16
    },
    sectionTitle: {
        fontSize: 20, fontWeight: 'bold', color: theme.textMain
    },
    countBadge: {
        backgroundColor: theme.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
    },
    countText: {
        fontSize: 12, fontWeight: '600', color: theme.textSub
    },
    ingredientsList: {
    },
    ingredientRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#f3f4f6'
    },
    ingredientText: {
        fontSize: 16, fontWeight: '500', color: theme.textSub, flex: 1
    },
    stepsList: {
        gap: 24
    },
    stepRow: {
        flexDirection: 'row', gap: 16
    },
    stepCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(44, 105, 109, 0.1)',
        justifyContent: 'center', alignItems: 'center'
    },
    stepNumber: {
        color: theme.primary, fontWeight: 'bold', fontSize: 14
    },
    stepText: {
        flex: 1,
        fontSize: 16, color: theme.textMain, lineHeight: 24
    },

    footerContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
    },
    footerGradient: {
        height: 40,
    },
    footerContent: {
        backgroundColor: theme.bg,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
    },
    swapAction: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    swapText: {
        fontSize: 14, fontWeight: 'bold', color: theme.textSub,
    },
    dot: {
        width: 6, height: 6, borderRadius: 3
    },
    logButton: {
        flex: 1, height: 56,
        backgroundColor: theme.primary,
        borderRadius: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
        shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4
    },
    logButtonText: {
        color: 'white', fontSize: 18, fontWeight: 'bold'
    }
});

