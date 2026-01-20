import { query } from '../config/database.js';
import MDE from '../services/mealDistributionEngine.js';
import MealRecommendationEngine from '../services/mealRecommendationEngine.js';

export const getDailyMealDistribution = async (req, res) => {
    try {
        const userId = req.user.id;
        const date = new Date().toISOString().split('T')[0];

        // 1. Fetch Existing Profile
        const profileRes = await query(
            `SELECT * FROM meal_distribution_profiles 
             WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );

        if (profileRes.rows.length > 0) {
            // Transform DB structure back to logical structure
            const p = profileRes.rows[0];
            return res.json({
                meta: {
                    date: p.date,
                    goal_style: p.goal_style,
                    meal_style: p.meal_style
                },
                meals: {
                    breakfast: {
                        calories: p.breakfast_calories,
                        protein: p.breakfast_protein_g,
                        carbs: p.breakfast_carbs_g,
                        fat: p.breakfast_fat_g
                    },
                    lunch: {
                        calories: p.lunch_calories,
                        protein: p.lunch_protein_g,
                        carbs: p.lunch_carbs_g,
                        fat: p.lunch_fat_g
                    },
                    dinner: {
                        calories: p.dinner_calories,
                        protein: p.dinner_protein_g,
                        carbs: p.dinner_carbs_g,
                        fat: p.dinner_fat_g
                    }
                }
            });
        }

        // 2. If Not Exist, Calculate & Save
        // We need user targets first (From Fitness Logic Engine / Users table)
        // Assuming strict source of truth is stored in users or can be re-derived.
        // Let's grab stored targets from `goals` table (active goal)
        const userRes = await query(
            `SELECT calorie_target::int, protein_target_g::int as protein_target, carb_target_g::int as carb_target, fat_target_g::int as fat_target 
             FROM goals WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );

        let targets = userRes.rows[0];

        // If targets are null/zero (new user), use fallback or trigger calculation
        if (!targets || !targets.calorie_target) {
            // Strict mode: Fail/Error or return default?
            // "AI MUST NEVER decide total calories". 
            // If DB has no targets, we can't distribute.
            return res.status(400).json({ error: "No fitness targets defined. Set targets first." });
        }

        // Targets mapping
        // Logic Engine expects camelCase
        const engineTargets = {
            calorie_target: targets.calorie_target,
            protein_target: targets.protein_target,
            carb_target: targets.carb_target,
            fat_target: targets.fat_target
        };

        // Preferences (Default)
        // Or could fetch last used preference from previous day
        const prefs = { meal_style: 'fixed', goal_style: 'balanced' };

        const distribution = MDE.distributePlan(engineTargets, prefs);

        // Save to DB
        await query(
            `INSERT INTO meal_distribution_profiles (
                user_id, date, meal_style, goal_style,
                breakfast_calories, breakfast_protein_g, breakfast_carbs_g, breakfast_fat_g,
                lunch_calories, lunch_protein_g, lunch_carbs_g, lunch_fat_g,
                dinner_calories, dinner_protein_g, dinner_carbs_g, dinner_fat_g
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
                userId, date, prefs.meal_style, prefs.goal_style,
                distribution.meals.breakfast.calories, distribution.meals.breakfast.protein, distribution.meals.breakfast.carbs, distribution.meals.breakfast.fat,
                distribution.meals.lunch.calories, distribution.meals.lunch.protein, distribution.meals.lunch.carbs, distribution.meals.lunch.fat,
                distribution.meals.dinner.calories, distribution.meals.dinner.protein, distribution.meals.dinner.carbs, distribution.meals.dinner.fat
            ]
        );

        return res.json(distribution);

    } catch (error) {
        console.error('Get Meal Distribution Error:', error);
        res.status(500).json({ error: 'Failed to fetch meal distribution' });
    }
};

export const recalculateDistribution = async (req, res) => {
    try {
        const userId = req.user.id;
        const { meal_style, goal_style } = req.body;
        const date = new Date().toISOString().split('T')[0];

        // 1. Get Targets
        const userRes = await query(
            `SELECT calorie_target::int, protein_target_g::int as protein_target, carb_target_g::int as carb_target, fat_target_g::int as fat_target 
             FROM goals WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
        );
        const targets = userRes.rows[0];

        // 2. Calculate
        const distribution = MDE.distributePlan({
            calorie_target: targets.calorie_target,
            protein_target: targets.protein_target,
            carb_target: targets.carb_target,
            fat_target: targets.fat_target
        }, { meal_style, goal_style });

        // 3. Upsert
        await query(
            `INSERT INTO meal_distribution_profiles (
                user_id, date, meal_style, goal_style,
                breakfast_calories, breakfast_protein_g, breakfast_carbs_g, breakfast_fat_g,
                lunch_calories, lunch_protein_g, lunch_carbs_g, lunch_fat_g,
                dinner_calories, dinner_protein_g, dinner_carbs_g, dinner_fat_g
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (user_id, date) DO UPDATE SET
                meal_style = EXCLUDED.meal_style,
                goal_style = EXCLUDED.goal_style,
                breakfast_calories = EXCLUDED.breakfast_calories,
                breakfast_protein_g = EXCLUDED.breakfast_protein_g,
                breakfast_carbs_g = EXCLUDED.breakfast_carbs_g,
                breakfast_fat_g = EXCLUDED.breakfast_fat_g,
                lunch_calories = EXCLUDED.lunch_calories,
                lunch_protein_g = EXCLUDED.lunch_protein_g,
                lunch_carbs_g = EXCLUDED.lunch_carbs_g,
                lunch_fat_g = EXCLUDED.lunch_fat_g,
                dinner_calories = EXCLUDED.dinner_calories,
                dinner_protein_g = EXCLUDED.dinner_protein_g,
                dinner_carbs_g = EXCLUDED.dinner_carbs_g,
                dinner_fat_g = EXCLUDED.dinner_fat_g
            `,
            [
                userId, date, meal_style, goal_style,
                distribution.meals.breakfast.calories, distribution.meals.breakfast.protein, distribution.meals.breakfast.carbs, distribution.meals.breakfast.fat,
                distribution.meals.lunch.calories, distribution.meals.lunch.protein, distribution.meals.lunch.carbs, distribution.meals.lunch.fat,
                distribution.meals.dinner.calories, distribution.meals.dinner.protein, distribution.meals.dinner.carbs, distribution.meals.dinner.fat
            ]
        );

        res.json(distribution);

    } catch (error) {
        console.error('Recalculate Error:', error);
        res.status(500).json({ error: 'Failed to recalculate meals' });
    }
};

