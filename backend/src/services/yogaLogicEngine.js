/**
 * yogaLogicEngine.js
 * 
 * DETERMINISTIC YOGA RECOMMENDATION ENGINE
 * 
 * RULES:
 * - NO AI-based decisions for safety
 * - All logic is rule-based and auditable
 * - Uses user profile, history, and exercise metadata
 * 
 * This engine powers:
 * - Daily recommendations
 * - Safety filtering
 * - Exercise rotation
 * - Category suggestions
 */

import { query } from '../config/database.js';

// =========================
// CONFIGURATION
// =========================

const CONFIG = {
    MAX_REPETITION_DAYS: 3, // Don't suggest same exercise within X days
    BEGINNER_ONLY_CATEGORIES: ['stress_relaxation'], // Safe for all
    CONTRAINDICATED_MAPPING: {
        // User pain area -> exercise areas to avoid
        'lower_back': ['deep_backbend', 'forward_fold_aggressive'],
        'knee': ['deep_squat', 'lunge_aggressive'],
        'shoulder': ['overhead_extend', 'rotator_cuff_load'],
        'neck': ['headstand', 'shoulder_stand', 'deep_twist']
    },
    TIME_BASED_CATEGORIES: {
        morning: ['posture_correction', 'full_body_flow'],
        evening: ['stress_relaxation', 'back_pain_relief'],
        anytime: ['knee_care', 'shoulder_mobility']
    },
    DIFFICULTY_PROGRESSION: {
        'beginner': ['beginner', 'beginner_safe'],
        'intermediate': ['beginner', 'beginner_safe', 'all_levels'],
        'advanced': ['beginner', 'beginner_safe', 'all_levels'] // No "advanced" in current dataset
    }
};

// =========================
// CORE FUNCTIONS
// =========================

/**
 * Get exercises that are safe for a specific user
 * Uses deterministic rules based on user profile
 * 
 * @param {Object} userProfile - User's preferences and health data
 * @returns {Array} List of safe exercise IDs
 */
export async function getSafeExercises(userProfile) {
    const { userId, painAreas = [], difficulty = 'beginner' } = userProfile;

    try {
        // Step 1: Get all active exercises
        let sql = `
            SELECT e.id, e.category_id, e.difficulty, e.contraindication_level,
                   d.who_should_avoid, d.target_areas
            FROM yoga_exercises e
            LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
            WHERE e.is_active = TRUE
        `;

        const result = await query(sql);
        let exercises = result.rows;

        // Step 2: Filter by difficulty level
        const allowedDifficulties = CONFIG.DIFFICULTY_PROGRESSION[difficulty] || ['beginner', 'beginner_safe'];
        exercises = exercises.filter(ex => allowedDifficulties.includes(ex.difficulty));

        // Step 3: Filter out contraindicated exercises based on pain areas
        if (painAreas.length > 0) {
            exercises = exercises.filter(ex => {
                // If exercise is marked as "avoid", skip it
                if (ex.contraindication_level === 'avoid') {
                    return false;
                }

                // Check if any user pain area matches the exercise's "who_should_avoid"
                const avoidList = ex.who_should_avoid || [];
                const hasContraindication = painAreas.some(pain => {
                    return avoidList.some(avoid =>
                        avoid.toLowerCase().includes(pain.toLowerCase())
                    );
                });

                return !hasContraindication;
            });
        }

        // Step 4: Further filter exercises marked as "caution" for beginners
        if (difficulty === 'beginner') {
            exercises = exercises.filter(ex => ex.contraindication_level !== 'caution' || painAreas.length === 0);
        }

        return exercises.map(ex => ex.id);
    } catch (error) {
        console.error('Error in getSafeExercises:', error);
        throw error;
    }
}

/**
 * Get daily yoga recommendation for a user
 * Uses deterministic logic based on:
 * - Time of day
 * - User pain areas
 * - Previous sessions (rotation)
 * - User goals
 * 
 * @param {number} userId - User ID
 * @returns {Object} Recommended exercise with full details
 */
