/**
 * ============================================================================
 * FITNESS LOGIC ENGINE (FLE)
 * ============================================================================
 * 
 * This is the SINGLE SOURCE OF TRUTH for all calorie, macro, and progress
 * calculations in FitCoach AI.
 * 
 * NO other file should implement BMR, TDEE, or macro calculations.
 * All screens and AI must use this engine.
 * 
 * Location: /backend/src/services/fitnessLogicEngine.js
 * ============================================================================
 */

import { query } from '../config/database.js';

// ============================================================================
// CONSTANTS (NON-NEGOTIABLE)
// ============================================================================

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  light: 1.375,
  moderately_active: 1.55,
  moderate: 1.55,
  very_active: 1.725,
  active: 1.725,
  extremely_active: 1.9,
  very: 1.9
};

const GOAL_CALORIE_ADJUSTMENTS = {
  fat_loss: -500,        // Moderate deficit
  maintenance: 0,
  muscle_gain: 300,      // Moderate surplus
  recomposition: -200    // Slight deficit with high protein
};

const GOAL_PROTEIN_MULTIPLIERS = {
  fat_loss: 2.0,         // g per kg bodyweight
  maintenance: 1.6,
  muscle_gain: 2.2,
  recomposition: 2.0
};

const FAT_CALORIE_PERCENTAGE = 0.25; // 25% of calories from fat
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9
};

const PLATEAU_DETECTION = {
  MIN_DAYS: 14,
  MIN_COMPLIANCE_PERCENT: 80,
  WEIGHT_CHANGE_THRESHOLD_KG: 0.3,
  AUTO_ADJUSTMENT_KCAL: 100
};

// ============================================================================
// BMR CALCULATION (Mifflin-St Jeor)
// ============================================================================

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * @param {Object} params - { weight_kg, height_cm, age, gender }
 * @returns {number} BMR in calories/day
 */
export const calculateBMR = ({ weight_kg, height_cm, age, gender }) => {
  if (!weight_kg || !height_cm || !age || !gender) {
    throw new Error('Missing required parameters for BMR calculation');
  }

  const weight = parseFloat(weight_kg);
  const height = parseFloat(height_cm);
  const ageNum = parseInt(age, 10);

  if (weight <= 0 || height <= 0 || ageNum <= 0) {
    throw new Error('Invalid parameter values for BMR calculation');
  }

  // Mifflin-St Jeor Formula
  const baseBMR = (10 * weight) + (6.25 * height) - (5 * ageNum);

  const genderLower = gender.toLowerCase();
  if (genderLower === 'male' || genderLower === 'm') {
    return Math.round(baseBMR + 5);
  } else if (genderLower === 'female' || genderLower === 'f') {
    return Math.round(baseBMR - 161);
  } else {
    // Default to average if gender not specified
    return Math.round(baseBMR - 78);
  }
};

// ============================================================================
// TDEE CALCULATION
// ============================================================================

/**
 * Calculate Total Daily Energy Expenditure
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level key
 * @returns {number} TDEE in calories/day
 */
export const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr || bmr <= 0) {
    throw new Error('Invalid BMR for TDEE calculation');
  }

  const normalizedLevel = (activityLevel || 'sedentary').toLowerCase().replace(/ /g, '_');
  const multiplier = ACTIVITY_MULTIPLIERS[normalizedLevel] || ACTIVITY_MULTIPLIERS.sedentary;

  return Math.round(bmr * multiplier);
};

// ============================================================================
// CALORIE TARGET CALCULATION
// ============================================================================

/**
 * Calculate daily calorie target based on TDEE and goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goalType - Goal type key
 * @param {number} customAdjustment - Optional custom calorie adjustment
 * @returns {number} Daily calorie target
 */
/**
 * Calculate daily calorie target based on TDEE, goal, and aggressiveness
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goalType - Goal type key
 * @param {string} aggressiveness - 'aggressive', 'balanced', 'conservative'
 * @param {number} customAdjustment - Optional custom calorie adjustment
 * @returns {number} Daily calorie target
 */
