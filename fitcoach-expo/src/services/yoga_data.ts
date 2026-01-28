/**
 * yoga_data.ts
 * Frontend Logic & Data Cache for FitCoach AI Yoga Module
 * All exercises use varied step images from our high-resolution library
 */

export const YOGA_THEME = {
    colors: {
        background: '#FFFFFF',
        surface: '#F8F9FA',
        primary: '#3F3D56',
        secondary: '#6C757D',
        accent: '#A2D2FF',
        accentSoft: '#EAF4FF',
        highlight: '#BDE0FE',
        success: '#C6F6D5',
        divider: '#F1F3F5',
    },
    spacing: { s: 8, m: 16, l: 24, xl: 32 },
    typography: {
        h1: { fontSize: 28, fontWeight: '700', color: '#3F3D56' },
        h2: { fontSize: 22, fontWeight: '600', color: '#3F3D56' },
        h3: { fontSize: 18, fontWeight: '600', color: '#3F3D56' },
        body: { fontSize: 16, lineHeight: 24, color: '#495057' },
        caption: { fontSize: 14, color: '#868E96' }
    }
};

export interface YogaStep {
    id: number;
    title: string;
    instruction: string;
    image_url: any;
    video_url?: string;
}

export interface YogaPose {
    id: string;
    name: string;
    sanskrit_name: string;
    category: 'Posture Correction' | 'Back Pain Relief' | 'Knee Care' | 'Shoulder Mobility' | 'Full Body Flow' | 'Stress & Relaxation';
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Beginner-Safe' | 'All Levels';
    duration_minutes: number;
    hero_image: any;
    benefits: string[];
    mistakes: string[];
    modifications: string[];
    instructor_cues: string[];
    steps: YogaStep[];
}

export const YOGA_CATEGORIES = [
    { id: 'posture', title: 'Posture Correction', benefit: 'Fix rounded shoulders', count: 5, icon: 'human-queue' },
    { id: 'back_pain', title: 'Back Pain Relief', benefit: 'Soothe lumbar tension', count: 4, icon: 'human-handsdown' },
    { id: 'knee', title: 'Knee Care', benefit: 'Strengthen stabilizers', count: 4, icon: 'run' },
    { id: 'shoulder', title: 'Shoulder Mobility', benefit: 'Unlock stiff joints', count: 4, icon: 'arm-flex' },
    { id: 'full_body', title: 'Full Body Flow', benefit: 'Energize & tone', count: 3, icon: 'yoga' },
    { id: 'stress', title: 'Stress & Relaxation', benefit: 'Calm the mind', count: 3, icon: 'leaf' },
];

// ═══════════════════════════════════════════════════════════════════════════
// YOGA ROUTINES - Curated multi-exercise sequences
// ═══════════════════════════════════════════════════════════════════════════

export interface YogaRoutine {
    id: string;
    name: string;
    subtitle: string;
    description: string;
    benefits: string[];
    total_duration_minutes: number;
    pose_ids: string[]; // Ordered list of pose IDs
    difficulty: 'Beginner' | 'Intermediate' | 'All Levels';
    icon: string;
    gradient: string[]; // For visual styling
}

export const YOGA_ROUTINES: Record<string, YogaRoutine> = {
    'morning_energize': {
        id: 'morning_energize',
        name: 'Morning Energy Boost',
        subtitle: 'Wake up your body & mind',
        description: 'Start your day with this gentle yet energizing sequence. These poses activate your spine, open your chest for deeper breathing, and get your blood flowing.',
        benefits: [
            'Increases blood circulation',
            'Wakes up stiff muscles',
            'Boosts mental alertness',
            'Sets positive tone for the day'
        ],
        total_duration_minutes: 12,
        pose_ids: ['cat_cow', 'down_dog', 'wall_angel', 'seated_chest_opener'],
        difficulty: 'All Levels',
        icon: 'weather-sunny',
        gradient: ['#FEF3C7', '#FDE68A']
    },
    'stress_relief': {
        id: 'stress_relief',
        name: 'Stress Relief & Calm',
        subtitle: 'Release tension, find peace',
        description: 'When stress builds up, your body holds it. This sequence targets common tension areas and activates your relaxation response through gentle stretches and breathing.',
        benefits: [
            'Lowers cortisol levels',
            'Releases shoulder & neck tension',
            'Calms the nervous system',
            'Improves sleep quality'
        ],
        total_duration_minutes: 18,
        pose_ids: ['neck_release', 'childs_pose_wide', 'supine_twist', 'legs_up_wall_relax', 'corpse_pose'],
        difficulty: 'Beginner',
        icon: 'leaf',
        gradient: ['#D1FAE5', '#A7F3D0']
    },
    'back_care': {
        id: 'back_care',
        name: 'Back Care Routine',
        subtitle: 'Strengthen & soothe your spine',
        description: 'Designed for those who sit at desks or experience back discomfort. This sequence mobilizes the spine, strengthens supporting muscles, and provides relief.',
        benefits: [
            'Relieves lower back tension',
            'Strengthens core support',
            'Improves spinal mobility',
            'Prevents future pain'
        ],
        total_duration_minutes: 15,
        pose_ids: ['cat_cow', 'sphinx_pose', 'rolling_bridge', 'supine_twist'],
        difficulty: 'Beginner',
        icon: 'human-handsdown',
        gradient: ['#DBEAFE', '#BFDBFE']
    },
    'desk_break': {
        id: 'desk_break',
        name: 'Quick Desk Break',
        subtitle: '5-minute office reset',
        description: 'Perfect for a midday break. Simple stretches that can be done anywhere to counteract the effects of sitting and screen time.',
        benefits: [
            'Counteracts sitting posture',
            'Refreshes focus',
            'Quick energy boost',
            'Reduces eye strain headaches'
        ],
        total_duration_minutes: 6,
        pose_ids: ['neck_release', 'seated_chest_opener'],
        difficulty: 'Beginner',
        icon: 'laptop',
        gradient: ['#E0E7FF', '#C7D2FE']
    },
    'evening_wind_down': {
        id: 'evening_wind_down',
        name: 'Evening Wind Down',
        subtitle: 'Prepare for restful sleep',
        description: 'Transition from your busy day to restful sleep. These calming poses signal to your body that it\'s time to relax and let go of the day.',
        benefits: [
            'Prepares body for sleep',
            'Releases accumulated tension',
            'Quiets racing thoughts',
            'Improves sleep quality'
        ],
        total_duration_minutes: 20,
        pose_ids: ['childs_pose_wide', 'supine_twist', 'butterfly_reclined', 'legs_up_wall_relax', 'corpse_pose'],
        difficulty: 'All Levels',
        icon: 'weather-night',
        gradient: ['#EDE9FE', '#DDD6FE']
    }
};