/**
 * Generate daily meal plan with AI recommendations
 * POST /api/meals/generate-daily-plan
 */
export const generateDailyPlan = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.body;

        // Use today if no date provided
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Generate full day plan (breakfast, lunch, dinner)
        const plan = await MealRecommendationEngine.generateDailyPlan(userId, targetDate);

        if (!plan.success) {
            throw new Error(plan.error || 'Failed to generate meal plan');
        }

        // Map results
        const mappedMeals = {};
        Object.entries(plan.data.meals).forEach(([type, meal]) => {
            mappedMeals[type] = mapRecommendationToFrontend(meal, true);
        });

        res.json({
            success: true,
            date: targetDate,
            meals: mappedMeals
        });

    } catch (error) {
        console.error('Generate Daily Plan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate meal plan',
            message: error.message
        });
    }
};

/**
 * Swap a specific meal with AI alternative
 * POST /api/meals/swap-meal
 */
export const swapMeal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, mealType } = req.body;

        // Validate meal type
        if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid meal type. Must be breakfast, lunch, or dinner'
            });
        }

        // Use today if no date provided
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Swap the meal
        const newMeal = await MealRecommendationEngine.swapMeal(userId, targetDate, mealType);

        res.json({
            success: true,
            date: targetDate,
            mealType,
            meal: mapRecommendationToFrontend(newMeal, true)
        });

    } catch (error) {
        console.error('Swap Meal Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to swap meal',
            message: error.message
        });
    }
};

/**
 * Get daily meals with recommendations AND logged food
 * Enhanced version of existing endpoint
 * GET /api/meals/daily?date=YYYY-MM-DD
 */