export const calculateCalorieTarget = (tdee, goalType, aggressiveness = 'balanced', customAdjustment = null) => {
  if (!tdee || tdee <= 0) {
    throw new Error('Invalid TDEE for calorie target calculation');
  }

  const goal = (goalType || 'maintenance').toLowerCase().replace(/ /g, '_');
  let adjustment = 0;

  if (customAdjustment !== null) {
    adjustment = customAdjustment;
  } else {
    adjustment = GOAL_CALORIE_ADJUSTMENTS[goal] || 0;

    // Aggressiveness Modifiers
    // Aggressive: ±20% faster deficit/surplus
    // Conservative: ±10% slower
    if (aggressiveness === 'aggressive') {
      adjustment = Math.round(adjustment * 1.2);
    } else if (aggressiveness === 'conservative') {
      adjustment = Math.round(adjustment * 0.9);
    }
  }

  const target = tdee + adjustment;

  // Safety bounds
  return Math.max(1200, Math.round(target));
};

/**
 * Calculate Macro Targets based on goal type and weight
 * @param {Object} params - { weight_kg, calorie_target, goal_type }
 * @returns {Object} { protein_g, fat_g, carb_g }
 */
export const calculateMacroTargets = ({ weight_kg, calorie_target, goal_type }) => {
  const goal = (goal_type || 'maintenance').toLowerCase();

  // 1. Protein based on bodyweight multiplier
  const proteinMult = GOAL_PROTEIN_MULTIPLIERS[goal] || GOAL_PROTEIN_MULTIPLIERS.maintenance;
  const protein_g = Math.round(weight_kg * proteinMult);

  // 2. Fat (Fixed percentage of TDEE/Calories)
  // Usually 25-30%. We use constant.
  const fat_cals = calorie_target * FAT_CALORIE_PERCENTAGE;
  const fat_g = Math.round(fat_cals / CALORIES_PER_GRAM.fat);

  // 3. Carbs (Remainder)
  const used_cals = (protein_g * CALORIES_PER_GRAM.protein) + (fat_g * CALORIES_PER_GRAM.fat);
  const remaining_cals = calorie_target - used_cals;
  const carb_g = Math.max(0, Math.round(remaining_cals / CALORIES_PER_GRAM.carbs));

  return { protein_g, carb_g, fat_g };
};

/**
 * Calculate precise meal splits (Calories & Macros)
 * @param {Object} dailyTargets - { calories, protein_g, carb_g, fat_g }
 * @param {string} aggressiveness - 'aggressive', 'balanced', 'conservative'
 * @returns {Object} { breakfast: {...}, lunch: {...}, dinner: {...} }
 */
export const calculateMealSplit = (dailyTargets, aggressiveness = 'balanced') => {
  // 1. Define Ratios
  let ratios = { breakfast: 0.30, lunch: 0.40, dinner: 0.30 };

  if (aggressiveness === 'conservative') {
    // Equal split
    ratios = { breakfast: 0.33, lunch: 0.34, dinner: 0.33 }; // 33/34/33 ensures 100%
  }

  // 2. Initial Split
  const result = { breakfast: {}, lunch: {}, dinner: {} };
  const macroKeys = ['calories', 'protein_g', 'carb_g', 'fat_g'];

  // Helper to distribute a value exactly
  const distribute = (total, ratioMap) => {
    const b = Math.floor(total * ratioMap.breakfast);
    const l = Math.floor(total * ratioMap.lunch);
    const d = Math.floor(total * ratioMap.dinner);
    // Add remainder to lunch
    const remainder = total - (b + l + d);
    return { breakfast: b, lunch: l + remainder, dinner: d };
  };

  macroKeys.forEach(key => {
    const dist = distribute(dailyTargets[key], ratios);
    result.breakfast[key] = dist.breakfast;
    result.lunch[key] = dist.lunch;
    result.dinner[key] = dist.dinner;
  });

  // 3. Apply Aggressive Logic (Macro Shifting) if needed
  // "Aggressive: Higher protein breakfast, Lower carb dinner"
  if (aggressiveness === 'aggressive') {
    // Shift 10% of daily protein from Dinner -> Breakfast
    const proteinShift = Math.floor(dailyTargets.protein_g * 0.10);
    if (result.dinner.protein_g > proteinShift) {
      result.dinner.protein_g -= proteinShift;
      result.breakfast.protein_g += proteinShift;
    }

    // Shift 20% of daily carbs from Dinner -> Lunch/Breakfast (reduce dinner carb load)
    const carbShift = Math.floor(dailyTargets.carb_g * 0.20);
    if (result.dinner.carb_g > carbShift) {
      result.dinner.carb_g -= carbShift;
      // Split shift between breakfast/lunch
      result.breakfast.carb_g += Math.floor(carbShift / 2);
      result.lunch.carb_g += (carbShift - Math.floor(carbShift / 2));
    }
  }

  return result;
};


// ...

/**
 * Calculate complete targets from user profile
 * @param {Object} profile - User profile with physiology data
 * @returns {Object} Complete target set
 */
