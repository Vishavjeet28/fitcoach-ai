/**
 * ============================================================================
 * WORKOUT LOGIC ENGINE (WLE)
 * ============================================================================
 * 
 * This is the SINGLE SOURCE OF TRUTH for workout program generation and
 * exercise calorie calculations in FitCoach AI.
 * 
 * ARCHITECTURE:
 * - Template-first (NOT free-form AI generation)
 * - AI tunes: volume, exercise selection, reps/sets, rest times
 * - MET-based calorie calculation
 * - Progressive overload tracking
 * 
 * Location: /backend/src/services/workoutLogicEngine.js
 * ============================================================================
 */

import { query } from '../config/database.js';

// ============================================================================
// WORKOUT TEMPLATES (AUTHORITATIVE)
// ============================================================================

// ============================================================================
// WARMUP & COOLDOWN ROUTINES
// ============================================================================
const WARMUP_ROUTINE = [
  { name: 'Jumping Jacks', sets: [2, 2, 2], reps: [30, 30, 30], met: 8.0, equipment: 'bodyweight', type: 'warmup' },
  { name: 'Arm Circles', sets: [2, 2, 2], reps: [15, 15, 15], met: 3.0, equipment: 'bodyweight', type: 'warmup' },
  { name: 'Bodyweight Squats', sets: [2, 2, 2], reps: [15, 15, 15], met: 5.0, equipment: 'bodyweight', type: 'warmup' }
];

const COOLDOWN_ROUTINE = [
  { name: 'Static Stretching', sets: [1, 1, 1], duration_min: 5, met: 2.5, equipment: 'none', type: 'cooldown' }
];

