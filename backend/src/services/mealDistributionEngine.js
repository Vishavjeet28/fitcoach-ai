/**
 * ============================================================================
 * MEAL DISTRIBUTION ENGINE (ENHANCED)
 * ============================================================================
 * 
 * Distributes daily calorie/macro targets into individual meals
 * NOW SUPPORTS: Swap-friendly mode with carry-forward tracking
 * 
 * STRICT RULES:
 * - Daily totals are LOCKED (0% flexibility)
 * - Meal-level flexibility allowed (within same macro)
 * - Carb ↔ Carb, Protein ↔ Protein, Fat ↔ Fat ONLY
 * - End-of-day reconciliation mandatory
 * 
 * Location: /backend/src/services/mealDistributionEngine.js
 * ============================================================================
 */

import { query } from '../config/database.js';

class MealDistributionEngine {
  
  constructor() {
    // Base ratios for "Balanced" (UPDATED to match spec)
    this.BASE_RATIOS = {
        breakfast: { calories: 0.30, protein: 0.35, carbs: 0.30, fat: 0.30 },
        lunch:     { calories: 0.40, protein: 0.35, carbs: 0.40, fat: 0.40 },
        dinner:    { calories: 0.30, protein: 0.30, carbs: 0.30, fat: 0.30 }
    };
  }

