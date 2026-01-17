import { query } from '../config/database.js';
import FLE from '../services/fitnessLogicEngine.js';

/**
 * CRITICAL: POST /api/user/profile-setup
 * 
 * One-time profile setup. Profile completion is IMMUTABLE once set.
 * 
 * PRODUCTION RULE: If profile_completed = TRUE, return 409 Conflict
 * Do NOT allow re-submission.
 * 
 * On success:
 * - Saves: age, gender, height, weight, activity_level, goal
 * - Calculates: BMR, TDEE, calorie targets, macro targets
 * - Sets: profile_completed = TRUE, profile_completed_at = NOW()
 */
export const setupProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { age, gender, height, weight, activityLevel, goal } = req.body;

    // STEP 1: Check if profile is ALREADY completed
    const existingResult = await query(
      `SELECT profile_completed FROM users WHERE id = $1`,
      [userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { profile_completed } = existingResult.rows[0];

    // PRODUCTION RULE: Profile setup is ONE-TIME ONLY
    if (profile_completed === true) {
      return res.status(409).json({
        error: 'Profile already completed',
        code: 'PROFILE_ALREADY_COMPLETED',
        message: 'This user has already completed profile setup and cannot re-submit.'
      });
    }

    // STEP 2: Update profile with provided data
    const updateResult = await query(
      `UPDATE users 
       SET age = $1,
           gender = $2,
           height = $3,
           weight = $4,
           activity_level = $5,
           goal = $6,
           profile_completed = TRUE,
           profile_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, name, age, gender, height, weight, 
                 activity_level, goal, profile_completed, profile_completed_at`,
      [age, gender, height, weight, activityLevel, goal, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = updateResult.rows[0];

    // STEP 3: Recalculate fitness targets (BMR, TDEE, calorie targets)
    try {
      await FLE.updateUserTargetsInDB(userId);
      console.log(`✅ [PROFILE SETUP] Targets recalculated for user ${userId}`);
    } catch (fleError) {
      console.error(`⚠️ [PROFILE SETUP] FLE recalculation failed for user ${userId}:`, fleError);
      // Don't fail the request, targets can be recalculated later
    }

    // STEP 4: Return success with updated user
    res.status(201).json({
      message: 'Profile setup completed successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        activityLevel: user.activity_level,
        goal: user.goal,
        profile_completed: user.profile_completed,
        profileCompletedAt: user.profile_completed_at
      }
    });

  } catch (error) {
    console.error('Profile setup error:', error);
    res.status(500).json({ error: 'Profile setup failed' });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, name, weight, height, age, gender,
              activity_level as "activityLevel", 
              goal, 
              calorie_target as "calorieTarget",
              profile_completed as "profile_completed",
              COALESCE(bmr_cached, calorie_target, 2000) as "bmr",
              COALESCE(tdee_cached, calorie_target, 2000) as "tdee",
              dietary_restrictions as "dietaryRestrictions",
              preferred_cuisines as "preferredCuisines", 
              created_at as "createdAt", 
              last_login as "lastLogin",
              subscription_status as "subscriptionStatus", 
              ai_usage_count as "aiUsageCount"
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

// Update user profile (Base Data)
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      age, gender, height, weight, activity_level, goal, profile_completed,
      preferences // Optional: goal_style, meal_style, etc.
    } = req.body;

    // 1. Build dynamic update query for USERS table
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (age !== undefined) { updates.push(`age = $${paramCount++}`); values.push(age); }
    if (gender !== undefined) { updates.push(`gender = $${paramCount++}`); values.push(gender); }
    if (height !== undefined) { updates.push(`height = $${paramCount++}`); values.push(height); }
    if (weight !== undefined) { updates.push(`weight = $${paramCount++}`); values.push(weight); }
    if (activity_level !== undefined) { updates.push(`activity_level = $${paramCount++}`); values.push(activity_level); }
    if (goal !== undefined) { updates.push(`goal = $${paramCount++}`); values.push(goal); }
    if (profile_completed !== undefined) { updates.push(`profile_completed = $${paramCount++}`); values.push(profile_completed); }

    updates.push(`updated_at = NOW()`);

    // Only update if there are fields (to avoid SQL error on empty update)
    if (updates.length > 1) { // >1 because updated_at is always there
         // Add userId as final param
        values.push(userId);
        
        await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
        );
    }

    // 2. Handle Preferences (if sent) - Ideally these go to a user_preferences table
    // For now, we'll verify they're received (Logging for MVP)
    if (preferences) {
        // e.g., UPDATE user_preferences ...
        console.log('Preferences update request:', preferences);
    }

    // 3. Return updated profile
    const result = await query(
      `SELECT id, email, name, weight, height, age, gender,
              activity_level as "activityLevel", 
              goal, 
              profile_completed as "profile_completed"
       FROM users WHERE id = $1`,
      [userId]
    );

    res.json({ 
        message: 'Profile updated successfully',
        user: result.rows[0] 
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};


// Export all user data
export const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    // Get food logs
    const foodResult = await query(
      'SELECT * FROM food_logs WHERE user_id = $1 ORDER BY meal_date DESC',
      [userId]
    );

    // Get exercise logs
    const exerciseResult = await query(
      'SELECT * FROM exercise_logs WHERE user_id = $1 ORDER BY workout_date DESC',
      [userId]
    );

    // Get water logs
    const waterResult = await query(
      'SELECT * FROM water_logs WHERE user_id = $1 ORDER BY log_date DESC',
      [userId]
    );

    // Get daily summaries
    const summariesResult = await query(
      'SELECT * FROM daily_summaries WHERE user_id = $1 ORDER BY summary_date DESC',
      [userId]
    );

    // Get AI insights
    const insightsResult = await query(
      'SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const exportData = {
      exportDate: new Date().toISOString(),
      user: userResult.rows[0],
      foodLogs: foodResult.rows,
      exerciseLogs: exerciseResult.rows,
      waterLogs: waterResult.rows,
      dailySummaries: summariesResult.rows,
      aiInsights: insightsResult.rows,
      totalRecords: {
        foodLogs: foodResult.rows.length,
        exerciseLogs: exerciseResult.rows.length,
        waterLogs: waterResult.rows.length,
        dailySummaries: summariesResult.rows.length,
        aiInsights: insightsResult.rows.length
      }
    };

    res.json({
      message: 'Data exported successfully',
      data: exportData
    });
  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
};

// Delete all user data
export const deleteUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_DATA') {
      return res.status(400).json({ 
        error: 'Confirmation required. Send { "confirmation": "DELETE_MY_DATA" } to proceed.' 
      });
    }

    // Delete all user data (cascade will handle related records)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ 
      message: 'All user data has been permanently deleted',
      deletedUserId: userId
    });
  } catch (error) {
    console.error('Delete user data error:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
};

// Update user preferences
export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dietaryRestrictions, preferredCuisines } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (dietaryRestrictions !== undefined) {
      updates.push(`dietary_restrictions = $${paramCount++}`);
      values.push(dietaryRestrictions);
    }

    if (preferredCuisines !== undefined) {
      updates.push(`preferred_cuisines = $${paramCount++}`);
      values.push(preferredCuisines);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING dietary_restrictions, preferred_cuisines`,
      values
    );

    res.json({
      message: 'Preferences updated successfully',
      preferences: result.rows[0]
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

// Deactivate account (soft delete)
export const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Revoke all refresh tokens
    await query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [userId]
    );

    res.json({ 
      message: 'Account deactivated successfully. Contact support to reactivate.' 
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
};

// Get account statistics
export const getAccountStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM food_logs WHERE user_id = $1) as food_logs_count,
        (SELECT COUNT(*) FROM exercise_logs WHERE user_id = $1) as exercise_logs_count,
        (SELECT COUNT(*) FROM water_logs WHERE user_id = $1) as water_logs_count,
        (SELECT COUNT(*) FROM daily_summaries WHERE user_id = $1) as days_logged,
        (SELECT COUNT(*) FROM ai_insights WHERE user_id = $1) as ai_insights_count,
        (SELECT created_at FROM users WHERE id = $1) as member_since`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      stats: {
        foodLogsCount: parseInt(stats.food_logs_count),
        exerciseLogsCount: parseInt(stats.exercise_logs_count),
        waterLogsCount: parseInt(stats.water_logs_count),
        daysLogged: parseInt(stats.days_logged),
        aiInsightsCount: parseInt(stats.ai_insights_count),
        memberSince: stats.member_since
      }
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ error: 'Failed to get account statistics' });
  }
};
