/**
 * Smart Notification Controller
 * FitCoach AI - Behavior-Driven, Non-Spammy Notifications
 * 
 * Philosophy:
 * - Notifications should HELP, not NAG
 * - Trigger only when action is needed
 * - Respect user context and quiet hours
 * - Max 3 notifications/day (excluding live workout)
 * - Calm, supportive language
 */

import db from '../config/database.js';
import { sendPushNotification } from '../services/pushNotificationService.js';

// ============================================================================
// NOTIFICATION MESSAGE LIBRARY - Irresistible, Eye-Catching Messages
// ============================================================================
const NOTIFICATION_MESSAGES = {
    // Meal Reminders (only if not logged)
    meal: {
        breakfast: [
            { title: "🌅 Rise & Fuel", body: "Your metabolism is waiting! Log a quick breakfast?" },
            { title: "☀️ Morning Power-Up", body: "Champions eat breakfast. What's fueling your morning?" },
            { title: "🍳 Breakfast Check", body: "Quick 30-sec log? Your future self will thank you." },
        ],
        lunch: [
            { title: "🥗 Midday Fuel Stop", body: "Your energy dip wants a salad. Or pizza. We don't judge." },
            { title: "⚡ Recharge Time", body: "Lunch logged = afternoon energy. Quick log?" },
            { title: "🌯 Lunch Break!", body: "Fuel up! What's keeping you going this afternoon?" },
        ],
        dinner: [
            { title: "🍽️ Evening Nourish", body: "End the day right. What's for dinner?" },
            { title: "🌙 Dinner Time", body: "One quick log before you relax. You got this!" },
            { title: "🥘 Final Fuel", body: "Log your dinner and complete today's nutrition circle." },
        ],
    },

    // Water Reminders (only if behind target)
    water: {
        gentle: [
            { title: "💧 Hydration Check", body: "You're a bit behind on water. Quick sip?" },
            { title: "🥤 Water Break", body: "Your cells are thirsty! 1 glass = instant refresh." },
        ],
        urgent: [
            { title: "💦 Hydration Alert!", body: "You're 500ml+ behind. Your energy needs this!" },
            { title: "🚰 Water Boost Needed", body: "Low hydration = low energy. Quick refill?" },
        ],
    },

    // Workout Reminders (only if scheduled and not done)
    workout: {
        scheduled: [
            { title: "🏋️ Workout Waiting!", body: "Today's session is ready. 30 mins to a better you?" },
            { title: "💪 Your Muscles Called", body: "They said it's go time. Ready when you are!" },
            { title: "⚡ Energy Boost Ready", body: "Your workout is prepped and waiting. Let's go!" },
        ],
        streak_protection: [
            { title: "🔥 Streak Alert!", body: "Your {streak}-day streak needs you today. Quick workout?" },
            { title: "⚠️ Don't Break the Chain!", body: "{streak} days strong. Keep it alive with just 15 mins!" },
        ],
    },

    // Live Workout Notifications
    live_workout: {
        rest_timer: { title: "⏱️ Rest Complete", body: "Time to crush the next set!" },
        next_exercise: { title: "➡️ Next Up: {exercise}", body: "Let's keep the momentum going!" },
        halfway: { title: "🔥 Halfway There!", body: "{calories} calories burned. Finish strong!" },
        almost_done: { title: "💪 Final Push!", body: "Just {sets_left} sets left. You got this!" },
    },

    // Post-Workout (max 1)
    post_workout: [
        { title: "🎉 Crushed It!", body: "{calories} calories burned! Hydrate and stretch?" },
        { title: "💥 Workout Complete!", body: "Amazing session! Your muscles need protein within 30 mins." },
        { title: "🏆 Session Done!", body: "You showed up. That's what matters. Cool down time?" },
    ],

    // Progress & Motivation
    progress: {
        weekly: [
            { title: "📊 Weekly Wins", body: "You logged {meals} meals & {workouts} workouts! Keep it up!" },
            { title: "🌟 Week in Review", body: "{calories_burned} calories burned, {water_avg}L avg water. Nice!" },
        ],
        monthly: [
            { title: "🏅 Month of Wins!", body: "{workouts} workouts, {streak_days} active days. You're crushing it!" },
        ],
    },

    // Streak Notifications
    streak: {
        at_risk: [
            { title: "🔥 Streak at Risk!", body: "Your {streak}-day streak expires at midnight! Quick log?" },
            { title: "⏰ Last Chance!", body: "Don't let {streak} days slip away. Any activity counts!" },
        ],
        saved: [
            { title: "✅ Streak Saved!", body: "Phew! {streak} days and counting. See you tomorrow!" },
        ],
        new_record: [
            { title: "🏆 NEW RECORD!", body: "{streak} days! Your longest streak ever. Legendary!" },
        ],
    },

    // Micro Tips (1 per day max)
    tips: [
        { title: "💡 Quick Tip", body: "{tip}" },
        { title: "🧠 Fitness Fact", body: "{tip}" },
        { title: "✨ Daily Wisdom", body: "{tip}" },
    ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get random message from array
 */
const getRandomMessage = (messages) => {
    return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Check if current time is in quiet hours
 */
const isQuietHours = (preferences) => {
    if (!preferences.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const start = preferences.quiet_hours_start;
    const end = preferences.quiet_hours_end;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
        return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
};

/**
 * Check if user has exceeded daily notification limit
 */
const hasExceededDailyLimit = async (userId) => {
    const result = await db.query(
        `SELECT notifications_received_today FROM user_activity_state 
     WHERE user_id = $1 AND today_date = CURRENT_DATE`,
        [userId]
    );

    if (result.rows.length === 0) return false;

    const prefs = await db.query(
        `SELECT max_notifications_per_day FROM notification_preferences WHERE user_id = $1`,
        [userId]
    );

    const maxAllowed = prefs.rows[0]?.max_notifications_per_day || 3;
    return result.rows[0].notifications_received_today >= maxAllowed;
};

/**
 * Get user's notification preferences
 */
const getPreferences = async (userId) => {
    const result = await db.query(
        `SELECT * FROM notification_preferences WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0] || null;
};

/**
 * Get user's activity state
 */
const getActivityState = async (userId) => {
    // Ensure activity state exists and is current
    await db.query(`
    INSERT INTO user_activity_state (user_id, today_date)
    VALUES ($1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
      today_date = CASE 
        WHEN user_activity_state.today_date < CURRENT_DATE 
        THEN CURRENT_DATE 
        ELSE user_activity_state.today_date 
      END,
      -- Reset daily counters if new day
      breakfast_logged = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN FALSE ELSE user_activity_state.breakfast_logged END,
      lunch_logged = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN FALSE ELSE user_activity_state.lunch_logged END,
      dinner_logged = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN FALSE ELSE user_activity_state.dinner_logged END,
      water_logged_ml = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN 0 ELSE user_activity_state.water_logged_ml END,
      workout_completed = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN FALSE ELSE user_activity_state.workout_completed END,
      notifications_received_today = CASE WHEN user_activity_state.today_date < CURRENT_DATE THEN 0 ELSE user_activity_state.notifications_received_today END
  `, [userId]);

    const result = await db.query(
        `SELECT * FROM user_activity_state WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0];
};

/**
 * Log notification sent
 */
const logNotification = async (userId, type, subtype, title, body, data = {}) => {
    await db.query(`
    INSERT INTO notification_logs (user_id, notification_type, notification_subtype, title, body, data)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [userId, type, subtype, title, body, JSON.stringify(data)]);

    // Update activity state counter
    await db.query(`
    UPDATE user_activity_state 
    SET notifications_received_today = notifications_received_today + 1,
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId]);
};

/**
 * Check if similar notification was sent recently (prevent spam)
 */
const wasRecentlySent = async (userId, type, subtype, hoursAgo = 4) => {
    const result = await db.query(`
    SELECT COUNT(*) as count FROM notification_logs
    WHERE user_id = $1 
      AND notification_type = $2 
      AND notification_subtype = $3
      AND created_at > NOW() - INTERVAL '${hoursAgo} hours'
  `, [userId, type, subtype]);

    return parseInt(result.rows[0].count) > 0;
};

// ============================================================================
// NOTIFICATION GENERATORS
// ============================================================================

/**
 * Check and send meal reminder if needed
 */
export const checkMealReminder = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.meal_reminders) return null;
        if (isQuietHours(prefs)) return null;
        if (await hasExceededDailyLimit(userId)) return null;

        const state = await getActivityState(userId);
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8);

        // Determine which meal window we're in
        let mealType = null;
        let mealLogged = false;

        if (currentTime >= prefs.breakfast_window_start && currentTime <= prefs.breakfast_window_end) {
            mealType = 'breakfast';
            mealLogged = state.breakfast_logged;
        } else if (currentTime >= prefs.lunch_window_start && currentTime <= prefs.lunch_window_end) {
            mealType = 'lunch';
            mealLogged = state.lunch_logged;
        } else if (currentTime >= prefs.dinner_window_start && currentTime <= prefs.dinner_window_end) {
            mealType = 'dinner';
            mealLogged = state.dinner_logged;
        }

        if (!mealType || mealLogged) return null;

        // Check if we already sent this reminder
        if (await wasRecentlySent(userId, 'meal_reminder', mealType, 2)) return null;

        // Get a random message
        const message = getRandomMessage(NOTIFICATION_MESSAGES.meal[mealType]);

        // Send notification
        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, message.title, message.body, {
                type: 'meal_reminder',
                mealType,
                screen: 'FoodLog'
            });
        }

        await logNotification(userId, 'meal_reminder', mealType, message.title, message.body);

        return { sent: true, type: 'meal_reminder', mealType };
    } catch (error) {
        console.error('Error checking meal reminder:', error);
        return null;
    }
};

