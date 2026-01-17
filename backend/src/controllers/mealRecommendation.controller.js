/**
 * ============================================================================
 * MEAL RECOMMENDATION CONTROLLER
 * FitCoach AI Backend - Production-Ready
 * 
 * STRICT ENGINEERING MODE REQUIREMENTS:
 * - AI-powered meal suggestions with STRICT validation
 * - 1 Primary + 2 Alternatives per meal
 * - Same-macro swaps ONLY (Carb↔Carb, Protein↔Protein, Fat↔Fat)
 * - Daily totals LOCKED (0% tolerance)
 * - All suggestions pass through AISafetyValidator
 * ============================================================================
 */

import AISafetyValidator from '../services/aiSafetyValidator.js';
import MealDistributionEngine from '../services/mealDistributionEngine.js';
import { logError } from '../utils/logger.js';
import pool from '../config/database.js';

// AI Service integration (placeholder - replace with actual AI service)
const generateMealSuggestions = async (systemPrompt, userContext) => {
  // TODO: Replace with actual AI service call (OpenAI, Claude, etc.)
  // For now, return mock suggestions
  return {
    primary: {
      name: "Grilled Chicken Breast with Quinoa",
      description: "Lean protein with complex carbs",
      calories: 450,
      protein: 45,
      carbs: 50,
      fat: 8,
      ingredients: ["Chicken breast 200g", "Quinoa 100g", "Vegetables 100g"],
      instructions: "1. Grill chicken. 2. Cook quinoa. 3. Combine with veggies."
    },
    alternatives: [
      {
        name: "Turkey Wrap with Brown Rice",
        description: "Similar macros, different taste",
        calories: 445,
        protein: 44,
        carbs: 52,
        fat: 7,
        ingredients: ["Turkey 200g", "Brown rice 100g", "Wrap 1pc"],
        instructions: "1. Cook turkey. 2. Prepare rice. 3. Wrap together."
      },
      {
        name: "Salmon with Sweet Potato",
        description: "Omega-3 rich alternative",
        calories: 455,
        protein: 46,
        carbs: 48,
        fat: 9,
        ingredients: ["Salmon 180g", "Sweet potato 200g", "Greens 50g"],
        instructions: "1. Bake salmon. 2. Roast sweet potato. 3. Serve with greens."
      }
    ]
  };
};

/**
 * POST /api/meals/recommend
 * Generates AI-powered meal recommendations with safety validation
 * 
 * Body: {
 *   user_id,
 *   meal_type, // 'breakfast', 'lunch', 'dinner'
 *   date, // YYYY-MM-DD
 *   preferences // Optional dietary preferences
 * }
 */
const recommendMeal = async (req, res) => {
  try {
    const { user_id, meal_type, date, preferences = {} } = req.body;
    
    // Validation
    if (!user_id || !meal_type || !date) {
      return res.status(400).json({
        success: false,
        error: 'user_id, meal_type, and date are required'
      });
    }
    
    if (!['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
      return res.status(400).json({
        success: false,
        error: 'meal_type must be breakfast, lunch, or dinner'
      });
    }
    
    // Step 1: Get remaining macros for this meal
    const remainingResult = await MealDistributionEngine.getRemainingMacros(user_id, date, meal_type);
    if (!remainingResult.success) {
      return res.status(400).json({
        success: false,
        error: remainingResult.error
      });
    }
    
    const mealLimits = remainingResult.data;
    
    // Step 2: Generate system prompt with strict boundaries
    const userContext = {
      meal_type,
      date,
      preferences,
      dietary_restrictions: preferences.dietary_restrictions || []
    };
    
    const systemPrompt = AISafetyValidator.generateSystemPrompt(userContext, mealLimits);
    
    // Step 3: Call AI service
    const aiSuggestions = await generateMealSuggestions(systemPrompt, userContext);
    
    // Step 4: Validate primary suggestion
    const primaryValidation = AISafetyValidator.validateMealSuggestion(
      aiSuggestions.primary,
      mealLimits
    );
    
    if (!primaryValidation.valid) {
      // AI violated boundaries - adjust or reject
      const adjusted = AISafetyValidator.adjustExceedingSuggestion(
        aiSuggestions.primary,
        mealLimits
      );
      
      if (!adjusted.success) {
        return res.status(400).json({
          success: false,
          error: 'AI suggestion exceeded limits and could not be adjusted',
          violations: primaryValidation.violations
        });
      }
      
      aiSuggestions.primary = adjusted.adjusted;
    }
    
    // Step 5: Validate alternatives
    const validatedAlternatives = [];
    for (const alt of aiSuggestions.alternatives) {
      const altValidation = AISafetyValidator.validateMealSuggestion(alt, mealLimits);
      
      if (altValidation.valid) {
        validatedAlternatives.push(alt);
      } else {
        // Try to adjust
        const adjusted = AISafetyValidator.adjustExceedingSuggestion(alt, mealLimits);
        if (adjusted.success) {
          validatedAlternatives.push(adjusted.adjusted);
        }
        // If adjustment fails, skip this alternative
      }
    }
    
    // Step 6: Ensure we have 1 Primary + 2 Alternatives
    if (validatedAlternatives.length < 2) {
      return res.status(500).json({
        success: false,
        error: 'AI failed to generate sufficient valid alternatives'
      });
    }
    
    // Step 7: Final safety check
    const finalResponse = {
      primary: aiSuggestions.primary,
      alternatives: validatedAlternatives.slice(0, 2)
    };
    
    if (!AISafetyValidator.isSafeResponse(finalResponse)) {
      return res.status(500).json({
        success: false,
        error: 'AI response failed final safety check'
      });
    }
    
    // Step 8: Sanitize response
    const sanitized = AISafetyValidator.sanitizeResponse(finalResponse);
    
    return res.status(200).json({
      success: true,
      data: {
        meal_type,
        date,
        remaining_macros: mealLimits,
        recommendations: sanitized,
        metadata: {
          ai_adjusted: primaryValidation.valid === false,
          alternatives_adjusted: validatedAlternatives.length < aiSuggestions.alternatives.length
        }
      }
    });
  } catch (error) {
    logError('recommendMeal', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate meal recommendations'
    });
  }
};