// Get today's recommended routine based on time of day
export const getTodayRoutine = (): YogaRoutine => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 10) {
        return YOGA_ROUTINES['morning_energize'];
    } else if (hour >= 10 && hour < 17) {
        return YOGA_ROUTINES['desk_break'];
    } else if (hour >= 17 && hour < 20) {
        return YOGA_ROUTINES['stress_relief'];
    } else {
        return YOGA_ROUTINES['evening_wind_down'];
    }
};

// Get all routines as array
export const getAllRoutines = (): YogaRoutine[] => Object.values(YOGA_ROUTINES);


// Image Assets - Using our high-resolution trainer library
const IMG = {
    trainer: require('../../assets/yoga_poses/trainer_seated.png'),
    seated: require('../../assets/yoga_poses/seated_chest_opener.png'),
    sphinx: require('../../assets/yoga_poses/sphinx_pose.png'),
    wall: require('../../assets/yoga_poses/mountain_pose_wall.png'),
    catCow: require('../../assets/yoga_poses/cat_cow.png'),
    neck: require('../../assets/yoga_poses/neck_stretches.png'),
    child: require('../../assets/yoga_poses/childs_pose_wide.png'),
    twist: require('../../assets/yoga_poses/supine_twist_gentle.png'),
    bridge: require('../../assets/yoga_poses/bridge_flow.png'),
    legsWall: require('../../assets/yoga_poses/legs_up_wall_relax.png'),
    quad: require('../../assets/yoga_poses/quad_activation.png'),
    gluteBridge: require('../../assets/yoga_poses/glute_bridge_hold.png'),
    warrior: require('../../assets/yoga_poses/warrior_2_flow.png'),
    corpse: require('../../assets/yoga_poses/corpse_pose.png'),
    thread: require('../../assets/yoga_poses/thread_the_needle.png'),
    downDog: require('../../assets/yoga_poses/downward_dog.png'),
};

