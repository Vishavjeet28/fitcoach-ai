-- ============================================================================
-- MIGRATION: Live Workout Execution System
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-20
-- ============================================================================
-- 
-- Purpose: Track in-progress workout execution in real-time
-- These are TEMPORARY state tables that persist during workout session
-- and are archived/deleted when workout ends.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. LIVE WORKOUT SESSIONS
-- Tracks the current in-progress workout session
-- ============================================================================
CREATE TABLE IF NOT EXISTS live_workout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Link to today's workout
    workout_program_id INTEGER REFERENCES workout_programs(id) ON DELETE SET NULL,
    split_name VARCHAR(255),
    
    -- Session timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Current exercise tracking
    current_exercise_index INTEGER DEFAULT 0,
    total_exercises INTEGER NOT NULL,
    exercises_data JSONB NOT NULL, -- Full exercise list for the session
    
    -- Accumulated metrics (updated after each set)
    accumulated_calories INTEGER DEFAULT 0,
    accumulated_fatigue DECIMAL(4,2) DEFAULT 0.0, -- 0.0 to 10.0 scale
    total_sets_completed INTEGER DEFAULT 0,
    total_volume_kg DECIMAL(10,2) DEFAULT 0.0,
    
    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    rest_timer_active BOOLEAN DEFAULT FALSE,
    rest_timer_end_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Only one active session per user
    CONSTRAINT unique_active_session UNIQUE (user_id, is_active)
);

-- ============================================================================
-- 2. LIVE WORKOUT SETS
-- Tracks each logged set during the active session
-- ============================================================================
CREATE TABLE IF NOT EXISTS live_workout_sets (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES live_workout_sessions(id) ON DELETE CASCADE,
    
    -- Exercise identification
    exercise_index INTEGER NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    set_number INTEGER NOT NULL,
    
    -- Set data
    reps INTEGER NOT NULL,
    weight_kg DECIMAL(8,2), -- Nullable for bodyweight exercises
    
    -- Backend-calculated values (NOT from frontend)
    calories_burned INTEGER NOT NULL,
    met_value DECIMAL(4,2) NOT NULL,
    rest_recommended_sec INTEGER NOT NULL,
    
    -- Timing
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing for fast lookups
    CONSTRAINT unique_set_per_exercise UNIQUE (session_id, exercise_index, set_number)
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_live_sessions_user_active 
ON live_workout_sessions(user_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_live_sessions_started 
ON live_workout_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_live_sets_session 
ON live_workout_sets(session_id, exercise_index);

CREATE INDEX IF NOT EXISTS idx_live_sets_logged 
ON live_workout_sets(logged_at);

-- ============================================================================
-- 4. EXERCISE TYPE REFERENCE FOR FATIGUE CALCULATION
-- This table maps exercise patterns to fatigue multipliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_fatigue_map (
    id SERIAL PRIMARY KEY,
    pattern VARCHAR(255) NOT NULL UNIQUE, -- Pattern to match (e.g., 'squat', 'deadlift')
    fatigue_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- 1.0 = normal, 2.0 = double fatigue
    muscle_groups TEXT[] DEFAULT '{}',
    is_compound BOOLEAN DEFAULT FALSE,
    base_rest_seconds INTEGER DEFAULT 90
);

-- Seed with common exercise patterns
INSERT INTO exercise_fatigue_map (pattern, fatigue_multiplier, muscle_groups, is_compound, base_rest_seconds) VALUES
    ('squat', 2.0, ARRAY['quads', 'glutes', 'hamstrings', 'core'], TRUE, 180),
    ('deadlift', 2.5, ARRAY['back', 'glutes', 'hamstrings', 'core'], TRUE, 180),
    ('bench press', 1.5, ARRAY['chest', 'shoulders', 'triceps'], TRUE, 120),
    ('overhead press', 1.5, ARRAY['shoulders', 'triceps', 'core'], TRUE, 120),
    ('barbell row', 1.5, ARRAY['back', 'biceps', 'core'], TRUE, 120),
    ('pull-up', 1.3, ARRAY['back', 'biceps', 'core'], TRUE, 120),
    ('leg press', 1.5, ARRAY['quads', 'glutes'], TRUE, 120),
    ('lunge', 1.3, ARRAY['quads', 'glutes', 'hamstrings'], TRUE, 90),
    ('dumbbell press', 1.2, ARRAY['chest', 'shoulders', 'triceps'], TRUE, 90),
    ('lat pulldown', 1.0, ARRAY['back', 'biceps'], FALSE, 90),
    ('cable row', 1.0, ARRAY['back', 'biceps'], FALSE, 90),
    ('curl', 0.8, ARRAY['biceps'], FALSE, 60),
    ('tricep', 0.8, ARRAY['triceps'], FALSE, 60),
    ('lateral raise', 0.7, ARRAY['shoulders'], FALSE, 60),
    ('calf raise', 0.6, ARRAY['calves'], FALSE, 60),
    ('face pull', 0.6, ARRAY['shoulders', 'back'], FALSE, 60),
    ('plank', 0.5, ARRAY['core'], FALSE, 60),
    ('crunch', 0.5, ARRAY['core'], FALSE, 45)
ON CONFLICT (pattern) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
    'live_workout_sessions',
    'live_workout_sets',
    'exercise_fatigue_map'
)
ORDER BY table_name;