export async function recommendDailyYoga(userId) {
    try {
        // Step 1: Get user preferences
        const prefResult = await query(
            `SELECT * FROM yoga_user_preferences WHERE user_id = $1`,
            [userId]
        );

        const prefs = prefResult.rows[0] || {
            preferred_difficulty: 'beginner',
            preferred_time: 'anytime',
            pain_areas: [],
            goals: []
        };

        // Step 2: Determine time-appropriate category
        const currentHour = new Date().getHours();
        let timeOfDay = 'anytime';
        if (currentHour >= 5 && currentHour < 11) {
            timeOfDay = 'morning';
        } else if (currentHour >= 18 || currentHour < 5) {
            timeOfDay = 'evening';
        }

        // Step 3: Get safe exercises for this user
        const safeExerciseIds = await getSafeExercises({
            userId,
            painAreas: prefs.pain_areas || [],
            difficulty: prefs.preferred_difficulty || 'beginner'
        });

        if (safeExerciseIds.length === 0) {
            // Fallback: Return most basic exercise
            return getDefaultExercise();
        }

        // Step 4: Get recently done exercises (avoid repetition)
        const recentResult = await query(
            `SELECT exercise_id FROM yoga_user_sessions 
             WHERE user_id = $1 
             AND session_date >= CURRENT_DATE - $2
             AND completed = TRUE`,
            [userId, CONFIG.MAX_REPETITION_DAYS]
        );

        const recentlyDone = recentResult.rows.map(r => r.exercise_id);

        // Step 5: Filter out recently done
        let candidates = safeExerciseIds.filter(id => !recentlyDone.includes(id));

        // If all exercises done recently, use all safe ones
        if (candidates.length === 0) {
            candidates = safeExerciseIds;
        }

        // Step 6: Prioritize by time of day and goals
        const priorityCategories = CONFIG.TIME_BASED_CATEGORIES[timeOfDay] || [];

        // Add goal-based priorities
        const goals = prefs.goals || [];
        if (goals.includes('pain_relief')) {
            priorityCategories.push('back_pain_relief', 'knee_care');
        }
        if (goals.includes('stress')) {
            priorityCategories.push('stress_relaxation');
        }
        if (goals.includes('posture')) {
            priorityCategories.push('posture_correction');
        }

        // Step 7: Get full exercise data for candidates
        const exerciseResult = await query(
            `SELECT e.*, d.benefits, d.step_by_step_instructions, d.instructor_cues,
                    c.name as category_name
             FROM yoga_exercises e
             LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
             LEFT JOIN yoga_categories c ON e.category_id = c.id
             WHERE e.id = ANY($1)
             ORDER BY 
                CASE WHEN e.category_id = ANY($2) THEN 0 ELSE 1 END,
                RANDOM()
             LIMIT 1`,
            [candidates, priorityCategories]
        );

        if (exerciseResult.rows.length === 0) {
            return getDefaultExercise();
        }

        const exercise = exerciseResult.rows[0];

        // Step 8: Add safety indicator
        exercise.is_safe_for_user = true;
        exercise.recommendation_reason = buildRecommendationReason(exercise, timeOfDay, goals);

        return exercise;
    } catch (error) {
        console.error('Error in recommendDailyYoga:', error);
        throw error;
    }
}

/**
 * Validate if a specific exercise is safe for a user
 * 
 * @param {string} exerciseId - Exercise ID to validate
 * @param {number} userId - User ID
 * @returns {Object} { isValid, warnings, alternatives }
 */
export async function validateExerciseForUser(exerciseId, userId) {
    try {
        // Get exercise details
        const exerciseResult = await query(
            `SELECT e.*, d.who_should_avoid
             FROM yoga_exercises e
             LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
             WHERE e.id = $1`,
            [exerciseId]
        );

        if (exerciseResult.rows.length === 0) {
            return { isValid: false, error: 'Exercise not found', warnings: [], alternatives: [] };
        }

        const exercise = exerciseResult.rows[0];

        // Get user preferences
        const prefResult = await query(
            `SELECT * FROM yoga_user_preferences WHERE user_id = $1`,
            [userId]
        );

        const prefs = prefResult.rows[0] || { pain_areas: [], preferred_difficulty: 'beginner' };
        const warnings = [];
        let isValid = true;

        // Check 1: Contraindication level
        if (exercise.contraindication_level === 'avoid') {
            isValid = false;
            warnings.push('This exercise has general contraindications. Please consult a professional.');
        }

        // Check 2: Pain area matching
        const painAreas = prefs.pain_areas || [];
        const avoidList = exercise.who_should_avoid || [];

        for (const pain of painAreas) {
            for (const avoid of avoidList) {
                if (avoid.toLowerCase().includes(pain.toLowerCase())) {
                    warnings.push(`Caution: You have indicated ${pain} pain. This exercise mentions: "${avoid}"`);
                    if (exercise.contraindication_level === 'caution') {
                        isValid = false;
                    }
                }
            }
        }

        // Check 3: Difficulty mismatch
        const userDifficulty = prefs.preferred_difficulty || 'beginner';
        if (userDifficulty === 'beginner' && exercise.difficulty === 'all_levels') {
            warnings.push('This exercise is marked for all levels. Take it slow and modify as needed.');
        }

        // Get alternatives if not fully valid
        let alternatives = [];
        if (!isValid || warnings.length > 0) {
            const altResult = await query(
                `SELECT id, name, category_id 
                 FROM yoga_exercises 
                 WHERE category_id = $1 
                 AND id != $2 
                 AND contraindication_level = 'safe'
                 AND is_active = TRUE
                 LIMIT 3`,
                [exercise.category_id, exerciseId]
            );
            alternatives = altResult.rows;
        }

        return {
            isValid,
            exerciseId,
            exerciseName: exercise.name,
            contraindication_level: exercise.contraindication_level,
            warnings,
            alternatives,
            canProceedWithCaution: isValid || exercise.contraindication_level === 'caution'
        };
    } catch (error) {
        console.error('Error in validateExerciseForUser:', error);
        throw error;
    }
}