export const YOGA_POSES: Record<string, YogaPose> = {
    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 1: POSTURE CORRECTION (5 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'seated_chest_opener': {
        id: 'seated_chest_opener',
        name: 'Seated Chest Opener',
        sanskrit_name: 'Sukhasana Variation',
        category: 'Posture Correction',
        difficulty: 'Beginner-Safe',
        duration_minutes: 3,
        hero_image: IMG.trainer,
        benefits: ['Reverses rounded shoulders', 'Improves breathing capacity', 'Relieves upper back tension'],
        mistakes: ['Jutting the chin forward', 'Arching lower back excessively', 'Forcing hands up too high'],
        modifications: ['Use strap if tight'],
        instructor_cues: ['Imagine a string pulling sternum to sky', 'Keep neck long', 'Soften jaw'],
        steps: [
            { id: 1, title: 'Find Your Seat', instruction: 'Sit in a comfortable cross-legged position on your mat. Rest your hands gently on your knees. Keep your spine tall and chin parallel to the floor.', image_url: IMG.trainer },
            { id: 2, title: 'Interlace Behind', instruction: 'Reach your arms behind your back and interlace your fingers. If your shoulders are tight, hold a strap or towel between your hands instead.', image_url: IMG.seated },
            { id: 3, title: 'Open Your Chest', instruction: 'Inhale deeply as you gently straighten your arms. Roll your shoulders back and down. Feel your collarbones broadening and chest lifting.', image_url: IMG.seated },
            { id: 4, title: 'Breathe & Release', instruction: 'Lift your sternum slightly toward the ceiling without craning your neck. Breathe deeply into your upper chest for 5-8 slow breaths. Release gently.', image_url: IMG.neck }
        ]
    },
    'sphinx_pose': {
        id: 'sphinx_pose',
        name: 'Sphinx Pose',
        sanskrit_name: 'Salamba Bhujangasana',
        category: 'Posture Correction',
        difficulty: 'Beginner',
        duration_minutes: 4,
        hero_image: IMG.sphinx,
        benefits: ['Strengthens spine', 'Opens chest and lungs', 'Soothes nervous system'],
        mistakes: ['Sinking into shoulders', 'Clenching glutes too tight', 'Looking up too high'],
        modifications: ['Place blanket under hips for comfort'],
        instructor_cues: ['Press down through your elbows', 'Pull your heart forward'],
        steps: [
            { id: 1, title: 'Lie Face Down', instruction: 'Lie on your belly with your legs extended behind you. The tops of your feet should press gently into the mat. Rest your forehead down.', image_url: IMG.corpse },
            { id: 2, title: 'Position Elbows', instruction: 'Place your elbows directly under your shoulders. Your forearms should be parallel, like the number 11, pointing straight ahead.', image_url: IMG.sphinx },
            { id: 3, title: 'Lift Your Chest', instruction: 'Press your forearms firmly into the mat to lift your chest away from the floor. Draw your shoulders away from your ears.', image_url: IMG.sphinx },
            { id: 4, title: 'Hold & Breathe', instruction: 'Look straight ahead with a soft gaze. Hold for 1-3 minutes, breathing softly. Feel the gentle opening in your chest and spine.', image_url: IMG.sphinx }
        ]
    },
    'wall_angel': {
        id: 'wall_angel',
        name: 'Wall Angel',
        sanskrit_name: 'Tadasana w/ Wall',
        category: 'Posture Correction',
        difficulty: 'Beginner-Safe',
        duration_minutes: 3,
        hero_image: IMG.wall,
        benefits: ['Incredible feedback for alignment', 'Strengthens deep neck flexors', 'Resets shoulder position'],
        mistakes: ['Ribs popping out', 'Chin lifting to touch wall', 'Holding breath'],
        modifications: ['Step feet further from wall if needed'],
        instructor_cues: ['Feel the wall supporting your spine', 'Keep chin tucked slightly'],
        steps: [
            { id: 1, title: 'Stand at Wall', instruction: 'Stand with your back against a wall, with your feet about 6 inches away from the base. Stand tall and breathe naturally.', image_url: IMG.wall },
            { id: 2, title: 'Find Contact Points', instruction: 'Ensure your hips, shoulder blades, and the back of your head all gently touch the wall. Keep your core engaged.', image_url: IMG.wall },
            { id: 3, title: 'Cactus Arms', instruction: 'Bring your arms to a "W" shape (cactus arms) against the wall if possible. Keep your elbows and backs of hands touching the wall.', image_url: IMG.wall },
            { id: 4, title: 'Slide Up & Down', instruction: 'Slowly slide your arms up overhead and back down while maintaining wall contact. Focus on keeping ribcage knitted in. Repeat 10 times.', image_url: IMG.wall }
        ]
    },
    'cat_cow': {
        id: 'cat_cow',
        name: 'Cat-Cow Flow',
        sanskrit_name: 'Marjaryasana-Bitilasana',
        category: 'Posture Correction',
        difficulty: 'All Levels',
        duration_minutes: 5,
        hero_image: IMG.catCow,
        benefits: ['Lubricates spinal joints', 'Improves body awareness', 'Relieves stiffness'],
        mistakes: ['Moving too fast', 'Bending elbows', 'Collapsing in mid-back'],
        modifications: ['Use fists if wrists hurt', 'Pad knees with blanket'],
        instructor_cues: ['Move vertebra by vertebra', 'Imagine a wave through your spine'],
        steps: [
            { id: 1, title: 'Tabletop Position', instruction: 'Come to all fours with your hands directly under shoulders and knees under hips. Spread your fingers wide. Keep spine neutral.', image_url: IMG.catCow },
            { id: 2, title: 'Cow Pose (Inhale)', instruction: 'As you inhale, drop your belly toward the mat. Lift your chest and gaze forward or slightly up. Let your sit bones reach toward the ceiling.', image_url: IMG.catCow },
            { id: 3, title: 'Cat Pose (Exhale)', instruction: 'As you exhale, press hands into the mat. Round your spine toward the ceiling. Tuck your chin toward your chest and draw belly in.', image_url: IMG.catCow },
            { id: 4, title: 'Flow Continuously', instruction: 'Continue flowing between Cow (inhale) and Cat (exhale) at your own breath pace. Move slowly, feeling each vertebra. Repeat for 10-15 cycles.', image_url: IMG.catCow }
        ]
    },
    'neck_release': {
        id: 'neck_release',
        name: 'Seated Neck Release',
        sanskrit_name: 'Greeva Sanchalana',
        category: 'Posture Correction',
        difficulty: 'Beginner-Safe',
        duration_minutes: 3,
        hero_image: IMG.neck,
        benefits: ['Reduces tension headaches', 'Lowers stress', 'Improves neck range of motion'],
        mistakes: ['Pulling head aggressively', 'Lifting shoulder to ear', 'Holding breath'],
        modifications: ['Keep hand weight light or none'],
        instructor_cues: ['Let gravity do the work', 'Soften your jaw'],
        steps: [
            { id: 1, title: 'Sit Tall', instruction: 'Sit comfortably with your spine straight, either cross-legged on the floor or in a chair with feet flat. Relax your shoulders down.', image_url: IMG.trainer },
            { id: 2, title: 'Drop Ear to Shoulder', instruction: 'Gently drop your right ear toward your right shoulder. Keep your left shoulder relaxed and down. Breathe deeply.', image_url: IMG.neck },
            { id: 3, title: 'Extend Opposite Arm', instruction: 'For a deeper stretch, extend your left arm out to the side and gently down toward the floor. Feel the stretch along your neck and upper trap.', image_url: IMG.neck },
            { id: 4, title: 'Hold & Switch', instruction: 'Hold for 5 slow, deep breaths. Optional: place right hand gently on head (no pulling). Release and repeat on the other side.', image_url: IMG.neck }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 2: BACK PAIN RELIEF (4 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'childs_pose_wide': {
        id: 'childs_pose_wide',
        name: 'Wide-Knee Child\'s Pose',
        sanskrit_name: 'Balasana',
        category: 'Back Pain Relief',
        difficulty: 'All Levels',
        duration_minutes: 5,
        hero_image: IMG.child,
        benefits: ['Gentle traction for lower back', 'Calms nervous system', 'Passive hip stretch'],
        mistakes: ['Forcing hips down if knees hurt', 'Tensing shoulders near ears'],
        modifications: ['Place cushion behind knees', 'Use block under forehead'],
        instructor_cues: ['Send your breath to your lower back', 'Melt your chest toward the earth'],
        steps: [
            { id: 1, title: 'Kneel Down', instruction: 'Kneel on your mat with your big toes touching behind you. Separate your knees wide, about mat-width apart.', image_url: IMG.child },
            { id: 2, title: 'Sit Back', instruction: 'Slowly sit your hips back toward your heels. If your hips don\'t reach your heels, that\'s perfectly fine.', image_url: IMG.child },
            { id: 3, title: 'Walk Hands Forward', instruction: 'Walk your hands forward on the mat, extending your arms. Lower your chest and forehead toward the floor.', image_url: IMG.child },
            { id: 4, title: 'Rest & Breathe', instruction: 'Rest your forehead on the mat or a block. Breathe deeply into your lower back for 1-5 minutes. Surrender to the pose.', image_url: IMG.child }
        ]
    },
    'supine_twist': {
        id: 'supine_twist',
        name: 'Supported Supine Twist',
        sanskrit_name: 'Supta Matsyendrasana',
        category: 'Back Pain Relief',
        difficulty: 'Beginner-Safe',
        duration_minutes: 4,
        hero_image: IMG.twist,
        benefits: ['Hydrates spinal discs', 'Relieves stiffness', 'Aids digestion'],
        mistakes: ['Forcing knees down', 'Lifting shoulder off floor'],
        modifications: ['Place pillow under knees'],
        instructor_cues: ['Keep both shoulders grounded', 'Twist from the belly button'],
        steps: [
            { id: 1, title: 'Lie on Back', instruction: 'Lie comfortably on your back. Take a moment to let your spine settle into the mat. Breathe naturally.', image_url: IMG.corpse },
            { id: 2, title: 'Hug Knees to Chest', instruction: 'Draw both knees into your chest. Wrap your arms around your shins and gently rock side to side to massage your lower back.', image_url: IMG.twist },
            { id: 3, title: 'Drop Knees to Side', instruction: 'Extend your arms out to a T-position. Drop both knees slowly to the right side. Turn your gaze to the left.', image_url: IMG.twist },
            { id: 4, title: 'Hold & Switch', instruction: 'Keep both shoulders grounded. Use a pillow under knees if needed. Hold 1-2 minutes, breathing deeply. Switch sides.', image_url: IMG.twist }
        ]
    },
    'rolling_bridge': {
        id: 'rolling_bridge',
        name: 'Rolling Bridge',
        sanskrit_name: 'Setu Bandhasana Flow',
        category: 'Back Pain Relief',
        difficulty: 'Beginner',
        duration_minutes: 4,
        hero_image: IMG.bridge,
        benefits: ['Stabilizes SI joint', 'Opens hip flexors', 'Strengthens posterior chain'],
        mistakes: ['Pushing too high (arching back)', 'Knees splaying out', 'Tensing neck'],
        modifications: ['Keep the lift smaller'],
        instructor_cues: ['Lift from your hips, not your back', 'Squeeze glutes gently at top'],
        steps: [
            { id: 1, title: 'Setup Position', instruction: 'Lie on your back with knees bent and feet flat, hip-width apart. Arms rest by your sides, palms down. Feet close to your glutes.', image_url: IMG.corpse },
            { id: 2, title: 'Lift Hips', instruction: 'Press your feet firmly into the mat. Inhale and slowly lift your hips off the floor, one vertebra at a time, starting from your tailbone.', image_url: IMG.bridge },
            { id: 3, title: 'Hold at Top', instruction: 'At the top, your body forms a diagonal line from shoulders to knees. Keep your knees pointing forward, not splaying out.', image_url: IMG.bridge },
            { id: 4, title: 'Roll Down Slowly', instruction: 'Exhale and lower your spine back down vertebra by vertebra. Start from upper back, then middle back, then tailbone. Repeat 10 times.', image_url: IMG.bridge }
        ]
    },
    'legs_up_wall_back': {
        id: 'legs_up_wall_back',
        name: 'Legs Up The Wall',
        sanskrit_name: 'Viparita Karani',
        category: 'Back Pain Relief',
        difficulty: 'Beginner-Safe',
        duration_minutes: 5,
        hero_image: IMG.legsWall,
        benefits: ['Reduces inflammation', 'Relaxes psoas muscle', 'Calms nervous system completely'],
        mistakes: ['Hips too far from wall', 'Arching neck'],
        modifications: ['Place blanket under hips', 'Bend knees slightly'],
        instructor_cues: ['Let thigh bones sink into hip sockets', 'Do absolutely nothing'],
        steps: [
            { id: 1, title: 'Sit Sideways at Wall', instruction: 'Sit on the floor with your right side against a wall. Your right hip should be touching or very close to the wall.', image_url: IMG.legsWall },
            { id: 2, title: 'Swing Legs Up', instruction: 'In one smooth movement, swing your legs up the wall as you lie back. Your buttocks should be close to (or touching) the wall.', image_url: IMG.legsWall },
            { id: 3, title: 'Adjust & Settle', instruction: 'Let your arms rest by your sides or open them wide, palms up. Adjust your distance from the wall until comfortable.', image_url: IMG.legsWall },
            { id: 4, title: 'Rest Completely', instruction: 'Close your eyes and do nothing. Let gravity drain tension from your legs. Stay for 3-5 minutes, breathing naturally.', image_url: IMG.legsWall }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 3: KNEE CARE (4 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'quad_setting': {
        id: 'quad_setting',
        name: 'Seated Quad Setting',
        sanskrit_name: 'Dandasana Variation',
        category: 'Knee Care',
        difficulty: 'Beginner-Safe',
        duration_minutes: 3,
        hero_image: IMG.quad,
        benefits: ['Improves patellar tracking', 'Strengthens VMO (inner quad)', 'Reduces knee pain'],
        mistakes: ['Holding breath', 'Hyperextending the knee'],
        modifications: ['Use smaller towel roll'],
        instructor_cues: ['Feel the muscle above your kneecap engage', 'Keep spine tall'],
        steps: [
            { id: 1, title: 'Sit with Legs Extended', instruction: 'Sit on the floor with both legs extended in front of you. Sit up tall with your spine straight.', image_url: IMG.quad },
            { id: 2, title: 'Place Towel Under Knee', instruction: 'Roll a small towel and place it under the knee of the leg you are working. Keep the leg straight.', image_url: IMG.quad },
            { id: 3, title: 'Press Knee Down', instruction: 'Press the back of your knee down into the towel by engaging your quadricep muscle. You should see/feel the muscle above your kneecap tighten.', image_url: IMG.quad },
            { id: 4, title: 'Lift Heel & Hold', instruction: 'While pressing down, try to lift your heel slightly off the mat. Hold for 5 seconds. Release and repeat 10 times. Switch legs.', image_url: IMG.quad }
        ]
    },
    'glute_bridge': {
        id: 'glute_bridge',
        name: 'Supported Glute Bridge',
        sanskrit_name: 'Setu Bandhasana',
        category: 'Knee Care',
        difficulty: 'Beginner',
        duration_minutes: 3,
        hero_image: IMG.gluteBridge,
        benefits: ['Takes pressure off knee joint', 'Stabilizes hips', 'Builds endurance'],
        mistakes: ['Knees falling inward', 'Lifting heels'],
        modifications: ['Place yoga block between knees'],
        instructor_cues: ['Imagine a block between your knees', 'Drive through your heels'],
        steps: [
            { id: 1, title: 'Setup Position', instruction: 'Lie on your back with knees bent and feet flat on the floor, hip-width apart. Feet should be close to your glutes.', image_url: IMG.corpse },
            { id: 2, title: 'Engage & Lift', instruction: 'Press your heels firmly into the floor. Engage your glutes and lift your hips toward the ceiling.', image_url: IMG.gluteBridge },
            { id: 3, title: 'Check Knee Alignment', instruction: 'Ensure your knees point straight ahead and don\'t cave inward. Imagine holding a block between your thighs.', image_url: IMG.gluteBridge },
            { id: 4, title: 'Hold & Lower', instruction: 'Hold at the top for 3-5 breaths. Lower slowly with control. Repeat 10 times.', image_url: IMG.gluteBridge }
        ]
    },
    'high_lunge': {
        id: 'high_lunge',
        name: 'Supported High Lunge',
        sanskrit_name: 'Ashta Chandrasana',
        category: 'Knee Care',
        difficulty: 'All Levels',
        duration_minutes: 3,
        hero_image: IMG.warrior,
        benefits: ['Strengthens knee stabilizers', 'Improves ankle stability', 'Opens hip flexors'],
        mistakes: ['Front knee swaying inward', 'Collapsing on back leg'],
        modifications: ['Use wall or chair for balance'],
        instructor_cues: ['Press the floor away', 'Keep your hips square to front'],
        steps: [
            { id: 1, title: 'Stand Tall', instruction: 'Stand with your feet hip-width apart. Ground down through your feet and stand tall.', image_url: IMG.wall },
            { id: 2, title: 'Step Back', instruction: 'Step your right foot back about 3-4 feet. Keep your right heel lifted off the ground.', image_url: IMG.warrior },
            { id: 3, title: 'Bend Front Knee', instruction: 'Bend your left knee so it stacks directly over your ankle. Don\'t let the knee go past your toes.', image_url: IMG.warrior },
            { id: 4, title: 'Hold Strong', instruction: 'Keep your back leg strong and straight. Arms can reach up or rest on hips. Hold for 5 breaths, then switch sides.', image_url: IMG.warrior }
        ]
    },
    'reclined_hand_toe': {
        id: 'reclined_hand_toe',
        name: 'Reclined Hand-to-Big-Toe',
        sanskrit_name: 'Supta Padangusthasana',
        category: 'Knee Care',
        difficulty: 'Beginner-Safe',
        duration_minutes: 4,
        hero_image: IMG.legsWall,
        benefits: ['Safe hamstring lengthening', 'Reduces knee compression', 'Relaxes legs'],
        mistakes: ['Locking the knee', 'Lifting hips off floor'],
        modifications: ['Keep a soft bend in the knee', 'Use a strap or towel'],
        instructor_cues: ['Flex your foot toward your face', 'Keep shoulders relaxed on mat'],
        steps: [
            { id: 1, title: 'Lie on Back', instruction: 'Lie flat on your back with both legs extended. Let your arms rest by your sides.', image_url: IMG.corpse },
            { id: 2, title: 'Loop Strap Around Foot', instruction: 'Take a strap or towel and loop it around the ball of your right foot. Hold one end of the strap in each hand.', image_url: IMG.legsWall },
            { id: 3, title: 'Extend Leg Up', instruction: 'Keeping your left leg on the floor, extend your right leg toward the ceiling. Keep a microbend in the knee if hamstrings are tight.', image_url: IMG.legsWall },
            { id: 4, title: 'Hold & Breathe', instruction: 'Keep your lower back grounded on the mat. Flex your foot. Hold for 1 minute. Lower slowly and switch sides.', image_url: IMG.legsWall }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 4: SHOULDER MOBILITY (4 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'shoulder_flossing': {
        id: 'shoulder_flossing',
        name: 'Shoulder Flossing',
        sanskrit_name: 'Shoulder Pass-Through',
        category: 'Shoulder Mobility',
        difficulty: 'Beginner',
        duration_minutes: 3,
        hero_image: IMG.wall,
        benefits: ['Full ROM for shoulder girdle', 'Opens chest', 'Improves posture'],
        mistakes: ['Bending elbows too much', 'Arching back to compensate'],
        modifications: ['Use wider grip on strap'],
        instructor_cues: ['Keep your ribs knitted in', 'Move slowly through sticky spots'],
        steps: [
            { id: 1, title: 'Hold Strap Wide', instruction: 'Stand tall holding a strap (or towel) with both hands, wider than shoulder-width apart. Arms are straight in front of you.', image_url: IMG.wall },
            { id: 2, title: 'Lift Overhead', instruction: 'Inhale and slowly lift the strap up and overhead, keeping your arms straight. Keep your ribcage from flaring.', image_url: IMG.wall },
            { id: 3, title: 'Bring Behind', instruction: 'Exhale and continue the movement, bringing the strap behind you toward your lower back. Go only as far as comfortable.', image_url: IMG.wall },
            { id: 4, title: 'Return & Repeat', instruction: 'Inhale to bring the strap back up and over. Exhale to lower to starting position. Repeat 5-10 times slowly.', image_url: IMG.wall }
        ]
    },
    'eagle_arms': {
        id: 'eagle_arms',
        name: 'Eagle Arms',
        sanskrit_name: 'Garudasana Arms',
        category: 'Shoulder Mobility',
        difficulty: 'Beginner',
        duration_minutes: 3,
        hero_image: IMG.neck,
        benefits: ['Stretches rhomboids and upper traps', 'Opens scapula area', 'Boosts circulation'],
        mistakes: ['Dropping elbows to chest', 'Hunching forward'],
        modifications: ['Simply hug opposite shoulders if wrapping is difficult'],
        instructor_cues: ['Breathe into the space between your shoulder blades', 'Lift elbows gently'],
        steps: [
            { id: 1, title: 'Extend Arms Forward', instruction: 'Sit or stand tall. Extend both arms straight out in front of you at shoulder height.', image_url: IMG.trainer },
            { id: 2, title: 'Cross Arms', instruction: 'Cross your right arm under your left arm at the elbows. The backs of your hands will be facing each other.', image_url: IMG.neck },
            { id: 3, title: 'Wrap Forearms', instruction: 'Bend both elbows and wrap your forearms around each other, trying to bring palms to touch. If this is too much, simply hug your shoulders.', image_url: IMG.neck },
            { id: 4, title: 'Lift & Hold', instruction: 'Lift your elbows to shoulder height while keeping shoulders down. Press forearms away from face. Hold 5 breaths, then switch arms.', image_url: IMG.neck }
        ]
    },
    'thread_needle': {
        id: 'thread_needle',
        name: 'Thread the Needle',
        sanskrit_name: 'Parsva Balasana',
        category: 'Shoulder Mobility',
        difficulty: 'Beginner',
        duration_minutes: 4,
        hero_image: IMG.thread,
        benefits: ['Gentle spinal twist', 'Relieves shoulder tension', 'Calming'],
        mistakes: ['Collapsing weight onto neck', 'Letting hips sway too far'],
        modifications: ['Pad knees with blanket'],
        instructor_cues: ['Press slightly into the grounded hand', 'Soften your face'],
        steps: [
            { id: 1, title: 'Start on All Fours', instruction: 'Come to tabletop position with hands under shoulders and knees under hips. Spread your fingers wide.', image_url: IMG.catCow },
            { id: 2, title: 'Lift Arm to Sky', instruction: 'Inhale and lift your right arm up toward the ceiling, opening your chest to the right. Follow your hand with your gaze.', image_url: IMG.thread },
            { id: 3, title: 'Thread Under', instruction: 'Exhale and thread your right arm under your left arm. Lower your right shoulder and cheek to the mat.', image_url: IMG.thread },
            { id: 4, title: 'Rest & Breathe', instruction: 'Your left hand can stay planted or walk forward for more stretch. Hold for 5-8 breaths. Repeat on other side.', image_url: IMG.thread }
        ]
    },
    'cow_face_arms': {
        id: 'cow_face_arms',
        name: 'Cow Face Arms',
        sanskrit_name: 'Gomukhasana Arms',
        category: 'Shoulder Mobility',
        difficulty: 'All Levels',
        duration_minutes: 3,
        hero_image: IMG.neck,
        benefits: ['Opens triceps and shoulders', 'Counters forward posture', 'Opens chest'],
        mistakes: ['Pushing head forward', 'Arching back intensely'],
        modifications: ['Use a strap between hands'],
        instructor_cues: ['Keep your neck free', 'Don\'t force the grip, use the strap'],
        steps: [
            { id: 1, title: 'Reach Arm Overhead', instruction: 'Sit or stand tall. Take your right arm up overhead and then bend the elbow, letting your hand drop behind your head toward your upper back.', image_url: IMG.trainer },
            { id: 2, title: 'Reach Bottom Arm Behind', instruction: 'Take your left arm behind your back, bending the elbow and reaching the back of your left hand up toward your shoulder blades.', image_url: IMG.neck },
            { id: 3, title: 'Clasp or Use Strap', instruction: 'Try to clasp your fingers behind your back. If they don\'t reach, hold a strap between your hands and gently walk hands closer.', image_url: IMG.neck },
            { id: 4, title: 'Hold Tall', instruction: 'Keep your head upright (don\'t push it forward). Hold for 5 breaths. Release and repeat on the other side.', image_url: IMG.neck }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 5: FULL BODY FLOW (3 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'sun_salutation': {
        id: 'sun_salutation',
        name: 'Gentle Sun Salutation',
        sanskrit_name: 'Surya Namaskar A',
        category: 'Full Body Flow',
        difficulty: 'All Levels',
        duration_minutes: 5,
        hero_image: IMG.downDog,
        benefits: ['Warms up entire body', 'Improves circulation', 'Connects breath to movement'],
        mistakes: ['Holding breath', 'Straining back in Cobra'],
        modifications: ['Use Knees-Chest-Chin instead of Chaturanga', 'Bend knees in Forward Fold'],
        instructor_cues: ['Move like you are moving through honey', 'Follow your breath'],
        steps: [
            { id: 1, title: 'Mountain Pose', instruction: 'Stand tall at the front of your mat. Inhale and reach your arms up overhead, bringing palms together. Look up gently.', image_url: IMG.wall },
            { id: 2, title: 'Forward Fold', instruction: 'Exhale and hinge at your hips, folding forward. Bend your knees as much as needed. Let your head hang heavy.', image_url: IMG.child },
            { id: 3, title: 'Plank to Cobra', instruction: 'Step back to plank. Lower through Knees-Chest-Chin. Inhale into a gentle Cobra, lifting your chest.', image_url: IMG.sphinx },
            { id: 4, title: 'Downward Dog', instruction: 'Exhale and lift your hips up and back into Downward Facing Dog. Hold for 3 breaths. Step forward and rise to standing.', image_url: IMG.downDog }
        ]
    },
    'dancing_warrior': {
        id: 'dancing_warrior',
        name: 'Dancing Warrior',
        sanskrit_name: 'Virabhadrasana Flow',
        category: 'Full Body Flow',
        difficulty: 'Beginner',
        duration_minutes: 5,
        hero_image: IMG.warrior,
        benefits: ['Strengthens legs', 'Opens side body', 'Feels empowering'],
        mistakes: ['Front knee collapsing inward', 'Shoulders hunched up'],
        modifications: ['Less knee bend', 'Touch fingertips to mat in Side Angle'],
        instructor_cues: ['Keep your front knee stable', 'Flow with grace'],
        steps: [
            { id: 1, title: 'Warrior 2 Setup', instruction: 'Step your feet wide apart (3-4 feet). Turn your right toes out and left toes slightly in. Bend your right knee over your ankle.', image_url: IMG.warrior },
            { id: 2, title: 'Warrior 2', instruction: 'Extend your arms out parallel to the floor. Gaze over your right fingertips. Keep your torso upright.', image_url: IMG.warrior },
            { id: 3, title: 'Reverse Warrior', instruction: 'Inhale and reach your right arm up and back, letting left hand slide down your back leg. Open through the right side body.', image_url: IMG.warrior },
            { id: 4, title: 'Side Angle & Flow', instruction: 'Exhale into Extended Side Angle: right forearm to right thigh, left arm overhead. Flow between Warrior 2, Reverse, and Side Angle 5 times. Switch sides.', image_url: IMG.warrior }
        ]
    },
    'down_dog': {
        id: 'down_dog',
        name: 'Downward Facing Dog',
        sanskrit_name: 'Adho Mukha Svanasana',
        category: 'Full Body Flow',
        difficulty: 'Beginner',
        duration_minutes: 2,
        hero_image: IMG.downDog,
        benefits: ['Full body reset', 'Lengthens spine', 'Strengthens arms'],
        mistakes: ['Rounding spine (bend knees instead)', 'Shoulders near ears'],
        modifications: ['Bend knees generously', 'Widen hands'],
        instructor_cues: ['Bend knees as much as needed to keep spine straight', 'Shake head yes and no'],
        steps: [
            { id: 1, title: 'Start on All Fours', instruction: 'Come to hands and knees. Hands are shoulder-width apart, fingers spread wide. Knees are hip-width apart.', image_url: IMG.catCow },
            { id: 2, title: 'Lift Hips Up', instruction: 'Tuck your toes under and lift your hips up and back. Start with knees bent. Your body forms an inverted V shape.', image_url: IMG.downDog },
            { id: 3, title: 'Press & Lengthen', instruction: 'Press your chest gently toward your thighs. Lengthen your spine. You can pedal your feet to stretch your calves.', image_url: IMG.downDog },
            { id: 4, title: 'Relax Your Head', instruction: 'Let your head hang completely relaxed between your upper arms. Hold for 5-10 breaths. Bend knees to release.', image_url: IMG.downDog }
        ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 6: STRESS & RELAXATION (3 Exercises)
    // ══════════════════════════════════════════════════════════════════════════
    'legs_up_wall_relax': {
        id: 'legs_up_wall_relax',
        name: 'Legs Up The Wall',
        sanskrit_name: 'Viparita Karani',
        category: 'Stress & Relaxation',
        difficulty: 'Beginner-Safe',
        duration_minutes: 10,
        hero_image: IMG.legsWall,
        benefits: ['Activates relaxation response', 'Aids sleep', 'Relieves tired legs'],
        mistakes: ['Doing too much - just relax!'],
        modifications: ['Blanket under hips', 'Cover with blanket for warmth'],
        instructor_cues: ['Nowhere to go, nothing to do', 'Let the floor hold you'],
        steps: [
            { id: 1, title: 'Position at Wall', instruction: 'Sit sideways with your right hip touching a wall. Have a folded blanket nearby if desired.', image_url: IMG.legsWall },
            { id: 2, title: 'Swing Legs Up', instruction: 'In one smooth motion, swing your legs up the wall as you lower your back to the floor. Wiggle close to the wall.', image_url: IMG.legsWall },
            { id: 3, title: 'Open Arms Wide', instruction: 'Let your arms rest out to the sides, palms facing up. You can place a blanket under your hips for comfort.', image_url: IMG.legsWall },
            { id: 4, title: 'Surrender Completely', instruction: 'Close your eyes. Focus on long, slow exhales. Stay for 5-10 minutes. There is nothing to do. Just be.', image_url: IMG.legsWall }
        ]
    },
    'butterfly_reclined': {
        id: 'butterfly_reclined',
        name: 'Reclined Butterfly',
        sanskrit_name: 'Supta Baddha Konasana',
        category: 'Stress & Relaxation',
        difficulty: 'Beginner-Safe',
        duration_minutes: 5,
        hero_image: IMG.corpse,
        benefits: ['Softens abdomen', 'Gentle hip opener', 'Emotionally grounding'],
        mistakes: ['Straining groin - use props!'],
        modifications: ['Place blocks or pillows under knees'],
        instructor_cues: ['Use pillows under knees to fully let go', 'Soften your belly'],
        steps: [
            { id: 1, title: 'Lie on Back', instruction: 'Lie flat on your back. Have some pillows or yoga blocks nearby.', image_url: IMG.corpse },
            { id: 2, title: 'Soles Together', instruction: 'Bring the soles of your feet together and let your knees fall open to the sides, creating a diamond shape with your legs.', image_url: IMG.corpse },
            { id: 3, title: 'Support Knees', instruction: 'Place a pillow or block under each knee for support. Your inner thighs should feel no strain whatsoever.', image_url: IMG.corpse },
            { id: 4, title: 'Rest & Breathe', instruction: 'Place one hand on your heart and one on your belly. Close your eyes and feel your breath move. Stay for 3-5 minutes.', image_url: IMG.corpse }
        ]
    },
    'corpse_pose': {
        id: 'corpse_pose',
        name: 'Corpse Pose',
        sanskrit_name: 'Savasana',
        category: 'Stress & Relaxation',
        difficulty: 'Beginner-Safe',
        duration_minutes: 5,
        hero_image: IMG.corpse,
        benefits: ['Total integration', 'Lowers blood pressure', 'Mental clarity'],
        mistakes: ['Fidgeting', 'Planning the day in your head'],
        modifications: ['Bend knees with feet wide if back hurts', 'Cover eyes with cloth'],
        instructor_cues: ['Let your bones be heavy', 'Surrender to gravity'],
        steps: [
            { id: 1, title: 'Lie Flat', instruction: 'Lie flat on your back on your mat. Extend your legs long and let your feet flop naturally outward.', image_url: IMG.corpse },
            { id: 2, title: 'Position Arms', instruction: 'Place your arms by your sides, a few inches away from your body. Turn your palms to face up, fingers naturally curled.', image_url: IMG.corpse },
            { id: 3, title: 'Release Everything', instruction: 'Close your eyes. Release all muscular control. Let the floor hold your entire weight. Soften your face, jaw, and eyes.', image_url: IMG.corpse },
            { id: 4, title: 'Complete Stillness', instruction: 'Do absolutely nothing. Rest completely for 3-5 minutes. When finished, wiggle fingers and toes, then slowly roll to your side.', image_url: IMG.corpse }
        ]
    }
};
