/**
 * Seed comprehensive yoga data for the Yoga Module
 * Run with: node scripts/seed-yoga-data.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fitcoach_db',
    user: process.env.DB_USER || 'fitcoach',
    password: process.env.DB_PASSWORD || 'fitcoach123',
});

// ============================================================================
// YOGA POSES - Comprehensive library
// ============================================================================
const YOGA_POSES = [
    // Foundation poses
    {
        name: 'Mountain Pose',
        sanskrit_name: 'Tadasana',
        description: 'The foundation of all standing poses. Stand tall with feet together, grounding through all four corners of your feet.',
        instructions: 'Stand with feet together or hip-width apart. Engage thighs, tuck tailbone, and lengthen through the crown of your head. Arms at sides, palms facing forward.',
        benefits: ['Improves posture', 'Strengthens thighs', 'Increases awareness'],
        default_duration_seconds: 30,
        image_url: 'https://images.unsplash.com/photo-1544367563-12123d8975bd?w=400'
    },
    {
        name: 'Child\'s Pose',
        sanskrit_name: 'Balasana',
        description: 'A restful pose that gently stretches the hips, thighs, and ankles while calming the mind.',
        instructions: 'Kneel on the floor, touch big toes together, sit on heels. Separate knees hip-width apart, lay torso down between thighs, extend arms forward.',
        benefits: ['Relieves stress', 'Stretches hips', 'Calms the mind'],
        default_duration_seconds: 60,
        image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400'
    },
    {
        name: 'Cat-Cow Stretch',
        sanskrit_name: 'Marjaryasana-Bitilasana',
        description: 'A gentle flow between two poses that warms up the body and brings flexibility to the spine.',
        instructions: 'Start on hands and knees. Inhale, drop belly, lift chest (Cow). Exhale, round spine, tuck chin (Cat). Flow with breath.',
        benefits: ['Spine flexibility', 'Relieves tension', 'Massages organs'],
        default_duration_seconds: 60,
        image_url: null
    },
    {
        name: 'Downward-Facing Dog',
        sanskrit_name: 'Adho Mukha Svanasana',
        description: 'An inversion that lengthens the spine and strengthens the arms and legs.',
        instructions: 'From all fours, lift hips up and back. Press hands into mat, keep spine long. Heels reach toward floor.',
        benefits: ['Energizes body', 'Calms brain', 'Strengthens arms'],
        default_duration_seconds: 45,
        image_url: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400'
    },
    {
        name: 'Cobra Pose',
        sanskrit_name: 'Bhujangasana',
        description: 'A backbend that opens the chest and strengthens the spine.',
        instructions: 'Lie face down, hands under shoulders. Press into hands, lift chest off floor. Keep elbows slightly bent, shoulders down.',
        benefits: ['Opens chest', 'Strengthens spine', 'Relieves stress'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Warrior I',
        sanskrit_name: 'Virabhadrasana I',
        description: 'A powerful standing pose that builds strength and stability in the legs.',
        instructions: 'Step one foot back, turn it 45 degrees. Bend front knee over ankle. Raise arms overhead, palms facing each other.',
        benefits: ['Strengthens legs', 'Opens hips', 'Builds focus'],
        default_duration_seconds: 45,
        image_url: 'https://images.unsplash.com/photo-1544367563-12123d8975bd?w=400'
    },
    {
        name: 'Warrior II',
        sanskrit_name: 'Virabhadrasana II',
        description: 'Opens the hips and builds strength in the legs while improving concentration.',
        instructions: 'From Warrior I, open hips to side. Extend arms parallel to floor, gaze over front fingertips.',
        benefits: ['Opens hips', 'Strengthens legs', 'Improves stamina'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Tree Pose',
        sanskrit_name: 'Vrksasana',
        description: 'A balancing pose that improves focus and strengthens the standing leg.',
        instructions: 'Stand on one leg, place other foot on inner thigh or calf (not knee). Hands at heart or overhead.',
        benefits: ['Improves balance', 'Strengthens legs', 'Increases focus'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Triangle Pose',
        sanskrit_name: 'Trikonasana',
        description: 'A standing pose that stretches and strengthens the thighs, knees, and ankles.',
        instructions: 'From wide stance, extend one arm down to shin/block, other arm to ceiling. Keep both sides of torso equally long.',
        benefits: ['Stretches legs', 'Opens chest', 'Relieves stress'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Seated Forward Fold',
        sanskrit_name: 'Paschimottanasana',
        description: 'A calming forward fold that stretches the entire back body.',
        instructions: 'Sit with legs extended. Inhale, lengthen spine. Exhale, fold forward from hips, reaching for feet.',
        benefits: ['Stretches spine', 'Calms mind', 'Relieves stress'],
        default_duration_seconds: 60,
        image_url: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400'
    },
    {
        name: 'Bridge Pose',
        sanskrit_name: 'Setu Bandhasana',
        description: 'A backbend that opens the chest and strengthens the legs and spine.',
        instructions: 'Lie on back, bend knees, feet flat on floor. Press into feet, lift hips. Interlace hands under back.',
        benefits: ['Opens chest', 'Strengthens legs', 'Reduces anxiety'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Supine Twist',
        sanskrit_name: 'Supta Matsyendrasana',
        description: 'A gentle twist that releases tension in the spine and aids digestion.',
        instructions: 'Lie on back, draw one knee to chest. Guide knee across body, extend arm opposite direction. Look toward extended arm.',
        benefits: ['Releases spine tension', 'Aids digestion', 'Calms nervous system'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Legs Up The Wall',
        sanskrit_name: 'Viparita Karani',
        description: 'A restorative inversion that relieves tired legs and calms the nervous system.',
        instructions: 'Sit sideways against wall, swing legs up. Rest arms at sides, close eyes. Stay for several minutes.',
        benefits: ['Relieves tired legs', 'Calms nervous system', 'Reduces anxiety'],
        default_duration_seconds: 180,
        image_url: null
    },
    {
        name: 'Corpse Pose',
        sanskrit_name: 'Savasana',
        description: 'The final relaxation pose that integrates the benefits of your practice.',
        instructions: 'Lie flat on back, arms at sides, palms up. Close eyes, release all effort. Breathe naturally.',
        benefits: ['Deep relaxation', 'Reduces stress', 'Integrates practice'],
        default_duration_seconds: 300,
        image_url: null
    },
    {
        name: 'Pigeon Pose',
        sanskrit_name: 'Eka Pada Rajakapotasana',
        description: 'A deep hip opener that releases tension stored in the hips.',
        instructions: 'From Downward Dog, bring one knee forward behind wrist. Extend back leg. Fold forward or stay upright.',
        benefits: ['Opens hips deeply', 'Releases emotional tension', 'Stretches thighs'],
        default_duration_seconds: 90,
        image_url: null
    },
    {
        name: 'Thread the Needle',
        sanskrit_name: 'Parsva Balasana',
        description: 'A gentle twist that opens the shoulders and upper back.',
        instructions: 'From all fours, slide one arm under body, resting shoulder and ear on floor. Other arm can extend forward.',
        benefits: ['Opens shoulders', 'Releases upper back', 'Reduces tension'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Reclined Butterfly',
        sanskrit_name: 'Supta Baddha Konasana',
        description: 'A restorative pose that opens the hips and relaxes the body.',
        instructions: 'Lie on back, bring soles of feet together, let knees fall open. Place hands on belly or extend arms.',
        benefits: ['Opens hips', 'Promotes relaxation', 'Relieves menstrual discomfort'],
        default_duration_seconds: 120,
        image_url: null
    },
    {
        name: 'Standing Forward Fold',
        sanskrit_name: 'Uttanasana',
        description: 'A calming forward bend that stretches the hamstrings and calms the mind.',
        instructions: 'From standing, hinge at hips and fold forward. Let head hang, grab opposite elbows.',
        benefits: ['Stretches hamstrings', 'Calms the mind', 'Relieves tension'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Low Lunge',
        sanskrit_name: 'Anjaneyasana',
        description: 'A hip-opening lunge that stretches the hip flexors and builds leg strength.',
        instructions: 'Step one foot forward into lunge, lower back knee to floor. Raise arms overhead, gently arch back.',
        benefits: ['Opens hip flexors', 'Strengthens legs', 'Improves balance'],
        default_duration_seconds: 45,
        image_url: null
    },
    {
        name: 'Sphinx Pose',
        sanskrit_name: 'Salamba Bhujangasana',
        description: 'A gentle backbend that strengthens the spine and opens the chest.',
        instructions: 'Lie on belly, prop up on forearms with elbows under shoulders. Press forearms down, lift chest.',
        benefits: ['Strengthens spine', 'Opens chest', 'Therapeutic for lower back'],
        default_duration_seconds: 60,
        image_url: null
    },
    {
        name: 'Happy Baby',
        sanskrit_name: 'Ananda Balasana',
        description: 'A playful pose that opens the hips and releases the lower back.',
        instructions: 'Lie on back, draw knees toward armpits. Grab outer edges of feet, gently pull knees down.',
        benefits: ['Opens hips', 'Releases lower back', 'Calms the mind'],
        default_duration_seconds: 60,
        image_url: null
    },
    {
        name: 'Neck Rolls',
        sanskrit_name: 'Greeva Sanchalana',
        description: 'Gentle neck movements to release tension from the neck and shoulders.',
        instructions: 'Drop chin to chest, slowly roll head in a half circle from shoulder to shoulder. Breathe deeply.',
        benefits: ['Releases neck tension', 'Improves mobility', 'Relieves headaches'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Shoulder Shrugs',
        sanskrit_name: 'Skandha Chakra',
        description: 'Simple shoulder movements to release tension from desk work.',
        instructions: 'Inhale, lift shoulders to ears. Exhale, release them down. Repeat several times.',
        benefits: ['Releases shoulder tension', 'Improves posture', 'Relieves stress'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Seated Side Stretch',
        sanskrit_name: 'Parsva Sukhasana',
        description: 'A gentle side stretch that opens the side body and improves breathing.',
        instructions: 'Sit cross-legged, place one hand on floor beside hip. Reach other arm overhead and lean.',
        benefits: ['Opens side body', 'Improves breathing', 'Stretches spine'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Plank Pose',
        sanskrit_name: 'Phalakasana',
        description: 'A core-strengthening pose that builds full-body stability.',
        instructions: 'From all fours, step feet back, body in one line from head to heels. Engage core, hold.',
        benefits: ['Strengthens core', 'Builds arm strength', 'Improves posture'],
        default_duration_seconds: 30,
        image_url: null
    },
    {
        name: 'Chair Pose',
        sanskrit_name: 'Utkatasana',
        description: 'A powerful pose that builds heat and strengthens the legs.',
        instructions: 'Stand with feet together, bend knees as if sitting back into a chair. Raise arms overhead.',
        benefits: ['Strengthens legs', 'Builds heat', 'Improves stamina'],
        default_duration_seconds: 30,
        image_url: null
    }
];

// ============================================================================
// YOGA SESSIONS - For each category
// ============================================================================
const YOGA_SESSIONS = [
    // RELAXATION & STRESS
    {
        title: 'Deep Sleep Release',
        description: 'Prepare your body for a restful sleep with these calming poses. Perfect for winding down after a long day.',
        category: 'Relaxation',
        duration_minutes: 10,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Sleep', 'Relaxation', 'Stress Relief'],
        calories_estimate: 25,
        image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Child\'s Pose', duration: 90, transition: 'Begin by settling into a comfortable position' },
            { name: 'Cat-Cow Stretch', duration: 60, transition: 'Rise to all fours' },
            { name: 'Thread the Needle', duration: 60, transition: 'Thread your arm through' },
            { name: 'Supine Twist', duration: 90, transition: 'Roll onto your back' },
            { name: 'Reclined Butterfly', duration: 120, transition: 'Bring soles of feet together' },
            { name: 'Corpse Pose', duration: 180, transition: 'Extend your legs and rest' }
        ]
    },
    {
        title: 'Anxiety Relief Flow',
        description: 'A gentle sequence designed to calm an anxious mind and release physical tension.',
        category: 'Relaxation',
        duration_minutes: 15,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Anxiety', 'Stress Relief', 'Calming'],
        calories_estimate: 35,
        image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Child\'s Pose', duration: 120, transition: 'Start in child\'s pose, focusing on your breath' },
            { name: 'Cat-Cow Stretch', duration: 90, transition: 'Come to all fours' },
            { name: 'Downward-Facing Dog', duration: 60, transition: 'Lift your hips up' },
            { name: 'Standing Forward Fold', duration: 60, transition: 'Walk feet to hands' },
            { name: 'Mountain Pose', duration: 45, transition: 'Slowly roll up to standing' },
            { name: 'Seated Forward Fold', duration: 90, transition: 'Come to seated' },
            { name: 'Supine Twist', duration: 90, transition: 'Lie back and twist' },
            { name: 'Legs Up The Wall', duration: 180, transition: 'Find a wall for support' },
            { name: 'Corpse Pose', duration: 180, transition: 'Rest completely' }
        ]
    },
    // FLEXIBILITY & MOBILITY
    {
        title: 'Full Body Stretch',
        description: 'Increase your range of motion and reduce stiffness with this comprehensive stretch sequence.',
        category: 'Flexibility',
        duration_minutes: 20,
        difficulty: 'Intermediate',
        intensity: 'Medium',
        focus_tags: ['Full Body', 'Flexibility', 'Mobility'],
        calories_estimate: 50,
        image_url: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Cat-Cow Stretch', duration: 90, transition: 'Start on hands and knees' },
            { name: 'Downward-Facing Dog', duration: 60, transition: 'Lift hips up and back' },
            { name: 'Low Lunge', duration: 60, transition: 'Step right foot forward' },
            { name: 'Low Lunge', duration: 60, transition: 'Switch to left side' },
            { name: 'Pigeon Pose', duration: 120, transition: 'Bring right knee forward' },
            { name: 'Pigeon Pose', duration: 120, transition: 'Switch to left side' },
            { name: 'Seated Forward Fold', duration: 90, transition: 'Sit with legs extended' },
            { name: 'Reclined Butterfly', duration: 120, transition: 'Lie back, soles together' },
            { name: 'Supine Twist', duration: 90, transition: 'Twist to each side' },
            { name: 'Happy Baby', duration: 90, transition: 'Grab your feet' },
            { name: 'Corpse Pose', duration: 180, transition: 'Rest and integrate' }
        ]
    },
    {
        title: 'Hip Opener Flow',
        description: 'Release tightness in your hips from sitting all day. Great for desk workers and athletes alike.',
        category: 'Flexibility',
        duration_minutes: 15,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Hips', 'Flexibility', 'Desk Workers'],
        calories_estimate: 35,
        image_url: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Child\'s Pose', duration: 60, transition: 'Begin in child\'s pose' },
            { name: 'Cat-Cow Stretch', duration: 60, transition: 'Come to all fours' },
            { name: 'Low Lunge', duration: 75, transition: 'Step right foot forward' },
            { name: 'Low Lunge', duration: 75, transition: 'Switch sides' },
            { name: 'Pigeon Pose', duration: 120, transition: 'Right leg forward' },
            { name: 'Pigeon Pose', duration: 120, transition: 'Left leg forward' },
            { name: 'Reclined Butterfly', duration: 120, transition: 'Lie on your back' },
            { name: 'Happy Baby', duration: 90, transition: 'Hold your feet' },
            { name: 'Corpse Pose', duration: 120, transition: 'Final rest' }
        ]
    },
    // STRENGTH YOGA
    {
        title: 'Power Flow Basics',
        description: 'Build strength and heat with this dynamic flowing sequence. Core-focused and energizing.',
        category: 'Strength',
        duration_minutes: 20,
        difficulty: 'Intermediate',
        intensity: 'High',
        focus_tags: ['Strength', 'Core', 'Power'],
        calories_estimate: 80,
        image_url: 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Mountain Pose', duration: 30, transition: 'Ground yourself' },
            { name: 'Chair Pose', duration: 45, transition: 'Sit back into chair' },
            { name: 'Standing Forward Fold', duration: 30, transition: 'Fold forward' },
            { name: 'Plank Pose', duration: 45, transition: 'Step back to plank' },
            { name: 'Cobra Pose', duration: 30, transition: 'Lower and lift' },
            { name: 'Downward-Facing Dog', duration: 45, transition: 'Press back' },
            { name: 'Warrior I', duration: 45, transition: 'Step right foot forward' },
            { name: 'Warrior II', duration: 45, transition: 'Open to side' },
            { name: 'Plank Pose', duration: 45, transition: 'Return to plank' },
            { name: 'Warrior I', duration: 45, transition: 'Step left foot forward' },
            { name: 'Warrior II', duration: 45, transition: 'Open to side' },
            { name: 'Chair Pose', duration: 45, transition: 'Step feet together' },
            { name: 'Mountain Pose', duration: 30, transition: 'Stand tall' },
            { name: 'Bridge Pose', duration: 60, transition: 'Come to floor, lift hips' },
            { name: 'Corpse Pose', duration: 180, transition: 'Rest and recover' }
        ]
    },
    {
        title: 'Core Sculpt Yoga',
        description: 'Target your core muscles with this focused practice. Build stability and functional strength.',
        category: 'Strength',
        duration_minutes: 15,
        difficulty: 'Intermediate',
        intensity: 'High',
        focus_tags: ['Core', 'Abs', 'Strength'],
        calories_estimate: 65,
        image_url: 'https://images.unsplash.com/photo-1544367563-12123d8975bd?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Cat-Cow Stretch', duration: 60, transition: 'Warm up your spine' },
            { name: 'Plank Pose', duration: 45, transition: 'Hold strong plank' },
            { name: 'Downward-Facing Dog', duration: 30, transition: 'Rest briefly' },
            { name: 'Plank Pose', duration: 45, transition: 'Back to plank' },
            { name: 'Child\'s Pose', duration: 30, transition: 'Quick rest' },
            { name: 'Cobra Pose', duration: 45, transition: 'Strengthen lower back' },
            { name: 'Plank Pose', duration: 45, transition: 'Final plank hold' },
            { name: 'Bridge Pose', duration: 60, transition: 'Flip over, lift hips' },
            { name: 'Supine Twist', duration: 60, transition: 'Release the spine' },
            { name: 'Corpse Pose', duration: 180, transition: 'Complete relaxation' }
        ]
    },
    // PAIN RELIEF
    {
        title: 'Desk Detox',
        description: 'Release neck and shoulder tension from sitting all day. Perfect mid-day break.',
        category: 'Pain Relief',
        duration_minutes: 5,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Neck', 'Shoulders', 'Office Workers'],
        calories_estimate: 10,
        image_url: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Neck Rolls', duration: 45, transition: 'Roll your neck gently' },
            { name: 'Shoulder Shrugs', duration: 30, transition: 'Lift and release shoulders' },
            { name: 'Seated Side Stretch', duration: 45, transition: 'Stretch right side' },
            { name: 'Seated Side Stretch', duration: 45, transition: 'Stretch left side' },
            { name: 'Thread the Needle', duration: 60, transition: 'Open your shoulders' },
            { name: 'Child\'s Pose', duration: 75, transition: 'Rest and breathe' }
        ]
    },
    {
        title: 'Lower Back Relief',
        description: 'Gentle poses to relieve lower back pain and tension. Therapeutic and soothing.',
        category: 'Pain Relief',
        duration_minutes: 10,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Back Pain', 'Lower Back', 'Therapeutic'],
        calories_estimate: 20,
        image_url: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Child\'s Pose', duration: 90, transition: 'Begin gently' },
            { name: 'Cat-Cow Stretch', duration: 90, transition: 'Mobilize your spine' },
            { name: 'Sphinx Pose', duration: 60, transition: 'Gentle backbend' },
            { name: 'Supine Twist', duration: 90, transition: 'Twist right' },
            { name: 'Supine Twist', duration: 90, transition: 'Twist left' },
            { name: 'Happy Baby', duration: 60, transition: 'Release lower back' },
            { name: 'Corpse Pose', duration: 120, transition: 'Rest completely' }
        ]
    },
    // POSTURE CORRECTION
    {
        title: 'Posture Reset',
        description: 'Realign your spine and improve your posture with this targeted sequence.',
        category: 'Posture',
        duration_minutes: 10,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Posture', 'Spine', 'Alignment'],
        calories_estimate: 25,
        image_url: 'https://images.unsplash.com/photo-1588286840104-4491684ebea8?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Mountain Pose', duration: 60, transition: 'Stand tall, feel your alignment' },
            { name: 'Standing Forward Fold', duration: 45, transition: 'Fold with a flat back' },
            { name: 'Cat-Cow Stretch', duration: 90, transition: 'Articulate your spine' },
            { name: 'Sphinx Pose', duration: 60, transition: 'Open your chest' },
            { name: 'Cobra Pose', duration: 45, transition: 'Strengthen your back' },
            { name: 'Bridge Pose', duration: 60, transition: 'Open front body' },
            { name: 'Supine Twist', duration: 60, transition: 'Release and realign' },
            { name: 'Mountain Pose', duration: 60, transition: 'Stand and feel the difference' }
        ]
    },
    {
        title: 'Shoulder & Upper Back Release',
        description: 'Open rounded shoulders and release upper back tension from daily activities.',
        category: 'Posture',
        duration_minutes: 12,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Shoulders', 'Upper Back', 'Posture'],
        calories_estimate: 30,
        image_url: 'https://images.unsplash.com/photo-1588286840104-4491684ebea8?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Shoulder Shrugs', duration: 45, transition: 'Warm up shoulders' },
            { name: 'Neck Rolls', duration: 45, transition: 'Release neck tension' },
            { name: 'Cat-Cow Stretch', duration: 60, transition: 'Mobilize upper back' },
            { name: 'Thread the Needle', duration: 75, transition: 'Right side' },
            { name: 'Thread the Needle', duration: 75, transition: 'Left side' },
            { name: 'Sphinx Pose', duration: 60, transition: 'Open chest' },
            { name: 'Bridge Pose', duration: 60, transition: 'Stretch chest and shoulders' },
            { name: 'Supine Twist', duration: 60, transition: 'Final release' },
            { name: 'Corpse Pose', duration: 180, transition: 'Rest with awareness of posture' }
        ]
    },
    // ENERGY & MORNING
    {
        title: 'Morning Sun Rise',
        description: 'A quick gentle flow to wake up your body and mind. Start your day with intention.',
        category: 'Energy',
        duration_minutes: 5,
        difficulty: 'Beginner',
        intensity: 'Low',
        focus_tags: ['Morning', 'Energy', 'Gentle'],
        calories_estimate: 15,
        image_url: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Mountain Pose', duration: 30, transition: 'Ground yourself' },
            { name: 'Standing Forward Fold', duration: 30, transition: 'Fold forward gently' },
            { name: 'Cat-Cow Stretch', duration: 60, transition: 'Awaken your spine' },
            { name: 'Downward-Facing Dog', duration: 45, transition: 'Stretch entire body' },
            { name: 'Cobra Pose', duration: 30, transition: 'Open your heart' },
            { name: 'Child\'s Pose', duration: 45, transition: 'Set your intention' },
            { name: 'Mountain Pose', duration: 30, transition: 'Rise with energy' }
        ]
    },
    {
        title: 'Energizing Flow',
        description: 'Build heat and energy with this dynamic morning practice. Wake up feeling alive.',
        category: 'Energy',
        duration_minutes: 15,
        difficulty: 'Intermediate',
        intensity: 'Medium',
        focus_tags: ['Morning', 'Energy', 'Dynamic'],
        calories_estimate: 50,
        image_url: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1000&auto=format&fit=crop',
        poses: [
            { name: 'Mountain Pose', duration: 30, transition: 'Begin standing tall' },
            { name: 'Chair Pose', duration: 45, transition: 'Build heat' },
            { name: 'Standing Forward Fold', duration: 30, transition: 'Release forward' },
            { name: 'Plank Pose', duration: 30, transition: 'Step back strong' },
            { name: 'Cobra Pose', duration: 30, transition: 'Flow through' },
            { name: 'Downward-Facing Dog', duration: 45, transition: 'Press back' },
            { name: 'Warrior I', duration: 45, transition: 'Step right forward' },
            { name: 'Warrior II', duration: 45, transition: 'Open wide' },
            { name: 'Triangle Pose', duration: 45, transition: 'Extend and reach' },
            { name: 'Downward-Facing Dog', duration: 30, transition: 'Return center' },
            { name: 'Warrior I', duration: 45, transition: 'Step left forward' },
            { name: 'Warrior II', duration: 45, transition: 'Open wide' },
            { name: 'Triangle Pose', duration: 45, transition: 'Extend and reach' },
            { name: 'Mountain Pose', duration: 30, transition: 'Return to center' },
            { name: 'Tree Pose', duration: 45, transition: 'Find balance' },
            { name: 'Mountain Pose', duration: 30, transition: 'Complete with gratitude' }
        ]
    }
];

async function seedYogaData() {
    const client = await pool.connect();

    try {
        console.log('🧘 Starting yoga data seed...\n');

        await client.query('BEGIN');

        // Clear existing data
        console.log('📋 Clearing existing yoga data...');
        await client.query('DELETE FROM yoga_session_poses');
        await client.query('DELETE FROM yoga_session_logs');
        await client.query('DELETE FROM yoga_sessions');
        await client.query('DELETE FROM yoga_poses');

        // Insert poses
        console.log('🧘 Inserting yoga poses...');
        const poseIdMap = {};

        for (const pose of YOGA_POSES) {
            const result = await client.query(
                `INSERT INTO yoga_poses (name, sanskrit_name, description, instructions, benefits, default_duration_seconds, image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [pose.name, pose.sanskrit_name, pose.description, pose.instructions, pose.benefits, pose.default_duration_seconds, pose.image_url]
            );
            poseIdMap[pose.name] = result.rows[0].id;
        }
        console.log(`   ✓ Inserted ${Object.keys(poseIdMap).length} poses`);

        // Insert sessions
        console.log('🧘 Inserting yoga sessions...');
        let sessionCount = 0;

        for (const session of YOGA_SESSIONS) {
            const sessionResult = await client.query(
                `INSERT INTO yoga_sessions (title, description, category, duration_minutes, difficulty, intensity, focus_tags, calories_estimate, image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [session.title, session.description, session.category, session.duration_minutes, session.difficulty, session.intensity, session.focus_tags, session.calories_estimate, session.image_url]
            );
            const sessionId = sessionResult.rows[0].id;
            sessionCount++;

            // Insert session poses
            for (let i = 0; i < session.poses.length; i++) {
                const pose = session.poses[i];
                const poseId = poseIdMap[pose.name];

                if (poseId) {
                    await client.query(
                        `INSERT INTO yoga_session_poses (session_id, pose_id, sequence_order, duration_seconds, transition_text)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [sessionId, poseId, i + 1, pose.duration, pose.transition]
                    );
                } else {
                    console.warn(`   ⚠ Pose not found: ${pose.name}`);
                }
            }
        }
        console.log(`   ✓ Inserted ${sessionCount} sessions with pose sequences`);

        await client.query('COMMIT');

        console.log('\n✅ Yoga data seeded successfully!');
        console.log(`   - ${Object.keys(poseIdMap).length} poses`);
        console.log(`   - ${sessionCount} sessions`);
        console.log('\n📊 Sessions by category:');

        const categoryCounts = YOGA_SESSIONS.reduce((acc, s) => {
            acc[s.category] = (acc[s.category] || 0) + 1;
            return acc;
        }, {});

        for (const [cat, count] of Object.entries(categoryCounts)) {
            console.log(`   - ${cat}: ${count} sessions`);
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding yoga data:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedYogaData().catch(console.error);
