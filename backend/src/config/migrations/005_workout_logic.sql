-- ============================================================================
-- MIGRATION 005: Workout Logic System
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-14
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. WORKOUT PREFERENCES
-- User-specific workout configuration
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Experience level
    experience_level VARCHAR(50) DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Schedule
    available_days INTEGER DEFAULT 3 CHECK (available_days >= 1 AND available_days <= 7),
    preferred_time VARCHAR(50), -- morning, afternoon, evening
    
    -- Equipment access
    equipment_access VARCHAR(50) DEFAULT 'gym' CHECK (equipment_access IN ('gym', 'home', 'minimal', 'bodyweight')),
    
    -- Preferences
    avoid_exercises TEXT[], -- List of exercises to avoid
    favorite_exercises TEXT[], -- Preferred exercises
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- ----------------------------------------------------------------------------
-- 2. WORKOUT PROGRAMS
-- User's active workout program (linked to template)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_programs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template reference
    template_id VARCHAR(100) NOT NULL, -- push_pull_legs, upper_lower, etc.
    template_name VARCHAR(255) NOT NULL,
    
    -- Program details
    frequency INTEGER NOT NULL, -- Days per week
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- Optional program duration
    
    -- Tuning parameters (stored for reference)
    tuned_for VARCHAR(50), -- beginner, intermediate, advanced
    tuning_notes TEXT, -- AI reasoning for program selection
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one active program per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_program ON workout_programs(user_id, is_active) WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- 3. WORKOUT SESSIONS (LOGS)
-- Actual workout sessions completed by user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES workout_programs(id) ON DELETE SET NULL,
    
    -- Session details
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    split_name VARCHAR(255), -- "Push Day", "Upper A", etc.
    
    -- Exercises completed (JSON array)
    exercises_completed JSONB NOT NULL,
    /* Example structure:
    [
      {
        "name": "Bench Press",
        "sets": 4,
        "reps": [10, 10, 8, 8],
        "weight_kg": [80, 80, 85, 85],
        "met": 6.0,
        "duration_min": 8
      }
    ]
    */
    
    -- Session metrics
    duration_minutes INTEGER, -- Total session time
    calories_burned INTEGER, -- MET-based calculation
    
    -- User notes
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- How user felt (1-5)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_program ON workout_sessions(program_id);

-- ----------------------------------------------------------------------------
-- 4. EXERCISE REFERENCE DATABASE (EXTENDED)
-- Add MET values and workout template compatibility
-- ----------------------------------------------------------------------------

-- Add MET column to existing exercises table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS met_value DECIMAL(4,1) DEFAULT 5.0;

-- Add template tags
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS template_tags TEXT[] DEFAULT '{}';

-- Add progression tracking
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS progression_type VARCHAR(50) DEFAULT 'weight'; -- weight, reps, time, distance

-- Update existing exercises with common MET values (examples)
UPDATE exercises SET met_value = 6.0 WHERE category = 'strength' AND difficulty_level = 'advanced';
UPDATE exercises SET met_value = 5.0 WHERE category = 'strength' AND difficulty_level = 'intermediate';
UPDATE exercises SET met_value = 3.5 WHERE category = 'strength' AND difficulty_level = 'beginner';
UPDATE exercises SET met_value = 8.0 WHERE category = 'cardio' AND name ILIKE '%sprint%';
UPDATE exercises SET met_value = 12.0 WHERE category = 'cardio' AND name ILIKE '%hiit%';

-- ----------------------------------------------------------------------------
-- 5. PERSONAL RECORDS (PR) TRACKING
-- Track user's best lifts over time
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL, -- Store name in case exercise deleted
    
    -- PR details
    pr_type VARCHAR(50) NOT NULL, -- '1RM', '3RM', '5RM', 'max_reps', 'max_time', 'max_distance'
    value DECIMAL(10,2) NOT NULL, -- Weight (kg), reps, seconds, meters, etc.
    unit VARCHAR(20), -- kg, reps, seconds, meters
    
    -- Context
    achieved_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_id INTEGER REFERENCES workout_sessions(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    verified BOOLEAN DEFAULT TRUE, -- Manual entry vs system-verified
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, exercise_name, pr_type)
);

CREATE INDEX IF NOT EXISTS idx_pr_user_exercise ON personal_records(user_id, exercise_id);

-- ----------------------------------------------------------------------------
-- 6. WORKOUT ANALYTICS (AGGREGATED)
-- Pre-calculated stats for performance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Session stats
    total_sessions INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    total_calories_burned INTEGER DEFAULT 0,
    
    -- Adherence
    planned_sessions INTEGER, -- Based on program frequency
    adherence_percentage DECIMAL(5,2), -- (completed / planned) * 100
    
    -- Volume metrics
    total_sets INTEGER DEFAULT 0,
    total_reps INTEGER DEFAULT 0,
    total_volume_kg INTEGER DEFAULT 0, -- Sum of (weight × reps)
    
    -- Popular exercises
    top_exercises JSONB, -- Array of most-performed exercises
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_workout_analytics_user_period ON workout_analytics(user_id, period_type, period_start);

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================================================

-- Uncomment to rollback:
-- DROP TABLE IF EXISTS workout_analytics CASCADE;
-- DROP TABLE IF EXISTS personal_records CASCADE;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS met_value;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS template_tags;
-- ALTER TABLE exercises DROP COLUMN IF EXISTS progression_type;
-- DROP TABLE IF EXISTS workout_sessions CASCADE;
-- DROP TABLE IF EXISTS workout_programs CASCADE;
-- DROP TABLE IF EXISTS workout_preferences CASCADE;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
    'workout_preferences',
    'workout_programs',
    'workout_sessions',
    'personal_records',
    'workout_analytics'
)
ORDER BY table_name;

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename, indexname;