export const calculateAllTargets = (profile) => {
  const { weight, height, age, gender, activity_level, activityLevel, goal, goal_aggressiveness } = profile;

  const actLevel = activity_level || activityLevel || 'sedentary';
  const goalType = goal || 'maintenance';
  const aggressiveness = goal_aggressiveness || 'balanced';

  // 1. BMR
  const bmr = calculateBMR({
    weight_kg: weight,
    height_cm: height,
    age,
    gender
  });

  // 2. TDEE
  const tdee = calculateTDEE(bmr, actLevel);

  // 3. Calories (with aggressiveness)
  const calorieTarget = calculateCalorieTarget(tdee, goalType, aggressiveness);

  // 4. Macros
  const macros = calculateMacroTargets({
    weight_kg: weight,
    calorie_target: calorieTarget,
    goal_type: goalType
  });

  return {
    bmr,
    tdee,
    calorie_target: calorieTarget,
    protein_target_g: macros.protein_g,
    carb_target_g: macros.carb_g,
    fat_target_g: macros.fat_g,
    goal_type: goalType,
    aggressiveness,
    activity_level: actLevel,
    calculated_at: new Date().toISOString()
  };
};

// ============================================================================
// EXERCISE CALORIE BURN (MET-based)
// ============================================================================

/**
 * Calculate calories burned from exercise using MET values
 * @param {Object} params - { met_value, weight_kg, duration_minutes }
 * @returns {number} Calories burned
 */
export const calculateExerciseCalories = ({ met_value, weight_kg, duration_minutes }) => {
  if (!met_value || !weight_kg || !duration_minutes) {
    return 0;
  }

  const met = parseFloat(met_value);
  const weight = parseFloat(weight_kg);
  const minutes = parseFloat(duration_minutes);

  // MET formula: Calories = MET × weight(kg) × duration(hours)
  const hours = minutes / 60;
  const calories = met * weight * hours;

  return Math.round(calories);
};

// ============================================================================
// NET CALORIES CALCULATION
// ============================================================================

/**
 * Calculate net calories for the day
 * @param {number} caloriesEaten - Total calories consumed
 * @param {number} caloriesBurned - Total exercise calories burned
 * @returns {number} Net calories
 */
export const calculateNetCalories = (caloriesEaten, caloriesBurned) => {
  return (parseInt(caloriesEaten, 10) || 0) - (parseInt(caloriesBurned, 10) || 0);
};

// ============================================================================
// DAILY DECISION ENGINE
// ============================================================================

/**
 * Compute daily decision status and gaps
 * @param {Object} params - { consumed, target }
 * @returns {Object} Decision status with gaps and next action
 */
export const computeDailyDecision = ({ consumed, target }) => {
  const calorieGap = (consumed.calories || 0) - (target.calories || 2000);
  const proteinGap = (consumed.protein || 0) - (target.protein || 100);
  const carbGap = (consumed.carbs || 0) - (target.carbs || 200);
  const fatGap = (consumed.fat || 0) - (target.fat || 60);
  const netCalories = calculateNetCalories(consumed.calories, consumed.exercise_calories || 0);

  // Determine status
  let status = 'on_track';
  const caloriePercentage = (consumed.calories || 0) / (target.calories || 2000) * 100;

  if (consumed.calories === 0 && consumed.protein === 0) {
    status = 'no_data';
  } else if (caloriePercentage > 110) {
    status = 'over';
  } else if (caloriePercentage < 80 && caloriePercentage > 0) {
    status = 'under';
  }

  // Generate actionable next step
  let nextAction = '';
  if (status === 'no_data') {
    nextAction = 'Log your meals to track your progress today.';
  } else if (status === 'over') {
    nextAction = `You're ${Math.abs(calorieGap)} calories over target. Consider a light workout or smaller dinner.`;
  } else if (status === 'under') {
    if (proteinGap < -20) {
      nextAction = `You need ${Math.abs(proteinGap)}g more protein. Add chicken, fish, or legumes.`;
    } else {
      nextAction = `You have ${Math.abs(calorieGap)} calories remaining. Focus on protein-rich foods.`;
    }
  } else {
    if (proteinGap < -10) {
      nextAction = `Great progress! Add ${Math.abs(proteinGap)}g more protein to hit your target.`;
    } else {
      nextAction = 'You\'re on track! Keep up the good work.';
    }
  }

  // AI context for prompts
  const aiContext = {
    status,
    calorie_target: target.calories,
    net_calories: netCalories,
    calorie_gap: calorieGap,
    protein_gap: proteinGap,
    carb_gap: carbGap,
    fat_gap: fatGap,
    consumed,
    target
  };

  return {
    status,
    calorie_gap: calorieGap,
    protein_gap_g: proteinGap,
    carb_gap_g: carbGap,
    fat_gap_g: fatGap,
    net_calories: netCalories,
    calories_eaten: consumed.calories || 0,
    calories_burned: consumed.exercise_calories || 0,
    next_action: nextAction,
    ai_context: aiContext,
    logging_complete: (consumed.calories || 0) > 0
  };
};