/**
 * Check and send water reminder if behind target
 */
export const checkWaterReminder = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.water_reminders) return null;
        if (isQuietHours(prefs)) return null;
        if (await hasExceededDailyLimit(userId)) return null;

        const state = await getActivityState(userId);

        // Calculate expected water intake based on time of day
        const now = new Date();
        const hoursElapsed = now.getHours() + (now.getMinutes() / 60);
        const activeHours = 14; // Assume 7am to 9pm active window
        const percentOfDay = Math.min(hoursElapsed / activeHours, 1);

        const expectedWater = Math.floor(prefs.daily_water_target_ml * percentOfDay);
        const currentWater = state.water_logged_ml || 0;
        const deficit = expectedWater - currentWater;

        // Only notify if significantly behind (300ml+ buffer)
        if (deficit < 300) return null;

        // Check if we already sent this reminder
        if (await wasRecentlySent(userId, 'water_reminder', 'hydration', 3)) return null;

        // Choose message based on severity
        const severity = deficit > 500 ? 'urgent' : 'gentle';
        const message = getRandomMessage(NOTIFICATION_MESSAGES.water[severity]);

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, message.title, message.body, {
                type: 'water_reminder',
                deficit,
                screen: 'Water'
            });
        }

        await logNotification(userId, 'water_reminder', severity, message.title, message.body, { deficit });

        return { sent: true, type: 'water_reminder', deficit };
    } catch (error) {
        console.error('Error checking water reminder:', error);
        return null;
    }
};