const WORKOUT_TEMPLATES = {
  push_pull_legs: {
    id: 'push_pull_legs',
    name: 'Push/Pull/Legs',
    description: 'Classic 3-day split focusing on movement patterns',
    frequency: 3,
    level: ['beginner', 'intermediate', 'advanced'],
    goal_compatibility: ['muscle_gain', 'recomposition', 'maintenance'],
    splits: [
      {
        day: 1,
        name: 'Push Day',
        muscle_groups: ['chest', 'shoulders', 'triceps'],
        exercises: [
          { name: 'Bench Press', sets: [3, 4, 5], reps: [8, 10, 12], met: 6.0, equipment: 'barbell' },
          { name: 'Overhead Press', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.0, equipment: 'barbell' },
          { name: 'Incline Dumbbell Press', sets: [3, 3, 4], reps: [10, 12, 12], met: 5.5, equipment: 'dumbbells' },
          { name: 'Lateral Raises', sets: [3, 3, 4], reps: [12, 15, 15], met: 3.5, equipment: 'dumbbells' },
          { name: 'Tricep Pushdown', sets: [3, 3, 3], reps: [12, 15, 15], met: 3.0, equipment: 'cable' }
        ]
      },
      {
        day: 2,
        name: 'Pull Day',
        muscle_groups: ['back', 'biceps'],
        exercises: [
          { name: 'Deadlift', sets: [3, 4, 5], reps: [5, 6, 8], met: 6.0, equipment: 'barbell' },
          { name: 'Pull-ups', sets: [3, 3, 4], reps: [6, 8, 10], met: 5.5, equipment: 'bodyweight' },
          { name: 'Barbell Row', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Face Pulls', sets: [3, 3, 3], reps: [15, 15, 20], met: 3.0, equipment: 'cable' },
          { name: 'Barbell Curl', sets: [3, 3, 3], reps: [10, 12, 12], met: 3.5, equipment: 'barbell' }
        ]
      },
      {
        day: 3,
        name: 'Leg Day',
        muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { name: 'Squat', sets: [3, 4, 5], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Romanian Deadlift', sets: [3, 3, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Leg Press', sets: [3, 3, 4], reps: [10, 12, 15], met: 5.0, equipment: 'machine' },
          { name: 'Leg Curl', sets: [3, 3, 3], reps: [12, 12, 15], met: 3.5, equipment: 'machine' },
          { name: 'Calf Raises', sets: [3, 4, 4], reps: [15, 15, 20], met: 3.0, equipment: 'machine' }
        ]
      }
    ]
  },

  upper_lower: {
    id: 'upper_lower',
    name: 'Upper/Lower Split',
    description: '4-day split alternating upper and lower body',
    frequency: 4,
    level: ['beginner', 'intermediate', 'advanced'],
    goal_compatibility: ['muscle_gain', 'recomposition', 'maintenance'],
    splits: [
      {
        day: 1,
        name: 'Upper A',
        muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
        exercises: [
          { name: 'Bench Press', sets: [3, 4, 5], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Barbell Row', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Overhead Press', sets: [3, 3, 4], reps: [8, 10, 12], met: 5.0, equipment: 'barbell' },
          { name: 'Lat Pulldown', sets: [3, 3, 3], reps: [10, 12, 12], met: 4.5, equipment: 'cable' },
          { name: 'Dumbbell Curl', sets: [3, 3, 3], reps: [12, 12, 15], met: 3.5, equipment: 'dumbbells' }
        ]
      },
      {
        day: 2,
        name: 'Lower A',
        muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { name: 'Squat', sets: [3, 4, 5], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Romanian Deadlift', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Leg Press', sets: [3, 3, 4], reps: [10, 12, 15], met: 5.0, equipment: 'machine' },
          { name: 'Leg Curl', sets: [3, 3, 3], reps: [12, 12, 15], met: 3.5, equipment: 'machine' },
          { name: 'Calf Raises', sets: [3, 3, 4], reps: [15, 15, 20], met: 3.0, equipment: 'machine' }
        ]
      },
      {
        day: 3,
        name: 'Upper B',
        muscle_groups: ['chest', 'back', 'shoulders', 'arms'],
        exercises: [
          { name: 'Incline Bench Press', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Pull-ups', sets: [3, 3, 4], reps: [6, 8, 10], met: 5.5, equipment: 'bodyweight' },
          { name: 'Dumbbell Press', sets: [3, 3, 4], reps: [10, 12, 12], met: 5.0, equipment: 'dumbbells' },
          { name: 'Cable Row', sets: [3, 3, 3], reps: [12, 12, 15], met: 4.5, equipment: 'cable' },
          { name: 'Tricep Pushdown', sets: [3, 3, 3], reps: [12, 15, 15], met: 3.0, equipment: 'cable' }
        ]
      },
      {
        day: 4,
        name: 'Lower B',
        muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { name: 'Front Squat', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Deadlift', sets: [3, 4, 5], reps: [5, 6, 8], met: 6.0, equipment: 'barbell' },
          { name: 'Bulgarian Split Squat', sets: [3, 3, 3], reps: [10, 12, 12], met: 4.5, equipment: 'dumbbells' },
          { name: 'Leg Extension', sets: [3, 3, 3], reps: [12, 15, 15], met: 3.5, equipment: 'machine' },
          { name: 'Seated Calf Raise', sets: [3, 3, 4], reps: [15, 15, 20], met: 2.5, equipment: 'machine' }
        ]
      }
    ]
  },

  full_body: {
    id: 'full_body',
    name: 'Full Body',
    description: '3-day full body routine for balanced development',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['fat_loss', 'maintenance', 'recomposition'],
    splits: [
      {
        day: 1,
        name: 'Full Body A',
        muscle_groups: ['full_body'],
        exercises: [
          { name: 'Squat', sets: [3, 4, 4], reps: [8, 10, 12], met: 6.0, equipment: 'barbell' },
          { name: 'Bench Press', sets: [3, 4, 4], reps: [8, 10, 12], met: 6.0, equipment: 'barbell' },
          { name: 'Barbell Row', sets: [3, 3, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Overhead Press', sets: [3, 3, 3], reps: [8, 10, 12], met: 5.0, equipment: 'barbell' },
          { name: 'Plank', sets: [3, 3, 3], reps: [30, 45, 60], met: 3.8, equipment: 'bodyweight' }
        ]
      },
      {
        day: 2,
        name: 'Full Body B',
        muscle_groups: ['full_body'],
        exercises: [
          { name: 'Deadlift', sets: [3, 4, 4], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Incline Bench Press', sets: [3, 3, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Pull-ups', sets: [3, 3, 4], reps: [6, 8, 10], met: 5.5, equipment: 'bodyweight' },
          { name: 'Leg Press', sets: [3, 3, 3], reps: [10, 12, 15], met: 5.0, equipment: 'machine' },
          { name: 'Face Pulls', sets: [3, 3, 3], reps: [15, 15, 20], met: 3.0, equipment: 'cable' }
        ]
      },
      {
        day: 3,
        name: 'Full Body C',
        muscle_groups: ['full_body'],
        exercises: [
          { name: 'Front Squat', sets: [3, 3, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Dumbbell Press', sets: [3, 3, 4], reps: [10, 12, 12], met: 5.0, equipment: 'dumbbells' },
          { name: 'Lat Pulldown', sets: [3, 3, 3], reps: [10, 12, 12], met: 4.5, equipment: 'cable' },
          { name: 'Romanian Deadlift', sets: [3, 3, 3], reps: [10, 12, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Cable Crunch', sets: [3, 3, 3], reps: [15, 15, 20], met: 3.5, equipment: 'cable' }
        ]
      }
    ]
  },

  bro_split: {
    id: 'bro_split',
    name: 'Bro Split (5-Day)',
    description: 'One muscle group per day for advanced lifters',
    frequency: 5,
    level: ['advanced'],
    goal_compatibility: ['muscle_gain'],
    splits: [
      {
        day: 1,
        name: 'Chest Day',
        muscle_groups: ['chest'],
        exercises: [
          { name: 'Bench Press', sets: [4, 5, 5], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Incline Dumbbell Press', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'dumbbells' },
          { name: 'Cable Fly', sets: [3, 3, 4], reps: [12, 12, 15], met: 4.0, equipment: 'cable' },
          { name: 'Dips', sets: [3, 3, 3], reps: [8, 10, 12], met: 5.0, equipment: 'bodyweight' },
          { name: 'Chest Fly Machine', sets: [3, 3, 3], reps: [12, 15, 15], met: 3.5, equipment: 'machine' }
        ]
      },
      {
        day: 2,
        name: 'Back Day',
        muscle_groups: ['back'],
        exercises: [
          { name: 'Deadlift', sets: [4, 5, 5], reps: [5, 6, 8], met: 6.0, equipment: 'barbell' },
          { name: 'Pull-ups', sets: [3, 4, 4], reps: [6, 8, 10], met: 5.5, equipment: 'bodyweight' },
          { name: 'Barbell Row', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Lat Pulldown', sets: [3, 3, 3], reps: [10, 12, 12], met: 4.5, equipment: 'cable' },
          { name: 'Face Pulls', sets: [3, 3, 3], reps: [15, 15, 20], met: 3.0, equipment: 'cable' }
        ]
      },
      {
        day: 3,
        name: 'Shoulder Day',
        muscle_groups: ['shoulders'],
        exercises: [
          { name: 'Overhead Press', sets: [4, 5, 5], reps: [6, 8, 10], met: 5.0, equipment: 'barbell' },
          { name: 'Lateral Raises', sets: [3, 4, 4], reps: [12, 15, 15], met: 3.5, equipment: 'dumbbells' },
          { name: 'Front Raises', sets: [3, 3, 3], reps: [12, 12, 15], met: 3.5, equipment: 'dumbbells' },
          { name: 'Rear Delt Fly', sets: [3, 3, 4], reps: [12, 15, 15], met: 3.0, equipment: 'dumbbells' },
          { name: 'Upright Row', sets: [3, 3, 3], reps: [10, 12, 12], met: 4.0, equipment: 'barbell' }
        ]
      },
      {
        day: 4,
        name: 'Leg Day',
        muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          { name: 'Squat', sets: [4, 5, 5], reps: [6, 8, 10], met: 6.0, equipment: 'barbell' },
          { name: 'Romanian Deadlift', sets: [3, 4, 4], reps: [8, 10, 12], met: 5.5, equipment: 'barbell' },
          { name: 'Leg Press', sets: [3, 4, 4], reps: [10, 12, 15], met: 5.0, equipment: 'machine' },
          { name: 'Leg Curl', sets: [3, 3, 4], reps: [12, 12, 15], met: 3.5, equipment: 'machine' },
          { name: 'Calf Raises', sets: [4, 4, 4], reps: [15, 15, 20], met: 3.0, equipment: 'machine' }
        ]
      },
      {
        day: 5,
        name: 'Arm Day',
        muscle_groups: ['biceps', 'triceps'],
        exercises: [
          { name: 'Barbell Curl', sets: [3, 4, 4], reps: [8, 10, 12], met: 3.5, equipment: 'barbell' },
          { name: 'Tricep Pushdown', sets: [3, 4, 4], reps: [10, 12, 15], met: 3.0, equipment: 'cable' },
          { name: 'Hammer Curl', sets: [3, 3, 3], reps: [10, 12, 12], met: 3.5, equipment: 'dumbbells' },
          { name: 'Overhead Tricep Extension', sets: [3, 3, 3], reps: [10, 12, 12], met: 3.0, equipment: 'dumbbells' },
          { name: 'Cable Curl', sets: [3, 3, 3], reps: [12, 15, 15], met: 3.0, equipment: 'cable' }
        ]
      }
    ]
  },

  cardio_hiit: {
    id: 'cardio_hiit',
    name: 'HIIT Cardio Program',
    description: 'High-Intensity Interval Training for fat loss',
    frequency: 3,
    level: ['beginner', 'intermediate', 'advanced'],
    goal_compatibility: ['fat_loss', 'maintenance'],
    splits: [
      {
        day: 1,
        name: 'HIIT Session A',
        muscle_groups: ['cardio'],
        exercises: [
          { name: 'Sprint Intervals', sets: [8, 10, 12], reps: [30, 30, 30], met: 12.5, equipment: 'none' },
          { name: 'Burpees', sets: [3, 4, 4], reps: [10, 12, 15], met: 8.0, equipment: 'bodyweight' },
          { name: 'Jump Rope', sets: [3, 4, 4], reps: [60, 60, 90], met: 11.0, equipment: 'jump_rope' },
          { name: 'Mountain Climbers', sets: [3, 3, 4], reps: [20, 30, 30], met: 8.0, equipment: 'bodyweight' }
        ]
      },
      {
        day: 2,
        name: 'HIIT Session B',
        muscle_groups: ['cardio'],
        exercises: [
          { name: 'Bike Sprints', sets: [8, 10, 12], reps: [30, 30, 30], met: 14.0, equipment: 'bike' },
          { name: 'Box Jumps', sets: [3, 4, 4], reps: [10, 12, 15], met: 8.0, equipment: 'box' },
          { name: 'Battle Ropes', sets: [3, 3, 4], reps: [30, 45, 45], met: 10.0, equipment: 'battle_ropes' },
          { name: 'High Knees', sets: [3, 3, 3], reps: [30, 45, 45], met: 8.0, equipment: 'bodyweight' }
        ]
      },
      {
        day: 3,
        name: 'HIIT Session C',
        muscle_groups: ['cardio'],
        exercises: [
          { name: 'Rowing Intervals', sets: [8, 10, 12], reps: [30, 30, 30], met: 12.0, equipment: 'rowing_machine' },
          { name: 'Kettlebell Swings', sets: [3, 4, 4], reps: [15, 20, 20], met: 9.8, equipment: 'kettlebell' },
          { name: 'Jumping Jacks', sets: [3, 3, 4], reps: [30, 40, 50], met: 7.0, equipment: 'bodyweight' },
          { name: 'Plank Jacks', sets: [3, 3, 3], reps: [20, 30, 30], met: 7.0, equipment: 'bodyweight' }
        ]
      }
    ]
  }
};

// ============================================================================
// MET-BASED CALORIE CALCULATION
// ============================================================================

/**
 * Calculate calories burned for a workout session
 * Formula: (MET × weight_kg × duration_minutes) / 60
 * 
 * @param {number} met - Metabolic Equivalent of Task
 * @param {number} weight_kg - User's body weight in kg
 * @param {number} duration_minutes - Total workout duration
 * @returns {number} Estimated calories burned
 */
const calculateCaloriesBurned = (met, weight_kg, duration_minutes) => {
  if (!met || !weight_kg || !duration_minutes) return 0;
  return Math.round((met * weight_kg * duration_minutes) / 60);
};

/**
 * Calculate total session calories from exercise list
 * 
 * @param {Array} exercises - List of exercises with MET values
 * @param {number} weight_kg - User's body weight
 * @returns {number} Total estimated calories
 */
const calculateSessionCalories = (exercises, weight_kg) => {
  let totalCalories = 0;

  exercises.forEach(exercise => {
    if (!exercise) return; // Skip if exercise is undefined

    // Use selected_sets if available (tuned exercise), otherwise default to 3
    const sets = exercise.selected_sets || (exercise.sets && exercise.sets[1]) || 3;

    // Estimate 2 minutes per set (work + rest)
    const estimatedMinutes = sets * 2;

    // Get MET value from exercise
    const met = exercise.met || 5.0; // Default to 5.0 if not specified

    const calories = calculateCaloriesBurned(met, weight_kg, estimatedMinutes);
    totalCalories += calories;
  });

  return totalCalories;
};

// ============================================================================
// TEMPLATE SELECTION LOGIC
// ============================================================================

/**
 * Select the most appropriate workout template based on user profile
 * 
 * @param {Object} userProfile - User's fitness profile
 * @returns {Object} Selected template with reasoning
 */
const selectTemplate = (userProfile) => {
  const { goal, experience_level, available_days, equipment_access } = userProfile;

  let selectedTemplate = null;
  let reasoning = '';

  // Goal-based primary filter
  if (goal === 'fat_loss') {
    if (available_days >= 3 && experience_level !== 'beginner') {
      selectedTemplate = WORKOUT_TEMPLATES.cardio_hiit;
      reasoning = 'HIIT is optimal for fat loss with efficient calorie burn';
    } else {
      selectedTemplate = WORKOUT_TEMPLATES.full_body;
      reasoning = 'Full body workouts 3x/week provide excellent fat loss results for beginners';
    }
  } else if (goal === 'muscle_gain') {
    if (available_days >= 5 && experience_level === 'advanced') {
      selectedTemplate = WORKOUT_TEMPLATES.bro_split;
      reasoning = 'Bro split allows maximum volume per muscle group for advanced lifters';
    } else if (available_days >= 4) {
      selectedTemplate = WORKOUT_TEMPLATES.upper_lower;
      reasoning = 'Upper/Lower split balances frequency and volume for muscle growth';
    } else {
      selectedTemplate = WORKOUT_TEMPLATES.push_pull_legs;
      reasoning = 'Push/Pull/Legs fits 3-day schedule while targeting all muscle groups';
    }
  } else if (goal === 'maintenance' || goal === 'recomposition') {
    if (available_days >= 4) {
      selectedTemplate = WORKOUT_TEMPLATES.upper_lower;
      reasoning = 'Upper/Lower provides balanced maintenance with moderate frequency';
    } else {
      selectedTemplate = WORKOUT_TEMPLATES.full_body;
      reasoning = 'Full body 3x/week maintains strength and muscle efficiently';
    }
  }

  // Fallback
  if (!selectedTemplate) {
    selectedTemplate = WORKOUT_TEMPLATES.full_body;
    reasoning = 'Full body is the most versatile template for your profile';
  }

  return { template: selectedTemplate, reasoning };
};

// ============================================================================
// AI TUNING PARAMETERS
// ============================================================================

/**
 * Adjust workout volume based on experience level
 * Returns [sets_index] where 0=beginner, 1=intermediate, 2=advanced
 */
const getVolumeIndex = (experience_level) => {
  switch (experience_level) {
    case 'beginner': return 0;
    case 'intermediate': return 1;
    case 'advanced': return 2;
    default: return 1;
  }
};

/**
 * Apply AI tuning to template exercises
 * AI adjusts: sets, reps, rest times (NOT exercises themselves)
 * 
 * @param {Object} template - Base template
 * @param {Object} userProfile - User's profile
 * @returns {Object} Tuned program
 */
const tuneProgram = (template, userProfile) => {
  const volumeIndex = getVolumeIndex(userProfile.experience_level);
  const tunedSplits = [];

  template.splits.forEach(split => {
    const tunedExercises = split.exercises.map(exercise => {
      // Select appropriate volume based on experience
      const selected_sets = exercise.sets[volumeIndex];
      const selected_reps = exercise.reps[volumeIndex];

      // Adjust rest times based on exercise intensity
      let rest_seconds = 90; // Default
      if (exercise.met >= 6.0) rest_seconds = 180; // Heavy compounds
      else if (exercise.met >= 4.5) rest_seconds = 120; // Moderate
      else rest_seconds = 60; // Accessories

      return {
        ...exercise,
        selected_sets,
        selected_reps,
        rest_seconds,
        estimated_duration_min: selected_sets * 2 // 2 min per set (work + rest)
      };
    });

    // Calculate split duration
    const total_duration = tunedExercises.reduce((sum, ex) => sum + ex.estimated_duration_min, 0);

    tunedSplits.push({
      ...split,
      exercises: tunedExercises,
      total_duration_min: total_duration
    });
  });

  return {
    ...template,
    splits: tunedSplits,
    tuned_for: userProfile.experience_level
  };
};

// ============================================================================
// MAIN WORKOUT LOGIC ENGINE CLASS
// ============================================================================

class WorkoutLogicEngine {

  /**
   * Helper: Enrich template exercises with DB data
   */
  async enrichExercisesWithDB(exercises) {
    if (!exercises || exercises.length === 0) return exercises;

    try {
      const names = exercises.map(ex => ex.name.toLowerCase());

      const result = await query(
        `SELECT * FROM exercises WHERE LOWER(name) = ANY($1)`,
        [names]
      );

      const dbMap = new Map(result.rows.map(ex => [ex.name.toLowerCase(), ex]));

      return exercises.map(ex => {
        const dbEx = dbMap.get(ex.name.toLowerCase());
        if (dbEx) {
          return {
            ...ex,
            id: dbEx.id,
            met: parseFloat(dbEx.met_value) || ex.met,
            category: dbEx.category,
            equipment: (dbEx.equipment_needed && dbEx.equipment_needed[0]) || ex.equipment,
            instructions: dbEx.instructions || [],
            tips: dbEx.tips || [],
            target_muscles: dbEx.target_muscles || [],
            video_url: dbEx.video_url || null,
            is_verified: true
          };
        }
        return ex;
      });
    } catch (error) {
      console.warn('Failed to enrich exercises from DB:', error.message);
      return exercises;
    }
  }

  /**
   * Get all available templates
   */
  getTemplates() {
    return Object.values(WORKOUT_TEMPLATES);
  }

  /**
   * Get specific template by ID
   */
  getTemplate(templateId) {
    return WORKOUT_TEMPLATES[templateId] || null;
  }

  /**
   * Recommend workout program for user
   * 
   * @param {number} userId - User ID
   * @returns {Object} Recommended program with tuning
   */
  async recommendProgram(userId) {
    try {
      // 1. Get user profile
      const userResult = await query(
        `SELECT weight, age, gender, goal, activity_level, workout_level 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // 2. Get or create workout preferences
      const prefsResult = await query(
        `SELECT experience_level, available_days, equipment_access 
         FROM workout_preferences WHERE user_id = $1`,
        [userId]
      );

      let preferences = prefsResult.rows[0];
      if (!preferences) {
        // Default preferences
        preferences = {
          experience_level: 'beginner',
          available_days: 3,
          equipment_access: 'gym'
        };
      }

      const userProfile = {
        ...user,
        ...preferences,
        experience_level: user.workout_level || preferences.experience_level || 'beginner',
        weight_kg: parseFloat(user.weight)
      };

      // 3. Select template
      const { template, reasoning } = selectTemplate(userProfile);

      // 4. Tune program
      const tunedProgram = tuneProgram(template, userProfile);

      // Inject Warmup/Cooldown
      tunedProgram.warmup = WARMUP_ROUTINE;
      tunedProgram.cooldown = COOLDOWN_ROUTINE;

      // 5. Enrich and calculate stats
      for (let i = 0; i < tunedProgram.splits.length; i++) {
        tunedProgram.splits[i].exercises = await this.enrichExercisesWithDB(tunedProgram.splits[i].exercises);
        tunedProgram.splits[i].estimated_calories = calculateSessionCalories(
          tunedProgram.splits[i].exercises,
          userProfile.weight_kg
        );
      }

      // 6. SAVE TO DATABASE (Critical Step)
      // First, deactivate any existing programs
      await query(
        `UPDATE workout_programs SET is_active = FALSE WHERE user_id = $1`,
        [userId]
      );

      // Insert new program
      const savedProgram = await query(
        `INSERT INTO workout_programs (
          user_id, template_id, template_name, frequency, 
          start_date, tuned_for, tuning_notes, is_active
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, TRUE)
        RETURNING *`,
        [
          userId,
          tunedProgram.id,
          tunedProgram.name,
          tunedProgram.frequency,
          userProfile.experience_level,
          reasoning
        ]
      );

      return {
        success: true,
        data: {
          program: tunedProgram,
          db_program: savedProgram.rows[0],
          reasoning,
          user_profile: {
            goal: user.goal,
            experience: preferences.experience_level,
            days_available: preferences.available_days
          }
        }
      };

    } catch (error) {
      console.error('Workout recommendation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get daily workout for user
   * Based on current week cycle
   * 
   * @param {number} userId - User ID
   * @returns {Object} Today's workout
   */
  async getDailyWorkout(userId) {
    try {
      // Get user's active program
      const programResult = await query(
        `SELECT * FROM workout_programs 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (programResult.rows.length === 0) {
        // No active program - generate recommendation
        return await this.recommendProgram(userId);
      }

      const program = programResult.rows[0];
      const template = this.getTemplate(program.template_id);

      if (!template) {
        throw new Error('Template not found');
      }

      // Calculate which day in cycle (1-based)
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(program.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const currentDay = (daysSinceStart % template.frequency) + 1;
      const todaySplit = template.splits[currentDay - 1];

      // Enrich exercises from DB
      const enrichedExercises = await this.enrichExercisesWithDB(todaySplit.exercises);
      const outputSplit = { ...todaySplit, exercises: enrichedExercises };

      // Get user weight for calorie calculation
      const userResult = await query(
        `SELECT weight FROM users WHERE id = $1`,
        [userId]
      );
      const weight_kg = parseFloat(userResult.rows[0].weight);

      return {
        success: true,
        data: {
          program_id: program.id,
          program_name: template.name,
          day: currentDay,
          total_days: template.frequency,
          split: outputSplit,
          warmup: WARMUP_ROUTINE,
          cooldown: COOLDOWN_ROUTINE,
          estimated_calories: calculateSessionCalories(outputSplit.exercises, weight_kg)
        }
      };

    } catch (error) {
      console.error('Get daily workout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log workout session
   * 
   * @param {number} userId - User ID
   * @param {Object} sessionData - Workout session details
   * @returns {Object} Created session
   */
  async logSession(userId, sessionData) {
    try {
      const {
        program_id,
        split_name,
        exercises_completed,
        duration_minutes,
        notes
      } = sessionData;

      // Get user weight
      const userResult = await query(
        `SELECT weight FROM users WHERE id = $1`,
        [userId]
      );
      const weight_kg = parseFloat(userResult.rows[0].weight);

      // Calculate calories burned
      const totalCalories = exercises_completed.reduce((sum, ex) => {
        return sum + calculateCaloriesBurned(ex.met, weight_kg, ex.duration_min);
      }, 0);

      // Insert session
      const result = await query(
        `INSERT INTO workout_sessions (
          user_id, program_id, split_name, 
          exercises_completed, duration_minutes, 
          calories_burned, notes, session_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
        RETURNING *`,
        [
          userId,
          program_id,
          split_name,
          JSON.stringify(exercises_completed),
          duration_minutes,
          totalCalories,
          notes
        ]
      );

      // --- LEGACY SUPPORT: Dual-write to exercise_logs for HistoryScreen compatibility ---
      // This ensures the workout appears in the existing History/Analytics views
      const dateStr = new Date().toISOString().split('T')[0];

      if (exercises_completed.length > 0) {
        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const ex of exercises_completed) {
          // Find exercise ID if possible
          let exerciseId = ex.id;

          // Use default met if missing
          const met = ex.met || 5.0;
          const cals = calculateCaloriesBurned(met, weight_kg, ex.duration_min || 10);

          params.push(
            userId,
            exerciseId || null,
            ex.name,
            ex.duration_min || 10,
            Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 3),
            Array.isArray(ex.reps) ? Math.max(...ex.reps) : (ex.reps || 10),
            0, // Default weight (or could avg it)
            cals,
            dateStr
          );

          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);
          paramIndex += 9;
        }

        await query(
          `INSERT INTO exercise_logs (
            user_id, exercise_id, custom_exercise_name,
            duration_minutes, sets, reps, weight_kg,
            calories_burned, workout_date
          ) VALUES ${values.join(', ')}`,
          params
        );
      }
      // --------------------------------------------------------------------------------

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      console.error('Log workout session error:', error);
      throw error;
    }
  }

  /**
   * Calculate MET-based calories for custom exercise
   * 
   * @param {string} exerciseName - Exercise name
   * @param {number} weight_kg - User weight
   * @param {number} duration_minutes - Duration
   * @returns {number} Calories burned
   */
  calculateExerciseCalories(exerciseName, weight_kg, duration_minutes) {
    // Find exercise in templates
    let met = 5.0; // Default moderate intensity

    for (const template of Object.values(WORKOUT_TEMPLATES)) {
      for (const split of template.splits) {
        const exercise = split.exercises.find(ex =>
          ex.name.toLowerCase() === exerciseName.toLowerCase()
        );
        if (exercise) {
          met = exercise.met;
          break;
        }
      }
    }

    return calculateCaloriesBurned(met, weight_kg, duration_minutes);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export default new WorkoutLogicEngine();
