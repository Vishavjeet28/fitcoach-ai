/**
 * Smart Notification Service
 * FitCoach AI - Complete Frontend Notification System
 * 
 * Features:
 * - Behavior-driven local notifications
 * - Push notification handling
 * - Notification preferences management
 * - Deep link routing from notifications
 * - Activity state tracking
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import SafeAsyncStorage from '../utils/SafeAsyncStorage';
import api from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPreferences {
    notifications_enabled: boolean;
    meal_reminders: boolean;
    water_reminders: boolean;
    workout_reminders: boolean;
    live_workout_alerts: boolean;
    progress_notifications: boolean;
    motivation_tips: boolean;
    streak_alerts: boolean;
    preferred_workout_time: string;
    workout_days: number[];
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    breakfast_window_start: string;
    breakfast_window_end: string;
    lunch_window_start: string;
    lunch_window_end: string;
    dinner_window_start: string;
    dinner_window_end: string;
    daily_water_target_ml: number;
    max_notifications_per_day: number;
    timezone: string;
}

export interface ActivityState {
    breakfast_logged: boolean;
    lunch_logged: boolean;
    dinner_logged: boolean;
    water_logged_ml: number;
    workout_completed: boolean;
    current_streak: number;
    notifications_received_today: number;
}

export interface NotificationData {
    type: string;
    screen?: string;
    [key: string]: any;
}

// ============================================================================
// NOTIFICATION MESSAGE TEMPLATES
// ============================================================================

const NOTIFICATION_MESSAGES = {
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
    workout: [
        { title: "🏋️ Workout Waiting!", body: "Today's session is ready. 30 mins to a better you?" },
        { title: "💪 Your Muscles Called", body: "They said it's go time. Ready when you are!" },
        { title: "⚡ Energy Boost Ready", body: "Your workout is prepped and waiting. Let's go!" },
    ],
    streak_at_risk: [
        { title: "🔥 Streak Alert!", body: "Your streak needs you today. Quick workout?" },
        { title: "⏰ Last Chance!", body: "Don't let your streak slip away. Any activity counts!" },
    ],
    post_workout: [
        { title: "🎉 Crushed It!", body: "Amazing session! Hydrate and stretch?" },
        { title: "💥 Workout Complete!", body: "You showed up. That's what matters. Cool down time?" },
        { title: "🏆 Session Done!", body: "Your muscles need protein within 30 mins." },
    ],
};

// ============================================================================
// SMART NOTIFICATION SERVICE CLASS
// ============================================================================

class SmartNotificationService {
    private static instance: SmartNotificationService;
    private pushToken: string | null = null;
    private isInitialized = false;
    private preferences: NotificationPreferences | null = null;
    private activityState: ActivityState | null = null;
    private notificationListener: Notifications.Subscription | null = null;
    private responseListener: Notifications.Subscription | null = null;
    private navigationRef: any = null;

    static getInstance(): SmartNotificationService {
        if (!SmartNotificationService.instance) {
            SmartNotificationService.instance = new SmartNotificationService();
        }
        return SmartNotificationService.instance;
    }

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    /**
     * Initialize the notification service
     */
    async initialize(navigationRef?: any): Promise<boolean> {
        try {
            if (navigationRef) {
                this.navigationRef = navigationRef;
            }

            // Configure notification handler
            Notifications.setNotificationHandler({
                handleNotification: async (notification) => {
                    const data = notification.request.content.data as NotificationData;

                    // Always show alert for live workout notifications
                    const isLiveWorkout = data?.type === 'live_workout';

                    return {
                        shouldShowAlert: true,
                        shouldPlaySound: !isLiveWorkout, // Silent for live workout
                        shouldSetBadge: true,
                    };
                },
            });

            // Set up notification channels for Android
            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }

            // Register for push notifications
            const token = await this.registerForPushNotifications();
            if (token) {
                this.pushToken = token;
                await this.registerTokenWithServer(token);
            }

            // Set up notification listeners
            this.setupListeners();

            // Load preferences and activity state
            await this.syncWithServer();

            this.isInitialized = true;
            console.log('✅ Smart Notification Service initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize notification service:', error);
            return false;
        }
    }

    /**
     * Set up Android notification channels
     */
    private async setupAndroidChannels(): Promise<void> {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'General',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#26D9BB',
            sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('live_workout', {
            name: 'Live Workout',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 100],
            lightColor: '#8B5CF6',
            sound: null, // Silent for live workout
        });

        await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250],
            lightColor: '#26D9BB',
        });

        await Notifications.setNotificationChannelAsync('achievements', {
            name: 'Achievements',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 100, 250],
            lightColor: '#FFD700',
        });
    }

    /**
     * Register for push notifications
     */
    private async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
            console.warn('Push notifications only work on physical devices');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permissions not granted');
            return null;
        }

        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            return tokenData.data;
        } catch (error) {
            console.error('Failed to get push token:', error);
            return null;
        }
    }

    /**
     * Register push token with backend
     */
    private async registerTokenWithServer(token: string): Promise<void> {
        try {
            await api.post('/notifications/register-token', {
                token,
                tokenType: 'expo',
            });
            await SafeAsyncStorage.setItem('push_token', token);
            console.log('✅ Push token registered with server');
        } catch (error) {
            console.error('Failed to register token with server:', error);
        }
    }

    /**
     * Set up notification listeners
     */
    private setupListeners(): void {
        // Handle notification received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('Notification received:', notification.request.content);
            }
        );

        // Handle notification tap
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            async (response) => {
                const data = response.notification.request.content.data as NotificationData;
                await this.handleNotificationTap(data);
            }
        );
    }

    /**
     * Handle notification tap (deep linking)
     */
    private async handleNotificationTap(data: NotificationData): Promise<void> {
        if (!data) return;

        // Track notification opened
        if (data.notificationId) {
            try {
                await api.post('/notifications/opened', { notificationId: data.notificationId });
            } catch (error) {
                console.error('Failed to track notification opened:', error);
            }
        }

        // Navigate to relevant screen
        if (this.navigationRef && data.screen) {
            try {
                this.navigationRef.navigate(data.screen, data);
            } catch (error) {
                console.error('Failed to navigate from notification:', error);
            }
        }
    }

    // ==========================================================================
    // PREFERENCES & SYNC
    // ==========================================================================

    /**
     * Sync preferences and activity state with server
     */
    async syncWithServer(): Promise<void> {
        try {
            const [prefsResponse, stateResponse] = await Promise.all([
                api.get('/notifications/preferences'),
                api.get('/notifications/activity-state'),
            ]);

            if (prefsResponse.data.success) {
                this.preferences = prefsResponse.data.preferences;
            }

            if (stateResponse.data.success) {
                this.activityState = stateResponse.data.state;
            }
        } catch (error) {
            console.error('Failed to sync with server:', error);
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(updates: Partial<NotificationPreferences>): Promise<boolean> {
        try {
            const response = await api.put('/notifications/preferences', updates);
            if (response.data.success) {
                this.preferences = { ...this.preferences, ...updates } as NotificationPreferences;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update preferences:', error);
            return false;
        }
    }

    /**
     * Get current preferences
     */
    getPreferences(): NotificationPreferences | null {
        return this.preferences;
    }

    /**
     * Get activity state
     */
    getActivityState(): ActivityState | null {
        return this.activityState;
    }

    // ==========================================================================
    // LOCAL NOTIFICATION SCHEDULING
    // ==========================================================================

    /**
     * Check if in quiet hours
     */
    private isQuietHours(): boolean {
        if (!this.preferences?.quiet_hours_enabled) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = this.preferences.quiet_hours_start.split(':').map(Number);
        const [endH, endM] = this.preferences.quiet_hours_end.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        // Handle overnight quiet hours
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    /**
     * Get random message from array
     */
    private getRandomMessage(messages: { title: string; body: string }[]): { title: string; body: string } {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    /**
     * Schedule meal reminder
     */
    async scheduleMealReminder(mealType: 'breakfast' | 'lunch' | 'dinner', delayMinutes: number = 0): Promise<string | null> {
        if (!this.preferences?.meal_reminders) return null;
        if (this.isQuietHours()) return null;

        // Check if meal already logged
        const mealLogged = this.activityState?.[`${mealType}_logged` as keyof ActivityState];
        if (mealLogged) return null;

        const message = this.getRandomMessage(NOTIFICATION_MESSAGES.meal[mealType]);

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'meal_reminder', mealType, screen: 'FoodLog' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: delayMinutes > 0 ? { seconds: delayMinutes * 60 } : null,
            });

            return identifier;
        } catch (error) {
            console.error('Failed to schedule meal reminder:', error);
            return null;
        }
    }

    /**
     * Schedule water reminder
     */
    async scheduleWaterReminder(deficit: number): Promise<string | null> {
        if (!this.preferences?.water_reminders) return null;
        if (this.isQuietHours()) return null;
        if (deficit < 300) return null;

        const severity = deficit > 500 ? 'urgent' : 'gentle';
        const message = this.getRandomMessage(NOTIFICATION_MESSAGES.water[severity]);

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'water_reminder', deficit, screen: 'Water' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.DEFAULT,
                },
                trigger: null,
            });

            return identifier;
        } catch (error) {
            console.error('Failed to schedule water reminder:', error);
            return null;
        }
    }

    /**
     * Schedule workout reminder
     */
    async scheduleWorkoutReminder(isStreakAtRisk: boolean = false): Promise<string | null> {
        if (!this.preferences?.workout_reminders) return null;
        if (this.isQuietHours()) return null;
        if (this.activityState?.workout_completed) return null;

        const messages = isStreakAtRisk
            ? NOTIFICATION_MESSAGES.streak_at_risk
            : NOTIFICATION_MESSAGES.workout;
        const message = this.getRandomMessage(messages);

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'workout_reminder', isStreakAtRisk, screen: 'Workout' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
            });

            return identifier;
        } catch (error) {
            console.error('Failed to schedule workout reminder:', error);
            return null;
        }
    }

    /**
     * Send live workout notification (high priority, silent)
     */
    async sendLiveWorkoutNotification(
        type: 'rest_complete' | 'next_exercise' | 'halfway' | 'almost_done',
        data: Record<string, any> = {}
    ): Promise<string | null> {
        if (!this.preferences?.live_workout_alerts) return null;

        const messages: Record<string, { title: string; body: string }> = {
            rest_complete: { title: "⏱️ Rest Complete", body: "Time to crush the next set!" },
            next_exercise: { title: `➡️ Next Up: ${data.exerciseName || 'Next Exercise'}`, body: "Let's keep the momentum going!" },
            halfway: { title: "🔥 Halfway There!", body: `${data.calories || 0} calories burned. Finish strong!` },
            almost_done: { title: "💪 Final Push!", body: `Just ${data.setsLeft || 1} sets left. You got this!` },
        };

        const message = messages[type];
        if (!message) return null;

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'live_workout', subtype: type, ...data },
                    sound: false, // Silent
                    priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: null,
            });

            return identifier;
        } catch (error) {
            console.error('Failed to send live workout notification:', error);
            return null;
        }
    }

    /**
     * Send post-workout notification
     */
    async sendPostWorkoutNotification(caloriesBurned: number): Promise<string | null> {
        if (!this.preferences?.workout_reminders) return null;

        const message = this.getRandomMessage(NOTIFICATION_MESSAGES.post_workout);

        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'post_workout', caloriesBurned, screen: 'PostureCare' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: null,
            });

            // Update activity state
            if (this.activityState) {
                this.activityState.workout_completed = true;
            }

            return identifier;
        } catch (error) {
            console.error('Failed to send post-workout notification:', error);
            return null;
        }
    }

    // ==========================================================================
    // DAILY SCHEDULING
    // ==========================================================================

    /**
     * Schedule all daily notifications based on preferences
     */
    async scheduleDailyNotifications(): Promise<void> {
        if (!this.preferences?.notifications_enabled) return;

        // Cancel existing scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Schedule meal reminders at end of each window (if meal not logged)
        if (this.preferences.meal_reminders) {
            await this.scheduleTimeBasedReminder('breakfast', this.preferences.breakfast_window_end);
            await this.scheduleTimeBasedReminder('lunch', this.preferences.lunch_window_end);
            await this.scheduleTimeBasedReminder('dinner', this.preferences.dinner_window_end);
        }

        // Schedule workout reminder near preferred time
        if (this.preferences.workout_reminders) {
            await this.scheduleWorkoutTimeReminder();
        }

        console.log('✅ Daily notifications scheduled');
    }

    /**
     * Schedule time-based reminder
     */
    private async scheduleTimeBasedReminder(
        mealType: 'breakfast' | 'lunch' | 'dinner',
        endTime: string
    ): Promise<void> {
        const [hours, minutes] = endTime.split(':').map(Number);

        // Schedule 30 minutes before window ends
        const reminderHour = minutes >= 30 ? hours : hours - 1;
        const reminderMinute = minutes >= 30 ? minutes - 30 : minutes + 30;

        const message = this.getRandomMessage(NOTIFICATION_MESSAGES.meal[mealType]);

        try {
            await Notifications.scheduleNotificationAsync({
                identifier: `${mealType}-reminder`,
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'meal_reminder', mealType, screen: 'FoodLog' },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: reminderHour,
                    minute: reminderMinute,
                },
            });
        } catch (error) {
            console.error(`Failed to schedule ${mealType} reminder:`, error);
        }
    }

    /**
     * Schedule workout time reminder
     */
    private async scheduleWorkoutTimeReminder(): Promise<void> {
        if (!this.preferences?.preferred_workout_time) return;

        const [hours, minutes] = this.preferences.preferred_workout_time.split(':').map(Number);
        const message = this.getRandomMessage(NOTIFICATION_MESSAGES.workout);

        try {
            await Notifications.scheduleNotificationAsync({
                identifier: 'workout-reminder',
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'workout_reminder', screen: 'Workout' },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes,
                },
            });
        } catch (error) {
            console.error('Failed to schedule workout reminder:', error);
        }
    }

    // ==========================================================================
    // ACTIVITY TRACKING
    // ==========================================================================

    /**
     * Track meal logged (updates local state)
     */
    trackMealLogged(mealType: 'breakfast' | 'lunch' | 'dinner'): void {
        if (this.activityState) {
            (this.activityState as any)[`${mealType}_logged`] = true;
        }

        // Cancel meal reminder if scheduled
        Notifications.cancelScheduledNotificationAsync(`${mealType}-reminder`);
    }

    /**
     * Track water logged
     */
    trackWaterLogged(amountMl: number): void {
        if (this.activityState) {
            this.activityState.water_logged_ml += amountMl;
        }
    }

    /**
     * Track workout completed
     */
    trackWorkoutCompleted(): void {
        if (this.activityState) {
            this.activityState.workout_completed = true;
        }

        // Cancel workout reminder
        Notifications.cancelScheduledNotificationAsync('workout-reminder');
    }

    // ==========================================================================
    // UTILITIES
    // ==========================================================================

    /**
     * Get push token
     */
    getPushToken(): string | null {
        return this.pushToken;
    }

    /**
     * Check if service is initialized
     */
    isServiceInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Request notification permissions
     */
    async requestPermissions(): Promise<boolean> {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Check notification permissions
     */
    async checkPermissions(): Promise<boolean> {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Cancel all notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.dismissAllNotificationsAsync();
    }

    /**
     * Get notification history from server
     */
    async getNotificationHistory(limit: number = 20): Promise<any[]> {
        try {
            const response = await api.get(`/notifications/history?limit=${limit}`);
            return response.data.notifications || [];
        } catch (error) {
            console.error('Failed to get notification history:', error);
            return [];
        }
    }

    /**
     * Get milestones from server
     */
    async getMilestones(): Promise<any[]> {
        try {
            const response = await api.get('/notifications/milestones');
            return response.data.milestones || [];
        } catch (error) {
            console.error('Failed to get milestones:', error);
            return [];
        }
    }

    /**
     * Cleanup on unmount
     */
    cleanup(): void {
        if (this.notificationListener) {
            this.notificationListener.remove();
        }
        if (this.responseListener) {
            this.responseListener.remove();
        }
    }
}

// Export singleton instance
export const smartNotificationService = SmartNotificationService.getInstance();
export default smartNotificationService;
