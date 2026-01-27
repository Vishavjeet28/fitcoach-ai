-- Yoga Module Schema V3 (Illustration Slider Phase 1)
-- Future-proof design for seamless video integration later.

-- 1. Categories (Static or Dynamic)
CREATE TABLE IF NOT EXISTS yoga_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'posture_correction'
    title VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    benefit_highlight VARCHAR(100), -- 'Fix rounded shoulders'
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Exercises (The Pose)
CREATE TABLE IF NOT EXISTS yoga_exercises (
    id SERIAL PRIMARY KEY,
    category_slug VARCHAR(50) REFERENCES yoga_categories(slug) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sanskrit_name VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INT DEFAULT 5,
    
    -- Content Arrays (Stored as JSONB for flexibility)
    benefits TEXT[], 
    mistakes TEXT[],
    modifications TEXT[],
    instructor_cues TEXT[],
    
    -- Metadata
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Steps (The Slider Content)
CREATE TABLE IF NOT EXISTS yoga_exercise_steps (
    id SERIAL PRIMARY KEY,
    exercise_id INT REFERENCES yoga_exercises(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    
    title VARCHAR(100) NOT NULL, -- Short header for the slide
    instruction TEXT NOT NULL,   -- 1-2 lines max
    
    image_url TEXT,              -- Illustration for this specific step
    video_url TEXT DEFAULT NULL, -- FUTURE PROOFING: Null for now, populated later
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. User Progress
CREATE TABLE IF NOT EXISTS user_yoga_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- Links to users table
    exercise_id INT REFERENCES yoga_exercises(id),
    completed_at TIMESTAMP DEFAULT NOW(),
    duration_spent INT -- Seconds spent
);

-- Seed Data (Example for Posture Correction)
INSERT INTO yoga_categories (slug, title, icon_name, benefit_highlight) VALUES
('posture', 'Posture Correction', 'human-queue', 'Fix rounded shoulders'),
('back_pain', 'Back Pain Relief', 'human-handsdown', 'Soothe lumbar tension'),
('knee', 'Knee Care', 'run', 'Strengthen stabilizers'),
('shoulder', 'Shoulder Mobility', 'arm-flex', 'Unlock stiffness'),
('full_body', 'Full Body Flow', 'yoga', 'Energize & tone'),
('stress', 'Stress & Relaxation', 'leaf', 'Calm the mind');

-- Example Exercise: Seated Chest Opener
-- Steps will be inserted separately.