/**
 * POST /api/meals/swap
 * Executes a same-macro swap between meals
 * 
 * Body: {
 *   user_id,
 *   date,
 *   from_meal,
 *   to_meal,
 *   macro_type, // 'protein', 'carbs', 'fat'
 *   amount_g,
 *   reason
 * }
 */
const executeMacroSwap = async (req, res) => {
  try {
    const { user_id, date, from_meal, to_meal, macro_type, amount_g, reason } = req.body;
    
    // Validation
    if (!user_id || !date || !from_meal || !to_meal || !macro_type || !amount_g) {
      return res.status(400).json({
        success: false,
        error: 'user_id, date, from_meal, to_meal, macro_type, and amount_g are required'
      });
    }
    
    if (!['protein', 'carbs', 'fat'].includes(macro_type)) {
      return res.status(400).json({
        success: false,
        error: 'macro_type must be protein, carbs, or fat'
      });
    }
    
    if (!['breakfast', 'lunch', 'dinner'].includes(from_meal) || 
        !['breakfast', 'lunch', 'dinner'].includes(to_meal)) {
      return res.status(400).json({
        success: false,
        error: 'from_meal and to_meal must be breakfast, lunch, or dinner'
      });
    }
    
    if (from_meal === to_meal) {
      return res.status(400).json({
        success: false,
        error: 'Cannot swap within the same meal'
      });
    }
    
    // Step 1: Validate swap with safety validator
    const dailyState = await MealDistributionEngine.getRemainingMacros(user_id, date, from_meal);
    if (!dailyState.success) {
      return res.status(400).json({
        success: false,
        error: dailyState.error
      });
    }
    
    const swapValidation = AISafetyValidator.validateMacroSwap(
      { from_meal, to_meal, macro_type, amount_g },
      dailyState.data
    );
    
    if (!swapValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Macro swap validation failed',
        violations: swapValidation.violations
      });
    }
    
    // Step 2: Execute swap
    const swapRequest = { from_meal, to_meal, macro_type, amount_g, reason };
    const result = await MealDistributionEngine.executeMacroSwap(user_id, swapRequest, date);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    // Step 3: Validate daily totals after swap
    const dailyValidation = await MealDistributionEngine.validateDailyTotals(user_id, date);
    
    if (!dailyValidation.success || !dailyValidation.data.valid) {
      // Rollback swap (emergency)
      await pool.query(
        `DELETE FROM meal_swap_logs WHERE user_id = $1 AND date = $2 AND created_at > NOW() - INTERVAL '1 minute'`,
        [user_id, date]
      );
      
      return res.status(500).json({
        success: false,
        error: 'Swap caused daily total violation - rolled back',
        violations: dailyValidation.data?.violations
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        swap: result.data,
        updated_distribution: dailyValidation.data
      }
    });
  } catch (error) {
    logError('executeMacroSwap', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute macro swap'
    });
  }
};

/**
 * GET /api/meals/swap-status
 * Returns swap history and current meal distribution state
 * 
 * Query: user_id, date
 */
const getSwapStatus = async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    if (!user_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'user_id and date are required'
      });
    }
    
    // Get swap history
    const swapHistory = await MealDistributionEngine.getSwapHistory(user_id, date);
    
    // Get current meal distribution
    const distribution = await MealDistributionEngine.getDailyDistribution(user_id, date);
    
    // Get daily totals validation
    const validation = await MealDistributionEngine.validateDailyTotals(user_id, date);
    
    return res.status(200).json({
      success: true,
      data: {
        swap_history: swapHistory.data || [],
        current_distribution: distribution.data,
        daily_totals: validation.data,
        is_valid: validation.data?.valid || false
      }
    });
  } catch (error) {
    logError('getSwapStatus', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch swap status'
    });
  }
};

/**
 * GET /api/meals/remaining
 * Returns remaining macros for each meal
 * 
 * Query: user_id, date
 */
const getRemainingMacros = async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    if (!user_id || !date) {
      return res.status(400).json({
        success: false,
        error: 'user_id and date are required'
      });
    }
    
    const meals = ['breakfast', 'lunch', 'dinner'];
    const remaining = {};
    
    for (const meal of meals) {
      const result = await MealDistributionEngine.getRemainingMacros(user_id, date, meal);
      if (result.success) {
        remaining[meal] = result.data;
      }
    }
    
    return res.status(200).json({
      success: true,
      data: remaining
    });
  } catch (error) {
    logError('getRemainingMacros', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch remaining macros'
    });
  }
};

export {
  recommendMeal,
  executeMacroSwap,
  getSwapStatus,
  getRemainingMacros
};
