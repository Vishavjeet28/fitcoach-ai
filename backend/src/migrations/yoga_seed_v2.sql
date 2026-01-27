-- =====================================================================
-- FITCOACH AI - YOGA SEED DATA (Production)
-- Matches frontend yoga_data.ts exactly
-- =====================================================================

-- =========================
-- SEED CATEGORIES
-- =========================
INSERT INTO yoga_categories (id, name, description, icon, image_url, display_order, is_active) VALUES
('posture_correction', 'Posture Correction', 'Correct forward head, rounded shoulders, and slouched spine. Perfect for desk workers.', 'human-queue', 'https://images.unsplash.com/photo-1588286840104-4491684ebea8?q=80&w=1000', 1, TRUE),
('back_pain_relief', 'Back Pain Relief', 'Gentle relief for lower back stiffness and sedentary lifestyle pain. No deep twists.', 'human-handsdown', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000', 2, TRUE),
('knee_care', 'Knee Care', 'Joint lubrication, quad/hamstring balance, and knee stability exercises.', 'run', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1000', 3, TRUE),
('shoulder_mobility', 'Shoulder Mobility', 'Prevent frozen shoulder, relieve desk stiffness, rotator cuff safety.', 'arm-flex', 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000', 4, TRUE),
('full_body_flow', 'Full Body Flow', 'Gentle daily mobility flows connecting breath and movement.', 'yoga', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000', 5, TRUE),
('stress_relaxation', 'Stress & Relaxation', 'Calm the nervous system, activate parasympathetic response, prepare for sleep.', 'leaf', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000', 6, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    image_url = EXCLUDED.image_url,
    display_order = EXCLUDED.display_order;

-- =========================
-- SEED EXERCISES
-- =========================

-- POSTURE CORRECTION
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('seated_chest_opener', 'posture_correction', 'Seated Chest Opener', 'Sukhasana Variation', 'beginner_safe', 'Counteract slouching and open the chest.', 'A gentle seated stretch that opens the front body, perfect for desk workers combating computer posture.', 3, 'anytime', 'safe', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000'),
('sphinx_pose', 'posture_correction', 'Sphinx Pose', 'Salamba Bhujangasana', 'beginner', 'Gentle thoracic extension to reverse kyphosis.', 'A passive backbend that helps restore the natural curve of the spine without aggressive force.', 4, 'anytime', 'caution', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('mountain_pose_wall', 'posture_correction', 'Wall Angel (Mountain Variation)', 'Tadasana w/ Wall', 'beginner_safe', 'Feedback for spinal alignment.', 'Using a wall provides tactile feedback to ensure your spine is truly neutral.', 3, 'anytime', 'safe', 'https://images.unsplash.com/photo-1588286840104-4491684ebea8?q=80&w=1000'),
('cat_cow', 'posture_correction', 'Cat-Cow Flow', 'Marjaryasana-Bitilasana', 'all_levels', 'Mobilize the entire spine.', 'A rhythmic flow connecting breath to movement, essential for spinal health.', 5, 'morning', 'safe', 'https://plus.unsplash.com/premium_photo-1664475477169-46b784084d5e?q=80&w=3272'),
('neck_stretches', 'posture_correction', 'Seated Neck Release', 'Greeva Sanchalana', 'beginner_safe', 'Release tension in upper trapezius.', 'Simple but effective release for text neck and stress-held tension.', 3, 'anytime', 'caution', 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose,
    description = EXCLUDED.description;

-- BACK PAIN RELIEF
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('childs_pose_wide', 'back_pain_relief', 'Wide-Knee Child''s Pose', 'Balasana', 'all_levels', 'Decompress the lumbar spine.', 'The ultimate restorative pose for lower back fatigue.', 5, 'anytime', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('supine_twist_gentle', 'back_pain_relief', 'Supported Supine Twist', 'Supta Matsyendrasana', 'beginner_safe', 'Release spinal tension through rotation.', 'A gentle twist done lying down, minimizing gravity load on the spine.', 4, 'evening', 'caution', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('bridge_flow', 'back_pain_relief', 'Rolling Bridge', 'Setu Bandhasana Flow', 'beginner', 'Strengthen glutes/stabilize pelvis.', 'Dynamic movement to wake up glutes which support the lower back.', 4, 'morning', 'safe', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000'),
('legs_up_wall_back', 'back_pain_relief', 'Legs Up The Wall', 'Viparita Karani', 'beginner_safe', 'Passive release of psoas and back muscles.', 'Gravity assists circulation return and allows lumbar muscles to fully let go.', 5, 'evening', 'caution', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose;

-- KNEE CARE
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('quad_activation', 'knee_care', 'Seated Quad Setting', 'Dandasana Variation', 'beginner_safe', 'Strengthen VMO (inner quad) for tracking.', 'Isometric strengthening safe for almost all knee conditions.', 3, 'anytime', 'safe', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1000'),
('glute_bridge_hold', 'knee_care', 'Supported Glute Bridge', 'Setu Bandhasana', 'beginner', 'Strengthen posterior chain to offload knees.', 'Strong hips mean less work for the knees.', 3, 'anytime', 'safe', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000'),
('high_lunge_supported', 'knee_care', 'Supported High Lunge', 'Ashta Chandrasana (Mod)', 'all_levels', 'Strengthen stabilizers.', 'Static hold to build stability. Use a chair for balance if needed.', 3, 'anytime', 'caution', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('hamstring_stretch_strap', 'knee_care', 'Reclined Hand-to-Big-Toe', 'Supta Padangusthasana', 'beginner_safe', 'Safe hamstring lengthening.', 'Using a strap allows stretching without compromising spinal alignment.', 4, 'evening', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose;

-- SHOULDER MOBILITY
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('shoulder_flossing', 'shoulder_mobility', 'Shoulder Flossing (Strap)', 'Shoulder Pass-Through', 'beginner', 'Full range of motion for shoulder girdle.', 'Dynamic movement using a strap to take shoulders through full rotation.', 3, 'morning', 'caution', 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000'),
('eagle_arms', 'shoulder_mobility', 'Eagle Arms', 'Garudasana Arms', 'beginner', 'Stretch rhomboids and upper traps.', 'A deep stretch for the space between shoulder blades.', 3, 'anytime', 'safe', 'https://images.unsplash.com/photo-1588286840104-4491684ebea8?q=80&w=1000'),
('thread_the_needle', 'shoulder_mobility', 'Thread the Needle', 'Parsva Balasana', 'beginner', 'Gentle spinal twist and shoulder stretch.', 'A floor-based pose that uses body weight to stretch the outer shoulder.', 4, 'evening', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('cow_face_arms', 'shoulder_mobility', 'Cow Face Arms (Strap)', 'Gomukhasana Arms', 'all_levels', 'Tricep and shoulder opening.', 'Using a strap makes this deep stretch accessible and safe.', 3, 'anytime', 'caution', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose;

-- FULL BODY FLOW
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('sun_salutation_a_mod', 'full_body_flow', 'Gentle Sun Salutation', 'Surya Namaskar A (Mod)', 'all_levels', 'Warm up entire body.', 'A slow, modified flow to wake up energy.', 5, 'morning', 'safe', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000'),
('warrior_2_flow', 'full_body_flow', 'Dancing Warrior', 'Virabhadrasana Flow', 'beginner', 'Leg strength and side body opening.', 'Flowing between Warrior 2 and Reverse Warrior.', 5, 'morning', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('downward_dog', 'full_body_flow', 'Downward Facing Dog', 'Adho Mukha Svanasana', 'beginner', 'Full body reset.', 'The quintessential reset pose.', 2, 'anytime', 'caution', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose;

-- STRESS & RELAXATION
INSERT INTO yoga_exercises (id, category_id, name, sanskrit_name, difficulty, primary_purpose, description, duration_minutes, time_of_day, contraindication_level, thumbnail_url) VALUES
('legs_up_wall_relax', 'stress_relaxation', 'Legs Up The Wall', 'Viparita Karani', 'beginner_safe', 'Parasympathetic activation.', 'The single most effective pose for stress relief.', 10, 'evening', 'caution', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000'),
('butterfly_reclined', 'stress_relaxation', 'Reclined Butterfly', 'Supta Baddha Konasana', 'beginner_safe', 'Open hips and relax belly.', 'A deeply restorative pose usually done with props.', 5, 'evening', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000'),
('corpse_pose', 'stress_relaxation', 'Corpse Pose', 'Savasana', 'beginner_safe', 'Total integration.', 'The most important pose. Complete stillness.', 5, 'evening', 'safe', 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    primary_purpose = EXCLUDED.primary_purpose;

-- =========================
-- SEED EXERCISE DETAILS
-- =========================

-- Posture Correction Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('seated_chest_opener', 
    ARRAY['Pectorals', 'Anterior Deltoids', 'Thoracic Spine'],
    ARRAY['Reverses rounded shoulders', 'Improves breathing capacity', 'Relieves upper back tension', 'Promotes upright awareness'],
    ARRAY['Sit in a comfortable cross-legged position or on a chair with feet flat.', 'Interlace your fingers behind your back (or hold a strap if tight).', 'Inhale and gently straighten your arms, rolling your shoulders back and down.', 'Lift your chest slightly toward the ceiling but keep your chin level.', 'Breathe deeply into the upper chest for 5-8 breaths.'],
    ARRAY['Jutting the chin forward/neck strain', 'Arching the lower back excessively', 'Forcing the hands up too high causing shoulder pain'],
    ARRAY['Acute shoulder injury (rotator cuff)', 'Wrist pain'],
    ARRAY['Imagine a string pulling your sternum to the sky', 'Keep your neck long and loose', 'Soften your jaw']
),
('sphinx_pose',
    ARRAY['Lower Back', 'Middle Back', 'Chest'],
    ARRAY['Strengthens spine', 'Opens chest/lungs', 'Soothes nervous system', 'Mild lower back compression (therapeutic)'],
    ARRAY['Lie on your belly with legs extended, tops of feet pressing down.', 'Place elbows under shoulders, forearms parallel like number 11.', 'Press forearms down to lift chest away from the floor.', 'Draw shoulders away from ears and look straight ahead.', 'Hold for 1-3 minutes, breathing softly.'],
    ARRAY['Sinking into shoulders (turtle neck)', 'Clenching glutes too tight', 'Looking up too high (neck compression)'],
    ARRAY['Pregnancy', 'Acute lower back injury'],
    ARRAY['Press down through your elbows', 'Pull your heart forward through the gate of your arms']
),
('mountain_pose_wall',
    ARRAY['Upper Back', 'Neck', 'Shoulders'],
    ARRAY['Incredible feedback for alignment', 'Strengthens deep neck flexors', 'Resets shoulder position'],
    ARRAY['Stand with your back against a wall, feet 6 inches away.', 'Ensure hips, shoulder blades, and back of head touch the wall.', 'Bring arms to a W shape (cactus arms) against the wall if possible.', 'Slide arms up and down slowly while keeping contact.', 'Focus on keeping the ribcage knitted in (not flaring).'],
    ARRAY['Letting ribs pop out to touch the wall', 'Chin lifting to touch head back', 'Holding breath'],
    ARRAY['Frozen shoulder'],
    ARRAY['Feel the wall supporting your spine', 'Keep your chin tucked slightly', 'Don''t force the arms, go where comfortable']
),
('cat_cow',
    ARRAY['Spine', 'Neck', 'Core'],
    ARRAY['Lubricates spinal joints', 'Improves proprioception', 'Relieves stiffness'],
    ARRAY['Start on all fours, wrists under shoulders, knees under hips.', 'Inhale: Drop belly, lift chest and gaze (Cow).', 'Exhale: Press hands down, round spine, tuck chin (Cat).', 'Move slowly with your own breath count.', 'Repeat for 10-15 cycles.'],
    ARRAY['Moving too fast', 'Bending elbows excessively', 'Collapsing in the mid-back'],
    ARRAY['Wrist pain', 'Knee pain'],
    ARRAY['Move vertebra by vertebra', 'Imagine a wave traveling through your spine']
),
('neck_stretches',
    ARRAY['Neck', 'Upper Traps'],
    ARRAY['Reduces tension headaches', 'Lowers stress', 'Improves neck range of motion'],
    ARRAY['Sit tall. Drop right ear toward right shoulder.', 'Extend left arm out to side and down for deeper stretch.', 'Hold for 5 breaths. Switch sides.', 'Optional: Gently place hand on head (add weight, do not pull).'],
    ARRAY['Pulling the head aggressively', 'Lifting the shoulder to the ear', 'Holding breath'],
    ARRAY['Acute neck disk issue (herniation)'],
    ARRAY['Let gravity do the work', 'Soften your jaw']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions,
    common_mistakes = EXCLUDED.common_mistakes,
    who_should_avoid = EXCLUDED.who_should_avoid,
    instructor_cues = EXCLUDED.instructor_cues;

-- Back Pain Relief Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('childs_pose_wide',
    ARRAY['Lower Back', 'Hips', 'Glutes'],
    ARRAY['Gentle traction for lower back', 'Calms nervous system', 'Passive hip stretches'],
    ARRAY['Kneel on mat, big toes touching, knees wide apart.', 'Sit hips back onto heels.', 'Walk hands forward and lower chest to floor.', 'Rest forehead on mat or block.', 'Breathe into the back body.'],
    ARRAY['Forcing hips down if knees hurt', 'Tensing shoulders near ears'],
    ARRAY['Knee injury', 'Pregnancy (keep knees very wide)'],
    ARRAY['Send your breath to your lower back', 'Melt your chest toward the earth']
),
('supine_twist_gentle',
    ARRAY['Lower Back', 'Obliques', 'Glutes'],
    ARRAY['Hydrates spinal discs', 'Relieves stiffness', 'Digestion aid'],
    ARRAY['Lie on back, hug knees to chest.', 'Drop both knees to the right side.', 'Extend left arm to side, gaze left.', 'Place a pillow under knees if they don''t touch floor.', 'Hold 1-2 mins, switch sides.'],
    ARRAY['Forcing knees down while lifting shoulder', 'Twisting too aggressively'],
    ARRAY['SI joint instability'],
    ARRAY['Keep both shoulders grounded', 'Twist from the belly button']
),
('bridge_flow',
    ARRAY['Glutes', 'Hamstrings', 'Core'],
    ARRAY['Stabilizes SI joint', 'Opens hip flexors', 'Strengthens posterior chain'],
    ARRAY['Lie on back, knees bent, feet flat hip-width apart.', 'Inhale: Press into feet, lift hips slowly.', 'Exhale: Lower spine vertebra by vertebra.', 'Repeat 10 times, focusing on articulation.'],
    ARRAY['Pushing too high (arching back)', 'Knees splaying out', 'Tensing neck'],
    ARRAY['Acute neck pain'],
    ARRAY['Lift from your hips, not your back', 'Squeeze glutes gently at top']
),
('legs_up_wall_back',
    ARRAY['Hamstrings', 'Lower Back'],
    ARRAY['Reduces inflammation', 'Relaxes psoas', 'Calms nervous system completely'],
    ARRAY['Sit sideway against a wall.', 'Swing legs up the wall as you lie back.', 'Rest hips on a folded blanket if needed.', 'Arms by sides, palms up.', 'Close eyes and rest.'],
    ARRAY['Hips too far from wall (straining)', 'Arching neck'],
    ARRAY['Glaucoma (inversion)', 'Acid reflux'],
    ARRAY['Let your thigh bones sink into your hip sockets', 'Do absolutely nothing']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions;

-- Knee Care Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('quad_activation',
    ARRAY['Quadriceps', 'Knees'],
    ARRAY['Improves patellar tracking', 'Non-weight bearing strength', 'Reduces knee pain'],
    ARRAY['Sit with legs extended (or one bent).', 'Place a rolled towel under the knee being worked.', 'Press knee down into towel to engage quad.', 'Lift heel slightly if possible.', 'Hold 5 seconds, release. Repeat 10x.'],
    ARRAY['Holding breath', 'Hyperextending'],
    ARRAY['Acute ACL tear'],
    ARRAY['Feel the muscle above your knee cap engage', 'Keep spine tall']
),
('glute_bridge_hold',
    ARRAY['Glutes', 'Hamstrings'],
    ARRAY['Takes pressure off knee joint', 'Stabilizes hips', 'Builds endurance'],
    ARRAY['Lie on back, feet hip-width close to glutes.', 'Press into heels to lift hips.', 'Ensure knees point straight (don''t cave in).', 'Hold for 3-5 breaths.', 'Lower slowly.'],
    ARRAY['Knees falling inward', 'Lifting heels'],
    ARRAY['Neck pain'],
    ARRAY['Imagine a block between your knees', 'Drive through your heels']
),
('high_lunge_supported',
    ARRAY['Quads', 'Glutes', 'Calves'],
    ARRAY['Balance', 'Ankle stability', 'Hip opening'],
    ARRAY['Stand feet hip-width.', 'Step one foot back, keeping heel lifted.', 'Bend front knee (knee over ankle, not past).', 'Keep back leg strong.', 'Hold for 5 breaths.'],
    ARRAY['Front knee swaying in', 'Collapsing on back leg'],
    ARRAY['Acute ankle sprain'],
    ARRAY['Press the floor away', 'Keep your hips square to front']
),
('hamstring_stretch_strap',
    ARRAY['Hamstrings'],
    ARRAY['Reduces knee compression', 'Safe for back', 'Relaxes legs'],
    ARRAY['Lie on back.', 'Loop a strap/towel around ball of right foot.', 'Extend leg toward ceiling (keep slight bend if needed).', 'Keep lower back grounded.', 'Hold 1 minute each side.'],
    ARRAY['Locking the knee', 'Lifting hips off floor'],
    ARRAY['Acute hamstring tear'],
    ARRAY['Flex your foot toward your face', 'Keep shoulders relaxed on mat']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions;

-- Shoulder Mobility Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('shoulder_flossing',
    ARRAY['Shoulders', 'Chest', 'Upper Back'],
    ARRAY['Combats frozen shoulder', 'Opens chest', 'Improves posture'],
    ARRAY['Stand tall holding a strap wider than shoulders.', 'Inhale: Lift strap overhead.', 'Exhale: Bring strap behind you (widen grip if needed).', 'Inhale: Bring back up.', 'Exhale: Lower to front.', 'Repeat 5-10 times slowly.'],
    ARRAY['Bending elbows too much', 'Arching back to compensate'],
    ARRAY['Acute rotator cuff tear', 'Shoulder instability'],
    ARRAY['Keep your ribs knitted in', 'Move slowly through the sticky spots']
),
('eagle_arms',
    ARRAY['Upper Back', 'Shoulders'],
    ARRAY['Relieves keyboard back', 'Opens scapula', 'Boosts circulation'],
    ARRAY['Extend arms forward.', 'Cross right arm under left.', 'Bend elbows and wrap forearms (or hug shoulders).', 'Lift elbows to shoulder height.', 'Press forearms away from face.', 'Hold 5 breaths, switch.'],
    ARRAY['Dropping elbows to chest', 'Hunching forward'],
    ARRAY['Shoulder injury'],
    ARRAY['Breathe into the space between your shoulder blades', 'Lift elbows gently']
),
('thread_the_needle',
    ARRAY['Shoulders', 'Upper Back', 'Neck'],
    ARRAY['Relieves tension', 'Gentle twist', 'Calming'],
    ARRAY['Start on all fours.', 'Inhale: Lift right arm to sky.', 'Exhale: Thread right arm under left.', 'Rest right cheek and shoulder on mat.', 'Hold 5-8 breaths, switch.'],
    ARRAY['Collapsing weight onto neck', 'Hips swaying too far'],
    ARRAY['Neck injury'],
    ARRAY['Press slightly into the grounded hand', 'Soften your face']
),
('cow_face_arms',
    ARRAY['Triceps', 'Shoulders', 'Chest'],
    ARRAY['Increases range of motion', 'Opens chest', 'Counters forward posture'],
    ARRAY['Hold strap in right hand, reach overhead.', 'Bend elbow, strap dangles down back.', 'Reach left arm behind and up to grab strap.', 'Walk hands closer gently.', 'Keep head upright.'],
    ARRAY['Pushing head forward', 'Arching back intensely'],
    ARRAY['Shoulder impingement'],
    ARRAY['Keep your neck free', 'Don''t force the grip, use the strap']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions;

-- Full Body Flow Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('sun_salutation_a_mod',
    ARRAY['Full Body'],
    ARRAY['Circulation', 'Flexibility', 'Breath connection'],
    ARRAY['Mountain Pose: Inhale arms up.', 'Forward Fold: Exhale, bend knees deeply.', 'Half Lift: Inhale hands to shins, flat back.', 'Plank: Exhale step back.', 'Knees-Chest-Chin: Lower slowly.', 'Cobra: Inhale gentle backbend.', 'Down Dog: Exhale hips up.', 'Step forward & rise.'],
    ARRAY['Holding breath', 'Straining back in Cobra'],
    ARRAY['Wrist pain', 'Vertigo'],
    ARRAY['Move like you are moving through honey', 'Follow your breath']
),
('warrior_2_flow',
    ARRAY['Legs', 'Hips', 'Side Body'],
    ARRAY['Strengthens legs', 'Opens hips', 'Feels empowering'],
    ARRAY['Step feet wide, right toes turn out.', 'Bend right knee (Warrior 2).', 'Inhale: Reverse Warrior (reach right arm up/back).', 'Exhale: Side Angle (forearm to thigh, left arm over).', 'Flow 5 times, then switch.'],
    ARRAY['Knee collapsing in', 'Shoulders hunched'],
    ARRAY['Knee issues'],
    ARRAY['Keep your front knee stable', 'Flow with grace']
),
('downward_dog',
    ARRAY['Calves', 'Hamstrings', 'Shoulders', 'Back'],
    ARRAY['Energizing', 'Lengthens spine', 'Strengthens arms'],
    ARRAY['Hands shoulder-width, feet hip-width.', 'Lift hips up and back.', 'Pedal out the feet (bend one knee, then other).', 'Press chest toward thighs.', 'Relax head completely.'],
    ARRAY['Rounding spine (bend knees instead!)', 'Shoulders near ears'],
    ARRAY['High blood pressure', 'Carpal tunnel'],
    ARRAY['Bend your knees as much as needed to keep spine straight', 'Shake your head yes and no']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions;

-- Stress & Relaxation Details
INSERT INTO yoga_exercise_details (exercise_id, target_areas, benefits, step_by_step_instructions, common_mistakes, who_should_avoid, instructor_cues) VALUES
('legs_up_wall_relax',
    ARRAY['Nervous System'],
    ARRAY['Reduces cortisol', 'Aids sleep', 'Relieves tired legs'],
    ARRAY['Sit sideways to wall.', 'Swing legs up.', 'Arms open wide.', 'Cover with blanket if cold.', 'Focus on long exhales.'],
    ARRAY['Doing too much. Just relax.'],
    ARRAY['Glaucoma'],
    ARRAY['Nowhere to go, nothing to do', 'Let the floor hold you']
),
('butterfly_reclined',
    ARRAY['Hips', 'Inner Thighs'],
    ARRAY['Softens abdomen', 'Gentle hip opener', 'Emotionally grounding'],
    ARRAY['Lie on back.', 'Soles of feet together, knees open.', 'Place blocks/pillows under knees for support.', 'Place one hand on heart, one on belly.', 'Feel the breath move.'],
    ARRAY['Straining groin (use props!)'],
    ARRAY['Hip injury'],
    ARRAY['Use pillows under knees to fully let go', 'Soften your belly']
),
('corpse_pose',
    ARRAY['Mind', 'Body'],
    ARRAY['Lowers blood pressure', 'Reduces fatigue', 'Mental clarity'],
    ARRAY['Lie flat on back.', 'Legs extended, feet flop open.', 'Arms by sides, palms up.', 'Close eyes.', 'Release all muscular control.'],
    ARRAY['Fidgeting', 'Planning the day'],
    ARRAY['Back pain (bend knees)'],
    ARRAY['Let your bones be heavy', 'Surrender to gravity']
)
ON CONFLICT (exercise_id) DO UPDATE SET
    target_areas = EXCLUDED.target_areas,
    benefits = EXCLUDED.benefits,
    step_by_step_instructions = EXCLUDED.step_by_step_instructions;

-- =====================================================================
-- END OF SEED DATA
-- =====================================================================