/**
 * Check and send workout reminder if scheduled but not done
 */
export const checkWorkoutReminder = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.workout_reminders) return null;
        if (isQuietHours(prefs)) return null;
        if (await hasExceededDailyLimit(userId)) return null;

        const state = await getActivityState(userId);

        // Don't remind if workout already done
        if (state.workout_completed) return null;

        // Check if today is a workout day
        const today = new Date().getDay();
        if (!prefs.workout_days.includes(today)) return null;

        // Check if it's near preferred workout time (within 30 mins)
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [prefHours, prefMins] = prefs.preferred_workout_time.split(':').map(Number);
        const preferredMinutes = prefHours * 60 + prefMins;

        const timeDiff = currentMinutes - preferredMinutes;
        if (timeDiff < -30 || timeDiff > 60) return null; // Not within notification window

        // Check if we already sent this reminder
        if (await wasRecentlySent(userId, 'workout_reminder', 'scheduled', 4)) return null;

        // Check if streak is at risk (more urgent message)
        const isStreakAtRisk = state.current_streak > 2 && !state.workout_completed;

        let message;
        if (isStreakAtRisk) {
            message = getRandomMessage(NOTIFICATION_MESSAGES.workout.streak_protection);
            message.body = message.body.replace('{streak}', state.current_streak);
        } else {
            message = getRandomMessage(NOTIFICATION_MESSAGES.workout.scheduled);
        }

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, message.title, message.body, {
                type: 'workout_reminder',
                screen: 'Workout'
            });
        }

        await logNotification(userId, 'workout_reminder', isStreakAtRisk ? 'streak_at_risk' : 'scheduled', message.title, message.body);

        return { sent: true, type: 'workout_reminder', isStreakAtRisk };
    } catch (error) {
        console.error('Error checking workout reminder:', error);
        return null;
    }
};

/**
 * Send live workout notification (high priority, doesn't count toward limit)
 */
