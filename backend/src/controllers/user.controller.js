import { query } from '../config/database.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, name, weight, height, age, gender,
              activity_level, goal, calorie_target, dietary_restrictions,
              preferred_cuisines, created_at, last_login
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
