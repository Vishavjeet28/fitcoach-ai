/**
 * yoga_data_expanded.ts
 * Comprehensive Yoga Exercise Database
 * 120+ exercises organized by Focus Area (6 categories × 20+ each)
 */

// ═══════════════════════════════════════════════════════════════════════════
// THEME & TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const YOGA_THEME = {
    colors: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        primary: '#3F3D56',
        secondary: '#6C757D',
        accent: '#A2D2FF',
        accentSoft: '#EAF4FF',
        highlight: '#BDE0FE',
        success: '#48BB78',
        divider: '#F1F3F5',
    },
    spacing: { s: 8, m: 16, l: 24, xl: 32 },
};

export interface YogaStep {
    id: number;
    title: string;
    instruction: string;
    image_url: any;
}

export interface YogaPose {
    id: string;
    name: string;
    sanskrit_name: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
    duration_minutes: number;
    hero_image: any;
    benefits: string[];
    mistakes: string[];
    modifications: string[];
    instructor_cues: string[];
    steps: YogaStep[];
}

export interface YogaCategory {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    color: string;
    gradient: string[];
    exerciseCount: number;
}

export interface YogaRoutine {
    id: string;
    name: string;
    subtitle: string;
    description: string;
    benefits: string[];
    total_duration_minutes: number;
    pose_ids: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'All Levels';
    icon: string;
    gradient: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE IMPORTS - All available yoga pose images
// ═══════════════════════════════════════════════════════════════════════════

const IMAGES = {
    // Existing images
    bridge_flow: require('../../assets/yoga_poses/bridge_flow.png'),
    cat_cow: require('../../assets/yoga_poses/cat_cow.png'),
    childs_pose_wide: require('../../assets/yoga_poses/childs_pose_wide.png'),
    corpse_pose: require('../../assets/yoga_poses/corpse_pose.png'),
    downward_dog: require('../../assets/yoga_poses/downward_dog.png'),
    glute_bridge_hold: require('../../assets/yoga_poses/glute_bridge_hold.png'),
    legs_up_wall: require('../../assets/yoga_poses/legs_up_wall_relax.png'),
    mountain_pose: require('../../assets/yoga_poses/mountain_pose_wall.png'),
    neck_stretches: require('../../assets/yoga_poses/neck_stretches.png'),
    quad_activation: require('../../assets/yoga_poses/quad_activation.png'),
    seated_chest_opener: require('../../assets/yoga_poses/seated_chest_opener.png'),
    sphinx_pose: require('../../assets/yoga_poses/sphinx_pose.png'),
    supine_twist: require('../../assets/yoga_poses/supine_twist_gentle.png'),
    thread_needle: require('../../assets/yoga_poses/thread_the_needle.png'),
    warrior_2: require('../../assets/yoga_poses/warrior_2_flow.png'),

    // New images
    standing_forward_fold: require('../../assets/yoga_poses/standing_forward_fold.png'),
    cobra_pose: require('../../assets/yoga_poses/cobra_pose.png'),
    warrior_one: require('../../assets/yoga_poses/warrior_one.png'),
    tree_pose: require('../../assets/yoga_poses/tree_pose.png'),
    extended_side_angle: require('../../assets/yoga_poses/extended_side_angle.png'),
    triangle_pose: require('../../assets/yoga_poses/triangle_pose.png'),
    half_moon: require('../../assets/yoga_poses/half_moon_pose.png'),
    chair_pose: require('../../assets/yoga_poses/chair_pose.png'),
    pigeon_pose: require('../../assets/yoga_poses/pigeon_pose.png'),
    seated_twist: require('../../assets/yoga_poses/seated_twist.png'),
    locust_pose: require('../../assets/yoga_poses/locust_pose.png'),
    bow_pose: require('../../assets/yoga_poses/bow_pose.png'),
    puppy_pose: require('../../assets/yoga_poses/puppy_pose.png'),
    eagle_arms: require('../../assets/yoga_poses/eagle_arms.png'),
    cow_face_arms: require('../../assets/yoga_poses/cow_face_arms.png'),
    reverse_prayer: require('../../assets/yoga_poses/reverse_prayer.png'),
    reclining_bound_angle: require('../../assets/yoga_poses/reclining_bound_angle.png'),

    // Step-specific images
    cat_cow_step1: require('../../assets/yoga_poses/cat_cow_step1.png'),
    cat_cow_step2: require('../../assets/yoga_poses/cat_cow_step2.png'),
    cat_cow_step3: require('../../assets/yoga_poses/cat_cow_step3.png'),
    cobra_pose_step1: require('../../assets/yoga_poses/cobra_pose_step1.png'),
    cobra_pose_step2: require('../../assets/yoga_poses/cobra_pose_step2.png'),
    cobra_pose_step3: require('../../assets/yoga_poses/cobra_pose_step3.png'),
    mountain_pose_step1: require('../../assets/yoga_poses/mountain_pose_step1.png'),
    mountain_pose_step2: require('../../assets/yoga_poses/mountain_pose_step2.png'),
    mountain_pose_step3: require('../../assets/yoga_poses/mountain_pose_step3.png'),
    sphinx_pose_step2: require('../../assets/yoga_poses/sphinx_pose_step2.png'),
};

// ═══════════════════════════════════════════════════════════════════════════
// FOCUS AREAS (Categories) - Redesigned with clearer descriptions
// ═══════════════════════════════════════════════════════════════════════════

export const YOGA_FOCUS_AREAS: YogaCategory[] = [
    {
        id: 'posture',
        title: 'Posture Correction',
        subtitle: 'Stand tall, feel confident',
        description: 'Fix rounded shoulders, forward head, and hunched back with targeted exercises that strengthen your postural muscles and increase spinal awareness.',
        icon: 'human-queue',
        color: '#4ECDC4',
        gradient: ['#E0F7F6', '#B2DFDB'],
        exerciseCount: 20,
    },
    {
        id: 'back_pain',
        title: 'Back Pain Relief',
        subtitle: 'Soothe & strengthen your spine',
        description: 'Gentle stretches and strengthening exercises to relieve lower back tension, decompress the spine, and build core stability for long-term relief.',
        icon: 'human-handsdown',
        color: '#FF6B6B',
        gradient: ['#FFEBEE', '#FFCDD2'],
        exerciseCount: 20,
    },
    {
        id: 'knee',
        title: 'Knee Care',
        subtitle: 'Protect & strengthen your knees',
        description: 'Build strength in the muscles that support your knees while improving flexibility in the surrounding areas for better joint health and pain prevention.',
        icon: 'run',
        color: '#45B7D1',
        gradient: ['#E1F5FE', '#B3E5FC'],
        exerciseCount: 20,
    },
    {
        id: 'shoulder',
        title: 'Shoulder Mobility',
        subtitle: 'Unlock stiff shoulders',
        description: 'Release tension, improve range of motion, and strengthen the rotator cuff muscles with targeted shoulder exercises for desk workers and athletes alike.',
        icon: 'arm-flex',
        color: '#96CEB4',
        gradient: ['#E8F5E9', '#C8E6C9'],
        exerciseCount: 20,
    },
    {
        id: 'full_body',
        title: 'Full Body Flow',
        subtitle: 'Energize every muscle',
        description: 'Dynamic sequences that work your entire body, building strength, flexibility, and coordination while boosting energy and mental focus.',
        icon: 'yoga',
        color: '#DDA0DD',
        gradient: ['#F3E5F5', '#E1BEE7'],
        exerciseCount: 20,
    },
    {
        id: 'relaxation',
        title: 'Stress & Relaxation',
        subtitle: 'Calm your mind & body',
        description: 'Restorative poses and breathing exercises designed to activate your parasympathetic nervous system, reduce cortisol, and promote deep relaxation.',
        icon: 'leaf',
        color: '#98D8C8',
        gradient: ['#E0F2F1', '#B2DFDB'],
        exerciseCount: 20,
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helper function to create exercise entries
// ═══════════════════════════════════════════════════════════════════════════

const createExercise = (
    id: string,
    name: string,
    sanskrit: string,
    category: string,
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels',
    duration: number,
    image: any,
    benefits: string[],
    cues: string[]
): YogaPose => ({
    id,
    name,
    sanskrit_name: sanskrit,
    category,
    difficulty,
    duration_minutes: duration,
    hero_image: image,
    benefits,
    mistakes: ['Holding breath', 'Forcing the stretch'],
    modifications: ['Use props as needed', 'Reduce range of motion'],
    instructor_cues: cues,
    steps: [
        { id: 1, title: 'Setup', instruction: 'Get into position mindfully.', image_url: image },
        { id: 2, title: 'Hold', instruction: 'Breathe deeply and maintain the pose.', image_url: image },
        { id: 3, title: 'Release', instruction: 'Slowly come out of the pose.', image_url: image },
    ],
});

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISES DATABASE - 20+ exercises per category
// ═══════════════════════════════════════════════════════════════════════════

export const YOGA_EXERCISES: Record<string, YogaPose> = {
    // ═══════════════ POSTURE CORRECTION (20 exercises) ═══════════════
    'mountain_pose': {
        ...createExercise('mountain_pose', 'Mountain Pose', 'Tadasana', 'Posture Correction', 'Beginner', 3, IMAGES.mountain_pose_step2, ['Improves alignment', 'Builds body awareness'], ['Ground through all four corners of feet', 'Stack joints vertically']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Stand with feet together or hip-width apart. Arms relaxed by your sides.', image_url: IMAGES.mountain_pose_step1 },
            { id: 2, title: 'Hold', instruction: 'Press down through your feet, engage quads, and lengthen your spine.', image_url: IMAGES.mountain_pose_step2 },
            { id: 3, title: 'Release', instruction: 'Soften your stance, roll your shoulders back, and breathe deeply.', image_url: IMAGES.mountain_pose_step3 },
        ]
    },
    'wall_angel': createExercise('wall_angel', 'Wall Angel', 'Wall Stretch', 'Posture Correction', 'Beginner', 3, IMAGES.mountain_pose, ['Opens chest', 'Strengthens upper back'], ['Keep entire spine against wall', 'Move arms slowly']),
    'cat_cow_posture': {
        ...createExercise('cat_cow_posture', 'Cat-Cow Flow', 'Marjaryasana-Bitilasana', 'Posture Correction', 'Beginner', 4, IMAGES.cat_cow, ['Increases spinal mobility', 'Warms up the back'], ['Move with your breath', 'Initiate from the pelvis']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Start on all fours, wrists under shoulders, knees under hips. Keep spine neutral.', image_url: IMAGES.cat_cow_step1 },
            { id: 2, title: 'Cow Pose', instruction: 'Inhale, drop your belly, lift your chin and chest, and gaze up.', image_url: IMAGES.cat_cow_step2 },
            { id: 3, title: 'Cat Pose', instruction: 'Exhale, round your spine toward the ceiling, tucking your chin to your chest.', image_url: IMAGES.cat_cow_step3 },
        ]
    },
    'cobra_pose': {
        ...createExercise('cobra_pose', 'Cobra Pose', 'Bhujangasana', 'Posture Correction', 'Beginner', 3, IMAGES.cobra_pose, ['Strengthens back extensors', 'Opens chest'], ['Keep elbows slightly bent', 'Draw shoulders back']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Lie on your stomach with legs extended and hands under shoulders.', image_url: IMAGES.cobra_pose_step1 },
            { id: 2, title: 'Lift', instruction: 'Inhale and gently lift your chest off the floor, keeping elbows close to ribs.', image_url: IMAGES.cobra_pose_step2 },
            { id: 3, title: 'Release', instruction: 'Exhale and slowly lower your chest and forehead back to the mat.', image_url: IMAGES.cobra_pose_step3 },
        ]
    },
    'sphinx_posture': {
        ...createExercise('sphinx_posture', 'Sphinx Pose', 'Salamba Bhujangasana', 'Posture Correction', 'Beginner', 4, IMAGES.sphinx_pose_step2, ['Gentle backbend', 'Lengthens spine'], ['Keep forearms parallel', 'Relax your glutes']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Lie on your stomach, legs extended. Place elbows under shoulders.', image_url: IMAGES.sphinx_pose }, // Fallback to generic while quota resets
            { id: 2, title: 'Lift', instruction: 'Press into forearms to lift chest. Keep neck long and look forward.', image_url: IMAGES.sphinx_pose_step2 },
            { id: 3, title: 'Release', instruction: 'Lower your chest down, stack hands, and rest forehead on them.', image_url: IMAGES.sphinx_pose }, // Fallback to generic
        ]
    },
    'chest_opener_seated': createExercise('chest_opener_seated', 'Seated Chest Opener', 'Seated Expansion', 'Posture Correction', 'Beginner', 3, IMAGES.seated_chest_opener, ['Opens tight pectorals', 'Improves breathing'], ['Interlace fingers behind back', 'Lift chest high']),
    'reverse_prayer_pose': createExercise('reverse_prayer_pose', 'Reverse Prayer', 'Pashchima Namaskarasana', 'Posture Correction', 'Intermediate', 3, IMAGES.reverse_prayer, ['Deep shoulder opener', 'Improves posture'], ['Start with fingers pointing down', 'Work slowly']),
    'standing_side_bend': createExercise('standing_side_bend', 'Standing Side Bend', 'Parsva Tadasana', 'Posture Correction', 'Beginner', 3, IMAGES.triangle_pose, ['Stretches side body', 'Opens intercostals'], ['Keep both feet grounded', 'Reach actively']),
    'thread_needle_posture': createExercise('thread_needle_posture', 'Thread the Needle', 'Parsva Balasana', 'Posture Correction', 'Beginner', 4, IMAGES.thread_needle, ['Releases upper back', 'Rotates thoracic spine'], ['Slide arm through completely', 'Keep hips stacked']),
    'warrior_one_posture': createExercise('warrior_one_posture', 'Warrior I', 'Virabhadrasana I', 'Posture Correction', 'Beginner', 4, IMAGES.warrior_one, ['Strengthens legs and core', 'Opens hip flexors'], ['Square hips forward', 'Reach arms high']),
    'triangle_posture': createExercise('triangle_posture', 'Triangle Pose', 'Trikonasana', 'Posture Correction', 'Beginner', 4, IMAGES.triangle_pose, ['Stretches entire side body', 'Builds leg strength'], ['Keep legs straight', 'Stack shoulders']),
    'extended_side_posture': createExercise('extended_side_posture', 'Extended Side Angle', 'Utthita Parsvakonasana', 'Posture Correction', 'Intermediate', 4, IMAGES.extended_side_angle, ['Deep lateral stretch', 'Builds stamina'], ['Front knee over ankle', 'Reach through fingertips']),
    'half_moon_posture': createExercise('half_moon_posture', 'Half Moon Pose', 'Ardha Chandrasana', 'Posture Correction', 'Intermediate', 4, IMAGES.half_moon, ['Improves balance', 'Strengthens legs'], ['Stack hips', 'Use a block if needed']),
    'eagle_arms_posture': createExercise('eagle_arms_posture', 'Eagle Arms', 'Garudasana Arms', 'Posture Correction', 'Beginner', 3, IMAGES.eagle_arms, ['Stretches between shoulder blades', 'Opens upper back'], ['Wrap arms tightly', 'Lift elbows']),
    'cow_face_posture': createExercise('cow_face_posture', 'Cow Face Arms', 'Gomukhasana Arms', 'Posture Correction', 'Intermediate', 3, IMAGES.cow_face_arms, ['Deep shoulder stretch', 'Improves flexibility'], ['Use a strap if needed', 'Keep spine tall']),
    'seated_twist_posture': createExercise('seated_twist_posture', 'Seated Spinal Twist', 'Ardha Matsyendrasana', 'Posture Correction', 'Beginner', 4, IMAGES.seated_twist, ['Rotates spine', 'Massages organs'], ['Twist from the waist', 'Keep spine long']),
    'puppy_pose_posture': createExercise('puppy_pose_posture', 'Puppy Pose', 'Uttana Shishosana', 'Posture Correction', 'Beginner', 4, IMAGES.puppy_pose, ['Opens shoulders', 'Stretches upper back'], ['Keep hips over knees', 'Melt chest down']),
    'forward_fold_posture': createExercise('forward_fold_posture', 'Standing Forward Fold', 'Uttanasana', 'Posture Correction', 'Beginner', 3, IMAGES.standing_forward_fold, ['Lengthens hamstrings', 'Relaxes spine'], ['Bend knees if needed', 'Let head hang heavy']),
    'tree_pose_posture': createExercise('tree_pose_posture', 'Tree Pose', 'Vrksasana', 'Posture Correction', 'Beginner', 3, IMAGES.tree_pose, ['Improves balance', 'Strengthens standing leg'], ['Avoid placing foot on knee', 'Find a focal point']),
    'chair_pose_posture': createExercise('chair_pose_posture', 'Chair Pose', 'Utkatasana', 'Posture Correction', 'Beginner', 3, IMAGES.chair_pose, ['Strengthens legs', 'Builds core stability'], ['Keep weight in heels', 'Reach arms up']),

    // ═══════════════ BACK PAIN RELIEF (20 exercises) ═══════════════
    'cat_cow_back': {
        ...createExercise('cat_cow_back', 'Cat-Cow Flow', 'Marjaryasana-Bitilasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.cat_cow, ['Mobilizes spine', 'Releases tension'], ['Sync movement with breath', 'Move slowly']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Start on all fours, wrists under shoulders, knees under hips. Keep spine neutral.', image_url: IMAGES.cat_cow_step1 },
            { id: 2, title: 'Cow Pose', instruction: 'Inhale, drop your belly, lift your chin and chest, and gaze up.', image_url: IMAGES.cat_cow_step2 },
            { id: 3, title: 'Cat Pose', instruction: 'Exhale, round your spine toward the ceiling, tucking your chin to your chest.', image_url: IMAGES.cat_cow_step3 },
        ]
    },
    'childs_pose_back': createExercise('childs_pose_back', 'Child\'s Pose', 'Balasana', 'Back Pain Relief', 'Beginner', 5, IMAGES.childs_pose_wide, ['Decompresses spine', 'Calms nervous system'], ['Sink hips back', 'Breathe into back']),
    'sphinx_back': createExercise('sphinx_back', 'Sphinx Pose', 'Salamba Bhujangasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.sphinx_pose, ['Gentle extension', 'Strengthens lower back'], ['Keep forearms grounded', 'Lengthen tailbone']),
    'cobra_back': {
        ...createExercise('cobra_back', 'Baby Cobra', 'Bhujangasana', 'Back Pain Relief', 'Beginner', 3, IMAGES.cobra_pose, ['Builds back strength', 'Opens chest'], ['Keep low, gentle lift', 'Use back muscles not arms']),
        steps: [
            { id: 1, title: 'Setup', instruction: 'Lie on your stomach with legs extended and hands under shoulders.', image_url: IMAGES.cobra_pose_step1 },
            { id: 2, title: 'Lift', instruction: 'Inhale and gently lift your chest off the floor, keeping elbows close to ribs.', image_url: IMAGES.cobra_pose_step2 },
            { id: 3, title: 'Release', instruction: 'Exhale and slowly lower your chest and forehead back to the mat.', image_url: IMAGES.cobra_pose_step3 },
        ]
    },
    'supine_twist_back': createExercise('supine_twist_back', 'Supine Twist', 'Supta Matsyendrasana', 'Back Pain Relief', 'Beginner', 5, IMAGES.supine_twist, ['Releases lower back', 'Aids digestion'], ['Keep both shoulders down', 'Let gravity do the work']),
    'bridge_back': createExercise('bridge_back', 'Bridge Pose', 'Setu Bandhasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.bridge_flow, ['Strengthens glutes', 'Opens hip flexors'], ['Press through heels', 'Keep knees parallel']),
    'knee_to_chest_back': createExercise('knee_to_chest_back', 'Knee to Chest', 'Apanasana', 'Back Pain Relief', 'Beginner', 3, IMAGES.reclining_bound_angle, ['Releases lower back', 'Massages organs'], ['Hug knees gently', 'Rock side to side']),
    'pigeon_back': createExercise('pigeon_back', 'Pigeon Pose', 'Eka Pada Rajakapotasana', 'Back Pain Relief', 'Intermediate', 5, IMAGES.pigeon_pose, ['Opens hips', 'Releases piriformis'], ['Keep hips square', 'Use props as needed']),
    'locust_back': createExercise('locust_back', 'Locust Pose', 'Salabhasana', 'Back Pain Relief', 'Intermediate', 3, IMAGES.locust_pose, ['Strengthens entire back', 'Builds endurance'], ['Lift from back muscles', 'Keep neck neutral']),
    'bow_back': createExercise('bow_back', 'Bow Pose', 'Dhanurasana', 'Back Pain Relief', 'Intermediate', 3, IMAGES.bow_pose, ['Deep backbend', 'Opens front body'], ['Kick into hands', 'Keep knees hip-width']),
    'downdog_back': createExercise('downdog_back', 'Downward Dog', 'Adho Mukha Svanasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.downward_dog, ['Lengthens spine', 'Stretches hamstrings'], ['Push hips up and back', 'Bend knees if needed']),
    'thread_needle_back': createExercise('thread_needle_back', 'Thread the Needle', 'Parsva Balasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.thread_needle, ['Rotates thoracic spine', 'Releases tension'], ['Keep hips stable', 'Breathe into upper back']),
    'forward_fold_back': createExercise('forward_fold_back', 'Standing Forward Fold', 'Uttanasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.standing_forward_fold, ['Decompresses spine', 'Stretches back chain'], ['Bend knees generously', 'Ragdoll arms']),
    'seated_forward_back': createExercise('seated_forward_back', 'Seated Forward Fold', 'Paschimottanasana', 'Back Pain Relief', 'Beginner', 5, IMAGES.standing_forward_fold, ['Stretches entire back', 'Calms mind'], ['Hinge from hips', 'Keep spine long']),
    'puppy_back': createExercise('puppy_back', 'Puppy Pose', 'Uttana Shishosana', 'Back Pain Relief', 'Beginner', 4, IMAGES.puppy_pose, ['Stretches spine', 'Opens shoulders'], ['Walk hands forward', 'Relax forehead down']),
    'happy_baby_back': createExercise('happy_baby_back', 'Happy Baby', 'Ananda Balasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.reclining_bound_angle, ['Releases sacrum', 'Opens hips'], ['Hold outer feet', 'Rock gently']),
    'legs_wall_back': createExercise('legs_wall_back', 'Legs Up the Wall', 'Viparita Karani', 'Back Pain Relief', 'Beginner', 10, IMAGES.legs_up_wall, ['Decompresses lower back', 'Improves circulation'], ['Scoot close to wall', 'Relax completely']),
    'reclined_twist_back': createExercise('reclined_twist_back', 'Reclined Eagle Twist', 'Supta Garudasana', 'Back Pain Relief', 'Beginner', 4, IMAGES.supine_twist, ['Deep spinal rotation', 'Stretches outer hip'], ['Cross legs like eagle', 'Drop to one side']),
    'half_lord_fishes': createExercise('half_lord_fishes', 'Half Lord of the Fishes', 'Ardha Matsyendrasana', 'Back Pain Relief', 'Intermediate', 4, IMAGES.seated_twist, ['Twists spine', 'Improves mobility'], ['Sit up tall', 'Twist from belly']),
    'crocodile_pose': createExercise('crocodile_pose', 'Crocodile Pose', 'Makarasana', 'Back Pain Relief', 'Beginner', 5, IMAGES.corpse_pose, ['Total back relaxation', 'Diaphragmatic breathing'], ['Lie on belly', 'Rest head on stacked hands']),

    // ═══════════════ KNEE CARE (20 exercises) ═══════════════
    'quad_stretch_knee': createExercise('quad_stretch_knee', 'Standing Quad Stretch', 'Quad Stretch', 'Knee Care', 'Beginner', 3, IMAGES.tree_pose, ['Lengthens quads', 'Reduces knee pressure'], ['Keep knees together', 'Stand tall']),
    'chair_pose_knee': createExercise('chair_pose_knee', 'Chair Pose', 'Utkatasana', 'Knee Care', 'Beginner', 3, IMAGES.chair_pose, ['Strengthens quads', 'Builds stability'], ['Keep knees behind toes', 'Press through heels']),
    'warrior_two_knee': createExercise('warrior_two_knee', 'Warrior II', 'Virabhadrasana II', 'Knee Care', 'Beginner', 4, IMAGES.warrior_2, ['Strengthens legs', 'Opens hips'], ['Align knee over ankle', 'Ground back foot']),
    'warrior_one_knee': createExercise('warrior_one_knee', 'Warrior I', 'Virabhadrasana I', 'Knee Care', 'Beginner', 4, IMAGES.warrior_one, ['Builds leg power', 'Stretches hip flexors'], ['Keep back heel down', 'Square hips']),
    'tree_knee': createExercise('tree_knee', 'Tree Pose', 'Vrksasana', 'Knee Care', 'Beginner', 3, IMAGES.tree_pose, ['Improves balance', 'Strengthens ankles'], ['Place foot below or above knee', 'Never on joint']),
    'bridge_knee': createExercise('bridge_knee', 'Bridge Pose', 'Setu Bandhasana', 'Knee Care', 'Beginner', 4, IMAGES.bridge_flow, ['Strengthens hamstrings', 'Supports knee health'], ['Keep knees hip-width', 'Press through feet']),
    'glute_bridge_knee': createExercise('glute_bridge_knee', 'Single Leg Glute Bridge', 'Eka Pada Setu', 'Knee Care', 'Intermediate', 4, IMAGES.glute_bridge_hold, ['Isolates each leg', 'Builds hip strength'], ['Keep hips level', 'Engage core']),
    'low_lunge_knee': createExercise('low_lunge_knee', 'Low Lunge', 'Anjaneyasana', 'Knee Care', 'Beginner', 3, IMAGES.warrior_one, ['Opens hip flexors', 'Takes pressure off knees'], ['Pad back knee', 'Keep front knee stacked']),
    'half_moon_knee': createExercise('half_moon_knee', 'Half Moon', 'Ardha Chandrasana', 'Knee Care', 'Intermediate', 4, IMAGES.half_moon, ['Strengthens standing leg', 'Improves balance'], ['Use block for support', 'Stack hips']),
    'triangle_knee': createExercise('triangle_knee', 'Triangle Pose', 'Trikonasana', 'Knee Care', 'Beginner', 4, IMAGES.triangle_pose, ['Strengthens entire leg', 'Safe for knees'], ['Keep legs straight but soft', 'Micro-bend if needed']),
    'reclined_hand_toe': createExercise('reclined_hand_toe', 'Reclined Hand to Toe', 'Supta Padangusthasana', 'Knee Care', 'Beginner', 4, IMAGES.reclining_bound_angle, ['Stretches hamstrings', 'Protects knee joint'], ['Use a strap', 'Keep bottom leg grounded']),
    'bound_angle_knee': createExercise('bound_angle_knee', 'Bound Angle Pose', 'Baddha Konasana', 'Knee Care', 'Beginner', 4, IMAGES.reclining_bound_angle, ['Opens hips', 'Gentle inner thigh stretch'], ['Let knees fall naturally', 'Never force']),
    'forward_fold_knee': createExercise('forward_fold_knee', 'Forward Fold with Bent Knees', 'Uttanasana Variation', 'Knee Care', 'Beginner', 3, IMAGES.standing_forward_fold, ['Protects knees', 'Releases hamstrings'], ['Keep knees soft', 'Focus on spine']),
    'squat_knee': createExercise('squat_knee', 'Yogic Squat', 'Malasana', 'Knee Care', 'Beginner', 4, IMAGES.chair_pose, ['Opens hips', 'Strengthens ankles'], ['Keep heels down', 'Press elbows to knees']),
    'standing_split_prep': createExercise('standing_split_prep', 'Standing Split Prep', 'Urdhva Prasarita Eka Padasana', 'Knee Care', 'Intermediate', 3, IMAGES.half_moon, ['Builds balance', 'Strengthens leg'], ['Keep standing leg bent', 'Use blocks']),
    'extended_side_knee': createExercise('extended_side_knee', 'Extended Side Angle', 'Utthita Parsvakonasana', 'Knee Care', 'Intermediate', 4, IMAGES.extended_side_angle, ['Strengthens front leg', 'Opens hips'], ['Front knee tracks over ankle', 'Push into back foot']),
    'gate_knee': createExercise('gate_knee', 'Gate Pose', 'Parighasana', 'Knee Care', 'Beginner', 3, IMAGES.triangle_pose, ['Side body stretch', 'Gentle on knees'], ['Pad kneeling leg', 'Keep hips forward']),
    'hero_pose_knee': createExercise('hero_pose_knee', 'Hero Pose with Props', 'Virasana', 'Knee Care', 'Beginner', 5, IMAGES.eagle_arms, ['Stretches quads', 'Improves knee flexibility'], ['Sit on block', 'Never force']),
    'side_lunge_knee': createExercise('side_lunge_knee', 'Side Lunge', 'Skandasana', 'Knee Care', 'Intermediate', 4, IMAGES.extended_side_angle, ['Opens adductors', 'Strengthens legs'], ['Keep bent knee tracking', 'Use hands for balance']),
    'mountain_knee': createExercise('mountain_knee', 'Mountain Pose', 'Tadasana', 'Knee Care', 'Beginner', 3, IMAGES.mountain_pose, ['Builds leg alignment', 'Knee awareness'], ['Micro-bend knees', 'Engage quads']),

    // ═══════════════ SHOULDER MOBILITY (20 exercises) ═══════════════
    'eagle_arms_shoulder': createExercise('eagle_arms_shoulder', 'Eagle Arms', 'Garudasana Arms', 'Shoulder Mobility', 'Beginner', 3, IMAGES.eagle_arms, ['Stretches between shoulders', 'Opens upper back'], ['Wrap arms tightly', 'Lift elbows']),
    'cow_face_shoulder': createExercise('cow_face_shoulder', 'Cow Face Arms', 'Gomukhasana Arms', 'Shoulder Mobility', 'Intermediate', 4, IMAGES.cow_face_arms, ['Deep shoulder stretch', 'Improves flexibility'], ['Use strap if needed', 'Keep chest lifted']),
    'reverse_prayer_shoulder': createExercise('reverse_prayer_shoulder', 'Reverse Prayer', 'Pashchima Namaskarasana', 'Shoulder Mobility', 'Intermediate', 3, IMAGES.reverse_prayer, ['Opens chest', 'Stretches wrists'], ['Work incrementally', 'Keep shoulders down']),
    'thread_needle_shoulder': createExercise('thread_needle_shoulder', 'Thread the Needle', 'Parsva Balasana', 'Shoulder Mobility', 'Beginner', 4, IMAGES.thread_needle, ['Rotates shoulder', 'Releases tension'], ['Reach through fully', 'Breathe deeply']),
    'puppy_shoulder': createExercise('puppy_shoulder', 'Puppy Pose', 'Uttana Shishosana', 'Shoulder Mobility', 'Beginner', 5, IMAGES.puppy_pose, ['Opens shoulders', 'Stretches lats'], ['Melt chest toward floor', 'Keep arms active']),
    'downdog_shoulder': createExercise('downdog_shoulder', 'Downward Dog', 'Adho Mukha Svanasana', 'Shoulder Mobility', 'Beginner', 4, IMAGES.downward_dog, ['Full shoulder stretch', 'Builds strength'], ['Rotate upper arms outward', 'Press through hands']),
    'dolphin_shoulder': createExercise('dolphin_shoulder', 'Dolphin Pose', 'Ardha Pincha Mayurasana', 'Shoulder Mobility', 'Intermediate', 4, IMAGES.downward_dog, ['Strengthens shoulders', 'Prepares for inversions'], ['Keep forearms parallel', 'Walk feet in']),
    'chest_opener_shoulder': createExercise('chest_opener_shoulder', 'Seated Chest Opener', 'Seated Expansion', 'Shoulder Mobility', 'Beginner', 3, IMAGES.seated_chest_opener, ['Opens front shoulders', 'Improves posture'], ['Clasp hands behind', 'Lift chest']),
    'side_stretch_shoulder': createExercise('side_stretch_shoulder', 'Seated Side Stretch', 'Parsva Sukhasana', 'Shoulder Mobility', 'Beginner', 3, IMAGES.eagle_arms, ['Stretches side body', 'Opens shoulder'], ['Ground opposite hip', 'Reach actively']),
    'neck_release_shoulder': createExercise('neck_release_shoulder', 'Neck Releases', 'Griva Sanchalana', 'Shoulder Mobility', 'Beginner', 4, IMAGES.neck_stretches, ['Releases neck tension', 'Complements shoulder work'], ['Move slowly', 'Never force']),
    'arm_circles_shoulder': createExercise('arm_circles_shoulder', 'Dynamic Arm Circles', 'Arm Mobilization', 'Shoulder Mobility', 'Beginner', 3, IMAGES.mountain_pose, ['Warms up shoulders', 'Increases circulation'], ['Start small, go bigger', 'Both directions']),
    'warrior_two_arms': createExercise('warrior_two_arms', 'Warrior II Arms', 'Virabhadrasana II', 'Shoulder Mobility', 'Beginner', 4, IMAGES.warrior_2, ['Builds shoulder endurance', 'Opens chest'], ['Keep arms at shoulder height', 'Relax shoulders down']),
    'extended_arms_shoulder': createExercise('extended_arms_shoulder', 'Extended Side Angle Arms', 'Utthita Parsvakonasana', 'Shoulder Mobility', 'Intermediate', 4, IMAGES.extended_side_angle, ['Full shoulder extension', 'Side body stretch'], ['Reach through top arm', 'Stack shoulders']),
    'half_moon_arms': createExercise('half_moon_arms', 'Half Moon Arms', 'Ardha Chandrasana', 'Shoulder Mobility', 'Intermediate', 4, IMAGES.half_moon, ['Challenges shoulder reach', 'Builds stability'], ['Extend through both arms', 'Use block for balance']),
    'cat_cow_shoulder': createExercise('cat_cow_shoulder', 'Cat-Cow for Shoulders', 'Shoulder Focus', 'Shoulder Mobility', 'Beginner', 4, IMAGES.cat_cow, ['Mobilizes shoulder blades', 'Warms up upper back'], ['Emphasize scapula movement', 'Breathe fully']),
    'sphinx_shoulder': createExercise('sphinx_shoulder', 'Sphinx Pose', 'Salamba Bhujangasana', 'Shoulder Mobility', 'Beginner', 4, IMAGES.sphinx_pose, ['Gentle shoulder engagement', 'Opens chest'], ['Keep elbows under shoulders', 'Relax shoulders']),
    'cobra_shoulder': createExercise('cobra_shoulder', 'Cobra Arms', 'Bhujangasana', 'Shoulder Mobility', 'Beginner', 3, IMAGES.cobra_pose, ['Strengthens rear shoulders', 'Opens chest'], ['Lift without pushing', 'Squeeze shoulder blades']),
    'bow_shoulder': createExercise('bow_shoulder', 'Bow Pose', 'Dhanurasana', 'Shoulder Mobility', 'Intermediate', 3, IMAGES.bow_pose, ['Deep shoulder stretch', 'Opens front body'], ['Kick into hands', 'Broaden chest']),
    'locust_arms': createExercise('locust_arms', 'Locust with Arms Back', 'Salabhasana', 'Shoulder Mobility', 'Intermediate', 3, IMAGES.locust_pose, ['Strengthens back shoulders', 'Opens chest'], ['Interlace hands behind back', 'Lift arms high']),
    'bridge_shoulder': createExercise('bridge_shoulder', 'Bridge with Clasp', 'Setu Bandhasana', 'Shoulder Mobility', 'Beginner', 4, IMAGES.bridge_flow, ['Opens front shoulders', 'Strengthens upper back'], ['Clasp hands under back', 'Roll shoulders under']),

    // ═══════════════ FULL BODY FLOW (20 exercises) ═══════════════
    'sun_salutation_a': createExercise('sun_salutation_a', 'Sun Salutation A', 'Surya Namaskar A', 'Full Body Flow', 'All Levels', 8, IMAGES.warrior_one, ['Full body warm-up', 'Builds heat'], ['Link breath to movement', 'Flow smoothly']),
    'warrior_one_flow': createExercise('warrior_one_flow', 'Warrior I Flow', 'Virabhadrasana I', 'Full Body Flow', 'Beginner', 4, IMAGES.warrior_one, ['Strengthens legs', 'Opens hips'], ['Ground through back heel', 'Reach up']),
    'warrior_two_flow': createExercise('warrior_two_flow', 'Warrior II Flow', 'Virabhadrasana II', 'Full Body Flow', 'Beginner', 4, IMAGES.warrior_2, ['Builds stamina', 'Opens hips'], ['Gaze over front hand', 'Strong back leg']),
    'triangle_flow': createExercise('triangle_flow', 'Triangle Flow', 'Trikonasana', 'Full Body Flow', 'Beginner', 4, IMAGES.triangle_pose, ['Full side body stretch', 'Strengthens legs'], ['Revolve from hip', 'Keep chest open']),
    'extended_side_flow': createExercise('extended_side_flow', 'Extended Side Angle', 'Utthita Parsvakonasana', 'Full Body Flow', 'Intermediate', 4, IMAGES.extended_side_angle, ['Deep hip opener', 'Side body stretch'], ['Elbow to knee or hand to floor', 'Reach overhead']),
    'half_moon_flow': createExercise('half_moon_flow', 'Half Moon Flow', 'Ardha Chandrasana', 'Full Body Flow', 'Intermediate', 4, IMAGES.half_moon, ['Balance challenge', 'Full body engagement'], ['Stack hips', 'Reach in both directions']),
    'chair_flow': createExercise('chair_flow', 'Chair Pose', 'Utkatasana', 'Full Body Flow', 'Beginner', 3, IMAGES.chair_pose, ['Builds leg strength', 'Core engagement'], ['Sit back like in a chair', 'Arms up or forward']),
    'tree_flow': createExercise('tree_flow', 'Tree Pose', 'Vrksasana', 'Full Body Flow', 'Beginner', 3, IMAGES.tree_pose, ['Balance and focus', 'Hip opener'], ['Root through standing foot', 'Find drishti']),
    'downdog_flow': createExercise('downdog_flow', 'Downward Dog', 'Adho Mukha Svanasana', 'Full Body Flow', 'Beginner', 4, IMAGES.downward_dog, ['Full body stretch', 'Builds upper body strength'], ['Spread fingers wide', 'Pedal feet']),
    'plank_flow': createExercise('plank_flow', 'Plank Hold', 'Phalakasana', 'Full Body Flow', 'Beginner', 2, IMAGES.locust_pose, ['Core strength', 'Full body engagement'], ['Keep hips in line', 'Engage everything']),
    'cobra_flow': createExercise('cobra_flow', 'Cobra Flow', 'Bhujangasana', 'Full Body Flow', 'Beginner', 3, IMAGES.cobra_pose, ['Backbend', 'Chest opener'], ['Use back muscles to lift', 'Keep elbows bent']),
    'bridge_flow': createExercise('bridge_flow', 'Bridge Flow', 'Setu Bandhasana', 'Full Body Flow', 'Beginner', 4, IMAGES.bridge_flow, ['Hip opener', 'Back strengthener'], ['Press through feet', 'Lift hips high']),
    'pigeon_flow': createExercise('pigeon_flow', 'Pigeon Pose', 'Eka Pada Rajakapotasana', 'Full Body Flow', 'Intermediate', 5, IMAGES.pigeon_pose, ['Deep hip release', 'Emotional release'], ['Square hips', 'Fold forward if comfortable']),
    'seated_twist_flow': createExercise('seated_twist_flow', 'Seated Twist', 'Ardha Matsyendrasana', 'Full Body Flow', 'Beginner', 4, IMAGES.seated_twist, ['Spinal rotation', 'Digestive aid'], ['Lengthen then twist', 'Look over back shoulder']),
    'forward_fold_flow': createExercise('forward_fold_flow', 'Standing Forward Fold', 'Uttanasana', 'Full Body Flow', 'Beginner', 3, IMAGES.standing_forward_fold, ['Stretches back body', 'Calms mind'], ['Fold from hips', 'Relax head']),
    'locust_flow': createExercise('locust_flow', 'Locust Pose', 'Salabhasana', 'Full Body Flow', 'Intermediate', 3, IMAGES.locust_pose, ['Back strengthener', 'Full posterior chain'], ['Lift everything', 'Gaze down']),
    'bow_flow': createExercise('bow_flow', 'Bow Pose', 'Dhanurasana', 'Full Body Flow', 'Intermediate', 3, IMAGES.bow_pose, ['Deep backbend', 'Opens front body'], ['Kick into hands', 'Rock if you like']),
    'cat_cow_flow': createExercise('cat_cow_flow', 'Cat-Cow Flow', 'Marjaryasana-Bitilasana', 'Full Body Flow', 'Beginner', 4, IMAGES.cat_cow, ['Spinal mobility', 'Warm-up'], ['Sync with breath', 'Flow continuously']),
    'childs_pose_flow': createExercise('childs_pose_flow', 'Child\'s Pose', 'Balasana', 'Full Body Flow', 'Beginner', 4, IMAGES.childs_pose_wide, ['Rest and reset', 'Gentle stretch'], ['Knees wide or together', 'Arms forward or back']),
    'supine_twist_flow': createExercise('supine_twist_flow', 'Supine Twist', 'Supta Matsyendrasana', 'Full Body Flow', 'Beginner', 5, IMAGES.supine_twist, ['Spinal release', 'Relaxation'], ['Let gravity work', 'Breathe deeply']),

    // ═══════════════ STRESS & RELAXATION (20 exercises) ═══════════════
    'childs_pose_relax': createExercise('childs_pose_relax', 'Child\'s Pose', 'Balasana', 'Stress & Relaxation', 'Beginner', 5, IMAGES.childs_pose_wide, ['Ultimate relaxation', 'Calms nervous system'], ['Sink into the pose', 'Breathe into back']),
    'corpse_pose_relax': createExercise('corpse_pose_relax', 'Corpse Pose', 'Savasana', 'Stress & Relaxation', 'Beginner', 10, IMAGES.corpse_pose, ['Total body relaxation', 'Meditation prep'], ['Scan and release', 'Let go completely']),
    'legs_wall_relax': createExercise('legs_wall_relax', 'Legs Up the Wall', 'Viparita Karani', 'Stress & Relaxation', 'Beginner', 10, IMAGES.legs_up_wall, ['Reverses blood flow', 'Deep relaxation'], ['Scoot close to wall', 'Stay as long as comfortable']),
    'reclined_bound_relax': createExercise('reclined_bound_relax', 'Reclined Bound Angle', 'Supta Baddha Konasana', 'Stress & Relaxation', 'Beginner', 8, IMAGES.reclining_bound_angle, ['Opens hips passively', 'Deeply relaxing'], ['Support knees with blocks', 'Let gravity work']),
    'supine_twist_relax': createExercise('supine_twist_relax', 'Gentle Supine Twist', 'Supta Matsyendrasana', 'Stress & Relaxation', 'Beginner', 5, IMAGES.supine_twist, ['Releases spine', 'Calms mind'], ['Let knees fall', 'Extend opposite arm']),
    'forward_fold_relax': createExercise('forward_fold_relax', 'Standing Forward Fold', 'Uttanasana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.standing_forward_fold, ['Calms busy mind', 'Releases tension'], ['Bend knees', 'Hang like ragdoll']),
    'supported_fish_relax': createExercise('supported_fish_relax', 'Supported Fish', 'Matsyasana', 'Stress & Relaxation', 'Beginner', 5, IMAGES.reclining_bound_angle, ['Opens heart center', 'Deep breathing'], ['Use props under back', 'Arms open wide']),
    'happy_baby_relax': createExercise('happy_baby_relax', 'Happy Baby', 'Ananda Balasana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.reclining_bound_angle, ['Releases lower back', 'Playful relaxation'], ['Hold outer feet', 'Rock gently']),
    'pigeon_relax': createExercise('pigeon_relax', 'Sleeping Pigeon', 'Eka Pada Rajakapotasana', 'Stress & Relaxation', 'Intermediate', 5, IMAGES.pigeon_pose, ['Deep hip release', 'Emotional release'], ['Fold forward', 'Let go of tension']),
    'cat_cow_relax': createExercise('cat_cow_relax', 'Slow Cat-Cow', 'Marjaryasana-Bitilasana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.cat_cow, ['Gentle spinal movement', 'Stress release'], ['Move very slowly', 'Focus on breath']),
    'neck_release_relax': createExercise('neck_release_relax', 'Neck Releases', 'Griva Sanchalana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.neck_stretches, ['Releases neck tension', 'Relieves headaches'], ['Very gentle movements', 'Close eyes']),
    'seated_meditation': createExercise('seated_meditation', 'Seated Meditation', 'Sukhasana', 'Stress & Relaxation', 'Beginner', 10, IMAGES.eagle_arms, ['Calms mind', 'Reduces anxiety'], ['Focus on breath', 'Let thoughts pass']),
    'crocodile_relax': createExercise('crocodile_relax', 'Crocodile Pose', 'Makarasana', 'Stress & Relaxation', 'Beginner', 5, IMAGES.corpse_pose, ['Rests entire body', 'Diaphragmatic breathing'], ['Lie on belly', 'Stack hands under forehead']),
    'extended_puppy_relax': createExercise('extended_puppy_relax', 'Extended Puppy Pose', 'Uttana Shishosana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.puppy_pose, ['Opens heart', 'Calms mind'], ['Melt chest down', 'Breathe into back']),
    'wide_child_relax': createExercise('wide_child_relax', 'Wide-Legged Child\'s Pose', 'Balasana Variation', 'Stress & Relaxation', 'Beginner', 5, IMAGES.childs_pose_wide, ['Opens hips', 'Full surrender'], ['Knees wide', 'Arms forward']),
    'thread_needle_relax': createExercise('thread_needle_relax', 'Gentle Thread the Needle', 'Parsva Balasana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.thread_needle, ['Releases shoulders', 'Calms nervous system'], ['Rest on shoulder', 'Close eyes']),
    'knees_chest_relax': createExercise('knees_chest_relax', 'Knees to Chest', 'Apanasana', 'Stress & Relaxation', 'Beginner', 4, IMAGES.reclining_bound_angle, ['Massages lower back', 'Reduces anxiety'], ['Hug knees gently', 'Rock side to side']),
    'eye_yoga_relax': createExercise('eye_yoga_relax', 'Eye Relaxation', 'Eye Yoga', 'Stress & Relaxation', 'Beginner', 3, IMAGES.corpse_pose, ['Reduces eye strain', 'Relieves tension'], ['Palming, circles, focus shifts', 'Blink frequently']),
    'breath_focus_relax': createExercise('breath_focus_relax', '4-7-8 Breathing', 'Pranayama', 'Stress & Relaxation', 'Beginner', 5, IMAGES.corpse_pose, ['Activates parasympathetic', 'Reduces stress'], ['Inhale 4, hold 7, exhale 8', 'Repeat 4 cycles']),
    'body_scan_relax': createExercise('body_scan_relax', 'Body Scan Relaxation', 'Yoga Nidra Prep', 'Stress & Relaxation', 'Beginner', 10, IMAGES.corpse_pose, ['Deep relaxation', 'Body awareness'], ['Systematic tension release', 'Head to toe']),
};

// ═══════════════════════════════════════════════════════════════════════════
// ROUTINES (Curated Sequences)
// ═══════════════════════════════════════════════════════════════════════════

export const YOGA_ROUTINES: Record<string, YogaRoutine> = {
    'morning_energize': {
        id: 'morning_energize',
        name: 'Morning Energy Boost',
        subtitle: 'Wake up your body & mind',
        description: 'Start your day with this gentle yet energizing sequence.',
        benefits: ['Increases circulation', 'Wakes up muscles', 'Boosts alertness'],
        total_duration_minutes: 12,
        pose_ids: ['cat_cow_flow', 'downdog_flow', 'warrior_one_flow', 'tree_flow'],
        difficulty: 'All Levels',
        icon: 'weather-sunny',
        gradient: ['#FEF3C7', '#FDE68A'],
    },
    'stress_relief': {
        id: 'stress_relief',
        name: 'Stress Relief & Calm',
        subtitle: 'Release tension, find peace',
        description: 'Target tension areas and activate your relaxation response.',
        benefits: ['Reduces stress', 'Calms nervous system', 'Improves sleep'],
        total_duration_minutes: 18,
        pose_ids: ['neck_release_relax', 'childs_pose_relax', 'supine_twist_relax', 'legs_wall_relax', 'corpse_pose_relax'],
        difficulty: 'Beginner',
        icon: 'leaf',
        gradient: ['#E0F2F1', '#B2DFDB'],
    },
    'back_care': {
        id: 'back_care',
        name: 'Back Care Routine',
        subtitle: 'Soothe & strengthen your spine',
        description: 'Gentle stretches to relieve lower back tension.',
        benefits: ['Relieves back pain', 'Strengthens core', 'Improves mobility'],
        total_duration_minutes: 15,
        pose_ids: ['cat_cow_back', 'childs_pose_back', 'sphinx_back', 'supine_twist_back'],
        difficulty: 'Beginner',
        icon: 'human-handsdown',
        gradient: ['#FFEBEE', '#FFCDD2'],
    },
    'desk_break': {
        id: 'desk_break',
        name: 'Quick Desk Break',
        subtitle: 'Relief for office workers',
        description: 'Short sequence to counter sitting all day.',
        benefits: ['Counters desk posture', 'Relieves neck tension', 'Re-energizes'],
        total_duration_minutes: 6,
        pose_ids: ['neck_release_shoulder', 'eagle_arms_shoulder', 'forward_fold_relax'],
        difficulty: 'Beginner',
        icon: 'laptop',
        gradient: ['#E3F2FD', '#BBDEFB'],
    },
    'evening_wind_down': {
        id: 'evening_wind_down',
        name: 'Evening Wind Down',
        subtitle: 'Prepare for restful sleep',
        description: 'Slow, restorative sequence for the end of day.',
        benefits: ['Promotes sleep', 'Releases daily tension', 'Calms mind'],
        total_duration_minutes: 20,
        pose_ids: ['forward_fold_relax', 'pigeon_relax', 'supine_twist_relax', 'legs_wall_relax', 'corpse_pose_relax'],
        difficulty: 'Beginner',
        icon: 'weather-night',
        gradient: ['#EDE7F6', '#D1C4E9'],
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const getExercisesByCategory = (categoryId: string): YogaPose[] => {
    const categoryMap: Record<string, string> = {
        'posture': 'Posture Correction',
        'back_pain': 'Back Pain Relief',
        'knee': 'Knee Care',
        'shoulder': 'Shoulder Mobility',
        'full_body': 'Full Body Flow',
        'relaxation': 'Stress & Relaxation',
    };

    const categoryName = categoryMap[categoryId] || categoryId;
    return Object.values(YOGA_EXERCISES).filter(e => e.category === categoryName);
};

export const getAllFocusAreas = (): YogaCategory[] => YOGA_FOCUS_AREAS;

export const getAllRoutines = (): YogaRoutine[] => Object.values(YOGA_ROUTINES);

export const getRoutineById = (id: string): YogaRoutine | undefined => YOGA_ROUTINES[id];

export const getExerciseById = (id: string): YogaPose | undefined => YOGA_EXERCISES[id];

export const getTodayRoutine = (): YogaRoutine => {
    const hour = new Date().getHours();
    if (hour < 12) return YOGA_ROUTINES['morning_energize'];
    if (hour < 17) return YOGA_ROUTINES['desk_break'];
    return YOGA_ROUTINES['evening_wind_down'];
};
