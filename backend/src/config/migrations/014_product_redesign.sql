-- ============================================================================
-- MIGRATION 014: Product Architecture Redesign
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-17
-- 
-- Purpose: Support new product architecture with habits, todos, tips, milestones
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HABITS TRACKING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'checkbox-marked-circle',
    color VARCHAR(20) DEFAULT '#26D9BB',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, habit_name)
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    UNIQUE(user_id, habit_id, log_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id, log_date);

-- ============================================================================
-- 2. DAILY TIPS (AI-generated, cached)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_tips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tip_content TEXT NOT NULL,
    tip_category VARCHAR(50), -- nutrition, motivation, workout, recovery, mindset
    source VARCHAR(50) DEFAULT 'ai', -- ai, curated, seasonal
    was_shown BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, tip_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_tips_user_date ON daily_tips(user_id, tip_date);

-- ============================================================================
-- 3. DAILY TODO ITEMS (Auto-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    todo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    todo_type VARCHAR(50) NOT NULL, -- meal_breakfast, meal_lunch, meal_dinner, water, workout, stretch, walk, breathe
    label TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    icon VARCHAR(50) DEFAULT 'checkbox-blank-circle-outline',
    
    UNIQUE(user_id, todo_date, todo_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_todos_date ON daily_todos(user_id, todo_date);
CREATE INDEX IF NOT EXISTS idx_daily_todos_completed ON daily_todos(user_id, todo_date, completed);

-- ============================================================================
-- 4. MILESTONES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL, 
    -- Types: weight_lost, weight_gained, streak_days, meals_logged, workouts_completed,
    --        water_streak, first_week, first_month, consistency_week, consistency_month
    milestone_name VARCHAR(100) NOT NULL,
    milestone_description TEXT,
    milestone_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    icon VARCHAR(50) DEFAULT 'trophy',
    badge_color VARCHAR(20) DEFAULT '#F59E0B',
    achieved_at TIMESTAMP,
    is_achieved BOOLEAN DEFAULT FALSE,
    progress_percent INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_achieved ON milestones(user_id, is_achieved);

-- ============================================================================
-- 5. STREAKS TRACKING (Aggregate Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- logging, workout, water, overall
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks ON user_streaks(user_id);

-- ============================================================================
-- 6. MEAL RECIPE ENHANCEMENTS
-- ============================================================================

-- Add recipe details to recommended_meals if not exists
ALTER TABLE recommended_meals 
ADD COLUMN IF NOT EXISTS recipe_steps JSONB,
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS tips TEXT[],
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'easy', -- easy, medium, hard
ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 1;

-- ============================================================================
-- 7. MEAL SWAP TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS meal_swaps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swap_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    original_meal_id INTEGER REFERENCES recommended_meals(id),
    new_meal_id INTEGER REFERENCES recommended_meals(id),
    swap_number INTEGER NOT NULL, -- 1, 2, 3, or 4+ (AI)
    swap_source VARCHAR(20) DEFAULT 'manual', -- manual (first 3), ai (after exhausted)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meal_swaps_user_date ON meal_swaps(user_id, swap_date);

-- View for daily swap counts
CREATE OR REPLACE VIEW daily_swap_counts AS
SELECT 
    user_id,
    swap_date,
    meal_type,
    COUNT(*) as swap_count,
    MAX(swap_number) as last_swap_number,
    CASE WHEN MAX(swap_number) >= 3 THEN TRUE ELSE FALSE END as manual_exhausted
FROM meal_swaps
GROUP BY user_id, swap_date, meal_type;

-- ============================================================================
-- 8. USER PREFERENCES EXTENSION
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_control_level VARCHAR(20) DEFAULT 'balanced', -- minimal, balanced, guided
ADD COLUMN IF NOT EXISTS meal_style VARCHAR(20) DEFAULT 'fixed', -- fixed, swap_friendly, flexible
ADD COLUMN IF NOT EXISTS workout_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS preferred_workout_time VARCHAR(20), -- morning, afternoon, evening
ADD COLUMN IF NOT EXISTS step_goal INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS water_goal_ml INTEGER DEFAULT 3000;

-- ============================================================================
-- 9. DAILY RECOMMENDATIONS ENHANCEMENT
-- ============================================================================

-- Add swap count tracking to daily_meal_recommendations
ALTER TABLE daily_meal_recommendations 
ADD COLUMN IF NOT EXISTS swap_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS swaps_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS ai_swap_used BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 10. SEED DEFAULT HABITS FOR NEW USERS
-- ============================================================================

-- Function to create default habits for a user
CREATE OR REPLACE FUNCTION create_default_habits(p_user_id INTEGER) 
RETURNS VOID AS $$
BEGIN
    INSERT INTO habits (user_id, habit_name, icon, sort_order) VALUES
        (p_user_id, 'Morning stretch', 'human-greeting', 1),
        (p_user_id, 'Drink water', 'cup-water', 2),
        (p_user_id, 'Take vitamins', 'pill', 3),
        (p_user_id, 'Walk 10 mins', 'walk', 4),
        (p_user_id, 'Mindful breathing', 'meditation', 5)
    ON CONFLICT (user_id, habit_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to generate daily todos
CREATE OR REPLACE FUNCTION generate_daily_todos(p_user_id INTEGER, p_date DATE DEFAULT CURRENT_DATE) 
RETURNS VOID AS $$
BEGIN
    -- Meal todos
    INSERT INTO daily_todos (user_id, todo_date, todo_type, label, priority, icon) VALUES
        (p_user_id, p_date, 'meal_breakfast', 'Log breakfast', 1, 'food-apple'),
        (p_user_id, p_date, 'meal_lunch', 'Log lunch', 1, 'food'),
        (p_user_id, p_date, 'meal_dinner', 'Log dinner', 1, 'food-turkey'),
        (p_user_id, p_date, 'water', 'Drink 3L water', 2, 'cup-water'),
        (p_user_id, p_date, 'workout', 'Complete workout', 2, 'dumbbell'),
        (p_user_id, p_date, 'walk', 'Walk 10,000 steps', 3, 'walk'),
        (p_user_id, p_date, 'stretch', 'Post-workout stretch', 3, 'human-greeting')
    ON CONFLICT (user_id, todo_date, todo_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. STREAK UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_streak() RETURNS TRIGGER AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get current streak info
    SELECT last_activity_date, current_streak, longest_streak 
    INTO v_last_date, v_current_streak, v_longest_streak
    FROM user_streaks 
    WHERE user_id = NEW.user_id AND streak_type = 'logging';
    
    IF v_last_date IS NULL THEN
        -- First entry
        INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_start_date)
        VALUES (NEW.user_id, 'logging', 1, 1, CURRENT_DATE, CURRENT_DATE);
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day
        v_current_streak := v_current_streak + 1;
        v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
        
        UPDATE user_streaks 
        SET current_streak = v_current_streak, 
            longest_streak = v_longest_streak,
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = 'logging';
    ELSIF v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak broken
        UPDATE user_streaks 
        SET current_streak = 1, 
            last_activity_date = CURRENT_DATE,
            streak_start_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = 'logging';
    END IF;
    -- Same day = no change needed
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on food_logs
DROP TRIGGER IF EXISTS trg_update_streak_on_food_log ON food_logs;
CREATE TRIGGER trg_update_streak_on_food_log
AFTER INSERT ON food_logs
FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- ============================================================================
-- 12. INITIAL MILESTONES FOR NEW USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_initial_milestones(p_user_id INTEGER) 
RETURNS VOID AS $$
BEGIN
    INSERT INTO milestones (user_id, milestone_type, milestone_name, milestone_description, target_value, icon, badge_color) VALUES
        -- Streak milestones
        (p_user_id, 'streak_days', '7-Day Streak', 'Log food for 7 consecutive days', 7, 'fire', '#F59E0B'),
        (p_user_id, 'streak_days', '30-Day Streak', 'Log food for 30 consecutive days', 30, 'fire', '#EF4444'),
        (p_user_id, 'streak_days', '100-Day Streak', 'Log food for 100 consecutive days', 100, 'fire', '#8B5CF6'),
        
        -- Consistency milestones
        (p_user_id, 'consistency_week', 'First Week Complete', 'Complete your first full week', 1, 'calendar-check', '#3B82F6'),
        (p_user_id, 'consistency_month', 'First Month Complete', 'Complete your first full month', 1, 'calendar-star', '#10B981'),
        
        -- Workout milestones
        (p_user_id, 'workouts_completed', '10 Workouts', 'Complete 10 workouts', 10, 'dumbbell', '#26D9BB'),
        (p_user_id, 'workouts_completed', '50 Workouts', 'Complete 50 workouts', 50, 'weight-lifter', '#6366F1'),
        
        -- Meal milestones
        (p_user_id, 'meals_logged', '100 Meals Logged', 'Log 100 meals', 100, 'food', '#EC4899'),
        (p_user_id, 'meals_logged', '500 Meals Logged', 'Log 500 meals', 500, 'food-variant', '#14B8A6')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('habits', 'habit_logs', 'daily_tips', 'daily_todos', 'milestones', 'user_streaks', 'meal_swaps');

-- Verify columns added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('ai_control_level', 'meal_style', 'workout_level', 'profile_completed');