export const sendLiveWorkoutNotification = async (userId, notificationType, data = {}) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.live_workout_alerts) return null;

        let message;
        switch (notificationType) {
            case 'rest_complete':
                message = NOTIFICATION_MESSAGES.live_workout.rest_timer;
                break;
            case 'next_exercise':
                message = { ...NOTIFICATION_MESSAGES.live_workout.next_exercise };
                message.title = message.title.replace('{exercise}', data.exerciseName || 'Next Exercise');
                break;
            case 'halfway':
                message = { ...NOTIFICATION_MESSAGES.live_workout.halfway };
                message.body = message.body.replace('{calories}', data.calories || '0');
                break;
            case 'almost_done':
                message = { ...NOTIFICATION_MESSAGES.live_workout.almost_done };
                message.body = message.body.replace('{sets_left}', data.setsLeft || '1');
                break;
            default:
                return null;
        }

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, message.title, message.body, {
                type: 'live_workout',
                subtype: notificationType,
                ...data
            }, { priority: 'high', channelId: 'live_workout' });
        }

        // Don't count toward daily limit
        await db.query(`
      INSERT INTO notification_logs (user_id, notification_type, notification_subtype, title, body, data)
      VALUES ($1, 'live_workout', $2, $3, $4, $5)
    `, [userId, notificationType, message.title, message.body, JSON.stringify(data)]);

        return { sent: true, type: 'live_workout', subtype: notificationType };
    } catch (error) {
        console.error('Error sending live workout notification:', error);
        return null;
    }
};

/**
 * Send post-workout notification (max 1 per workout)
 */
export const sendPostWorkoutNotification = async (userId, workoutData) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.workout_reminders) return null;

        // Check if we already sent post-workout notification today
        if (await wasRecentlySent(userId, 'post_workout', 'completed', 8)) return null;

        const message = getRandomMessage(NOTIFICATION_MESSAGES.post_workout);
        const body = message.body.replace('{calories}', workoutData.caloriesBurned || '0');

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, message.title, body, {
                type: 'post_workout',
                screen: 'PostureCare', // Suggest stretching
                ...workoutData
            });
        }

        await logNotification(userId, 'post_workout', 'completed', message.title, body, workoutData);

        // Update activity state
        await db.query(`
      UPDATE user_activity_state 
      SET workout_completed = TRUE,
          workout_completed_at = NOW(),
          workout_duration_minutes = $2,
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId, workoutData.durationMinutes || 0]);

        return { sent: true, type: 'post_workout' };
    } catch (error) {
        console.error('Error sending post-workout notification:', error);
        return null;
    }
};

/**
 * Check and send streak alert if at risk
 */
export const checkStreakAlert = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.streak_alerts) return null;
        if (isQuietHours(prefs)) return null;

        const state = await getActivityState(userId);

        // Only alert if streak exists and at risk (evening time, no activity)
        if (state.current_streak < 1) return null;
        if (state.workout_completed || state.breakfast_logged || state.lunch_logged) return null;

        const now = new Date();
        const hour = now.getHours();

        // Only send streak alerts in evening (after 8pm)
        if (hour < 20) return null;

        // Check if we already sent this alert
        if (await wasRecentlySent(userId, 'streak_alert', 'at_risk', 24)) return null;

        const message = getRandomMessage(NOTIFICATION_MESSAGES.streak.at_risk);
        const body = message.body.replace('{streak}', state.current_streak);
        const title = message.title.replace('{streak}', state.current_streak);

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, title, body, {
                type: 'streak_alert',
                streak: state.current_streak,
                screen: 'Home'
            });
        }

        await logNotification(userId, 'streak_alert', 'at_risk', title, body, { streak: state.current_streak });

        return { sent: true, type: 'streak_alert', streak: state.current_streak };
    } catch (error) {
        console.error('Error checking streak alert:', error);
        return null;
    }
};

/**
 * Send daily motivation tip (max 1 per day)
 */
export const sendDailyTip = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.motivation_tips) return null;
        if (isQuietHours(prefs)) return null;

        // Check if tip already sent today
        if (await wasRecentlySent(userId, 'motivation_tip', 'daily', 24)) return null;

        // Get a random tip that hasn't been sent recently
        const result = await db.query(`
      SELECT * FROM motivation_tips 
      WHERE is_enabled = TRUE
      ORDER BY times_sent ASC, RANDOM()
      LIMIT 1
    `);

        if (result.rows.length === 0) return null;

        const tip = result.rows[0];
        const messageTemplate = getRandomMessage(NOTIFICATION_MESSAGES.tips);
        const title = `${tip.emoji} ${messageTemplate.title.replace('💡 ', '')}`;
        const body = tip.tip_text;

        if (prefs.expo_push_token) {
            await sendPushNotification(prefs.expo_push_token, title, body, {
                type: 'motivation_tip',
                category: tip.category
            });
        }

        // Update tip usage count
        await db.query(`UPDATE motivation_tips SET times_sent = times_sent + 1 WHERE id = $1`, [tip.id]);

        await logNotification(userId, 'motivation_tip', 'daily', title, body, { tipId: tip.id });

        return { sent: true, type: 'motivation_tip' };
    } catch (error) {
        console.error('Error sending daily tip:', error);
        return null;
    }
};

/**
 * Check for milestone achievements
 */
export const checkMilestones = async (userId) => {
    try {
        const prefs = await getPreferences(userId);
        if (!prefs || !prefs.notifications_enabled || !prefs.progress_notifications) return null;

        // Check workout count milestones
        const workoutCount = await db.query(`
      SELECT COUNT(*) as count FROM exercise_logs WHERE user_id = $1
    `, [userId]);

        // Check streak milestones
        const state = await getActivityState(userId);

        // Find unachieved milestones that are now achieved
        const achievable = await db.query(`
      SELECT m.* FROM notification_milestones m
      LEFT JOIN user_milestones um ON m.id = um.milestone_id AND um.user_id = $1
      WHERE um.id IS NULL AND m.is_enabled = TRUE
        AND (
          (m.milestone_type = 'streak' AND m.threshold_value <= $2)
          OR (m.milestone_type = 'workout_count' AND m.threshold_value <= $3)
        )
    `, [userId, state.current_streak || 0, parseInt(workoutCount.rows[0].count) || 0]);

        const achieved = [];

        for (const milestone of achievable.rows) {
            // Mark as achieved
            await db.query(`
        INSERT INTO user_milestones (user_id, milestone_id, notified, notified_at)
        VALUES ($1, $2, TRUE, NOW())
        ON CONFLICT (user_id, milestone_id) DO NOTHING
      `, [userId, milestone.id]);

            // Send notification
            if (prefs.expo_push_token) {
                await sendPushNotification(prefs.expo_push_token, milestone.title, milestone.body, {
                    type: 'milestone',
                    milestoneKey: milestone.milestone_key,
                    screen: 'Profile'
                });
            }

            await logNotification(userId, 'milestone', milestone.milestone_key, milestone.title, milestone.body);
            achieved.push(milestone.milestone_key);
        }

        return achieved.length > 0 ? { sent: true, type: 'milestone', milestones: achieved } : null;
    } catch (error) {
        console.error('Error checking milestones:', error);
        return null;
    }
};

// ============================================================================
// ACTIVITY STATE UPDATES (Called by other services)
// ============================================================================

/**
 * Update meal logged state
 */
export const updateMealLogged = async (userId, mealType) => {
    const column = `${mealType.toLowerCase()}_logged`;
    const timeColumn = `${mealType.toLowerCase()}_logged_at`;

    await db.query(`
    UPDATE user_activity_state 
    SET ${column} = TRUE,
        ${timeColumn} = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId]);
};