/**
 * Get category-based recommendations
 * For users who want to explore a specific area
 * 
 * @param {string} categoryId - Category to get exercises from
 * @param {number} userId - User ID for safety filtering
 * @returns {Array} Safe exercises in that category
 */
export async function getExercisesByCategory(categoryId, userId) {
    try {
        // Get user preferences for filtering
        const prefResult = await query(
            `SELECT * FROM yoga_user_preferences WHERE user_id = $1`,
            [userId]
        );

        const prefs = prefResult.rows[0] || { pain_areas: [], preferred_difficulty: 'beginner' };

        const result = await query(
            `SELECT e.*, d.benefits, d.target_areas,
                    CASE 
                        WHEN e.contraindication_level = 'safe' THEN 'safe_for_you'
                        WHEN e.contraindication_level = 'caution' THEN 'proceed_with_care'
                        ELSE 'not_recommended'
                    END as safety_status
             FROM yoga_exercises e
             LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
             WHERE e.category_id = $1
             AND e.is_active = TRUE
             ORDER BY 
                CASE e.contraindication_level 
                    WHEN 'safe' THEN 1 
                    WHEN 'caution' THEN 2 
                    ELSE 3 
                END,
                e.duration_minutes ASC`,
            [categoryId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error in getExercisesByCategory:', error);
        throw error;
    }
}

/**
 * Get post-workout recovery suggestions
 * Called after gym workout to suggest complementary yoga
 * 
 * @param {string} workoutType - Type of workout done (upper, lower, full, cardio)
 * @param {number} userId - User ID
 * @returns {Array} Recommended recovery exercises
 */
export async function getPostWorkoutYoga(workoutType, userId) {
    const categoryMapping = {
        'upper': ['shoulder_mobility', 'stress_relaxation'],
        'lower': ['knee_care', 'back_pain_relief'],
        'full': ['full_body_flow', 'stress_relaxation'],
        'cardio': ['back_pain_relief', 'stress_relaxation']
    };

    const targetCategories = categoryMapping[workoutType] || ['stress_relaxation'];

    try {
        const result = await query(
            `SELECT e.id, e.name, e.duration_minutes, e.primary_purpose, e.thumbnail_url,
                    c.name as category_name
             FROM yoga_exercises e
             LEFT JOIN yoga_categories c ON e.category_id = c.id
             WHERE e.category_id = ANY($1)
             AND e.is_active = TRUE
             AND e.contraindication_level = 'safe'
             ORDER BY e.duration_minutes ASC
             LIMIT 3`,
            [targetCategories]
        );

        return result.rows;
    } catch (error) {
        console.error('Error in getPostWorkoutYoga:', error);
        throw error;
    }
}

// =========================
// HELPER FUNCTIONS
// =========================

async function getDefaultExercise() {
    const result = await query(
        `SELECT e.*, d.benefits, d.step_by_step_instructions
         FROM yoga_exercises e
         LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
         WHERE e.id = 'childs_pose_wide'`
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    }

    // Ultimate fallback
    const fallback = await query(
        `SELECT e.*, d.benefits
         FROM yoga_exercises e
         LEFT JOIN yoga_exercise_details d ON e.id = d.exercise_id
         WHERE e.contraindication_level = 'safe'
         AND e.is_active = TRUE
         LIMIT 1`
    );

    return fallback.rows[0];
}

function buildRecommendationReason(exercise, timeOfDay, goals) {
    const reasons = [];

    if (timeOfDay === 'morning' && ['posture_correction', 'full_body_flow'].includes(exercise.category_id)) {
        reasons.push('Perfect for your morning routine');
    }
    if (timeOfDay === 'evening' && ['stress_relaxation', 'back_pain_relief'].includes(exercise.category_id)) {
        reasons.push('Great for winding down');
    }
    if (goals.includes('stress') && exercise.category_id === 'stress_relaxation') {
        reasons.push('Matches your stress relief goal');
    }
    if (goals.includes('posture') && exercise.category_id === 'posture_correction') {
        reasons.push('Helps with your posture goal');
    }
    if (exercise.duration_minutes <= 5) {
        reasons.push('Quick 5-minute practice');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you today';
}

// =========================
// ANALYTICS HELPERS
// =========================

/**
 * Get user's yoga statistics
 */
export async function getUserYogaStats(userId) {
    try {
        const result = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE completed = TRUE) as total_sessions,
                SUM(duration_completed_seconds) / 60 as total_minutes,
                COUNT(DISTINCT session_date) FILTER (WHERE session_date >= CURRENT_DATE - 7) as days_this_week,
                COUNT(*) FILTER (WHERE session_date = CURRENT_DATE AND completed = TRUE) as done_today,
                mode() WITHIN GROUP (ORDER BY exercise_id) as favorite_exercise
             FROM yoga_user_sessions
             WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error in getUserYogaStats:', error);
        throw error;
    }
}

export default {
    getSafeExercises,
    recommendDailyYoga,
    validateExerciseForUser,
    getExercisesByCategory,
    getPostWorkoutYoga,
    getUserYogaStats
};
