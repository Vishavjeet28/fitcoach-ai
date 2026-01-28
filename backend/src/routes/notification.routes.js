/**
 * Smart Notification Routes
 * FitCoach AI - API Endpoints for Notification System
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import db from '../config/database.js';
import { registerPushToken } from '../services/pushNotificationService.js';
import smartNotification from '../controllers/smartNotification.controller.js';

const router = express.Router();

// ============================================================================
// PREFERENCES
// ============================================================================

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Ensure preferences exist
        await db.query(`
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

        const result = await db.query(
            `SELECT * FROM notification_preferences WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            preferences: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to get preferences' });
    }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            notifications_enabled,
            meal_reminders,
            water_reminders,
            workout_reminders,
            live_workout_alerts,
            progress_notifications,
            motivation_tips,
            streak_alerts,
            preferred_workout_time,
            workout_days,
            quiet_hours_enabled,
            quiet_hours_start,
            quiet_hours_end,
            breakfast_window_start,
            breakfast_window_end,
            lunch_window_start,
            lunch_window_end,
            dinner_window_start,
            dinner_window_end,
            daily_water_target_ml,
            max_notifications_per_day,
            timezone,
        } = req.body;

        await db.query(`
      INSERT INTO notification_preferences (user_id, notifications_enabled, meal_reminders, water_reminders, 
        workout_reminders, live_workout_alerts, progress_notifications, motivation_tips, streak_alerts,
        preferred_workout_time, workout_days, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
        breakfast_window_start, breakfast_window_end, lunch_window_start, lunch_window_end,
        dinner_window_start, dinner_window_end, daily_water_target_ml, max_notifications_per_day, timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (user_id) DO UPDATE SET
        notifications_enabled = COALESCE($2, notification_preferences.notifications_enabled),
        meal_reminders = COALESCE($3, notification_preferences.meal_reminders),
        water_reminders = COALESCE($4, notification_preferences.water_reminders),
        workout_reminders = COALESCE($5, notification_preferences.workout_reminders),
        live_workout_alerts = COALESCE($6, notification_preferences.live_workout_alerts),
        progress_notifications = COALESCE($7, notification_preferences.progress_notifications),
        motivation_tips = COALESCE($8, notification_preferences.motivation_tips),
        streak_alerts = COALESCE($9, notification_preferences.streak_alerts),
        preferred_workout_time = COALESCE($10, notification_preferences.preferred_workout_time),
        workout_days = COALESCE($11, notification_preferences.workout_days),
        quiet_hours_enabled = COALESCE($12, notification_preferences.quiet_hours_enabled),
        quiet_hours_start = COALESCE($13, notification_preferences.quiet_hours_start),
        quiet_hours_end = COALESCE($14, notification_preferences.quiet_hours_end),
        breakfast_window_start = COALESCE($15, notification_preferences.breakfast_window_start),
        breakfast_window_end = COALESCE($16, notification_preferences.breakfast_window_end),
        lunch_window_start = COALESCE($17, notification_preferences.lunch_window_start),
        lunch_window_end = COALESCE($18, notification_preferences.lunch_window_end),
        dinner_window_start = COALESCE($19, notification_preferences.dinner_window_start),
        dinner_window_end = COALESCE($20, notification_preferences.dinner_window_end),
        daily_water_target_ml = COALESCE($21, notification_preferences.daily_water_target_ml),
        max_notifications_per_day = COALESCE($22, notification_preferences.max_notifications_per_day),
        timezone = COALESCE($23, notification_preferences.timezone),
        updated_at = NOW()
    `, [userId, notifications_enabled, meal_reminders, water_reminders, workout_reminders,
            live_workout_alerts, progress_notifications, motivation_tips, streak_alerts,
            preferred_workout_time, workout_days, quiet_hours_enabled, quiet_hours_start,
            quiet_hours_end, breakfast_window_start, breakfast_window_end, lunch_window_start,
            lunch_window_end, dinner_window_start, dinner_window_end, daily_water_target_ml,
            max_notifications_per_day, timezone]);

        res.json({ success: true, message: 'Preferences updated' });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }
});

// ============================================================================
// TOKEN REGISTRATION
// ============================================================================

/**
 * POST /api/notifications/register-token
 * Register push notification token
 */
router.post('/register-token', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token, tokenType = 'expo' } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Token is required' });
        }

        const result = await registerPushToken(userId, token, tokenType);
        res.json(result);
    } catch (error) {
        console.error('Error registering push token:', error);
        res.status(500).json({ success: false, error: 'Failed to register token' });
    }
});

// ============================================================================
// NOTIFICATION HISTORY
// ============================================================================

