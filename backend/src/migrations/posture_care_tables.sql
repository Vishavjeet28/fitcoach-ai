-- Posture & Pain Care System Tables
-- Run this migration to add the corrective exercise feature

-- 1. Exercise Library (Fixed, validated exercises)
CREATE TABLE IF NOT EXISTS corrective_exercise_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    target_area VARCHAR(50) NOT NULL, -- 'posture', 'back', 'knee', 'shoulder', 'neck'
    instructions TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 60,
    reps INTEGER, -- NULL if time-based only
    rest_seconds INTEGER DEFAULT 15,
    difficulty VARCHAR(20) DEFAULT 'safe', -- 'easy', 'safe', 'rehab'
    contraindications TEXT,
    image_url VARCHAR(255),
    video_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Pain Preferences
CREATE TABLE IF NOT EXISTS user_pain_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    pain_type VARCHAR(50) NOT NULL, -- 'upper_back', 'lower_back', 'knee', 'shoulder', 'neck'
    severity VARCHAR(20) DEFAULT 'mild', -- 'mild', 'moderate'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, pain_type)
);

-- 3. Corrective Sessions (Track completed sessions)
CREATE TABLE IF NOT EXISTS corrective_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_seconds INTEGER,
    exercises_completed INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    feedback VARCHAR(20), -- 'better', 'same', 'worse'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, session_date)
);

-- 4. Posture Care Streaks
CREATE TABLE IF NOT EXISTS posture_care_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pain_prefs_user ON user_pain_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_corrective_sessions_user_date ON corrective_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_exercise_library_target ON corrective_exercise_library(target_area);

-- Seed the exercise library with validated exercises
INSERT INTO corrective_exercise_library (name, target_area, instructions, duration_seconds, reps, difficulty, contraindications) VALUES
-- POSTURE EXERCISES
('Wall Angels', 'posture', 'Stand with your back flat against a wall. Raise arms to shoulder height, elbows bent at 90°. Slowly slide arms up and down the wall while keeping back and arms touching the wall.', 60, 10, 'safe', 'Avoid if you have acute shoulder pain'),
('Chin Tucks', 'posture', 'Sit or stand tall. Gently tuck your chin back, creating a "double chin". Hold for 5 seconds, then release. Keep your eyes level throughout.', 45, 10, 'easy', NULL),
('Shoulder Blade Squeezes', 'posture', 'Sit or stand with arms at your sides. Squeeze your shoulder blades together as if holding a pencil between them. Hold for 5 seconds, release.', 45, 12, 'easy', NULL),
('Chest Opener Stretch', 'posture', 'Stand in a doorway with arms on the frame at 90°. Step forward gently until you feel a stretch across your chest. Hold and breathe deeply.', 60, NULL, 'safe', 'Avoid if you have shoulder instability'),
('Neck Side Stretch', 'posture', 'Sit tall. Gently tilt your head toward one shoulder until you feel a stretch. Hold for 20 seconds, then switch sides.', 60, NULL, 'easy', 'Move slowly, never force'),

-- BACK PAIN EXERCISES
('Cat-Cow Stretch', 'back', 'Start on hands and knees. Arch your back up like a cat (exhale), then drop belly toward floor and lift head (inhale). Move slowly and rhythmically.', 60, 10, 'safe', 'Avoid deep extension if you have disc issues'),
('Child''s Pose', 'back', 'Kneel on the floor, sit back on your heels, and stretch arms forward on the ground. Rest forehead on the floor and breathe deeply.', 60, NULL, 'easy', NULL),
('Pelvic Tilt', 'back', 'Lie on your back with knees bent. Flatten your lower back against the floor by tightening your abs. Hold for 5 seconds, release.', 45, 10, 'easy', NULL),
('Knee-to-Chest Stretch', 'back', 'Lie on your back. Pull one knee gently toward your chest, holding behind the thigh. Hold 20 seconds, then switch legs.', 60, NULL, 'safe', NULL),
('Bird Dog', 'back', 'Start on hands and knees. Extend one arm forward and opposite leg back, keeping your back flat. Hold 5 seconds, switch sides.', 60, 8, 'safe', 'Keep core engaged, no twisting'),

-- KNEE PAIN EXERCISES
('Quad Sets', 'knee', 'Sit with leg extended. Tighten the muscle on top of your thigh, pushing your knee down. Hold 5 seconds, release.', 45, 15, 'rehab', NULL),
('Straight Leg Raises', 'knee', 'Lie on your back with one knee bent. Keep the other leg straight and lift it to the height of the bent knee. Lower slowly.', 60, 10, 'safe', 'Stop if you feel knee pain'),
('Hamstring Stretch', 'knee', 'Sit on edge of chair. Extend one leg with heel on floor. Lean forward gently from hips until you feel a stretch behind your thigh.', 60, NULL, 'easy', NULL),
('Glute Bridge', 'knee', 'Lie on your back with knees bent. Lift hips toward ceiling, squeezing glutes at top. Lower slowly.', 60, 12, 'safe', NULL),
('Calf Raises', 'knee', 'Stand holding a wall for balance. Rise up on your toes, hold briefly, lower slowly. Keep knees straight.', 45, 15, 'easy', 'Hold wall for balance'),

-- SHOULDER PAIN EXERCISES
('Pendulum Swings', 'shoulder', 'Lean forward, supporting yourself with one hand. Let affected arm hang down. Gently swing arm in small circles.', 60, NULL, 'rehab', 'Keep movement small and gentle'),
('Arm Circles', 'shoulder', 'Stand with arms extended to sides. Make small circles, gradually increasing size. Reverse direction after 30 seconds.', 60, NULL, 'easy', 'Keep circles small if painful'),
('Shoulder Rolls', 'shoulder', 'Stand or sit tall. Roll shoulders forward in circles 10 times, then backward 10 times.', 45, 20, 'easy', NULL),
('Doorway Stretch', 'shoulder', 'Stand in doorway with arm on frame at 90°. Step forward gently to stretch front of shoulder. Hold 20 seconds each side.', 60, NULL, 'safe', 'Never force the stretch'),
('Cross-Body Stretch', 'shoulder', 'Bring one arm across your body at shoulder height. Use other hand to gently press arm closer to chest. Hold 20 seconds.', 45, NULL, 'easy', NULL),

-- NECK PAIN EXERCISES
('Neck Rotations', 'neck', 'Sit tall. Slowly turn head to look over one shoulder, hold 5 seconds. Return to center, repeat other side.', 45, 10, 'easy', 'Move slowly, never force'),
('Neck Tilts', 'neck', 'Sit tall. Tilt ear toward shoulder, feeling stretch on opposite side. Hold 15 seconds, switch sides.', 45, NULL, 'easy', NULL),
('Levator Scapulae Stretch', 'neck', 'Turn head 45° to one side. Look down toward armpit. Use hand to gently increase stretch. Hold 20 seconds.', 60, NULL, 'safe', 'Be gentle, stop if dizzy'),
('Upper Trap Stretch', 'neck', 'Sit and hold seat with one hand. Tilt head away from that side until you feel the stretch. Hold 20 seconds.', 60, NULL, 'safe', NULL)

ON CONFLICT DO NOTHING;
