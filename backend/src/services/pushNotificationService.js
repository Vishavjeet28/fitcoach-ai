/**
 * Push Notification Service
 * FitCoach AI - Expo & Firebase Cloud Messaging Integration
 * 
 * Supports:
 * - Expo Push Notifications (for Expo managed apps)
 * - Firebase Cloud Messaging (for bare React Native)
 */

import fetch from 'node-fetch';
import admin from 'firebase-admin';
import db from '../config/database.js';

// Initialize Firebase Admin if credentials exist
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (firebaseInitialized) return true;

    try {
        const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            : null;

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            firebaseInitialized = true;
            console.log('✅ Firebase Admin SDK initialized');
        }
    } catch (error) {
        console.warn('⚠️ Firebase Admin SDK not initialized:', error.message);
    }

    return firebaseInitialized;
};

// ============================================================================
// EXPO PUSH NOTIFICATIONS
// ============================================================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification via Expo
 */
export const sendExpoPushNotification = async (pushToken, title, body, data = {}, options = {}) => {
    try {
        const message = {
            to: pushToken,
            sound: options.sound || 'default',
            title,
            body,
            data,
            priority: options.priority || 'high',
            channelId: options.channelId || 'default',
            badge: options.badge,
            categoryId: options.categoryId,
        };

        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();

        if (result.data?.status === 'error') {
            console.error('Expo push error:', result.data.message);

            // Handle invalid tokens
            if (result.data.details?.error === 'DeviceNotRegistered') {
                await invalidatePushToken(pushToken);
            }

            return { success: false, error: result.data.message };
        }

        console.log('✅ Expo push sent:', { title, token: pushToken.slice(-10) });
        return { success: true, ticketId: result.data?.id };
    } catch (error) {
        console.error('Failed to send Expo push:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send batch notifications via Expo
 */
export const sendExpoMultipleNotifications = async (messages) => {
    try {
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        return { success: true, tickets: result.data };
    } catch (error) {
        console.error('Failed to send batch Expo pushes:', error);
        return { success: false, error: error.message };
    }
};

// ============================================================================
// FIREBASE CLOUD MESSAGING
// ============================================================================

/**
 * Send push notification via Firebase
 */
export const sendFirebasePushNotification = async (fcmToken, title, body, data = {}, options = {}) => {
    if (!initializeFirebase()) {
        console.warn('Firebase not initialized, skipping FCM push');
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const message = {
            token: fcmToken,
            notification: {
                title,
                body,
            },
            data: Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, String(value)])
            ),
            android: {
                priority: options.priority || 'high',
                notification: {
                    channelId: options.channelId || 'default',
                    sound: options.sound || 'default',
                    icon: 'ic_notification',
                    color: '#26D9BB',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: options.sound || 'default',
                        badge: options.badge,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        console.log('✅ FCM push sent:', { title, messageId: response });
        return { success: true, messageId: response };
    } catch (error) {
        console.error('Failed to send FCM push:', error);

        // Handle invalid tokens
        if (error.code === 'messaging/registration-token-not-registered') {
            await invalidateFcmToken(fcmToken);
        }

        return { success: false, error: error.message };
    }
};

// ============================================================================
// UNIFIED PUSH FUNCTION
// ============================================================================

/**
 * Send push notification (auto-detects token type)
 */
export const sendPushNotification = async (token, title, body, data = {}, options = {}) => {
    // Expo tokens start with "ExponentPushToken"
    if (token.startsWith('ExponentPushToken')) {
        return sendExpoPushNotification(token, title, body, data, options);
    }

    // Assume FCM token
    return sendFirebasePushNotification(token, title, body, data, options);
};

/**
 * Send notification to user (looks up token from database)
 */
export const sendPushToUser = async (userId, title, body, data = {}, options = {}) => {
    try {
        const result = await db.query(
            `SELECT expo_push_token, fcm_token FROM notification_preferences WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'User preferences not found' };
        }

        const { expo_push_token, fcm_token } = result.rows[0];

        // Prefer Expo token
        if (expo_push_token) {
            return sendExpoPushNotification(expo_push_token, title, body, data, options);
        }

        if (fcm_token) {
            return sendFirebasePushNotification(fcm_token, title, body, data, options);
        }

        return { success: false, error: 'No push token available' };
    } catch (error) {
        console.error('Failed to send push to user:', error);
        return { success: false, error: error.message };
    }
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Register push token for user
 */
export const registerPushToken = async (userId, token, tokenType = 'expo') => {
    try {
        const column = tokenType === 'fcm' ? 'fcm_token' : 'expo_push_token';

        await db.query(`
      INSERT INTO notification_preferences (user_id, ${column})
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET 
        ${column} = $2,
        updated_at = NOW()
    `, [userId, token]);

        console.log(`✅ Push token registered for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to register push token:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Invalidate Expo push token
 */
const invalidatePushToken = async (token) => {
    try {
        await db.query(`
      UPDATE notification_preferences 
      SET expo_push_token = NULL 
      WHERE expo_push_token = $1
    `, [token]);
        console.log('✅ Invalidated Expo push token');
    } catch (error) {
        console.error('Failed to invalidate push token:', error);
    }
};

/**
 * Invalidate FCM token
 */
const invalidateFcmToken = async (token) => {
    try {
        await db.query(`
      UPDATE notification_preferences 
      SET fcm_token = NULL 
      WHERE fcm_token = $1
    `, [token]);
        console.log('✅ Invalidated FCM token');
    } catch (error) {
        console.error('Failed to invalidate FCM token:', error);
    }
};

// ============================================================================
// NOTIFICATION CHANNELS (Android)
// ============================================================================

export const NOTIFICATION_CHANNELS = {
    default: {
        id: 'default',
        name: 'General Notifications',
        description: 'General app notifications',
        importance: 4, // HIGH
    },
    live_workout: {
        id: 'live_workout',
        name: 'Live Workout',
        description: 'Real-time workout notifications',
        importance: 5, // MAX
    },
    reminders: {
        id: 'reminders',
        name: 'Reminders',
        description: 'Meal, water, and workout reminders',
        importance: 3, // DEFAULT
    },
    achievements: {
        id: 'achievements',
        name: 'Achievements',
        description: 'Milestone and streak celebrations',
        importance: 4, // HIGH
    },
};

export default {
    sendPushNotification,
    sendPushToUser,
    sendExpoPushNotification,
    sendExpoMultipleNotifications,
    sendFirebasePushNotification,
    registerPushToken,
    NOTIFICATION_CHANNELS,
};
