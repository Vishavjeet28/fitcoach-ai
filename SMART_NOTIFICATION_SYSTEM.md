# 🔔 Smart Notification System

## FitCoach AI - Behavior-Driven, Non-Spammy Notifications

A complete, production-ready notification system designed to increase retention, consistency, and calm motivation while respecting user attention.

---

## 📋 Table of Contents

1. [Philosophy](#philosophy)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Notification Types](#notification-types)
5. [Message Library](#message-library)
6. [Priority Rules](#priority-rules)
7. [Integration Guide](#integration-guide)
8. [API Reference](#api-reference)
9. [Edge Cases](#edge-cases)

---

## 🧠 Philosophy

### Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Help, not nag** | Notifications only trigger when action is needed |
| **No guilt** | Language is always supportive, never accusatory |
| **Respect attention** | Max 3 notifications/day (excluding live workout) |
| **Context-aware** | Considers time, activity state, and user preferences |
| **Adaptive** | Reduces frequency if user ignores notifications |

### Tone Guidelines

```
✅ "Your metabolism is waiting! Log a quick breakfast?"
✅ "You're a bit behind on water. Quick sip?"
✅ "Your streak needs you today. Quick workout?"

❌ "You haven't logged breakfast!"
❌ "You're failing your water goal!"
❌ "Don't break your streak!"
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React Native)                   │
├─────────────────────────────────────────────────────────────────┤
│  smartNotificationService.ts  │  useSmartNotifications.ts       │
│  - Local scheduling           │  - React hook                   │
│  - Deep link handling         │  - State management             │
│  - Activity tracking          │  - Preference updates           │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  POST /register-token   │  GET /preferences   │  POST /opened   │
│  PUT /preferences       │  GET /history       │  POST /trigger  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  smartNotification.controller.js  │  pushNotificationService.js │
│  - Smart trigger logic            │  - Expo Push API            │
│  - Message selection              │  - Firebase Cloud Messaging │
│  - Rate limiting                  │  - Token management         │
│  - Activity state updates         │                             │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────────┤
│  notification_preferences  │  user_activity_state               │
│  notification_logs         │  notification_milestones           │
│  user_milestones           │  motivation_tips                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### notification_preferences
Stores user's notification settings.

```sql
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Master toggle
    notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Category toggles
    meal_reminders BOOLEAN DEFAULT TRUE,
    water_reminders BOOLEAN DEFAULT TRUE,
    workout_reminders BOOLEAN DEFAULT TRUE,
    live_workout_alerts BOOLEAN DEFAULT TRUE,
    progress_notifications BOOLEAN DEFAULT TRUE,
    motivation_tips BOOLEAN DEFAULT TRUE,
    streak_alerts BOOLEAN DEFAULT TRUE,
    
    -- Schedule
    preferred_workout_time TIME DEFAULT '18:00:00',
    workout_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    
    -- Meal windows
    breakfast_window_start TIME DEFAULT '07:00:00',
    breakfast_window_end TIME DEFAULT '10:00:00',
    lunch_window_start TIME DEFAULT '12:00:00',
    lunch_window_end TIME DEFAULT '14:00:00',
    dinner_window_start TIME DEFAULT '18:00:00',
    dinner_window_end TIME DEFAULT '21:00:00',
    
    -- Limits
    daily_water_target_ml INTEGER DEFAULT 3000,
    max_notifications_per_day INTEGER DEFAULT 3,
    
    -- Tokens
    expo_push_token TEXT,
    fcm_token TEXT
);
```

### notification_logs
Tracks all sent notifications for analytics and spam prevention.

```sql
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    notification_subtype VARCHAR(100),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP,
    was_opened BOOLEAN DEFAULT FALSE,
    action_taken BOOLEAN DEFAULT FALSE
);
```

### user_activity_state
Real-time tracking for smart notification triggers.

```sql
CREATE TABLE user_activity_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    today_date DATE DEFAULT CURRENT_DATE,
    
    -- Meal tracking
    breakfast_logged BOOLEAN DEFAULT FALSE,
    lunch_logged BOOLEAN DEFAULT FALSE,
    dinner_logged BOOLEAN DEFAULT FALSE,
    
    -- Water tracking
    water_logged_ml INTEGER DEFAULT 0,
    
    -- Workout tracking
    workout_completed BOOLEAN DEFAULT FALSE,
    live_workout_active BOOLEAN DEFAULT FALSE,
    
    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    -- Engagement metrics
    notifications_received_today INTEGER DEFAULT 0,
    notification_response_rate DECIMAL(3,2) DEFAULT 0.50
);
```

---

## 📱 Notification Types

### 1. Meal Reminders
**Trigger:** Meal not logged within its time window

| Meal | Window | Reminder At |
|------|--------|-------------|
| Breakfast | 7:00 - 10:00 | 9:30 |
| Lunch | 12:00 - 14:00 | 13:30 |
| Dinner | 18:00 - 21:00 | 20:30 |

### 2. Water Reminders
**Trigger:** User is 300ml+ behind expected intake

```javascript
const expectedWater = dailyTarget * (hoursElapsed / 14);
const deficit = expectedWater - currentWater;
// Only notify if deficit > 300ml
```

### 3. Workout Reminders
**Trigger:** Scheduled workout day, near preferred time, not yet done

### 4. Live Workout Notifications
**Types:**
- `rest_complete` - Timer finished
- `next_exercise` - Suggest next exercise
- `halfway` - Motivational midpoint
- `almost_done` - Final push

**Priority:** HIGH (doesn't count toward daily limit)

### 5. Post-Workout Notifications
**Trigger:** Workout completion
**Content:** Calories burned, hydration/stretching suggestion
**Limit:** Max 1 per workout

### 6. Streak Alerts
**Trigger:** Evening time (8pm+), streak exists, no activity today

### 7. Progress Notifications
**Frequency:** Weekly and monthly
**Content:** Summary of workouts, meals logged, calories burned

### 8. Motivation Tips
**Frequency:** Max 1 per day
**Length:** One sentence only
**Disable-able:** Yes

---

## 💬 Message Library

### Meal Reminders

```javascript
breakfast: [
  { title: "🌅 Rise & Fuel", body: "Your metabolism is waiting! Log a quick breakfast?" },
  { title: "☀️ Morning Power-Up", body: "Champions eat breakfast. What's fueling your morning?" },
  { title: "🍳 Breakfast Check", body: "Quick 30-sec log? Your future self will thank you." },
]

lunch: [
  { title: "🥗 Midday Fuel Stop", body: "Your energy dip wants a salad. Or pizza. We don't judge." },
  { title: "⚡ Recharge Time", body: "Lunch logged = afternoon energy. Quick log?" },
]

dinner: [
  { title: "🍽️ Evening Nourish", body: "End the day right. What's for dinner?" },
  { title: "🌙 Dinner Time", body: "One quick log before you relax. You got this!" },
]
```

### Water Reminders

```javascript
gentle: [
  { title: "💧 Hydration Check", body: "You're a bit behind on water. Quick sip?" },
]

urgent: [
  { title: "💦 Hydration Alert!", body: "You're 500ml+ behind. Your energy needs this!" },
]
```

### Streak Alerts

```javascript
at_risk: [
  { title: "🔥 Streak Alert!", body: "Your {streak}-day streak needs you today. Quick workout?" },
  { title: "⏰ Last Chance!", body: "Don't let {streak} days slip away. Any activity counts!" },
]

saved: [
  { title: "✅ Streak Saved!", body: "Phew! {streak} days and counting. See you tomorrow!" },
]
```

### Milestones

```javascript
{ milestone_key: 'first_workout', title: "First Workout Complete! 💪", body: "You crushed your first workout! This is just the beginning." },
{ milestone_key: 'streak_7', title: "One Week Warrior! 🏆", body: "A full week of consistency. You're officially in the zone!" },
{ milestone_key: 'streak_30', title: "Monthly Master! 👑", body: "30 days of excellence! You're unstoppable now." },
```

---

## ⚡ Priority Rules

### Daily Limit Logic

```javascript
// Max 3 notifications per day (configurable)
// Live workout notifications DO NOT count toward this limit

if (notifications_received_today >= max_notifications_per_day) {
  return null; // Skip non-essential notifications
}
```

### Spam Prevention

```javascript
// Don't send same notification type within X hours
const wasRecentlySent = async (userId, type, subtype, hoursAgo) => {
  const result = await db.query(`
    SELECT COUNT(*) FROM notification_logs
    WHERE user_id = $1 
      AND notification_type = $2 
      AND notification_subtype = $3
      AND created_at > NOW() - INTERVAL '${hoursAgo} hours'
  `);
  return result.rows[0].count > 0;
};

// Cooldown periods:
// - Meal reminders: 2 hours
// - Water reminders: 3 hours  
// - Workout reminders: 4 hours
// - Streak alerts: 24 hours
// - Daily tips: 24 hours
```

### Quiet Hours

```javascript
const isQuietHours = (preferences) => {
  if (!preferences.quiet_hours_enabled) return false;
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 8);
  const { quiet_hours_start, quiet_hours_end } = preferences;
  
  // Handle overnight (e.g., 22:00 to 07:00)
  if (quiet_hours_start > quiet_hours_end) {
    return currentTime >= quiet_hours_start || currentTime <= quiet_hours_end;
  }
  return currentTime >= quiet_hours_start && currentTime <= quiet_hours_end;
};
```

### Adaptive Frequency

```javascript
// Track response rate over last 20 notifications
// Reduce frequency if user ignores 5+ consecutive notifications
if (consecutive_ignored_notifications >= 5) {
  // Skip optional notifications (tips, progress)
  // Only send essential (meal, workout, streak at risk)
}
```

---

## 🔌 Integration Guide

### 1. Initialize Service (in App.tsx)

```typescript
import smartNotificationService from './services/smartNotificationService';

// In your main component
useEffect(() => {
  smartNotificationService.initialize(navigationRef);
}, []);
```

### 2. Use the Hook in Components

```typescript
import { useSmartNotifications } from './hooks/useSmartNotifications';

const MyComponent = () => {
  const { 
    preferences,
    updatePreference,
    trackMealLogged,
    trackWaterLogged,
    trackWorkoutCompleted,
    sendPostWorkoutNotification,
  } = useSmartNotifications();
  
  const handleLogMeal = async (mealType) => {
    await saveMealToDatabase();
    trackMealLogged(mealType); // Updates local state & cancels reminder
  };
  
  const handleCompleteWorkout = async (caloriesBurned) => {
    await saveWorkoutToDatabase();
    trackWorkoutCompleted();
    sendPostWorkoutNotification(caloriesBurned);
  };
};
```

### 3. Track Activity in Existing Services

```typescript
// In your meal logging service
import smartNotification from '../controllers/smartNotification.controller';

export const logMeal = async (userId, mealData) => {
  await db.query('INSERT INTO food_logs ...');
  await smartNotification.updateMealLogged(userId, mealData.meal_type);
};

// In your water logging service
export const logWater = async (userId, amountMl) => {
  await db.query('INSERT INTO water_logs ...');
  await smartNotification.updateWaterLogged(userId, amountMl);
};
```

### 4. Add Routes to Server

```javascript
// In server.js
import notificationRoutes from './routes/notification.routes.js';
app.use('/api/notifications', notificationRoutes);
```

### 5. Run Database Migration

```bash
cd backend
psql -d fitcoach_db -f src/config/migrations/015_smart_notifications.sql
```

---

## 🌐 API Reference

### Preferences

```
GET /api/notifications/preferences
Response: { success: true, preferences: {...} }

PUT /api/notifications/preferences
Body: { meal_reminders: true, quiet_hours_enabled: false, ... }
Response: { success: true, message: 'Preferences updated' }
```

### Token Registration

```
POST /api/notifications/register-token
Body: { token: 'ExponentPushToken[...]', tokenType: 'expo' }
Response: { success: true }
```

### History

```
GET /api/notifications/history?limit=20&offset=0
Response: { success: true, notifications: [...] }
```

### Activity State

```
GET /api/notifications/activity-state
Response: { success: true, state: {...} }
```

### Milestones

```
GET /api/notifications/milestones
Response: { success: true, milestones: [...] }
```

### Track Opened

```
POST /api/notifications/opened
Body: { notificationId: 123 }
Response: { success: true }
```

---

## 🧩 Edge Cases

| Scenario | Handling |
|----------|----------|
| User logs meal right before reminder | Cancel scheduled reminder immediately |
| User in quiet hours but streak at risk | Skip notification, try again in morning |
| User ignores 5+ notifications | Reduce to essential-only mode |
| Invalid push token | Invalidate in database, stop sending |
| Timezone changes | Recalculate all scheduled notifications |
| New user, no activity state | Create default state on first request |
| Day rollover | Reset daily counters automatically |

---

## 📊 Analytics (Future)

Track these metrics for optimization:
- Notification open rate by type
- Time to action after notification
- Streak protection success rate
- Opt-out rate by notification type
- Best performing message variants

---

## 🚀 Quick Start Checklist

- [ ] Run database migration `015_smart_notifications.sql`
- [ ] Add `pushNotificationService.js` to backend services
- [ ] Add `smartNotification.controller.js` to backend controllers
- [ ] Add `notification.routes.js` to backend routes
- [ ] Register routes in `server.js`
- [ ] Add `smartNotificationService.ts` to frontend services
- [ ] Add `useSmartNotifications.ts` to frontend hooks
- [ ] Initialize service in App.tsx
- [ ] Add NotificationSettingsScreen to navigation
- [ ] Integrate tracking calls in meal/water/workout flows
- [ ] Set up cron job for `/api/notifications/run-scheduler`

---

**Built with ❤️ for FitCoach AI**