export const getDailyMealsWithRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // 1. Get meal distribution targets (or create if user has calorie_target)
        let distributionRes = await query(
            `SELECT * FROM meal_distribution_profiles 
             WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );

        // Auto-create distribution if none exists but user has calorie_target
        if (distributionRes.rows.length === 0) {
            const userRes = await query(
                `SELECT calorie_target, 
                        ROUND(calorie_target * 0.3 / 4) as protein_target_g,
                        ROUND(calorie_target * 0.4 / 4) as carbs_target_g,
                        ROUND(calorie_target * 0.3 / 9) as fat_target_g
                 FROM users WHERE id = $1 AND calorie_target IS NOT NULL AND calorie_target > 0`,
                [userId]
            );

            if (userRes.rows.length > 0 && userRes.rows[0].calorie_target > 0) {
                const user = userRes.rows[0];

                // Calculate 30/40/30 split
                const breakfastCals = Math.round(user.calorie_target * 0.30);
                const lunchCals = Math.round(user.calorie_target * 0.40);
                const dinnerCals = Math.round(user.calorie_target * 0.30);

                const breakfastProtein = Math.round(user.protein_target_g * 0.30);
                const lunchProtein = Math.round(user.protein_target_g * 0.40);
                const dinnerProtein = Math.round(user.protein_target_g * 0.30);

                const breakfastCarbs = Math.round(user.carbs_target_g * 0.30);
                const lunchCarbs = Math.round(user.carbs_target_g * 0.40);
                const dinnerCarbs = Math.round(user.carbs_target_g * 0.30);

                const breakfastFat = Math.round(user.fat_target_g * 0.30);
                const lunchFat = Math.round(user.fat_target_g * 0.40);
                const dinnerFat = Math.round(user.fat_target_g * 0.30);

                // Create default 30/40/30 distribution (matches migration 004 schema)
                const insertRes = await query(
                    `INSERT INTO meal_distribution_profiles (
                        user_id, date, 
                        breakfast_calories, breakfast_protein_g, breakfast_carbs_g, breakfast_fat_g,
                        lunch_calories, lunch_protein_g, lunch_carbs_g, lunch_fat_g,
                        dinner_calories, dinner_protein_g, dinner_carbs_g, dinner_fat_g
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *`,
                    [
                        userId, date,
                        breakfastCals, breakfastProtein, breakfastCarbs, breakfastFat,
                        lunchCals, lunchProtein, lunchCarbs, lunchFat,
                        dinnerCals, dinnerProtein, dinnerCarbs, dinnerFat
                    ]
                );
                distributionRes = { rows: insertRes.rows };
                console.log(`✅ [MEALS] Auto-created meal distribution for user ${userId}, date ${date}`);
            }
        }

        // 2. Get AI recommendations (if exist)
        const recommendationsRes = await query(
            `SELECT id, meal_type, recommended_food_items, recommended_details, 
                    target_calories, target_protein_g, target_carbs_g, target_fat_g,
                    generation_method, reasoning, created_at, swap_count
             FROM daily_meal_recommendations 
             WHERE user_id = $1 AND date = $2 AND is_active = TRUE
             ORDER BY meal_type`,
            [userId, date]
        );

        // 3. Get logged food
        const loggedRes = await query(
            `SELECT fl.id, fl.meal_type, 
                    COALESCE(f.name, fl.custom_food_name) as food_name,
                    fl.servings as portion_size, 
                    COALESCE(f.serving_unit, 'serving') as unit,
                    fl.calories, fl.protein, fl.carbs, fl.fat, fl.logged_at
             FROM food_logs fl
             LEFT JOIN foods f ON fl.food_id = f.id
             WHERE fl.user_id = $1 AND fl.meal_date = $2
             ORDER BY fl.meal_type, fl.logged_at`,
            [userId, date]
        );

        // 4. Get compliance data (if exists)
        const complianceRes = await query(
            `SELECT meal_type, compliance_score, was_followed, was_swapped, swap_count
             FROM meal_compliance
             WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );

        // Transform into structured response
        const distribution = distributionRes.rows[0] || null;
        const recommendations = {};
        const logged = {};
        const compliance = {};

        // Group recommendations by meal type
        recommendationsRes.rows.forEach(rec => {
            recommendations[rec.meal_type] = mapRecommendationToFrontend(rec);
        });

        // Group logged food by meal type
        loggedRes.rows.forEach(log => {
            if (!logged[log.meal_type]) {
                logged[log.meal_type] = {
                    items: [],
                    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }
                };
            }
            logged[log.meal_type].items.push({
                id: log.id,
                foodName: log.food_name,
                portionSize: log.portion_size,
                unit: log.unit,
                calories: log.calories,
                protein: log.protein,
                carbs: log.carbs,
                fat: log.fat,
                loggedAt: log.logged_at
            });
            logged[log.meal_type].totals.calories += Number(log.calories || 0);
            logged[log.meal_type].totals.protein += Number(log.protein || 0);
            logged[log.meal_type].totals.carbs += Number(log.carbs || 0);
            logged[log.meal_type].totals.fat += Number(log.fat || 0);
        });

        // Group compliance by meal type
        complianceRes.rows.forEach(comp => {
            compliance[comp.meal_type] = {
                score: comp.compliance_score,
                wasFollowed: comp.was_followed,
                wasSwapped: comp.was_swapped,
                swapCount: comp.swap_count
            };
        });

        // Build response structure
        const meals = {
            breakfast: {
                targets: distribution ? {
                    calories: distribution.breakfast_calories,
                    protein_g: distribution.breakfast_protein_g,
                    carbs_g: distribution.breakfast_carbs_g,
                    fat_g: distribution.breakfast_fat_g
                } : null,
                recommendation: recommendations.breakfast || null,
                logged: logged.breakfast || { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
                compliance: compliance.breakfast || null
            },
            lunch: {
                targets: distribution ? {
                    calories: distribution.lunch_calories,
                    protein_g: distribution.lunch_protein_g,
                    carbs_g: distribution.lunch_carbs_g,
                    fat_g: distribution.lunch_fat_g
                } : null,
                recommendation: recommendations.lunch || null,
                logged: logged.lunch || { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
                compliance: compliance.lunch || null
            },
            dinner: {
                targets: distribution ? {
                    calories: distribution.dinner_calories,
                    protein_g: distribution.dinner_protein_g,
                    carbs_g: distribution.dinner_carbs_g,
                    fat_g: distribution.dinner_fat_g
                } : null,
                recommendation: recommendations.dinner || null,
                logged: logged.dinner || { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
                compliance: compliance.dinner || null
            }
        };

        res.json({
            success: true,
            date,
            meals,
            distribution: distribution ? {
                mealStyle: distribution.meal_style,
                goalStyle: distribution.goal_style
            } : null
        });

    } catch (error) {
        console.error('Get Daily Meals Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily meals',
            message: error.message
        });
    }
};