// ============================================================================
// PLATEAU DETECTION
// ============================================================================

/**
 * Detect weight plateau based on weight logs
 * @param {number} userId - User ID
 * @returns {Object|null} Plateau event or null
 */
export const detectPlateau = async (userId) => {
  try {
    // Get last 14+ days of weight logs
    const weightResult = await query(
      `SELECT log_date, weight_kg 
       FROM weight_logs 
       WHERE user_id = $1 
         AND log_date >= CURRENT_DATE - INTERVAL '21 days'
       ORDER BY log_date ASC`,
      [userId]
    );

    if (weightResult.rows.length < PLATEAU_DETECTION.MIN_DAYS) {
      return null; // Not enough data
    }

    // Get logging compliance
    const complianceResult = await query(
      `SELECT COUNT(*) as logged_days
       FROM daily_summaries
       WHERE user_id = $1
         AND summary_date >= CURRENT_DATE - INTERVAL '14 days'
         AND total_calories > 0`,
      [userId]
    );

    const loggedDays = parseInt(complianceResult.rows[0].logged_days, 10);
    const compliancePercent = Math.round((loggedDays / 14) * 100);

    if (compliancePercent < PLATEAU_DETECTION.MIN_COMPLIANCE_PERCENT) {
      return null; // Not enough compliance to detect plateau
    }

    // Calculate weight trend
    const weights = weightResult.rows.map(r => parseFloat(r.weight_kg));
    const recentWeights = weights.slice(-PLATEAU_DETECTION.MIN_DAYS);

    const avgWeight = recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length;
    const minWeight = Math.min(...recentWeights);
    const maxWeight = Math.max(...recentWeights);
    const weightRange = maxWeight - minWeight;

    // Plateau detected if weight hasn't changed meaningfully
    if (weightRange <= PLATEAU_DETECTION.WEIGHT_CHANGE_THRESHOLD_KG) {
      return {
        detected: true,
        days_stalled: PLATEAU_DETECTION.MIN_DAYS,
        weight_at_detection: recentWeights[recentWeights.length - 1],
        average_weight_during: avgWeight,
        logging_compliance_percentage: compliancePercent,
        reason: `Weight has varied by only ${weightRange.toFixed(1)}kg over ${PLATEAU_DETECTION.MIN_DAYS} days with ${compliancePercent}% logging compliance.`,
        suggested_adjustment: PLATEAU_DETECTION.AUTO_ADJUSTMENT_KCAL,
        plateau_start_date: weightResult.rows[weightResult.rows.length - PLATEAU_DETECTION.MIN_DAYS].log_date
      };
    }

    return null;
  } catch (error) {
    console.error('Plateau detection error:', error);
    return null;
  }
};

// ============================================================================
// WEIGHT TREND ANALYSIS
// ============================================================================

/**
 * Analyze weight trend over a period
 * @param {number} userId - User ID
 * @param {number} days - Number of days to analyze
 * @returns {Object} Trend analysis
 */
export const analyzeWeightTrend = async (userId, days = 30) => {
  try {
    const result = await query(
      `SELECT log_date, weight_kg 
       FROM weight_logs 
       WHERE user_id = $1 
         AND log_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY log_date ASC`,
      [userId]
    );

    if (result.rows.length < 2) {
      return {
        trend: 'insufficient_data',
        data_points: result.rows.length,
        message: 'Need more weight entries to calculate trend'
      };
    }

    const weights = result.rows.map(r => parseFloat(r.weight_kg));
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const change = lastWeight - firstWeight;
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

    let trend = 'stable';
    if (change > 0.5) trend = 'gaining';
    else if (change < -0.5) trend = 'losing';

    return {
      trend,
      first_weight: firstWeight,
      last_weight: lastWeight,
      change_kg: change,
      average_weight: avgWeight,
      data_points: weights.length,
      period_days: days,
      weekly_change_kg: (change / (days / 7))
    };
  } catch (error) {
    console.error('Weight trend analysis error:', error);
    throw error;
  }
};

