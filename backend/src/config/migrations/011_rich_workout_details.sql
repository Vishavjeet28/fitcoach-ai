
BEGIN;

-- 1. Add columns for rich details
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS instructions TEXT[],
ADD COLUMN IF NOT EXISTS video_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS tips TEXT[],
ADD COLUMN IF NOT EXISTS target_muscles TEXT[];

-- 2. Seed Data (Robust Updates)
-- Bench Press
UPDATE exercises SET 
instructions = ARRAY[
  'Lie flat on the bench with your eyes under the bar.',
  'Grip the bar slightly wider than shoulder-width.',
  'Unrack the bar and lower it slowly to your mid-chest.',
  'Press the bar back up explosively until arms are extended.'
],
tips = ARRAY['Keep feet planted firmly.', 'Squeeze shoulder blades together.', 'Don''t flair elbows out excessively.'],
target_muscles = ARRAY['Pectoralis Major', 'Triceps Brachii', 'Anterior Deltoid']
WHERE name ILIKE 'Bench Press';

-- Squat
UPDATE exercises SET 
instructions = ARRAY[
  'Stand with feet shoulder-width apart, barbell resting on your upper back.',
  'Brace your core and break at the hips and knees simultaneously.',
  'Keep your chest up and back straight.',
  'Lower until your thighs are at least parallel to the floor.',
  'Drive back up through your heels to the starting position.'
],
tips = ARRAY['Keep your core braced.', 'Ensure your knees track over your toes.', 'Do not let knees cave inward.'],
target_muscles = ARRAY['Quadriceps', 'Gluteus Maximus', 'Adductors']
WHERE name ILIKE 'Squat';

-- Deadlift
UPDATE exercises SET 
instructions = ARRAY[
  'Stand with feet hip-width apart, barbell over mid-foot.',
  'Hinge at hips to grip the bar just outside your legs.',
  'Bring shins to the bar, straightening your back and engaging lats.',
  'Lift the bar by driving hips forward and standing tall.',
  'Lower the bar with control by pushing hips back.'
],
tips = ARRAY['Keep the bar close to your body.', 'Don''t round your lower back.', 'Engage lats to keep bar tight.'],
target_muscles = ARRAY['Hamstrings', 'Gluteus Maximus', 'Erector Spinae']
WHERE name ILIKE 'Deadlift';

-- Overhead Press
UPDATE exercises SET 
instructions = ARRAY[
  'Stand with feet shoulder-width apart, holding the bar at shoulder height.',
  'Brace your core and glutes.',
  'Press the bar straight up overhead, clearing your face.',
  'Lock out arms at the top with bar over mid-foot.',
  'Lower back to shoulders with control.'
],
tips = ARRAY['Keep core braced.', 'Avoid arching your lower back excessively.', 'Head through at the top.'],
target_muscles = ARRAY['Deltoids', 'Triceps Brachii']
WHERE name ILIKE 'Overhead Press';

-- Pull-ups
UPDATE exercises SET 
instructions = ARRAY[
  'Hang from a pull-up bar with palms facing away (pronated grip).',
  'Engage your lats and pull your chest towards the bar.',
  'Drive elbows down towards hips.',
  'Chin should clear the bar.',
  'Lower yourself fully to dead hang before the next rep.'
],
tips = ARRAY['Full range of motion.', 'Don''t swing (kipping) for strict pull-ups.', 'Squeeze glutes to prevent swinging.'],
target_muscles = ARRAY['Latissimus Dorsi', 'Biceps Brachii', 'Rear Deltoids']
WHERE name ILIKE 'Pull-ups';

-- Barbell Row
UPDATE exercises SET 
instructions = ARRAY[
  'Stand with feet hip-width, holding bar.',
  'Hinge forward at hips until torso is nearly parallel to floor.',
  'Keep back straight.',
  'Pull bar towards lower chest/upper abs.',
  'Lower with control.'
],
tips = ARRAY['Don''t use momentum.', 'Squeeze back muscles at top.'],
target_muscles = ARRAY['Latissimus Dorsi', 'Rhomboids', 'Rear Deltoids']
WHERE name ILIKE 'Barbell Row';

COMMIT;
