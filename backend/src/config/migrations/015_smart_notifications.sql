-- =============================================================================
-- SMART NOTIFICATION SYSTEM - Database Schema
-- FitCoach AI - Behavior-Driven, Non-Spammy Notifications
-- =============================================================================

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
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
    
    -- Preferred workout time (for smart scheduling)
    preferred_workout_time TIME DEFAULT '18:00:00',
    workout_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Sun, 1=Mon, etc.
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    
    -- Meal windows (for smart meal reminders)
    breakfast_window_start TIME DEFAULT '07:00:00',
    breakfast_window_end TIME DEFAULT '10:00:00',
    lunch_window_start TIME DEFAULT '12:00:00',
    lunch_window_end TIME DEFAULT '14:00:00',
    dinner_window_start TIME DEFAULT '18:00:00',
    dinner_window_end TIME DEFAULT '21:00:00',
    
    -- Water hydration target
    daily_water_target_ml INTEGER DEFAULT 3000,
    
    -- Frequency control
    max_notifications_per_day INTEGER DEFAULT 3,
    
    -- Timezone
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Push token
    expo_push_token TEXT,
    fcm_token TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Logs (to track what was sent and prevent repetition)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL,
    -- Types: meal_reminder, water_reminder, workout_reminder, live_workout,
    --        post_workout, streak_alert, milestone, motivation_tip, weekly_progress
    
    notification_subtype VARCHAR(100), -- e.g., 'breakfast', 'lunch', 'dinner', 'hydration_behind'
    
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Metadata
    data JSONB,
    
    -- Delivery status
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    
    -- Engagement tracking
    was_opened BOOLEAN DEFAULT FALSE,
    action_taken BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Activity State (real-time tracking for smart notifications)
CREATE TABLE IF NOT EXISTS user_activity_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Today's activity (resets daily)
    today_date DATE DEFAULT CURRENT_DATE,
    
    -- Meal tracking
    breakfast_logged BOOLEAN DEFAULT FALSE,
    breakfast_logged_at TIMESTAMP,
    lunch_logged BOOLEAN DEFAULT FALSE,
    lunch_logged_at TIMESTAMP,
    dinner_logged BOOLEAN DEFAULT FALSE,
    dinner_logged_at TIMESTAMP,
    snacks_logged INTEGER DEFAULT 0,
    
    -- Water tracking
    water_logged_ml INTEGER DEFAULT 0,
    last_water_log_at TIMESTAMP,
    
    -- Workout tracking
    workout_completed BOOLEAN DEFAULT FALSE,
    workout_completed_at TIMESTAMP,
    workout_duration_minutes INTEGER DEFAULT 0,
    
    -- Live workout state
    live_workout_active BOOLEAN DEFAULT FALSE,
    live_workout_started_at TIMESTAMP,
    live_workout_id INTEGER,
    
    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    streak_at_risk BOOLEAN DEFAULT FALSE,
    last_active_date DATE,
    
    -- Engagement metrics
    notifications_received_today INTEGER DEFAULT 0,
    notifications_opened_today INTEGER DEFAULT 0,
    last_app_open_at TIMESTAMP,
    
    -- Response rate (for adaptive frequency)
    notification_response_rate DECIMAL(3,2) DEFAULT 0.50,
    consecutive_ignored_notifications INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone Definitions
CREATE TABLE IF NOT EXISTS notification_milestones (
    id SERIAL PRIMARY KEY,
    milestone_key VARCHAR(100) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    emoji VARCHAR(10) DEFAULT '🎉',
    threshold_value INTEGER,
    milestone_type VARCHAR(50), -- 'streak', 'workout_count', 'weight_loss', 'water_streak'
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Milestone Progress
CREATE TABLE IF NOT EXISTS user_milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES notification_milestones(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP,
    
    UNIQUE(user_id, milestone_id)
);

-- Motivation Tips Library
CREATE TABLE IF NOT EXISTS motivation_tips (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50), -- 'nutrition', 'fitness', 'hydration', 'mindset', 'recovery'
    tip_text TEXT NOT NULL,
    emoji VARCHAR(10) DEFAULT '💡',
    is_enabled BOOLEAN DEFAULT TRUE,
    times_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default milestones
INSERT INTO notification_milestones (milestone_key, title, body, emoji, threshold_value, milestone_type) VALUES
    ('first_workout', 'First Workout Complete! 💪', 'You crushed your first workout! This is just the beginning.', '💪', 1, 'workout_count'),
    ('streak_3', '3-Day Streak! 🔥', 'Three days in a row! You''re building unstoppable momentum.', '🔥', 3, 'streak'),
    ('streak_7', 'One Week Warrior! 🏆', 'A full week of consistency. You''re officially in the zone!', '🏆', 7, 'streak'),
    ('streak_14', 'Two Week Champion! ⭐', 'Two weeks of dedication. Habits are forming!', '⭐', 14, 'streak'),
    ('streak_30', 'Monthly Master! 👑', '30 days of excellence! You''re unstoppable now.', '👑', 30, 'streak'),
    ('workouts_10', '10 Workouts Done! 🎯', 'Double digits! Every rep is paying off.', '🎯', 10, 'workout_count'),
    ('workouts_25', '25 Workouts Strong! 💥', 'Quarter century of workouts! Beast mode activated.', '💥', 25, 'workout_count'),
    ('workouts_50', '50 Workout Legend! 🌟', 'Half a hundred workouts! You''re a FitCoach legend.', '🌟', 50, 'workout_count'),
    ('water_streak_7', 'Hydration Hero! 💧', '7 days of hitting your water goal. Your body thanks you!', '💧', 7, 'water_streak')
ON CONFLICT (milestone_key) DO NOTHING;

-- Insert default motivation tips
INSERT INTO motivation_tips (category, tip_text, emoji) VALUES
    ('nutrition', 'Protein at every meal helps maintain muscle and keeps you fuller longer.', '🥩'),
    ('nutrition', 'Eating slowly can reduce calorie intake by up to 20%.', '🍽️'),
    ('nutrition', 'Colorful plates = nutrient-dense meals. Aim for 3+ colors per meal.', '🌈'),
    ('fitness', 'Consistency beats intensity. Show up, even for 10 minutes.', '💪'),
    ('fitness', 'Your muscles grow during rest, not during the workout.', '😴'),
    ('fitness', 'Progressive overload: Add a little more each week. Small gains compound.', '📈'),
    ('hydration', 'Drinking water before meals can boost metabolism by 24-30%.', '💧'),
    ('hydration', 'Thirst is often mistaken for hunger. Drink first, eat later.', '🥤'),
    ('mindset', 'Progress, not perfection. Every step forward counts.', '🧠'),
    ('mindset', 'You don''t have to be great to start, but you have to start to be great.', '🌟'),
    ('recovery', 'Sleep is the #1 performance enhancer. Aim for 7-9 hours.', '🛏️'),
    ('recovery', 'Active recovery (walks, stretching) speeds up muscle repair.', '🧘')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_date ON notification_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_state_date ON user_activity_state(user_id, today_date);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