/**
 * Helper to map DB recommendation or engine output to frontend format
 */
function mapRecommendationToFrontend(rec, isEngineOutput = false) {
    if (!rec) return null;

    const foodItems = isEngineOutput ? rec.food_items : rec.recommended_food_items;
    const details = isEngineOutput ? rec.details : rec.recommended_details;
    const items = foodItems || [];
    const dets = details || {};

    return {
        id: rec.id,
        name: items[0]?.name || 'Recommended Meal',
        description: rec.reasoning || rec.ai_reasoning || dets.description || '',
        foodItems: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            protein_g: item.protein || item.protein_g,
            carbs_g: item.carbs || item.carbs_g,
            fat_g: item.fat || item.fat_g
        })),
        calories: isEngineOutput ? rec.calories : rec.target_calories,
        protein_g: isEngineOutput ? rec.protein_g : rec.target_protein_g,
        carbs_g: isEngineOutput ? rec.carbs_g : rec.target_carbs_g,
        fat_g: isEngineOutput ? rec.fat_g : rec.target_fat_g,
        prepTime: parseInt(dets.prep_time) || 10,
        cookTime: parseInt(dets.cook_time) || 15,
        steps: dets.recipe_instructions || [],
        tips: dets.tips || [],
        swapCount: rec.swap_count
    };
}


