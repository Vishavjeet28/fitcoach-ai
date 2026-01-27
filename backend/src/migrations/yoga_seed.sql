-- Seed Poses
INSERT INTO yoga_poses (name, sanskrit_name, description, default_duration_seconds, benefits) VALUES
('Child''s Pose', 'Balasana', 'A resting pose that calms the brain and relieves stress.', 120, ARRAY['Relieves stress', 'Stretches hips', 'Calms mind']),
('Cat-Cow Stretch', 'Marjaryasana-Bitilasana', 'A gentle flow between two poses that warms up the body and brings flexibility to the spine.', 60, ARRAY['Spine flexibility', 'Relieves tension', 'Massages organs']),
('Downward-Facing Dog', 'Adho Mukha Svanasana', 'An inversion that lengthens the spine and strengthens the arms and legs.', 60, ARRAY['Energizes body', 'Calms brain', 'Strengthens arms']),
('Warrior I', 'Virabhadrasana I', 'A standing pose that builds focus, power and stability.', 45, ARRAY['Strengthens legs', 'Opens chest', 'Improves focus']),
('Tree Pose', 'Vrksasana', 'A balancing pose that replicates the steady stance of a tree.', 60, ARRAY['Improves balance', 'Strengthens legs', 'Focus']),
('Corpse Pose', 'Savasana', 'The final relaxation pose.', 300, ARRAY['Deep relaxation', 'Reduces fatigue', 'Mental calm']),
('Cobra Pose', 'Bhujangasana', 'A backbend that opens the chest and strengthens the spine.', 30, ARRAY['Opens chest', 'Strengthens spine', 'Relieves stress']),
('Pigeon Pose', 'Eka Pada Rajakapotasana', 'A deep hip opener.', 60, ARRAY['Opens hips', 'Relieves sciatica', 'Stretches thighs']);

-- Seed Sessions

-- 1. Morning Energy (5 min)
INSERT INTO yoga_sessions (title, description, category, duration_minutes, difficulty, intensity, focus_tags, calories_estimate, image_url) VALUES
('Morning Sun Rise', 'A quick gentle flow to wake up your body and mind.', 'Energy', 5, 'Beginner', 'Low', ARRAY['Morning', 'Energy', 'Stretch'], 15, 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000&auto=format&fit=crop');

-- 2. Evening Wind Down (10 min)
INSERT INTO yoga_sessions (title, description, category, duration_minutes, difficulty, intensity, focus_tags, calories_estimate, image_url) VALUES
('Deep Sleep Release', 'Prepare your body for a restful sleep with these calming poses.', 'Relaxation', 10, 'Beginner', 'Low', ARRAY['Sleep', 'Relaxation', 'Stress'], 25, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop');

-- 3. Office Tension Relief (5 min)
INSERT INTO yoga_sessions (title, description, category, duration_minutes, difficulty, intensity, focus_tags, calories_estimate, image_url) VALUES
('Desk Detox', 'Release neck and shoulder tension from sitting all day.', 'Pain Relief', 5, 'Beginner', 'Low', ARRAY['Neck', 'Shoulders', 'Work'], 10, 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000&auto=format&fit=crop');

-- 4. Flexibility Basics (20 min)
INSERT INTO yoga_sessions (title, description, category, duration_minutes, difficulty, intensity, focus_tags, calories_estimate, image_url) VALUES
('Full Body Flow', 'Increase your range of motion and reduce stiffness.', 'Flexibility', 20, 'Intermediate', 'Medium', ARRAY['Full Body', 'Flexibility'], 60, 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000&auto=format&fit=crop');

-- Link Poses to Sessions (Simple mapping for now)
WITH session_row AS (SELECT id FROM yoga_sessions WHERE title = 'Morning Sun Rise'),
     pose_cat AS (SELECT id FROM yoga_poses WHERE name = 'Cat-Cow Stretch'),
     pose_dog AS (SELECT id FROM yoga_poses WHERE name = 'Downward-Facing Dog'),
     pose_cobra AS (SELECT id FROM yoga_poses WHERE name = 'Cobra Pose')
INSERT INTO yoga_session_poses (session_id, pose_id, sequence_order, duration_seconds, transition_text)
SELECT session_row.id, pose_cat.id, 1, 60, 'Come onto your hands and knees'
FROM session_row, pose_cat;

WITH session_row AS (SELECT id FROM yoga_sessions WHERE title = 'Morning Sun Rise'),
     pose_cat AS (SELECT id FROM yoga_poses WHERE name = 'Cat-Cow Stretch'),
     pose_dog AS (SELECT id FROM yoga_poses WHERE name = 'Downward-Facing Dog')
INSERT INTO yoga_session_poses (session_id, pose_id, sequence_order, duration_seconds, transition_text)
SELECT session_row.id, pose_dog.id, 2, 60, 'Lift your hips up and back'
FROM session_row, pose_dog;

WITH session_row AS (SELECT id FROM yoga_sessions WHERE title = 'Morning Sun Rise'),
     pose_cobra AS (SELECT id FROM yoga_poses WHERE name = 'Cobra Pose')
INSERT INTO yoga_session_poses (session_id, pose_id, sequence_order, duration_seconds, transition_text)
SELECT session_row.id, pose_cobra.id, 3, 30, 'Lower down and lift your chest'
FROM session_row, pose_cobra;
