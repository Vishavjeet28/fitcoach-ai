-- =====================================================================
-- FITCOACH AI - YOGA & CORRECTIVE EXERCISE DATABASE SCHEMA
-- Version: 2.0 (Production-Ready)
-- =====================================================================

-- Drop existing tables if recreating (uncomment for fresh install)
-- DROP TABLE IF EXISTS yoga_user_sessions CASCADE;
-- DROP TABLE IF EXISTS yoga_exercise_details CASCADE;
-- DROP TABLE IF EXISTS yoga_exercises CASCADE;
-- DROP TABLE IF EXISTS yoga_categories CASCADE;
-- DROP TYPE IF EXISTS difficulty_level CASCADE;
-- DROP TYPE IF EXISTS contraindication_level CASCADE;
-- DROP TYPE IF EXISTS time_of_day CASCADE;
-- DROP TYPE IF EXISTS pain_feedback CASCADE;

-- =========================
-- ENUM TYPES (Type Safety)
-- =========================

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'beginner_safe', 'all_levels');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contraindication_level AS ENUM ('safe', 'caution', 'avoid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE time_of_day AS ENUM ('morning', 'evening', 'anytime');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pain_feedback AS ENUM ('none', 'better', 'same', 'worse');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================
-- TABLE: yoga_categories
-- =========================
CREATE TABLE IF NOT EXISTS yoga_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE yoga_categories IS 'Master list of yoga/exercise categories';

-- =========================
-- TABLE: yoga_exercises
-- =========================
CREATE TABLE IF NOT EXISTS yoga_exercises (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(50) REFERENCES yoga_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sanskrit_name VARCHAR(255),
    difficulty difficulty_level DEFAULT 'beginner',
    primary_purpose TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    breath_count INTEGER, -- Alternative to time-based
    time_of_day time_of_day DEFAULT 'anytime',
    contraindication_level contraindication_level DEFAULT 'safe',
    thumbnail_url VARCHAR(500),
    video_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    -- AI Video Ready Fields (Future)
    ai_video_prompt TEXT,
    ai_instructor_style VARCHAR(50) DEFAULT 'calm', -- calm, authoritative, friendly
    captions_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE yoga_exercises IS 'Individual yoga poses and corrective exercises';

-- =========================
-- TABLE: yoga_exercise_details
-- =========================
CREATE TABLE IF NOT EXISTS yoga_exercise_details (
    id SERIAL PRIMARY KEY,
    exercise_id VARCHAR(100) REFERENCES yoga_exercises(id) ON DELETE CASCADE,
    target_areas TEXT[] NOT NULL DEFAULT '{}',
    benefits TEXT[] NOT NULL DEFAULT '{}',
    step_by_step_instructions TEXT[] NOT NULL DEFAULT '{}',
    common_mistakes TEXT[] NOT NULL DEFAULT '{}',
    who_should_avoid TEXT[] DEFAULT '{}',
    instructor_cues TEXT[] DEFAULT '{}',
    equipment_needed TEXT[] DEFAULT '{}',
    modifications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exercise_id)
);

COMMENT ON TABLE yoga_exercise_details IS 'Detailed instruction data for each exercise';

-- =========================
-- TABLE: yoga_user_sessions
-- =========================
CREATE TABLE IF NOT EXISTS yoga_user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) REFERENCES yoga_exercises(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_completed_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    pain_feedback pain_feedback DEFAULT 'none',
    mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
    mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE yoga_user_sessions IS 'User activity log for yoga sessions';

-- =========================
-- TABLE: yoga_user_preferences
-- =========================
CREATE TABLE IF NOT EXISTS yoga_user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_difficulty difficulty_level DEFAULT 'beginner',
    preferred_time time_of_day DEFAULT 'anytime',
    avoid_categories TEXT[] DEFAULT '{}',
    pain_areas TEXT[] DEFAULT '{}', -- ['lower_back', 'knee', 'shoulder', 'neck']
    goals TEXT[] DEFAULT '{}', -- ['flexibility', 'stress', 'posture', 'pain_relief']
    session_reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TIME,
    instructor_preference VARCHAR(50) DEFAULT 'female',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE yoga_user_preferences IS 'User preferences for yoga recommendations';

-- =========================
-- INDEXES (Performance)
-- =========================
CREATE INDEX IF NOT EXISTS idx_yoga_exercises_category ON yoga_exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_yoga_exercises_difficulty ON yoga_exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_yoga_exercises_active ON yoga_exercises(is_active);
CREATE INDEX IF NOT EXISTS idx_yoga_user_sessions_user ON yoga_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_yoga_user_sessions_date ON yoga_user_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_yoga_user_sessions_exercise ON yoga_user_sessions(exercise_id);

-- =========================
-- TRIGGERS (Auto-update timestamps)
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_yoga_categories_updated_at ON yoga_categories;
CREATE TRIGGER update_yoga_categories_updated_at
    BEFORE UPDATE ON yoga_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_yoga_exercises_updated_at ON yoga_exercises;
CREATE TRIGGER update_yoga_exercises_updated_at
    BEFORE UPDATE ON yoga_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_yoga_user_preferences_updated_at ON yoga_user_preferences;
CREATE TRIGGER update_yoga_user_preferences_updated_at
    BEFORE UPDATE ON yoga_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- VIEWS (Frontend-Ready)
-- =========================
CREATE OR REPLACE VIEW v_yoga_exercises_full AS
SELECT 
    e.id,
    e.name,
    e.sanskrit_name,
    e.category_id,
    c.name as category_name,
    e.difficulty,
    e.primary_purpose,
    e.description,
    e.duration_minutes,
    e.time_of_day,
    e.contraindication_level,
    e.thumbnail_url,
    e.video_url,
    e.is_active,
    e.is_premium,
    d.target_areas,
    d.benefits,
    d.step_by_step_instructions,
    d.common_mistakes,
    d.who_should_avoid,
    d.instructor_cues
FROM yoga_exercises e
LEFT JOIN yoga_categories c ON e.category_id = c.id
LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
WHERE e.is_active = TRUE;

COMMENT ON VIEW v_yoga_exercises_full IS 'Complete exercise data for frontend consumption';

-- =========================
-- FUNCTIONS (Logic Layer Support)
-- =========================

-- Get exercises safe for a user based on their pain areas
CREATE OR REPLACE FUNCTION get_safe_exercises_for_user(p_user_id INTEGER)
RETURNS TABLE (exercise_id VARCHAR(100)) AS $$
DECLARE
    user_pain_areas TEXT[];
BEGIN
    -- Get user's pain areas
    SELECT pain_areas INTO user_pain_areas
    FROM yoga_user_preferences
    WHERE user_id = p_user_id;
    
    -- If no preferences, return all safe exercises
    IF user_pain_areas IS NULL OR array_length(user_pain_areas, 1) IS NULL THEN
        RETURN QUERY
        SELECT e.id FROM yoga_exercises e WHERE e.is_active = TRUE;
    ELSE
        -- Exclude exercises with matching contraindicated areas
        RETURN QUERY
        SELECT e.id 
        FROM yoga_exercises e
        LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
        WHERE e.is_active = TRUE
        AND e.contraindication_level != 'avoid'
        AND NOT (d.who_should_avoid && user_pain_areas);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Get user's recent exercise history (for rotation logic)
CREATE OR REPLACE FUNCTION get_recent_exercises(p_user_id INTEGER, p_days INTEGER DEFAULT 7)
RETURNS TABLE (exercise_id VARCHAR(100), times_done BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.exercise_id, COUNT(*) as times_done
    FROM yoga_user_sessions s
    WHERE s.user_id = p_user_id
    AND s.session_date >= CURRENT_DATE - p_days
    AND s.completed = TRUE
    GROUP BY s.exercise_id
    ORDER BY times_done DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