/**
 * Update water logged
 */
export const updateWaterLogged = async (userId, amountMl) => {
    await db.query(`
    UPDATE user_activity_state 
    SET water_logged_ml = water_logged_ml + $2,
        last_water_log_at = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId, amountMl]);
};

/**
 * Update streak
 */
export const updateStreak = async (userId, newStreak) => {
    await db.query(`
    UPDATE user_activity_state 
    SET current_streak = $2,
        longest_streak = GREATEST(longest_streak, $2),
        last_active_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = $1
  `, [userId, newStreak]);
};

/**
 * Track notification response
 */
export const trackNotificationOpened = async (userId, notificationId) => {
    await db.query(`
    UPDATE notification_logs 
    SET opened_at = NOW(),
        was_opened = TRUE
    WHERE user_id = $1 AND id = $2
  `, [userId, notificationId]);

    // Update response rate
    await db.query(`
    UPDATE user_activity_state 
    SET notifications_opened_today = notifications_opened_today + 1,
        consecutive_ignored_notifications = 0,
        notification_response_rate = (
          SELECT COALESCE(AVG(CASE WHEN was_opened THEN 1 ELSE 0 END), 0.5)
          FROM (
            SELECT was_opened FROM notification_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 20
          ) recent
        )
    WHERE user_id = $1
  `, [userId]);
};

// ============================================================================
// CONTROLLER EXPORTS
// ============================================================================

export default {
    checkMealReminder,
    checkWaterReminder,
    checkWorkoutReminder,
    sendLiveWorkoutNotification,
    sendPostWorkoutNotification,
    checkStreakAlert,
    sendDailyTip,
    checkMilestones,
    updateMealLogged,
    updateWaterLogged,
    updateStreak,
    trackNotificationOpened,
};
