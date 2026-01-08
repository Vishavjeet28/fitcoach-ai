import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface NotificationSchedule {
  id: string;
  title: string;
  body: string;
  trigger: {
    hour: number;
    minute: number;
    repeats: boolean;
  };
  type: 'meal' | 'workout' | 'water' | 'sleep' | 'custom';
}

export interface NotificationSettings {
  enabled: boolean;
  mealReminders: boolean;
  workoutReminders: boolean;
  hydrationReminders: boolean;
  sleepReminders: boolean;
  customReminders: boolean;
}

/**
 * Push Notification Service
 * Handles meal reminders, workout notifications, hydration alerts, and custom notifications
 * Manages permissions, scheduling, and recurring notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service and request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      const token = await this.registerForPushNotificationsAsync();
      if (token) {
        this.pushToken = token;
        this.isInitialized = true;
        console.log('Push token:', token);
      }

      return this.isInitialized;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  private async registerForPushNotificationsAsync(): Promise<string | null> {
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
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Schedule meal reminder notifications
   */
  async scheduleMealReminders(): Promise<void> {
    const mealSchedules: NotificationSchedule[] = [
      {
        id: 'breakfast-reminder',
        title: '🍳 Breakfast Time!',
        body: 'Start your day with a protein-rich breakfast to fuel your morning!',
        trigger: { hour: 7, minute: 30, repeats: true },
        type: 'meal'
      },
      {
        id: 'lunch-reminder',
        title: '🥗 Lunch Break!',
        body: 'Time for a balanced lunch to maintain your energy levels!',
        trigger: { hour: 12, minute: 30, repeats: true },
        type: 'meal'
      },
      {
        id: 'snack-reminder',
        title: '🥜 Healthy Snack Time!',
        body: 'Consider a protein-rich snack to keep your metabolism active!',
        trigger: { hour: 15, minute: 30, repeats: true },
        type: 'meal'
      },
      {
        id: 'dinner-reminder',
        title: '🍽️ Dinner Time!',
        body: 'End your day with a nutritious dinner for optimal recovery!',
        trigger: { hour: 19, minute: 0, repeats: true },
        type: 'meal'
      }
    ];

    await this.scheduleNotifications(mealSchedules);
  }

  /**
   * Schedule workout reminder notifications
   */
  async scheduleWorkoutReminders(): Promise<void> {
    const workoutSchedules: NotificationSchedule[] = [
      {
        id: 'morning-workout',
        title: '💪 Morning Workout Time!',
        body: 'Ready to crush your morning workout? Your body is primed for action!',
        trigger: { hour: 6, minute: 0, repeats: true },
        type: 'workout'
      },
      {
        id: 'evening-workout',
        title: '🏋️ Evening Training Session!',
        body: 'Time for your evening workout! Release the stress and build strength!',
        trigger: { hour: 18, minute: 0, repeats: true },
        type: 'workout'
      },
      {
        id: 'rest-day-reminder',
        title: '🧘 Active Recovery Day!',
        body: 'Rest days are growth days! Consider light stretching or walking.',
        trigger: { hour: 10, minute: 0, repeats: true },
        type: 'workout'
      }
    ];

    await this.scheduleNotifications(workoutSchedules);
  }

  /**
   * Schedule hydration reminder notifications
   */
  async scheduleHydrationReminders(): Promise<void> {
    const hydrationSchedules: NotificationSchedule[] = [
      {
        id: 'morning-hydration',
        title: '💧 Morning Hydration!',
        body: 'Start your day with a large glass of water to kickstart your metabolism!',
        trigger: { hour: 7, minute: 0, repeats: true },
        type: 'water'
      },
      {
        id: 'midday-hydration',
        title: '💧 Stay Hydrated!',
        body: 'Reminder to drink water and maintain optimal hydration levels!',
        trigger: { hour: 14, minute: 0, repeats: true },
        type: 'water'
      },
      {
        id: 'afternoon-hydration',
        title: '💧 Hydration Check!',
        body: 'How is your water intake today? Keep those hydration levels up!',
        trigger: { hour: 16, minute: 30, repeats: true },
        type: 'water'
      },
      {
        id: 'evening-hydration',
        title: '💧 Evening Hydration!',
        body: 'One more glass of water before winding down for the day!',
        trigger: { hour: 20, minute: 0, repeats: true },
        type: 'water'
      }
    ];

    await this.scheduleNotifications(hydrationSchedules);
  }

  /**
   * Schedule sleep and recovery reminders
   */
  async scheduleSleepReminders(): Promise<void> {
    const sleepSchedules: NotificationSchedule[] = [
      {
        id: 'bedtime-reminder',
        title: '😴 Bedtime Reminder!',
        body: 'Time to wind down! Quality sleep is crucial for recovery and gains.',
        trigger: { hour: 21, minute: 30, repeats: true },
        type: 'sleep'
      },
      {
        id: 'sleep-preparation',
        title: '🌙 Prepare for Sleep!',
        body: 'Consider putting away screens and doing some light stretching.',
        trigger: { hour: 22, minute: 0, repeats: true },
        type: 'sleep'
      }
    ];

    await this.scheduleNotifications(sleepSchedules);
  }

  /**
   * Schedule custom notification
   */
  async scheduleCustomNotification(
    id: string,
    title: string,
    body: string,
    hour: number,
    minute: number,
    repeats: boolean = true
  ): Promise<void> {
    const schedule: NotificationSchedule = {
      id,
      title,
      body,
      trigger: { hour, minute, repeats },
      type: 'custom'
    };

    await this.scheduleNotifications([schedule]);
  }

  /**
   * Schedule multiple notifications
   */
  private async scheduleNotifications(schedules: NotificationSchedule[]): Promise<void> {
    for (const schedule of schedules) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: schedule.id,
          content: {
            title: schedule.title,
            body: schedule.body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { type: schedule.type }
          },
          trigger: {
            hour: schedule.trigger.hour,
            minute: schedule.trigger.minute,
            repeats: schedule.trigger.repeats
          }
        });
        
        console.log(`Scheduled notification: ${schedule.id}`);
      } catch (error) {
        console.error(`Failed to schedule notification ${schedule.id}:`, error);
      }
    }
  }

  /**
   * Cancel specific notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error(`Failed to cancel notification ${notificationId}:`, error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Cancel notifications by type
   */
  async cancelNotificationsByType(type: 'meal' | 'workout' | 'water' | 'sleep'): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === type) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log(`Cancelled all ${type} notifications`);
    } catch (error) {
      console.error(`Failed to cancel ${type} notifications:`, error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Send immediate notification
   */
  async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
    }
  }

  /**
   * Setup default notification schedule
   */
  async setupDefaultNotifications(): Promise<void> {
    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();
      
      // Schedule default reminders
      await this.scheduleMealReminders();
      await this.scheduleWorkoutReminders();
      await this.scheduleHydrationReminders();
      await this.scheduleSleepReminders();
      
      console.log('Default notifications scheduled successfully');
    } catch (error) {
      console.error('Failed to setup default notifications:', error);
    }
  }

  /**
   * Get motivational notification based on time
   */
  getTimeBasedNotification(): { title: string; body: string } {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 9) {
      return {
        title: '🌅 Good Morning, Champion!',
        body: 'Ready to conquer the day? Start with hydration and movement!'
      };
    } else if (hour >= 9 && hour < 12) {
      return {
        title: '⚡ Morning Energy Boost!',
        body: 'Your metabolism is fired up! Perfect time for a workout!'
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        title: '🎯 Midday Motivation!',
        body: 'Keep the momentum going! Stay hydrated and nourished!'
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        title: '🏆 Evening Excellence!',
        body: 'Great time for training or preparing a nutritious dinner!'
      };
    } else {
      return {
        title: '🌙 Evening Wind Down!',
        body: 'Time to rest and recover. Tomorrow brings new opportunities!'
      };
    }
  }

  /**
   * Get push token for external services
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
}

export default NotificationService;
