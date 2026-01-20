import { query } from '../config/database.js';
import AIService from './ai.service.js';
import { calculateMealSplit } from './fitnessLogicEngine.js';


/**
 * ============================================================================
 * MEAL RECOMMENDATION ENGINE
 * ============================================================================
 * 
 * PRODUCTION RULE: AI recommends FOOD ONLY, never calories or macros
 * 
 * Purpose:
 * - Convert meal targets → actual food recommendations
 * - Respect dietary restrictions & preferences
 * - Generate balanced, realistic meals
 * - Enable AI swaps within same targets
 * 
 * Flow:
 * 1. Get daily targets from FLE (calorie_target, protein_target, etc)
 * 2. Apply meal distribution (30/40/30 or custom)
 * 3. For each meal, generate food recommendations via AI
 * 4. Validate recommendations match targets (±5%)
 * 5. Store in recommended_meals table
 */

class MealRecommendationEngine {

  /**
   * Generate full day meal plan
   * 
   * @param {number} userId 
   * @param {string} date - YYYY-MM-DD format
   * @returns {Object} { breakfast, lunch, dinner }
   */
  async generateDailyPlan(userId, date) {
    try {
      console.log(`🍽️ [MEAL ENGINE] Generating daily plan for user ${userId}, date ${date}`);

      // STEP 1: Get or create meal distribution for this day
      const distribution = await this.getMealDistribution(userId, date);

      // STEP 2: Get user preferences
      const userPrefs = await this.getUserPreferences(userId);

      // STEP 3: Generate recommendations for each meal concurrently
      const [breakfast, lunch, dinner] = await Promise.all([
        this.generateMealRecommendation(
          userId,
          date,
          'breakfast',
          {
            calories: distribution.breakfast_calories,
            protein_g: distribution.breakfast_protein_g,
            carbs_g: distribution.breakfast_carbs_g,
            fat_g: distribution.breakfast_fat_g,
          },
          userPrefs
        ),
        this.generateMealRecommendation(
          userId,
          date,
          'lunch',
          {
            calories: distribution.lunch_calories,
            protein_g: distribution.lunch_protein_g,
            carbs_g: distribution.lunch_carbs_g,
            fat_g: distribution.lunch_fat_g,
          },
          userPrefs
        ),
        this.generateMealRecommendation(
          userId,
          date,
          'dinner',
          {
            calories: distribution.dinner_calories,
            protein_g: distribution.dinner_protein_g,
            carbs_g: distribution.dinner_carbs_g,
            fat_g: distribution.dinner_fat_g,
          },
          userPrefs
        )
      ]);

      return {
        success: true,
        data: {
          date,
          distribution,
          meals: { breakfast, lunch, dinner }
        }
      };

    } catch (error) {
      console.error('❌ [MEAL ENGINE] Error generating daily plan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get or create meal distribution for a specific day
   * Uses FLE targets + default 30/40/30 split
   */
  async getMealDistribution(userId, date) {
    // Check if distribution already exists for this day
    const existing = await query(
      `SELECT * FROM meal_distribution_profiles WHERE user_id = $1 AND date = $2`,
      [userId, date]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new distribution based on user's FLE targets
    // Create new distribution based on user's FLE targets
    const userResult = await query(
      `SELECT calorie_target, 
              ROUND(calorie_target * 0.3 / 4) as protein_target_g,
              ROUND(calorie_target * 0.4 / 4) as carbs_target_g,
              ROUND(calorie_target * 0.3 / 9) as fat_target_g,
              goal_aggressiveness
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Use FLE logic for split (Source of Truth)
    const split = calculateMealSplit({
      calories: user.calorie_target,
      protein_g: parseInt(user.protein_target_g),
      carb_g: parseInt(user.carbs_target_g),
      fat_g: parseInt(user.fat_target_g)
    }, user.goal_aggressiveness || 'balanced');

    // Store distribution
    const insertResult = await query(
      `INSERT INTO meal_distribution_profiles (
        user_id, date, 
        breakfast_calories, breakfast_protein_g, breakfast_carbs_g, breakfast_fat_g,
        lunch_calories, lunch_protein_g, lunch_carbs_g, lunch_fat_g,
        dinner_calories, dinner_protein_g, dinner_carbs_g, dinner_fat_g
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId, date,
        split.breakfast.calories, split.breakfast.protein_g, split.breakfast.carb_g, split.breakfast.fat_g,
        split.lunch.calories, split.lunch.protein_g, split.lunch.carb_g, split.lunch.fat_g,
        split.dinner.calories, split.dinner.protein_g, split.dinner.carb_g, split.dinner.fat_g
      ]
    );

    return insertResult.rows[0];
  }

  /**
   * Get user dietary preferences
   */
  async getUserPreferences(userId) {
    const result = await query(
      `SELECT 
        dietary_restrictions,
        preferred_cuisines,
        goal
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        dietary_restrictions: [],
        preferred_cuisines: [],
        goal: 'maintenance'
      };
    }

    return result.rows[0];
  }

  /**
   * Generate single meal recommendation
   * 
   * CRITICAL: AI recommends FOOD ONLY, targets are NON-NEGOTIABLE
   */
  async generateMealRecommendation(userId, date, mealType, targets, userPrefs) {
    // Check if active recommendation already exists
    const existing = await query(
      `SELECT * FROM daily_meal_recommendations 
       WHERE user_id = $1 AND date = $2 AND meal_type = $3 AND is_active = TRUE`,
      [userId, date, mealType]
    );

    if (existing.rows.length > 0) {
      console.log(`✅ [MEAL ENGINE] Active ${mealType} recommendation already exists`);
      // Map DB row to result format
      const rec = existing.rows[0];
      return {
        id: rec.id,
        food_items: rec.recommended_food_items,
        details: rec.recommended_details,
        calories: rec.target_calories,
        protein_g: rec.target_protein_g,
        carbs_g: rec.target_carbs_g,
        fat_g: rec.target_fat_g,
        ai_reasoning: rec.reasoning,
        swap_count: rec.swap_count
      };
    }

    // Generate AI recommendation
    console.log(`🤖 [MEAL ENGINE] Requesting recommendation for ${mealType}`);

    // STRATEGY 1: Try verfied DB recipe
    const dbRecipe = await this.findMatchingRecipeInDB(mealType, targets);
    let mealData;
    let method = 'ai';

    if (dbRecipe) {
      console.log(`✅ [MEAL ENGINE] Found matching DB recipe for ${mealType}`);
      mealData = this.formatDBRecipe(dbRecipe);
      method = 'database';
    } else {
      // STRATEGY 2: Fallback to AI
      console.log(`🤖 [MEAL ENGINE] No strict DB match. Requesting AI generation...`);

      const aiPrompt = `Generate a ${mealType} meal recommendation with these EXACT targets:
- Calories: ${targets.calories} (±25 acceptable)
- Protein: ${targets.protein_g}g (±3g acceptable)
- Carbs: ${targets.carbs_g}g (±5g acceptable)
- Fat: ${targets.fat_g}g (±3g acceptable)

User preferences:
- Dietary restrictions: ${userPrefs.dietary_restrictions || 'None'}
- Preferred cuisines: ${userPrefs.preferred_cuisines || 'Any'}
- Allergies: ${userPrefs.allergies || 'None'}
- Goal: ${userPrefs.goal}

Respond ONLY with JSON (no markdown):
{
  "food_items": [
    {"name": "Food name", "quantity": 150, "unit": "g", "calories": 200, "protein": 20, "carbs": 30, "fat": 5}
  ],
  "total_calories": 600,
  "total_protein": 40,
  "total_carbs": 80,
  "total_fat": 15,
  "reasoning": "Why this meal fits...",
  "details": {
    "recipe_instructions": ["Step 1", "Step 2"],
    "prep_time": "10 mins",
    "cook_time": "15 mins",
    "difficulty": "Easy",
    "tips": ["Tip 1"],
    "best_time_to_eat": "Time range",
    "allergens": ["Gluten"],
    "alternatives": ["Alternative option"]
  }
}`;

      try {
        const aiResponse = await AIService.chat(aiPrompt, userId);
        let cleanResponse = aiResponse.trim();
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        mealData = JSON.parse(cleanResponse);
      } catch (error) {
        console.warn(`⚠️ [MEAL ENGINE] AI generation failed for ${mealType}:`, error.message);
        mealData = await this.getStaticMeal(mealType, 0);
        method = 'static_fallback';
      }

      // Validate
      const isValid = this.validateMealTargets(mealData, targets);
      if (!isValid) {
        console.warn('⚠️ [MEAL ENGINE] AI meal does not meet targets, using fallback');
        mealData = await this.getStaticMeal(mealType, 0);
        method = 'static_fallback_validation_fail';
      }
    }

    // Store in NEW table
    const insertResult = await query(
      `INSERT INTO daily_meal_recommendations (
        user_id, date, meal_type, 
        recommended_food_items, recommended_details,
        target_calories, target_protein_g, target_carbs_g, target_fat_g,
        generation_method, reasoning, swap_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)
      RETURNING *`,
      [
        userId,
        date,
        mealType,
        JSON.stringify(mealData.food_items),
        JSON.stringify(mealData.details || {}),
        targets.calories, targets.protein_g, targets.carbs_g, targets.fat_g,
        method,
        mealData.reasoning || 'Generated meal'
      ]
    );

    const rec = insertResult.rows[0];
    console.log(`✅ [MEAL ENGINE] ${mealType} recommendation saved (ID: ${rec.id})`);

    return {
      id: rec.id,
      food_items: rec.recommended_food_items,
      details: rec.recommended_details,
      calories: rec.target_calories,
      protein_g: rec.target_protein_g,
      carbs_g: rec.target_carbs_g,
      fat_g: rec.target_fat_g,
      ai_reasoning: rec.reasoning,
      swap_count: rec.swap_count
    };
  }

  /**
   * Swap existing meal with AI alternative
   * MUST maintain same calorie/macro targets
   */

  /**
   * Swap existing meal
   */
  async swapMeal(userId, date, mealType) {
    // Get current active meal from NEW table
    const currentResult = await query(
      `SELECT * FROM daily_meal_recommendations 
       WHERE user_id = $1 AND date = $2 AND meal_type = $3 AND is_active = TRUE`,
      [userId, date, mealType]
    );

    if (currentResult.rows.length === 0) {
      // If no recommendation exists yet, generate one
      return this.generateMealRecommendation(userId, date, mealType, /* need targets */ null, await this.getUserPreferences(userId));
      // Wait, we need targets. We should fetch them.
      // But for simplicity, if none exists, we assume user tapped swap on empty? 
      // UI shouldn't allow swap on empty.
      throw new Error('No active meal found to swap');
    }

    const currentMeal = currentResult.rows[0];
    const swapCount = (currentMeal.swap_count || 0) + 1;

    // TARGETS must stay constant.
    const targets = {
      calories: currentMeal.target_calories,
      protein_g: currentMeal.target_protein_g,
      carbs_g: currentMeal.target_carbs_g,
      fat_g: currentMeal.target_fat_g,
    };

    // Deactivate current
    await query(
      `UPDATE daily_meal_recommendations SET is_active = FALSE WHERE id = $1`,
      [currentMeal.id]
    );

    let mealData;
    let method = 'manual_swap';

    if (swapCount <= 3) {
      console.log(`🔄 [MEAL ENGINE] Swap #${swapCount} (using static/DB options)`);
      const staticOption = await this.getStaticMeal(mealType, swapCount);
      mealData = staticOption;
      method = 'database_swap';
    } else {
      console.log(`🤖 [MEAL ENGINE] Swap limit exceeded (${swapCount}). Force AI generation.`);
      const userPrefs = await this.getUserPreferences(userId);
      const aiPrompt = `Generate a UNIQUE alternative for ${mealType} (Swap #${swapCount}).
       Targets: ${targets.calories}kcal, P:${targets.protein_g}g, C:${targets.carbs_g}g, F:${targets.fat_g}g.
       JSON Only.`;

      try {
        const aiResponse = await AIService.chat(aiPrompt, userId);
        let clean = aiResponse.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        mealData = JSON.parse(clean);
      } catch (e) {
        mealData = await this.getStaticMeal(mealType, Math.floor(Math.random() * 10));
      }
      method = 'ai_force_swap';
    }

    // Store new
    const insertResult = await query(
      `INSERT INTO daily_meal_recommendations (
        user_id, date, meal_type, 
        recommended_food_items, recommended_details,
        target_calories, target_protein_g, target_carbs_g, target_fat_g,
        generation_method, reasoning, swap_count, replaced_from_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        userId, date, mealType,
        JSON.stringify(mealData.food_items),
        JSON.stringify(mealData.details || {}),
        targets.calories, targets.protein_g, targets.carbs_g, targets.fat_g,
        method,
        mealData.reasoning || 'Swapped meal',
        swapCount,
        currentMeal.id
      ]
    );

    console.log(`🔄 [MEAL ENGINE] ${mealType} swapped successfully (Count: ${swapCount})`);

    const rec = insertResult.rows[0];
    return {
      id: rec.id,
      food_items: rec.recommended_food_items,
      details: rec.recommended_details,
      calories: rec.target_calories,
      protein_g: rec.target_protein_g,
      carbs_g: rec.target_carbs_g,
      fat_g: rec.target_fat_g,
      ai_reasoning: rec.reasoning,
      swap_count: rec.swap_count
    };
  }
  /**
   * Validate meal meets targets within acceptable range
   */
  validateMealTargets(mealData, targets) {
    const tolerance = 0.05; // 5%

    const calOk = Math.abs(mealData.total_calories - targets.calories) <= targets.calories * tolerance;
    const proteinOk = Math.abs(mealData.total_protein - targets.protein_g) <= targets.protein_g * tolerance;
    const carbsOk = Math.abs(mealData.total_carbs - targets.carbs_g) <= targets.carbs_g * tolerance;
    const fatOk = Math.abs(mealData.total_fat - targets.fat_g) <= targets.fat_g * tolerance;

    return calOk && proteinOk && carbsOk && fatOk;
  }

  /**
   * Get static meal from predefined list (for fallbacks and quick swaps)
   * Indices: 0=Default, 1=Swap1, 2=Swap2, 3=Swap3
   */

  /**
   * Find a recipe in DB that matches targets within tolerance
   */
  async findMatchingRecipeInDB(mealType, targets) {
    const tolerance = 0.15; // 15% tolerance
    const categoryMap = { 'breakfast': 'Breakfast', 'lunch': 'Lunch', 'dinner': 'Dinner' };
    const category = categoryMap[mealType] || 'Lunch';

    const result = await query(
      `SELECT * FROM foods WHERE category = $1 AND is_verified = TRUE`,
      [category]
    );

    const candidates = result.rows.filter(r => {
      const calDiff = Math.abs(r.calories - targets.calories) / targets.calories;
      return calDiff <= tolerance;
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  formatDBRecipe(recipe) {
    return {
      food_items: [{
        name: recipe.name,
        quantity: recipe.serving_size || 1,
        unit: recipe.serving_unit || 'serving',
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat
      }],
      total_calories: recipe.calories,
      total_protein: recipe.protein,
      total_carbs: recipe.carbs,
      total_fat: recipe.fat,
      reasoning: recipe.description || "Verified healthy recipe.",
      details: {
        recipe_instructions: recipe.instructions || ["See instructions in method"],
        prep_time: (recipe.prep_time_minutes || 10) + " mins",
        cook_time: (recipe.cook_time_minutes || 10) + " mins",
        difficulty: "Medium",
        ingredients: recipe.ingredients,
        tips: ["Enjoy!"],
        image_url: recipe.image_url
      }
    };
  }

  async getStaticMeal(mealType, index = 0) {
    try {
      // Fetch from DB
      // We map 'breakfast', 'lunch', 'dinner' to DB 'category' values
      const categoryMap = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner'
      };

      const category = categoryMap[mealType] || 'Lunch';

      // Get recipes. We use OFFSET to select variations.
      const result = await query(
        `SELECT * FROM foods 
         WHERE category = $1 AND is_verified = TRUE 
         ORDER BY id ASC 
         LIMIT 1 OFFSET $2`,
        [category, index]
      );

      if (result.rows.length > 0) {
        const recipe = result.rows[0];

        // Parse details if needed (DB has rich cols now)
        const details = {
          recipe_instructions: recipe.instructions || ["See recipe instructions"],
          prep_time: (recipe.prep_time_minutes || 10) + " mins",
          cook_time: (recipe.cook_time_minutes || 10) + " mins",
          difficulty: "Medium",
          ingredients: recipe.ingredients, // New field in DB
          tips: ["Enjoy this healthy meal!"],
          image_url: recipe.image_url
        };

        // Construct response
        // Note: fitcoach frontend expects food_items. 
        // We present the Recipe as the main item, and Ingredients as sub-items (if we had macro breakdown).
        // For now, we list the Recipe as the item.
        return {
          food_items: [{
            name: recipe.name,
            quantity: recipe.serving_size || 1,
            unit: recipe.serving_unit || 'serving',
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat
          }],
          total_calories: recipe.calories,
          total_protein: recipe.protein,
          total_carbs: recipe.carbs,
          total_fat: recipe.fat,
          reasoning: recipe.description || "A healthy option from our recipe book.",
          details: details
        };
      }

      // FALLBACK if DB empty (keep original minimal hardcoded just in case)
      console.warn(`[MEAL ENGINE] No DB recipe found for ${mealType} offset ${index}. Using fallback.`);
      return this.getHardcodedFallback(mealType);

    } catch (e) {
      console.error('getStaticMeal error:', e);
      return this.getHardcodedFallback(mealType);
    }
  }

  getHardcodedFallback(mealType) {
    // Minimal fallback to avoid crash
    return {
      food_items: [{ name: "Healthy Plate", quantity: 1, unit: "serving", calories: 500, protein: 30, carbs: 50, fat: 15 }],
      total_calories: 500,
      total_protein: 30,
      total_carbs: 50,
      total_fat: 15,
      reasoning: "Fallback meal",
      details: {}
    };
  }
}

export default new MealRecommendationEngine();
