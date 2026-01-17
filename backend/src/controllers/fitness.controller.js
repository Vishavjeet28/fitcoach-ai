/**
 * ============================================================================
 * FITNESS CONTROLLER
 * ============================================================================
 * 
 * API endpoints for the Fitness Logic Engine.
 * Handles goals, targets, weight tracking, and plateau detection.
 * 
 * Location: /backend/src/controllers/fitness.controller.js
 * ============================================================================
 */

import { query } from '../config/database.js';
import FLE from '../services/fitnessLogicEngine.js';
import billingService from '../services/billingService.js';

// ============================================================================
// GET USER TARGETS
// ============================================================================

/**
 * GET /api/fitness/targets
 * Calculate and return user's current targets
 */
export const getUserTargets = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const userResult = await query(
      `SELECT weight, height, age, gender, activity_level, goal,
              calorie_target, bmr_cached, tdee_cached
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = userResult.rows[0];

    // Check if we need to recalculate (missing cached values or profile changed)
    if (!profile.bmr_cached || !profile.tdee_cached) {
      try {
        const targets = await FLE.updateUserTargetsInDB(userId);
        return res.json({
          source: 'calculated',
          targets
        });
      } catch (calcError) {
        // Profile might be incomplete
        return res.json({
          source: 'profile_incomplete',
          message: 'Please complete your profile to see personalized targets',
          required_fields: ['weight', 'height', 'age', 'gender', 'activity_level'],
          defaults: {
            calorie_target: profile.calorie_target || 2000,
            protein_target_g: 100,
            carb_target_g: 200,
            fat_target_g: 60
          }
        });
      }
    }

    // Return cached values
    const macros = FLE.calculateMacroTargets({
      weight_kg: profile.weight,
      calorie_target: profile.calorie_target,
      goal_type: profile.goal
    });

    res.json({
      source: 'cached',
      targets: {
        bmr: profile.bmr_cached,
        tdee: profile.tdee_cached,
        calorie_target: profile.calorie_target,
        protein_target_g: macros.protein_g,
        carb_target_g: macros.carb_g,
        fat_target_g: macros.fat_g,
        goal_type: profile.goal || 'maintenance',
        activity_level: profile.activity_level || 'sedentary'
      }
    });
  } catch (error) {
    console.error('Get user targets error:', error);
    res.status(500).json({ error: 'Failed to get user targets' });
  }
};

// ============================================================================
// RECALCULATE TARGETS
// ============================================================================

/**
 * POST /api/fitness/targets/recalculate
 * Force recalculation of all targets
 */
export const recalculateTargets = async (req, res) => {
  try {
    const userId = req.user.id;

    const targets = await FLE.updateUserTargetsInDB(userId);

    res.json({
      message: 'Targets recalculated successfully',
      targets
    });
  } catch (error) {
    console.error('Recalculate targets error:', error);
    res.status(500).json({ error: error.message || 'Failed to recalculate targets' });
  }
};

// ============================================================================
// SET GOAL
// ============================================================================

/**
 * POST /api/fitness/goals
 * Create or update user's active goal
 */
export const setGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal_type, target_weight_kg, target_date, custom_calorie_adjustment } = req.body;

    // Validate goal_type
    const validGoals = ['fat_loss', 'maintenance', 'muscle_gain', 'recomposition'];
    if (!goal_type || !validGoals.includes(goal_type)) {
      return res.status(400).json({ 
        error: 'Invalid goal_type',
        valid_options: validGoals
      });
    }

    const goal = await FLE.setUserGoal(userId, {
      goal_type,
      target_weight_kg,
      target_date,
      custom_calorie_adjustment
    });

    res.status(201).json({
      message: 'Goal set successfully',
      goal
    });
  } catch (error) {
    console.error('Set goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to set goal' });
  }
};

// ============================================================================
// GET ACTIVE GOAL
// ============================================================================

/**
 * GET /api/fitness/goals/active
 * Get user's current active goal
 */
export const getActiveGoal = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM goals WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        has_goal: false,
        message: 'No active goal set'
      });
    }

    res.json({
      has_goal: true,
      goal: result.rows[0]
    });
  } catch (error) {
    console.error('Get active goal error:', error);
    res.status(500).json({ error: 'Failed to get active goal' });
  }
};

// ============================================================================
// LOG WEIGHT
// ============================================================================

/**
 * POST /api/fitness/weight
 * Log a weight entry
 */
export const logWeight = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight_kg, body_fat_percentage, source = 'manual', notes, log_date } = req.body;

    if (!weight_kg || weight_kg <= 0 || weight_kg > 500) {
      return res.status(400).json({ error: 'Invalid weight value' });
    }

    const date = log_date || new Date().toISOString().split('T')[0];

    // Upsert weight log (one per day)
    const result = await query(
      `INSERT INTO weight_logs (user_id, weight_kg, body_fat_percentage, source, notes, log_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET 
         weight_kg = $2, 
         body_fat_percentage = $3, 
         source = $4, 
         notes = $5,
         logged_at = NOW()
       RETURNING *`,
      [userId, weight_kg, body_fat_percentage || null, source, notes || null, date]
    );

    // Also update user's weight in profile
    await query(
      `UPDATE users SET weight = $1, updated_at = NOW() WHERE id = $2`,
      [weight_kg, userId]
    );

    // Trigger target recalculation (weight changed)
    try {
      await FLE.updateUserTargetsInDB(userId);
    } catch (e) {
      // Non-fatal
      console.warn('Target recalculation skipped:', e.message);
    }

    res.status(201).json({
      message: 'Weight logged successfully',
      weight_log: result.rows[0]
    });
  } catch (error) {
    console.error('Log weight error:', error);
    res.status(500).json({ error: 'Failed to log weight' });
  }
};

// ============================================================================
// GET WEIGHT HISTORY
// ============================================================================

/**
 * GET /api/fitness/weight
 * Get weight history
 */
export const getWeightHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const result = await query(
      `SELECT id, weight_kg, body_fat_percentage, source, log_date, logged_at, notes
       FROM weight_logs
       WHERE user_id = $1 
         AND log_date >= CURRENT_DATE - INTERVAL '${parseInt(days, 10)} days'
       ORDER BY log_date DESC`,
      [userId]
    );

    // Get trend analysis
    const trend = await FLE.analyzeWeightTrend(userId, parseInt(days, 10));

    res.json({
      logs: result.rows,
      trend,
      period_days: parseInt(days, 10)
    });
  } catch (error) {
    console.error('Get weight history error:', error);
    res.status(500).json({ error: 'Failed to get weight history' });
  }
};

// ============================================================================
// GET DAILY DECISION
// ============================================================================

/**
 * GET /api/fitness/daily-decision
 * Get today's computed decision status
 */
export const getDailyDecision = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get today's consumption
    const summaryResult = await query(
      `SELECT total_calories, total_protein, total_carbs, total_fat,
              total_exercise_calories, total_exercise_minutes
       FROM daily_summaries
       WHERE user_id = $1 AND summary_date = $2`,
      [userId, targetDate]
    );

    // Get user's targets
    const targetResult = await query(
      `SELECT calorie_target, g.protein_target_g, g.carb_target_g, g.fat_target_g
       FROM users u
       LEFT JOIN goals g ON g.user_id = u.id AND g.is_active = TRUE
       WHERE u.id = $1`,
      [userId]
    );

    const consumed = summaryResult.rows[0] || {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      total_exercise_calories: 0
    };

    const targets = targetResult.rows[0] || {
      calorie_target: 2000,
      protein_target_g: 100,
      carb_target_g: 200,
      fat_target_g: 60
    };

    // Compute decision
    const decision = FLE.computeDailyDecision({
      consumed: {
        calories: parseInt(consumed.total_calories, 10) || 0,
        protein: parseFloat(consumed.total_protein) || 0,
        carbs: parseFloat(consumed.total_carbs) || 0,
        fat: parseFloat(consumed.total_fat) || 0,
        exercise_calories: parseInt(consumed.total_exercise_calories, 10) || 0
      },
      target: {
        calories: targets.calorie_target || 2000,
        protein: targets.protein_target_g || 100,
        carbs: targets.carb_target_g || 200,
        fat: targets.fat_target_g || 60
      }
    });

    // Store decision for caching
    try {
      await query(
        `INSERT INTO daily_decisions (
          user_id, decision_date, status, calorie_gap, protein_gap_g, carb_gap_g, fat_gap_g,
          calories_eaten, calories_burned, net_calories,
          calorie_target, protein_target_g, carb_target_g, fat_target_g,
          logging_complete, next_action, ai_context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (user_id, decision_date)
        DO UPDATE SET
          status = $3, calorie_gap = $4, protein_gap_g = $5, carb_gap_g = $6, fat_gap_g = $7,
          calories_eaten = $8, calories_burned = $9, net_calories = $10,
          logging_complete = $15, next_action = $16, ai_context = $17,
          computed_at = NOW()`,
        [
          userId, targetDate, decision.status, decision.calorie_gap,
          decision.protein_gap_g, decision.carb_gap_g, decision.fat_gap_g,
          decision.calories_eaten, decision.calories_burned, decision.net_calories,
          targets.calorie_target, targets.protein_target_g, targets.carb_target_g, targets.fat_target_g,
          decision.logging_complete, decision.next_action, JSON.stringify(decision.ai_context)
        ]
      );
    } catch (e) {
      // Non-fatal
      console.warn('Decision cache update failed:', e.message);
    }

    res.json({
      date: targetDate,
      decision: {
        status: decision.status,
        calorie_gap: decision.calorie_gap,
        protein_gap_g: decision.protein_gap_g,
        carb_gap_g: decision.carb_gap_g,
        fat_gap_g: decision.fat_gap_g,
        net_calories: decision.net_calories,
        calories_eaten: decision.calories_eaten,
        calories_burned: decision.calories_burned,
        logging_complete: decision.logging_complete,
        next_action: decision.next_action
      },
      targets: {
        calories: targets.calorie_target,
        protein_g: targets.protein_target_g,
        carbs_g: targets.carb_target_g,
        fat_g: targets.fat_target_g
      }
    });
  } catch (error) {
    console.error('Get daily decision error:', error);
    res.status(500).json({ error: 'Failed to get daily decision' });
  }
};

// ============================================================================
// CHECK PLATEAU
// ============================================================================

/**
 * GET /api/fitness/plateau-check
 * Check for weight plateau (Premium feature)
 */
export const checkPlateau = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check feature access
    const access = await billingService.checkFeatureAccess(userId, 'plateau_detection');
    if (!access.allowed) {
      return res.status(403).json({ 
        error: 'Premium feature',
        code: 'UPGRADE_REQUIRED',
        message: access.reason
      });
    }

    const plateau = await FLE.detectPlateau(userId);

    if (!plateau) {
      return res.json({
        plateau_detected: false,
        message: 'No plateau detected. Keep going!'
      });
    }

    // Store plateau event if new
    const existingPlateau = await query(
      `SELECT id FROM plateau_events
       WHERE user_id = $1 
         AND is_resolved = FALSE
         AND detected_on >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    if (existingPlateau.rows.length === 0) {
      await query(
        `INSERT INTO plateau_events (
          user_id, detected_on, plateau_start_date, days_stalled,
          weight_at_detection, average_weight_during, logging_compliance_percentage,
          reason, adjustment_kcal, adjustment_type
        ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, 'calorie_decrease')`,
        [
          userId,
          plateau.plateau_start_date,
          plateau.days_stalled,
          plateau.weight_at_detection,
          plateau.average_weight_during,
          plateau.logging_compliance_percentage,
          plateau.reason,
          -plateau.suggested_adjustment
        ]
      );
    }

    res.json({
      plateau_detected: true,
      plateau
    });
  } catch (error) {
    console.error('Check plateau error:', error);
    res.status(500).json({ error: 'Failed to check for plateau' });
  }
};

// ============================================================================
// APPLY PLATEAU ADJUSTMENT
// ============================================================================

/**
 * POST /api/fitness/plateau/:id/apply
 * Apply the suggested adjustment for a plateau
 */
export const applyPlateauAdjustment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check feature access
    const access = await billingService.checkFeatureAccess(userId, 'adaptive_calories');
    if (!access.allowed) {
      return res.status(403).json({ 
        error: 'Premium feature',
        code: 'UPGRADE_REQUIRED',
        message: access.reason
      });
    }

    // Get plateau event
    const plateauResult = await query(
      `SELECT * FROM plateau_events WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (plateauResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plateau event not found' });
    }

    const plateau = plateauResult.rows[0];

    // Update goal with new calorie target
    const goalResult = await query(
      `UPDATE goals 
       SET calorie_target = calorie_target + $1,
           calorie_adjustment = calorie_adjustment + $1,
           updated_at = NOW()
       WHERE user_id = $2 AND is_active = TRUE
       RETURNING calorie_target`,
      [plateau.adjustment_kcal, userId]
    );

    // Mark plateau as resolved
    await query(
      `UPDATE plateau_events
       SET adjustment_applied_at = NOW(), is_resolved = TRUE, resolved_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Update user's calorie target
    if (goalResult.rows.length > 0) {
      await query(
        `UPDATE users SET calorie_target = $1, updated_at = NOW() WHERE id = $2`,
        [goalResult.rows[0].calorie_target, userId]
      );
    }

    res.json({
      message: 'Adjustment applied successfully',
      new_calorie_target: goalResult.rows[0]?.calorie_target
    });
  } catch (error) {
    console.error('Apply plateau adjustment error:', error);
    res.status(500).json({ error: 'Failed to apply adjustment' });
  }
};

export default {
  getUserTargets,
  recalculateTargets,
  setGoal,
  getActiveGoal,
  logWeight,
  getWeightHistory,
  getDailyDecision,
  checkPlateau,
  applyPlateauAdjustment
};