/**
 * GET /api/notifications/history
 * Get notification history
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;

        const result = await db.query(`
      SELECT id, notification_type, notification_subtype, title, body, 
             delivered_at, was_opened, action_taken, data
      FROM notification_logs
      WHERE user_id = $1
      ORDER BY delivered_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            notifications: result.rows
        });
    } catch (error) {
        console.error('Error getting notification history:', error);
        res.status(500).json({ success: false, error: 'Failed to get history' });
    }
});

/**
 * POST /api/notifications/opened
 * Track notification opened
 */
router.post('/opened', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.body;

        await smartNotification.trackNotificationOpened(userId, notificationId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking notification opened:', error);
        res.status(500).json({ success: false, error: 'Failed to track' });
    }
});

// ============================================================================
// ACTIVITY STATE
// ============================================================================

/**
 * GET /api/notifications/activity-state
 * Get current activity state
 */
router.get('/activity-state', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Ensure state exists
        await db.query(`
      INSERT INTO user_activity_state (user_id, today_date)
      VALUES ($1, CURRENT_DATE)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

        const result = await db.query(
            `SELECT * FROM user_activity_state WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            state: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting activity state:', error);
        res.status(500).json({ success: false, error: 'Failed to get state' });
    }
});

// ============================================================================
// MILESTONES
// ============================================================================

/**
 * GET /api/notifications/milestones
 * Get user's milestone achievements
 */
router.get('/milestones', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
      SELECT m.*, um.achieved_at, um.notified
      FROM notification_milestones m
      LEFT JOIN user_milestones um ON m.id = um.milestone_id AND um.user_id = $1
      WHERE m.is_enabled = TRUE
      ORDER BY m.threshold_value ASC
    `, [userId]);

        res.json({
            success: true,
            milestones: result.rows
        });
    } catch (error) {
        console.error('Error getting milestones:', error);
        res.status(500).json({ success: false, error: 'Failed to get milestones' });
    }
});

// ============================================================================
// MANUAL TRIGGERS (for testing/admin)
// ============================================================================

/**
 * POST /api/notifications/trigger-check
 * Manually trigger notification check (for testing)
 */
router.post('/trigger-check', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.body;

        let result;
        switch (type) {
            case 'meal':
                result = await smartNotification.checkMealReminder(userId);
                break;
            case 'water':
                result = await smartNotification.checkWaterReminder(userId);
                break;
            case 'workout':
                result = await smartNotification.checkWorkoutReminder(userId);
                break;
            case 'streak':
                result = await smartNotification.checkStreakAlert(userId);
                break;
            case 'tip':
                result = await smartNotification.sendDailyTip(userId);
                break;
            case 'milestones':
                result = await smartNotification.checkMilestones(userId);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid type' });
        }

        res.json({
            success: true,
            result: result || { sent: false, reason: 'No notification needed' }
        });
    } catch (error) {
        console.error('Error triggering notification check:', error);
        res.status(500).json({ success: false, error: 'Failed to trigger check' });
    }
});

// ============================================================================
// SCHEDULED JOB ENDPOINT (for cron/scheduler)
// ============================================================================

/**
 * POST /api/notifications/run-scheduler
 * Run notification scheduler for all users (called by cron job)
 */
router.post('/run-scheduler', async (req, res) => {
    try {
        // Verify internal API key
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // Get all users with notifications enabled
        const users = await db.query(`
      SELECT user_id FROM notification_preferences
      WHERE notifications_enabled = TRUE
        AND expo_push_token IS NOT NULL
    `);

        const results = {
            processed: 0,
            notifications_sent: 0,
            errors: 0
        };

        for (const user of users.rows) {
            try {
                results.processed++;

                // Check all notification types
                const mealResult = await smartNotification.checkMealReminder(user.user_id);
                const waterResult = await smartNotification.checkWaterReminder(user.user_id);
                const workoutResult = await smartNotification.checkWorkoutReminder(user.user_id);
                const streakResult = await smartNotification.checkStreakAlert(user.user_id);

                if (mealResult?.sent) results.notifications_sent++;
                if (waterResult?.sent) results.notifications_sent++;
                if (workoutResult?.sent) results.notifications_sent++;
                if (streakResult?.sent) results.notifications_sent++;

                // Check milestones (less frequently)
                await smartNotification.checkMilestones(user.user_id);
            } catch (error) {
                console.error(`Error processing user ${user.user_id}:`, error);
                results.errors++;
            }
        }

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error running notification scheduler:', error);
        res.status(500).json({ success: false, error: 'Failed to run scheduler' });
    }
});

export default router;
