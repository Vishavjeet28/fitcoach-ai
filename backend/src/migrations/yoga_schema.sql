-- Yoga Sessions
CREATE TABLE IF NOT EXISTS yoga_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'Relaxation', 'Flexibility', 'Strength', 'Pain Relief', 'Posture', 'Energy'
    duration_minutes INTEGER NOT NULL,
    difficulty VARCHAR(20) NOT NULL, -- 'Beginner', 'Intermediate', 'Advanced'
    intensity VARCHAR(20) NOT NULL, -- 'Low', 'Medium', 'High'
    focus_tags TEXT[], -- Array of strings e.g. ['Back Pain', 'Morning']
    calories_estimate INTEGER DEFAULT 0,
    video_url VARCHAR(255), -- Optional for future
    image_url VARCHAR(255),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Yoga Poses
CREATE TABLE IF NOT EXISTS yoga_poses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sanskrit_name VARCHAR(255),
    description TEXT,
    instructions TEXT, -- Step by step text
    benefits TEXT[],
    image_url VARCHAR(255),
    audio_url VARCHAR(255),
    default_duration_seconds INTEGER DEFAULT 60, -- Default hold time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction: Session -> Poses (Ordered)
CREATE TABLE IF NOT EXISTS yoga_session_poses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES yoga_sessions(id) ON DELETE CASCADE,
    pose_id INTEGER REFERENCES yoga_poses(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    duration_seconds INTEGER, -- Override default duration for this session
    transition_text VARCHAR(255), -- "Moving slowly into..."
    UNIQUE(session_id, sequence_order)
);

-- User Logs
CREATE TABLE IF NOT EXISTS yoga_session_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES yoga_sessions(id) ON DELETE SET NULL,
    duration_completed_seconds INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    mood_rating INTEGER, -- 1-5 (1=bad, 5=great)
    calories_burned INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_yoga_sessions_category ON yoga_sessions(category);
CREATE INDEX IF NOT EXISTS idx_yoga_logs_user_date ON yoga_session_logs(user_id, started_at);