// ============================================================================
// DATABASE INTEGRATION: Update User BMR/TDEE Cache
// ============================================================================

/**
 * Update user's BMR and TDEE in database
 * @param {number} userId - User ID
 * @returns {Object} Updated targets
 */
export const updateUserTargetsInDB = async (userId) => {
  try {
    // Get user profile
    const userResult = await query(
      `SELECT weight, height, age, gender, activity_level, goal 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const profile = userResult.rows[0];

    // Calculate all targets
    const targets = calculateAllTargets(profile);

    // Update user record with cached values
    await query(
      `UPDATE users 
       SET bmr_cached = $1, 
           tdee_cached = $2, 
           calorie_target = $3,
           bmr_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [targets.bmr, targets.tdee, targets.calorie_target, userId]
    );

    // Check for active goal and update it
    const goalResult = await query(
      `UPDATE goals 
       SET calorie_target = $1,
           protein_target_g = $2,
           carb_target_g = $3,
           fat_target_g = $4,
           updated_at = NOW()
       WHERE user_id = $5 AND is_active = TRUE
       RETURNING id`,
      [targets.calorie_target, targets.protein_target_g, targets.carb_target_g, targets.fat_target_g, userId]
    );

    if (goalResult.rows.length === 0) {
      // No active goal found, create one based on profile
      await query(
        `INSERT INTO goals (
                user_id, goal_type, start_date, 
                start_weight_kg, 
                calorie_target, protein_target_g, carb_target_g, fat_target_g,
                is_active
            ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, TRUE)`,
        [
          userId,
          profile.goal || 'maintenance',
          profile.weight,
          targets.calorie_target,
          targets.protein_target_g,
          targets.carb_target_g,
          targets.fat_target_g
        ]
      );
    }

    return {
      ...targets,
      goal_updated: true
    };
  } catch (error) {
    console.error('Update user targets error:', error);
    throw error;
  }
};

// ============================================================================
// DATABASE INTEGRATION: Create/Update Goal
// ============================================================================

/**
 * Create or update active goal for user
 * @param {number} userId - User ID
 * @param {Object} goalData - Goal parameters
 * @returns {Object} Created/updated goal
 */
export const setUserGoal = async (userId, goalData) => {
  try {
    const { goal_type, target_weight_kg, target_date, custom_calorie_adjustment } = goalData;

    // Get user profile for calculations
    const userResult = await query(
      `SELECT weight, height, age, gender, activity_level FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const profile = userResult.rows[0];

    // Calculate targets
    const bmr = calculateBMR({
      weight_kg: profile.weight,
      height_cm: profile.height,
      age: profile.age,
      gender: profile.gender
    });

    const tdee = calculateTDEE(bmr, profile.activity_level);
    const calorieTarget = calculateCalorieTarget(tdee, goal_type, custom_calorie_adjustment);
    const macros = calculateMacroTargets({
      weight_kg: profile.weight,
      calorie_target: calorieTarget,
      goal_type
    });

    // Deactivate existing goals
    await query(
      `UPDATE goals SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Create new goal
    const result = await query(
      `INSERT INTO goals (
        user_id, goal_type, start_date, target_date, 
        start_weight_kg, target_weight_kg,
        calorie_target, protein_target_g, carb_target_g, fat_target_g,
        calorie_adjustment, is_active
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
      RETURNING *`,
      [
        userId,
        goal_type,
        target_date || null,
        profile.weight,
        target_weight_kg || null,
        calorieTarget,
        macros.protein_g,
        macros.carb_g,
        macros.fat_g,
        custom_calorie_adjustment || GOAL_CALORIE_ADJUSTMENTS[goal_type] || 0
      ]
    );

    // Update user's goal field
    await query(
      `UPDATE users SET goal = $1, calorie_target = $2, updated_at = NOW() WHERE id = $3`,
      [goal_type, calorieTarget, userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Set user goal error:', error);
    throw error;
  }
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Core calculations
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateAllTargets,
  calculateExerciseCalories,
  calculateNetCalories,

  // Daily decision
  computeDailyDecision,

  // Weight analysis
  detectPlateau,
  analyzeWeightTrend,

  // Database operations
  updateUserTargetsInDB,
  setUserGoal,

  // Constants (for reference)
  ACTIVITY_MULTIPLIERS,
  GOAL_CALORIE_ADJUSTMENTS,
  GOAL_PROTEIN_MULTIPLIERS,
  PLATEAU_DETECTION
};