  /**
   * Distribute daily targets into meals
   * @param {Object} dailyTargets - { calorie_target, protein_target, carb_target, fat_target }
   * @param {Object} preferences - { meal_style, goal_style }
   */
  distributePlan(dailyTargets, preferences) {
    const { calorie_target, protein_target, carb_target, fat_target } = dailyTargets;
    const { goal_style = 'balanced', meal_style = 'fixed' } = preferences;

    // Deep copy base ratios
    let ratios = JSON.parse(JSON.stringify(this.BASE_RATIOS));

    // APPLY GOAL MODIFIERS
    if (goal_style === 'aggressive') {
        // Aggressive: 35% / 40% / 25% calorie split
        ratios.breakfast.calories = 0.35;
        ratios.lunch.calories = 0.40;
        ratios.dinner.calories = 0.25;
        
        // Carb shift: 30% / 45% / 25%
        ratios.breakfast.carbs = 0.30;
        ratios.lunch.carbs = 0.45;
        ratios.dinner.carbs = 0.25;
        
        // Protein boost breakfast
        ratios.breakfast.protein = 0.40;
        ratios.lunch.protein = 0.35;
        ratios.dinner.protein = 0.25;

    } else if (goal_style === 'conservative') {
        // "Even macro distribution"
        // 33.3% split for simplicity
        const meals = ['breakfast', 'lunch', 'dinner'];
        meals.forEach(m => {
            ratios[m] = { calories: 0.333, protein: 0.333, carbs: 0.333, fat: 0.333 };
        });
        // Handle rounding later
    }

    // CALCULATE VALUES
    const result = {
        meta: {
            date: new Date().toISOString().split('T')[0],
            goal_style,
            meal_style
        },
        meals: {}
    };

    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        result.meals[meal] = {
            calories: Math.round(calorie_target * ratios[meal].calories),
            protein: Math.round(protein_target * ratios[meal].protein),
            carbs: Math.round(carb_target * ratios[meal].carbs),
            fat: Math.round(fat_target * ratios[meal].fat),
        };
    });

    // INTEGRITY CHECK & ROUNDING ADJUSTMENT (Ensure sum === target)
    // We adjust LUNCH to absorb rounding errors
    const checkSum = (key) => {
        const sum = result.meals.breakfast[key] + result.meals.lunch[key] + result.meals.dinner[key];
        const target = (key === 'calories') ? calorie_target :
                       (key === 'protein') ? protein_target :
                       (key === 'carbs') ? carb_target : fat_target;
        
        const diff = target - sum;
        if (diff !== 0) {
            result.meals.lunch[key] += diff; // Add remainder to lunch
        }
    };

    checkSum('calories');
    checkSum('protein');
    checkSum('carbs');
    checkSum('fat');

    return result;
  }
  
  /**
   * ========================================================================
   * SWAP-FRIENDLY MODE (NEW)
   * ========================================================================
   */
  
  /**
   * Execute macro swap between meals
   * STRICT RULE: Same macro type only (Carb↔Carb, Protein↔Protein, Fat↔Fat)
   * 
   * @param {number} userId - User ID
   * @param {Object} swapRequest - { from_meal, to_meal, macro_type, amount_g }
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Object} Updated meal distribution
   */
  async executeMacroSwap(userId, swapRequest, date) {
    try {
      const { from_meal, to_meal, macro_type, amount_g } = swapRequest;
      
      // Validate macro type
      const validMacros = ['protein', 'carbs', 'fat'];
      if (!validMacros.includes(macro_type)) {
        throw new Error(`Invalid macro type: ${macro_type}`);
      }
      
      // Get current distribution
      const distResult = await query(
        `SELECT * FROM meal_distribution_profiles 
         WHERE user_id = $1 AND date = $2`,
        [userId, date]
      );
      
      if (distResult.rows.length === 0) {
        throw new Error('No meal distribution found for this date');
      }
      
      const current = distResult.rows[0];
      
      // Build field names
      const fromField = `${from_meal}_${macro_type}_g`;
      const toField = `${to_meal}_${macro_type}_g`;
      
      // Calculate new values
      const fromCurrent = parseInt(current[fromField]) || 0;
      const toCurrent = parseInt(toField) || 0;
      
      const fromNew = fromCurrent - amount_g;
      const toNew = toCurrent + amount_g;
      
      // Validate: source must have enough
      if (fromNew < 0) {
        throw new Error(`${from_meal} only has ${fromCurrent}g ${macro_type}, cannot swap ${amount_g}g`);
      }
      
      // Update database
      const updateQuery = `
        UPDATE meal_distribution_profiles 
        SET ${fromField} = $1, ${toField} = $2, updated_at = NOW()
        WHERE user_id = $3 AND date = $4
        RETURNING *
      `;
      
      const updateResult = await query(updateQuery, [fromNew, toNew, userId, date]);
      
      // Log swap
      await query(
        `INSERT INTO meal_swap_logs (
          user_id, date, from_meal, to_meal, macro_type, amount_g
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, date, from_meal, to_meal, macro_type, amount_g]
      );
      
      return {
        success: true,
        updated: updateResult.rows[0],
        swap: {
          from_meal,
          to_meal,
          macro_type,
          amount_g,
          from_new: fromNew,
          to_new: toNew
        }
      };
      
    } catch (error) {
      console.error('Macro swap error:', error);
      throw error;
    }
  }
  
  /**
   * Get swap history for a date
   * 
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Array} Swap history
   */
  async getSwapHistory(userId, date) {
    try {
      const result = await query(
        `SELECT * FROM meal_swap_logs 
         WHERE user_id = $1 AND date = $2 
         ORDER BY created_at DESC`,
        [userId, date]
      );
      
      return result.rows;
      
    } catch (error) {
      console.error('Get swap history error:', error);
      throw error;
    }
  }
  
  /**
   * Get remaining macros for a meal (after logging food)
   * 
   * @param {number} userId - User ID
   * @param {string} date - Date
   * @param {string} mealType - breakfast/lunch/dinner
   * @returns {Object} Remaining macros
   */
  async getRemainingMacros(userId, date, mealType) {
    try {
      // Get meal target
      const distResult = await query(
        `SELECT 
          ${mealType}_calories as calories,
          ${mealType}_protein_g as protein_g,
          ${mealType}_carbs_g as carbs_g,
          ${mealType}_fat_g as fat_g
         FROM meal_distribution_profiles 
         WHERE user_id = $1 AND date = $2`,
        [userId, date]
      );
      
      if (distResult.rows.length === 0) {
        throw new Error('No meal distribution found');
      }
      
      const target = distResult.rows[0];
      
      // Get consumed for this meal
      const consumedResult = await query(
        `SELECT 
          COALESCE(SUM(calories), 0) as consumed_calories,
          COALESCE(SUM(protein), 0) as consumed_protein,
          COALESCE(SUM(carbs), 0) as consumed_carbs,
          COALESCE(SUM(fat), 0) as consumed_fat
         FROM food_logs 
         WHERE user_id = $1 AND meal_date = $2 AND meal_type = $3`,
        [userId, date, mealType]
      );
      
      const consumed = consumedResult.rows[0];
      
      return {
        meal: mealType,
        target: {
          calories: parseInt(target.calories),
          protein_g: parseInt(target.protein_g),
          carbs_g: parseInt(target.carbs_g),
          fat_g: parseInt(target.fat_g)
        },
        consumed: {
          calories: parseInt(consumed.consumed_calories),
          protein_g: Math.round(parseFloat(consumed.consumed_protein)),
          carbs_g: Math.round(parseFloat(consumed.consumed_carbs)),
          fat_g: Math.round(parseFloat(consumed.consumed_fat))
        },
        remaining: {
          calories: parseInt(target.calories) - parseInt(consumed.consumed_calories),
          protein_g: parseInt(target.protein_g) - Math.round(parseFloat(consumed.consumed_protein)),
          carbs_g: parseInt(target.carbs_g) - Math.round(parseFloat(consumed.consumed_carbs)),
          fat_g: parseInt(target.fat_g) - Math.round(parseFloat(consumed.consumed_fat))
        }
      };
      
    } catch (error) {
      console.error('Get remaining macros error:', error);
      throw error;
    }
  }
  
  /**
   * Validate end-of-day totals
   * Ensures daily totals match targets (0% tolerance)
   * 
   * @param {number} userId - User ID
   * @param {string} date - Date
   * @returns {Object} Validation result
   */
  async validateDailyTotals(userId, date) {
    try {
      // Get distribution
      const distResult = await query(
        `SELECT 
          breakfast_calories + lunch_calories + dinner_calories as total_calories,
          breakfast_protein_g + lunch_protein_g + dinner_protein_g as total_protein,
          breakfast_carbs_g + lunch_carbs_g + dinner_carbs_g as total_carbs,
          breakfast_fat_g + lunch_fat_g + dinner_fat_g as total_fat
         FROM meal_distribution_profiles 
         WHERE user_id = $1 AND date = $2`,
        [userId, date]
      );
      
      if (distResult.rows.length === 0) {
        return { valid: false, reason: 'No distribution found' };
      }
      
      const distributed = distResult.rows[0];
      
      // Get original targets
      const targetResult = await query(
        `SELECT calorie_target, protein_target_g, carb_target_g, fat_target_g
         FROM goals WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      );
      
      if (targetResult.rows.length === 0) {
        return { valid: false, reason: 'No active goal found' };
      }
      
      const targets = targetResult.rows[0];
      
      // Validate (0% tolerance)
      const violations = [];
      
      if (parseInt(distributed.total_calories) !== parseInt(targets.calorie_target)) {
        violations.push({
          macro: 'calories',
          expected: targets.calorie_target,
          actual: distributed.total_calories,
          diff: distributed.total_calories - targets.calorie_target
        });
      }
      
      if (parseInt(distributed.total_protein) !== parseInt(targets.protein_target_g)) {
        violations.push({
          macro: 'protein',
          expected: targets.protein_target_g,
          actual: distributed.total_protein,
          diff: distributed.total_protein - targets.protein_target_g
        });
      }
      
      if (parseInt(distributed.total_carbs) !== parseInt(targets.carb_target_g)) {
        violations.push({
          macro: 'carbs',
          expected: targets.carb_target_g,
          actual: distributed.total_carbs,
          diff: distributed.total_carbs - targets.carb_target_g
        });
      }
      
      if (parseInt(distributed.total_fat) !== parseInt(targets.fat_target_g)) {
        violations.push({
          macro: 'fat',
          expected: targets.fat_target_g,
          actual: distributed.total_fat,
          diff: distributed.total_fat - targets.fat_target_g
        });
      }
      
      return {
        valid: violations.length === 0,
        violations,
        distributed,
        targets
      };
      
    } catch (error) {
      console.error('Validate daily totals error:', error);
      throw error;
    }
  }
}

export default new MealDistributionEngine();
