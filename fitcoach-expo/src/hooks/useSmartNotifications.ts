/**
 * useSmartNotifications Hook
 * FitCoach AI - React Hook for Smart Notification System
 * 
 * Usage:
 * const { preferences, updatePreference, scheduleMealReminder, ... } = useSmartNotifications();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import smartNotificationService, {
    NotificationPreferences,
    ActivityState
} from '../services/smartNotificationService';

interface UseSmartNotificationsReturn {
    // State
    isInitialized: boolean;
    isLoading: boolean;
    preferences: NotificationPreferences | null;
    activityState: ActivityState | null;
    pushToken: string | null;
    hasPermissions: boolean;

    // Preference Management
    updatePreference: <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => Promise<boolean>;
    updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<boolean>;
    toggleNotifications: (enabled: boolean) => Promise<boolean>;

    // Notification Actions
    scheduleMealReminder: (mealType: 'breakfast' | 'lunch' | 'dinner') => Promise<void>;
    scheduleWaterReminder: (deficit: number) => Promise<void>;
    scheduleWorkoutReminder: (isStreakAtRisk?: boolean) => Promise<void>;
    sendLiveWorkoutNotification: (
        type: 'rest_complete' | 'next_exercise' | 'halfway' | 'almost_done',
        data?: Record<string, any>
    ) => Promise<void>;
    sendPostWorkoutNotification: (caloriesBurned: number) => Promise<void>;

    // Activity Tracking
    trackMealLogged: (mealType: 'breakfast' | 'lunch' | 'dinner') => void;
    trackWaterLogged: (amountMl: number) => void;
    trackWorkoutCompleted: () => void;

    // Utilities
    requestPermissions: () => Promise<boolean>;
    syncWithServer: () => Promise<void>;
    getNotificationHistory: () => Promise<any[]>;
    getMilestones: () => Promise<any[]>;
}

export function useSmartNotifications(): UseSmartNotificationsReturn {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [activityState, setActivityState] = useState<ActivityState | null>(null);
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [hasPermissions, setHasPermissions] = useState(false);

    const appStateRef = useRef(AppState.currentState);

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);

            // Initialize the service
            const initialized = await smartNotificationService.initialize();
            setIsInitialized(initialized);

            // Get initial state
            const perms = await smartNotificationService.checkPermissions();
            setHasPermissions(perms);

            setPushToken(smartNotificationService.getPushToken());
            setPreferences(smartNotificationService.getPreferences());
            setActivityState(smartNotificationService.getActivityState());

            setIsLoading(false);
        };

        init();

        // Cleanup on unmount
        return () => {
            smartNotificationService.cleanup();
        };
    }, []);

    // Handle app state changes (sync on foreground)
    useEffect(() => {
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App has come to foreground - sync with server
                await syncWithServer();
            }
            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    // Sync with server
    const syncWithServer = useCallback(async () => {
        await smartNotificationService.syncWithServer();
        setPreferences(smartNotificationService.getPreferences());
        setActivityState(smartNotificationService.getActivityState());
    }, []);

    // Update a single preference
    const updatePreference = useCallback(async <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ): Promise<boolean> => {
        const success = await smartNotificationService.updatePreferences({ [key]: value });
        if (success) {
            setPreferences(prev => prev ? { ...prev, [key]: value } : null);
        }
        return success;
    }, []);

    // Update multiple preferences
    const updatePreferences = useCallback(async (
        updates: Partial<NotificationPreferences>
    ): Promise<boolean> => {
        const success = await smartNotificationService.updatePreferences(updates);
        if (success) {
            setPreferences(prev => prev ? { ...prev, ...updates } : null);
        }
        return success;
    }, []);

    // Toggle all notifications
    const toggleNotifications = useCallback(async (enabled: boolean): Promise<boolean> => {
        const success = await updatePreference('notifications_enabled', enabled);

        if (success && !enabled) {
            // Cancel all scheduled notifications when disabled
            await smartNotificationService.cancelAllNotifications();
        } else if (success && enabled) {
            // Reschedule daily notifications when enabled
            await smartNotificationService.scheduleDailyNotifications();
        }

        return success;
    }, [updatePreference]);

    // Schedule meal reminder
    const scheduleMealReminder = useCallback(async (
        mealType: 'breakfast' | 'lunch' | 'dinner'
    ): Promise<void> => {
        await smartNotificationService.scheduleMealReminder(mealType);
    }, []);

    // Schedule water reminder
    const scheduleWaterReminder = useCallback(async (deficit: number): Promise<void> => {
        await smartNotificationService.scheduleWaterReminder(deficit);
    }, []);

    // Schedule workout reminder
    const scheduleWorkoutReminder = useCallback(async (
        isStreakAtRisk: boolean = false
    ): Promise<void> => {
        await smartNotificationService.scheduleWorkoutReminder(isStreakAtRisk);
    }, []);

    // Send live workout notification
    const sendLiveWorkoutNotification = useCallback(async (
        type: 'rest_complete' | 'next_exercise' | 'halfway' | 'almost_done',
        data: Record<string, any> = {}
    ): Promise<void> => {
        await smartNotificationService.sendLiveWorkoutNotification(type, data);
    }, []);

    // Send post-workout notification
    const sendPostWorkoutNotification = useCallback(async (
        caloriesBurned: number
    ): Promise<void> => {
        await smartNotificationService.sendPostWorkoutNotification(caloriesBurned);
    }, []);

    // Track meal logged
    const trackMealLogged = useCallback((
        mealType: 'breakfast' | 'lunch' | 'dinner'
    ): void => {
        smartNotificationService.trackMealLogged(mealType);
        setActivityState(prev => {
            if (!prev) return prev;
            return { ...prev, [`${mealType}_logged`]: true };
        });
    }, []);

    // Track water logged
    const trackWaterLogged = useCallback((amountMl: number): void => {
        smartNotificationService.trackWaterLogged(amountMl);
        setActivityState(prev => {
            if (!prev) return prev;
            return { ...prev, water_logged_ml: prev.water_logged_ml + amountMl };
        });
    }, []);

    // Track workout completed
    const trackWorkoutCompleted = useCallback((): void => {
        smartNotificationService.trackWorkoutCompleted();
        setActivityState(prev => {
            if (!prev) return prev;
            return { ...prev, workout_completed: true };
        });
    }, []);

    // Request permissions
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        const granted = await smartNotificationService.requestPermissions();
        setHasPermissions(granted);
        return granted;
    }, []);

    // Get notification history
    const getNotificationHistory = useCallback(async (): Promise<any[]> => {
        return smartNotificationService.getNotificationHistory();
    }, []);

    // Get milestones
    const getMilestones = useCallback(async (): Promise<any[]> => {
        return smartNotificationService.getMilestones();
    }, []);

    return {
        // State
        isInitialized,
        isLoading,
        preferences,
        activityState,
        pushToken,
        hasPermissions,

        // Preference Management
        updatePreference,
        updatePreferences,
        toggleNotifications,

        // Notification Actions
        scheduleMealReminder,
        scheduleWaterReminder,
        scheduleWorkoutReminder,
        sendLiveWorkoutNotification,
        sendPostWorkoutNotification,

        // Activity Tracking
        trackMealLogged,
        trackWaterLogged,
        trackWorkoutCompleted,

        // Utilities
        requestPermissions,
        syncWithServer,
        getNotificationHistory,
        getMilestones,
    };
}

export default useSmartNotifications;
