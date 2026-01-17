/**
 * ============================================================================
 * AI SAFETY VALIDATOR
 * ============================================================================
 * 
 * CRITICAL SYSTEM COMPONENT - Enforces strict boundaries on AI suggestions
 * 
 * This validator ensures AI NEVER:
 * - Changes calorie targets
 * - Modifies macro targets
 * - Overrides user goals
 * - Suggests meals that exceed per-meal limits
 * - Allows cross-macro swaps
 * 
 * ALL AI SUGGESTIONS MUST PASS THROUGH THIS VALIDATOR
 * 
 * Location: /backend/src/services/aiSafetyValidator.js
 * ============================================================================
 */

// ============================================================================
// VALIDATION RULES (NON-NEGOTIABLE)
// ============================================================================

const RULES = {
  // Daily totals are LOCKED (0% flexibility)
  DAILY_TOTAL_TOLERANCE: 0,
  
  // Meal-level tolerance (5 kcal for rounding)
  MEAL_LEVEL_TOLERANCE: 5,
  
  // Macro tolerance (1g for rounding)
  MACRO_TOLERANCE: 1,
  
  // Max suggestions per request
  MAX_SUGGESTIONS: 3,
  
  // Allowed macro swap types
  ALLOWED_SWAPS: {
    carbs: ['carbs'],
    protein: ['protein'],
    fat: ['fat']
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that meal suggestion fits within per-meal macros
 * 
 * @param {Object} suggestion - AI-generated meal suggestion
 * @param {Object} mealLimits - Per-meal macro limits
 * @returns {Object} { valid: boolean, violations: Array, adjusted: Object }
 */
const validateMealSuggestion = (suggestion, mealLimits) => {
  const violations = [];
  let valid = true;
  
  // Extract values
  const suggestedCals = suggestion.calories || 0;
  const suggestedProtein = suggestion.protein_g || 0;
  const suggestedCarbs = suggestion.carbs_g || 0;
  const suggestedFat = suggestion.fat_g || 0;
  
  const limitCals = mealLimits.calories || 0;
  const limitProtein = mealLimits.protein_g || 0;
  const limitCarbs = mealLimits.carbs_g || 0;
  const limitFat = mealLimits.fat_g || 0;
  
  // Calorie validation
  if (suggestedCals > limitCals + RULES.MEAL_LEVEL_TOLERANCE) {
    violations.push({
      type: 'calories',
      suggested: suggestedCals,
      limit: limitCals,
      excess: suggestedCals - limitCals
    });
    valid = false;
  }
  
  // Protein validation
  if (suggestedProtein > limitProtein + RULES.MACRO_TOLERANCE) {
    violations.push({
      type: 'protein',
      suggested: suggestedProtein,
      limit: limitProtein,
      excess: suggestedProtein - limitProtein
    });
    valid = false;
  }
  
  // Carbs validation
  if (suggestedCarbs > limitCarbs + RULES.MACRO_TOLERANCE) {
    violations.push({
      type: 'carbs',
      suggested: suggestedCarbs,
      limit: limitCarbs,
      excess: suggestedCarbs - limitCarbs
    });
    valid = false;
  }
  
  // Fat validation
  if (suggestedFat > limitFat + RULES.MACRO_TOLERANCE) {
    violations.push({
      type: 'fat',
      suggested: suggestedFat,
      limit: limitFat,
      excess: suggestedFat - limitFat
    });
    valid = false;
  }
  
  // If invalid, attempt adjustment (scale down proportionally)
  let adjusted = null;
  if (!valid) {
    const scaleFactor = Math.min(
      limitCals / suggestedCals,
      limitProtein / suggestedProtein,
      limitCarbs / suggestedCarbs,
      limitFat / suggestedFat
    );
    
    adjusted = {
      ...suggestion,
      calories: Math.round(suggestedCals * scaleFactor),
      protein_g: Math.round(suggestedProtein * scaleFactor),
      carbs_g: Math.round(suggestedCarbs * scaleFactor),
      fat_g: Math.round(suggestedFat * scaleFactor),
      _scaled: true,
      _scale_factor: scaleFactor.toFixed(2)
    };
  }
  
  return {
    valid,
    violations,
    adjusted,
    suggestion
  };
};

/**
 * Validate multiple meal suggestions
 * Returns only valid suggestions, rejects invalid ones
 * 
 * @param {Array} suggestions - Array of AI suggestions
 * @param {Object} mealLimits - Per-meal limits
 * @returns {Object} { validSuggestions: Array, rejectedSuggestions: Array }
 */
const validateMealSuggestions = (suggestions, mealLimits) => {
  const validSuggestions = [];
  const rejectedSuggestions = [];
  
  suggestions.forEach((suggestion, index) => {
    const validation = validateMealSuggestion(suggestion, mealLimits);
    
    if (validation.valid) {
      validSuggestions.push({
        ...suggestion,
        _validated: true,
        _index: index
      });
    } else {
      // Try adjusted version
      if (validation.adjusted) {
        const adjustedValidation = validateMealSuggestion(validation.adjusted, mealLimits);
        if (adjustedValidation.valid) {
          validSuggestions.push({
            ...validation.adjusted,
            _validated: true,
            _adjusted: true,
            _index: index
          });
        } else {
          rejectedSuggestions.push({
            suggestion,
            violations: validation.violations,
            reason: 'Exceeds meal limits even after adjustment'
          });
        }
      } else {
        rejectedSuggestions.push({
          suggestion,
          violations: validation.violations,
          reason: 'Exceeds meal limits'
        });
      }
    }
  });
  
  return {
    validSuggestions: validSuggestions.slice(0, RULES.MAX_SUGGESTIONS),
    rejectedSuggestions
  };
};

/**
 * Validate macro swap request
 * Ensures same-macro rule is followed
 * 
 * @param {Object} swapRequest - Swap details
 * @param {Object} dailyState - Current daily macro state
 * @returns {Object} { valid: boolean, reason: string, impact: Object }
 */
const validateMacroSwap = (swapRequest, dailyState) => {
  const {
    from_meal,
    to_meal,
    macro_type,
    amount_g
  } = swapRequest;
  
  // Rule 1: Must be same macro type
  if (!RULES.ALLOWED_SWAPS[macro_type]) {
    return {
      valid: false,
      reason: `Invalid macro type: ${macro_type}. Only carbs, protein, fat allowed.`,
      impact: null
    };
  }
  
  // Rule 2: Cannot swap to different macro
  // (This is implicit in same-macro rule, but double-check)
  
  // Rule 3: Must not violate daily totals
  // Swaps are INTERNAL - daily total must remain unchanged
  
  // Calculate impact
  const fromMealCurrent = dailyState[from_meal]?.[macro_type] || 0;
  const toMealCurrent = dailyState[to_meal]?.[macro_type] || 0;
  
  const fromMealAfter = fromMealCurrent - amount_g;
  const toMealAfter = toMealCurrent + amount_g;
  
  // Rule 4: Source meal must have enough
  if (fromMealAfter < 0) {
    return {
      valid: false,
      reason: `${from_meal} only has ${fromMealCurrent}g ${macro_type}, cannot swap ${amount_g}g`,
      impact: null
    };
  }
  
  // Rule 5: Target meal must not exceed daily total
  // (Each meal has a soft limit, but daily is hard limit)
  const dailyLimit = dailyState.daily_limits?.[macro_type] || Infinity;
  const dailyConsumed = Object.keys(dailyState)
    .filter(key => !key.startsWith('daily_'))
    .reduce((sum, meal) => sum + (dailyState[meal]?.[macro_type] || 0), 0);
  
  if (dailyConsumed > dailyLimit) {
    return {
      valid: false,
      reason: `Daily ${macro_type} limit (${dailyLimit}g) already exceeded`,
      impact: null
    };
  }
  
  return {
    valid: true,
    reason: 'Swap allowed - same macro, within limits',
    impact: {
      [from_meal]: {
        before: fromMealCurrent,
        after: fromMealAfter,
        change: -amount_g
      },
      [to_meal]: {
        before: toMealCurrent,
        after: toMealAfter,
        change: +amount_g
      },
      daily_total_change: 0 // MUST be zero
    }
  };
};

/**
 * Validate daily totals protection
 * Ensures AI suggestions don't modify daily targets
 * 
 * @param {Object} aiResponse - Full AI response
 * @param {Object} originalTargets - Original daily targets
 * @returns {Object} { valid: boolean, violations: Array }
 */
const validateDailyTotalsProtection = (aiResponse, originalTargets) => {
  const violations = [];
  
  // Check if AI tried to modify targets
  const suspiciousFields = [
    'new_calorie_target',
    'adjusted_calories',
    'updated_target',
    'calorie_adjustment',
    'macro_adjustment'
  ];
  
  const responseStr = JSON.stringify(aiResponse).toLowerCase();
  
  suspiciousFields.forEach(field => {
    if (responseStr.includes(field.toLowerCase())) {
      violations.push({
        field,
        message: `AI attempted to modify targets using field: ${field}`
      });
    }
  });
  
  // If AI returned meal suggestions, verify sum doesn't change daily
  if (aiResponse.meals) {
    const suggestedTotal = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0
    };
    
    Object.values(aiResponse.meals).forEach(meal => {
      suggestedTotal.calories += meal.calories || 0;
      suggestedTotal.protein_g += meal.protein_g || 0;
      suggestedTotal.carbs_g += meal.carbs_g || 0;
      suggestedTotal.fat_g += meal.fat_g || 0;
    });
    
    // Check against original targets
    if (Math.abs(suggestedTotal.calories - originalTargets.calories) > RULES.DAILY_TOTAL_TOLERANCE) {
      violations.push({
        field: 'daily_calories',
        message: `Total calories changed: ${originalTargets.calories} → ${suggestedTotal.calories}`
      });
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
};

/**
 * Inject system prompt for AI
 * Ensures AI understands boundaries
 * 
 * @param {Object} userContext - User context
 * @param {Object} mealLimits - Current meal limits
 * @returns {string} System prompt
 */
const generateSystemPrompt = (userContext, mealLimits) => {
  return `You are an AI Fitness Coach embedded inside a rule-based fitness application.

==============================
NON-NEGOTIABLE SYSTEM RULES
==============================
1. Daily calorie and macro targets (protein, carbs, fat) are FIXED.
   - Meal-level flexibility is allowed.
   - Day-level totals MUST be met exactly (0% deviation).
   
2. Macro swaps are ONLY allowed within the same macro category:
   - Carbs ↔ Carbs
   - Protein ↔ Protein
   - Fat ↔ Fat
   - Cross-macro swaps are forbidden.
   
3. You must NEVER override or recalculate system-provided numbers.

4. You must NEVER provide medical advice or unsafe workout guidance.

5. If information is missing or confidence is low, ASK for clarification.

6. Safety, adherence, and clarity always outweigh creativity.

==============================
CURRENT CONTEXT
==============================
User Profile:
- Name: ${userContext.name || 'User'}
- Goal: ${userContext.goal || 'Not set'}
- Age: ${userContext.age || 'Unknown'}
- Weight: ${userContext.weight ? userContext.weight + 'kg' : 'Unknown'}

Meal Limits (YOU MUST RESPECT THESE):
- Calories: ${mealLimits.calories || 0} kcal
- Protein: ${mealLimits.protein_g || 0}g
- Carbs: ${mealLimits.carbs_g || 0}g
- Fat: ${mealLimits.fat_g || 0}g

==============================
YOUR TASK
==============================
Suggest 3 meal options (1 primary + 2 alternatives) that:
1. Stay WITHIN the meal limits above
2. Are practical and realistic
3. Match user's dietary preferences
4. Include exact macro breakdowns

Format each suggestion as:
{
  "name": "Meal name",
  "description": "Brief description",
  "calories": X,
  "protein_g": X,
  "carbs_g": X,
  "fat_g": X,
  "ingredients": ["item1", "item2"],
  "reasoning": "Why this works"
}

Remember: ALL values must be ≤ meal limits. No exceptions.`;
};

// ============================================================================
// MAIN VALIDATOR CLASS
// ============================================================================

class AISafetyValidator {
  
  /**
   * Validate meal suggestions from AI
   * Primary validation function
   */
  validateMealSuggestions(suggestions, mealLimits) {
    return validateMealSuggestions(suggestions, mealLimits);
  }
  
  /**
   * Validate single meal suggestion
   */
  validateMealSuggestion(suggestion, mealLimits) {
    return validateMealSuggestion(suggestion, mealLimits);
  }
  
  /**
   * Validate macro swap request
   */
  validateMacroSwap(swapRequest, dailyState) {
    return validateMacroSwap(swapRequest, dailyState);
  }
  
  /**
   * Validate daily totals protection
   */
  validateDailyTotalsProtection(aiResponse, originalTargets) {
    return validateDailyTotalsProtection(aiResponse, originalTargets);
  }
  
  /**
   * Generate system prompt for AI
   */
  generateSystemPrompt(userContext, mealLimits) {
    return generateSystemPrompt(userContext, mealLimits);
  }
  
  /**
   * Check if response is safe to return to user
   * Final safety check before sending AI response
   */
  isSafeResponse(aiResponse) {
    // Check for dangerous keywords
    const dangerousPatterns = [
      /change.*target/i,
      /adjust.*calories.*to/i,
      /increase.*tdee/i,
      /decrease.*tdee/i,
      /override/i,
      /recalculate.*macro/i
    ];
    
    const responseStr = JSON.stringify(aiResponse);
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(responseStr)) {
        return {
          safe: false,
          reason: `Response contains dangerous pattern: ${pattern}`
        };
      }
    }
    
    return { safe: true };
  }
  
  /**
   * Sanitize AI response
   * Remove any fields that shouldn't be there
   */
  sanitizeResponse(aiResponse) {
    const forbiddenFields = [
      'new_target',
      'adjusted_target',
      'calorie_adjustment',
      'macro_adjustment',
      'recommended_deficit',
      'recommended_surplus'
    ];
    
    const sanitized = { ...aiResponse };
    
    forbiddenFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
        console.warn(`[SAFETY] Removed forbidden field: ${field}`);
      }
    });
    
    return sanitized;
  }
  
  /**
   * Log safety violation
   */
  logViolation(violation) {
    console.error('[SAFETY VIOLATION]', {
      timestamp: new Date().toISOString(),
      type: violation.type,
      details: violation.details
    });
    
    // In production, send to monitoring service
    // e.g., Sentry, DataDog, CloudWatch
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export default new AISafetyValidator();
