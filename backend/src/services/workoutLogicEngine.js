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
    benefits: ['Balanced muscle growth', 'High frequency per muscle', 'Flexible scheduling'],
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
    benefits: ['Great for strength', '4 days/week active', 'Good recovery balance'],
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
    benefits: ['High calorie burn', 'Perfect for beginners', 'Missed days are less impactful'],
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
    benefits: ['Maximum focus per muscle', 'Simple to follow', 'High volume'],
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
    benefits: ['Rapid fat loss', 'Short workout duration', 'Improved heart health'],
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
  },

  powerlifting: {
    id: 'powerlifting',
    name: 'Powerlifting Split',
    description: 'Focus on the "Big 3" lifts (Squat, Bench, Deadlift) to maximize raw strength. \nPrioritizes low reps with heavy weights and long rest periods.',
    frequency: 4,
    level: ['intermediate', 'advanced'],
    goal_compatibility: ['strength'],
    benefits: ['Maximize raw strength', 'Improve bone density', 'Master compound lifts'],
    splits: [
      { day: 1, name: 'Squat Focus', muscle_groups: ['legs'], exercises: [{ name: 'Squat', sets: 5, reps: 5, met: 6.0 }, { name: 'Leg Press', sets: 3, reps: 8, met: 5.0 }] },
      { day: 2, name: 'Bench Focus', muscle_groups: ['chest'], exercises: [{ name: 'Bench Press', sets: 5, reps: 5, met: 6.0 }, { name: 'Close Grip Bench', sets: 3, reps: 8, met: 5.5 }] },
      { day: 3, name: 'Deadlift Focus', muscle_groups: ['back'], exercises: [{ name: 'Deadlift', sets: 5, reps: 3, met: 6.0 }, { name: 'Barbell Row', sets: 3, reps: 8, met: 5.5 }] },
      { day: 4, name: 'Accessory Day', muscle_groups: ['shoulders', 'arms'], exercises: [{ name: 'Overhead Press', sets: 4, reps: 6, met: 5.0 }, { name: 'Dips', sets: 3, reps: 10, met: 5.0 }] },
    ]
  },

  phul: {
    id: 'phul',
    name: 'PHUL',
    description: 'Power Hypertrophy Upper Lower. Blends strength and size training. \nBuilds heavy strength early in the week and muscle volume later.',
    frequency: 4,
    level: ['intermediate'],
    goal_compatibility: ['muscle_gain', 'strength'],
    benefits: ['Best of both worlds (Size & Strength)', 'High frequency training', 'Balanced physique'],
    splits: [
      { day: 1, name: 'Upper Power', muscle_groups: ['upper'], exercises: [{ name: 'Barbell Row', sets: 4, reps: 5, met: 6.0 }, { name: 'Bench Press', sets: 4, reps: 5, met: 6.0 }] },
      { day: 2, name: 'Lower Power', muscle_groups: ['lower'], exercises: [{ name: 'Squat', sets: 4, reps: 5, met: 6.0 }, { name: 'Deadlift', sets: 4, reps: 5, met: 6.0 }] },
      { day: 3, name: 'Upper Hypertrophy', muscle_groups: ['upper'], exercises: [{ name: 'Incline Dumbbell Press', sets: 3, reps: 10, met: 5.0 }, { name: 'Lat Pulldown', sets: 3, reps: 10, met: 4.5 }] },
      { day: 4, name: 'Lower Hypertrophy', muscle_groups: ['lower'], exercises: [{ name: 'Front Squat', sets: 3, reps: 10, met: 5.5 }, { name: 'Lunges', sets: 3, reps: 12, met: 5.0 }] }
    ]
  },

  phat: {
    id: 'phat',
    name: 'PHAT',
    description: 'Power Hypertrophy Adaptive Training. High volume & intensity. \nCombines powerlifting speed work with bodybuilding volume.',
    frequency: 5,
    level: ['advanced'],
    goal_compatibility: ['muscle_gain', 'strength'],
    benefits: ['Maximum muscle hypertrophy', 'Break through plateaus', 'High calorie burn'],
    splits: [
      { day: 1, name: 'Upper Power', exercises: [{ name: 'Barbell Row', sets: 3, reps: 5 }, { name: 'Weighted Pullups', sets: 2, reps: 8 }] },
      { day: 2, name: 'Lower Power', exercises: [{ name: 'Squat', sets: 3, reps: 5 }, { name: 'RDL', sets: 3, reps: 8 }] },
      { day: 3, name: 'Back & Shoulders Hypertrophy', exercises: [{ name: 'Rack Chins', sets: 3, reps: 10 }, { name: 'Seated Press', sets: 3, reps: 12 }] },
      { day: 4, name: 'Legs Hypertrophy', exercises: [{ name: 'Leg Press', sets: 3, reps: 15 }, { name: 'Hack Squat', sets: 3, reps: 12 }] },
      { day: 5, name: 'Chest & Arms Hypertrophy', exercises: [{ name: 'Dumbbell Press', sets: 3, reps: 12 }, { name: 'Preacher Curl', sets: 3, reps: 12 }] }
    ]
  },

  cardio_strength: {
    id: 'cardio_strength',
    name: 'Cardio + Strength Hybrid',
    description: 'Balanced approach for general fitness and heart health. \nCombines resistance training with steady state cardio sessions.',
    frequency: 4,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['fat_loss', 'maintenance', 'cardio'],
    benefits: ['Improved endurance', 'Heart health', 'Sustainable fat loss'],
    splits: [
      { day: 1, name: 'Full Body Strength', exercises: [{ name: 'Goblet Squat', sets: 3, reps: 12 }, { name: 'Pushups', sets: 3, reps: 10 }] },
      { day: 2, name: 'Steady State Cardio', exercises: [{ name: 'Jogging', duration_min: 30, met: 7.0 }] },
      { day: 3, name: 'Full Body Strength', exercises: [{ name: 'Dumbbell Row', sets: 3, reps: 12 }, { name: 'Lunges', sets: 3, reps: 12 }] },
      { day: 4, name: 'HIIT Cardio', exercises: [{ name: 'Sprint Intervals', duration_min: 20, met: 10.0 }] }
    ]
  },

  functional: {
    id: 'functional',
    name: 'Functional Training Split',
    description: 'Focuses on movement patterns used in daily life. \nPrioritizes core stability, balance, and multi-planar movements.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['functional', 'mobility'],
    benefits: ['Real-world strength', 'Injury prevention', 'Better coordination'],
    splits: [
      { day: 1, name: 'Hinge & Push', exercises: [{ name: 'Kettlebell Swing', sets: 3, reps: 15 }, { name: 'Pushups', sets: 3, reps: 12 }] },
      { day: 2, name: 'Squat & Pull', exercises: [{ name: 'Goblet Squat', sets: 3, reps: 12 }, { name: 'TRX Row', sets: 3, reps: 12 }] },
      { day: 3, name: 'Lunge & Rotate', exercises: [{ name: 'Walking Lunges', sets: 3, reps: 20 }, { name: 'Russian Twist', sets: 3, reps: 20 }] }
    ]
  },

  calisthenics: {
    id: 'calisthenics',
    name: 'Calisthenics Split',
    description: 'Bodyweight-only mastery. \nBuild muscle and control using only your own body weight.',
    frequency: 4,
    level: ['beginner', 'intermediate', 'advanced'],
    goal_compatibility: ['muscle_gain', 'strength', 'mobility'],
    benefits: ['Master body control', 'No equipment needed', 'Gymnastic strength'],
    splits: [
      { day: 1, name: 'Push Skills', exercises: [{ name: 'Pushups', sets: 4, reps: 15 }, { name: 'Dips', sets: 3, reps: 10 }] },
      { day: 2, name: 'Pull Skills', exercises: [{ name: 'Pullups', sets: 4, reps: 8 }, { name: 'Bodyweight Row', sets: 3, reps: 12 }] },
      { day: 3, name: 'Leg Skills', exercises: [{ name: 'Pistol Squat Progression', sets: 3, reps: 5 }, { name: 'Lunges', sets: 3, reps: 20 }] },
      { day: 4, name: 'Core & Static', exercises: [{ name: 'L-Sit Hold', sets: 3, duration: '20s' }, { name: 'Plank', sets: 3, duration: '60s' }] }
    ]
  },

  home_workout: {
    id: 'home_workout',
    name: 'Home Workout Split',
    description: 'Effective training with minimal space and equipment. \nPerfect for busy schedules and working out from home.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['maintenance', 'fat_loss'],
    benefits: ['Convenient', 'Zero cost', 'Equipment-free'],
    splits: [
      { day: 1, name: 'Living Room Full Body', exercises: [{ name: 'Squats', sets: 3, reps: 20 }, { name: 'Pushups', sets: 3, reps: 15 }] },
      { day: 2, name: 'Bedroom Core & Cardio', exercises: [{ name: 'Mountain Climbers', sets: 3, reps: 30 }, { name: 'Bicycle Crunch', sets: 3, reps: 20 }] },
      { day: 3, name: 'Kitchen Legs & Glutes', exercises: [{ name: 'Glute Bridge', sets: 3, reps: 20 }, { name: 'Lunges', sets: 3, reps: 20 }] }
    ]
  },

  sports_specific: {
    id: 'sports_specific',
    name: 'Sports-Specific Split',
    description: 'Athlete-focused training for speed, agility, and power. \nEnhances explosive performance for field and court sports.',
    frequency: 3,
    level: ['intermediate', 'advanced'],
    goal_compatibility: ['performance', 'mobility'],
    benefits: ['Increase speed & agility', 'Explosive power', 'Injury resilience'],
    splits: [
      { day: 1, name: 'Power & Speed', exercises: [{ name: 'Box Jumps', sets: 4, reps: 5 }, { name: 'Sprint Intervals', duration_min: 15 }] },
      { day: 2, name: 'Strength & Stability', exercises: [{ name: 'Trap Bar Deadlift', sets: 3, reps: 5 }, { name: 'Single Leg RDL', sets: 3, reps: 8 }] },
      { day: 3, name: 'Agility & Conditioning', exercises: [{ name: 'Ladder Drills', duration_min: 10 }, { name: 'Burpees', sets: 3, reps: 15 }] }
    ]
  },

  posture_correction: {
    id: 'posture_correction',
    name: 'Posture Correction Split',
    description: 'Corrects forward head and rounded shoulders. \nStrengthens the upper back and core while stretching tight chest muscles.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['rehab', 'mobility'],
    benefits: ['Fix "Tech Neck"', 'Stand taller', 'Reduce neck pain'],
    splits: [
      { day: 1, name: 'Upper Back Focus', exercises: [{ name: 'Face Pulls', sets: 3, reps: 15 }, { name: 'Doorway Stretch', duration: '60s' }] },
      { day: 2, name: 'Core & Glutes', exercises: [{ name: 'Bird Dog', sets: 3, reps: 10 }, { name: 'Glute Bridge', sets: 3, reps: 15 }] },
      { day: 3, name: 'Thoracic Mobility', exercises: [{ name: 'Cat Cow', duration: '60s' }, { name: 'Y-W-T Raises', sets: 3, reps: 10 }] }
    ]
  },

  back_pain_rehab: {
    id: 'back_pain_rehab',
    name: 'Back Pain Rehab Split',
    description: 'Gentle strengthening for a healthy spine. \nFocuses on core stability and glute activation to support the lower back.',
    frequency: 3,
    level: ['beginner'],
    goal_compatibility: ['rehab', 'mobility'],
    benefits: ['Reduce lower back pain', 'Strengthen core corset', 'Pain-free movement'],
    splits: [
      { day: 1, name: 'Core Stability', exercises: [{ name: 'Dead Bug', sets: 3, reps: 10 }, { name: 'Bird Dog', sets: 3, reps: 10 }] },
      { day: 2, name: 'Glute Activation', exercises: [{ name: 'Clamshells', sets: 3, reps: 15 }, { name: 'Glute Bridge', sets: 3, reps: 12 }] },
      { day: 3, name: 'Gentle Mobility', exercises: [{ name: 'Cat Cow', duration: '60s' }, { name: 'Childs Pose', duration: '60s' }] }
    ]
  },

  knee_pain_friendly: {
    id: 'knee_pain_friendly',
    name: 'Knee Pain Friendly Split',
    description: 'Low-impact muscle building that spares the knees. \nBuilds leg strength without heavy loading or high impact.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['rehab', 'muscle_gain'],
    benefits: ['Build legs pain-free', 'Low joint impact', 'Strengthen supporting muscles'],
    splits: [
      { day: 1, name: 'Posterior Chain', exercises: [{ name: 'Romanian Deadlift', sets: 3, reps: 10 }, { name: 'Glute Bridge', sets: 3, reps: 15 }] },
      { day: 2, name: 'Low Impact Cardio', exercises: [{ name: 'Swimming', duration_min: 20 }, { name: 'Elliptical', duration_min: 15 }] },
      { day: 3, name: 'Iso & Stability', exercises: [{ name: 'Wall Sit', sets: 3, duration: '45s' }, { name: 'Side Leg Raises', sets: 3, reps: 15 }] }
    ]
  },

  shoulder_rehab: {
    id: 'shoulder_rehab',
    name: 'Shoulder Rehab Split',
    description: 'Rotator cuff and scapular stability focus. \nImproving shoulder health and range of motion.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['rehab', 'mobility'],
    benefits: ['Bulletproof shoulders', 'Improve overhead mobility', 'Reduce impingement'],
    splits: [
      { day: 1, name: 'Rotator Cuff', exercises: [{ name: 'External Rotations', sets: 3, reps: 15 }, { name: 'Internal Rotations', sets: 3, reps: 15 }] },
      { day: 2, name: 'Scapular Stability', exercises: [{ name: 'Scapular Pushups', sets: 3, reps: 12 }, { name: 'Face Pulls', sets: 3, reps: 15 }] },
      { day: 3, name: 'Mobility', exercises: [{ name: 'Wall Angels', sets: 3, reps: 10 }, { name: 'Arm Circles', duration: '60s' }] }
    ]
  },

  mobility_flexibility: {
    id: 'mobility_flexibility',
    name: 'Mobility & Flexibility Split',
    description: 'Dedicated routine for joint health and range of motion. \nCombines yoga flows with dynamic stretching.',
    frequency: 3,
    level: ['beginner', 'intermediate', 'advanced'],
    goal_compatibility: ['mobility', 'recovery'],
    benefits: ['Feel younger', 'Move freely', 'Improve posture'],
    splits: [
      { day: 1, name: 'Lower Body Flow', exercises: [{ name: 'Pigeon Pose', duration: '60s' }, { name: 'World\'s Greatest Stretch', sets: 3, reps: 5 }] },
      { day: 2, name: 'Upper Body Flow', exercises: [{ name: 'Doorway Stretch', duration: '60s' }, { name: 'T-Spine Rotation', sets: 3, reps: 10 }] },
      { day: 3, name: 'Full Body Release', exercises: [{ name: 'Foam Rolling', duration_min: 10 }, { name: 'Deep Squat Hold', duration: '60s' }] }
    ]
  },

  core_focused: {
    id: 'core_focused',
    name: 'Core-Focused Split',
    description: 'Intense ab and core work for stability and aesthetics. \nTargets upper abs, lower abs, obliques, and lower back.',
    frequency: 3,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['aesthetics', 'strength'],
    benefits: ['Six-pack abs', 'Bulletproof core', 'Better balance'],
    splits: [
      { day: 1, name: 'Front Core', exercises: [{ name: 'Crunches', sets: 3, reps: 20 }, { name: 'Leg Raises', sets: 3, reps: 15 }] },
      { day: 2, name: 'Obliques & Rotation', exercises: [{ name: 'Russian Twist', sets: 3, reps: 20 }, { name: 'Side Plank', sets: 3, duration: '45s' }] },
      { day: 3, name: 'Static Stability', exercises: [{ name: 'Plank', sets: 3, duration: '60s' }, { name: 'Dead Bug', sets: 3, reps: 10 }] }
    ]
  },

  fat_loss: {
    id: 'fat_loss',
    name: 'Fat Loss Focused Split',
    description: 'High-rep metabolic conditioning. \nKeeps heart rate up with short rest periods and compound movements.',
    frequency: 4,
    level: ['beginner', 'intermediate'],
    goal_compatibility: ['fat_loss', 'endurance'],
    benefits: ['Max calorie burn', ' cardiovascular health', 'Muscle endurance'],
    splits: [
      { day: 1, name: 'Circuit A', exercises: [{ name: 'Squat Jumps', sets: 3, reps: 20 }, { name: 'Pushups', sets: 3, reps: 15 }, { name: 'Mountain Climbers', sets: 3, reps: 30 }] },
      { day: 2, name: 'Cardio Intervals', exercises: [{ name: 'Walk/Run Intervals', duration_min: 30 }] },
      { day: 3, name: 'Circuit B', exercises: [{ name: 'Lunges', sets: 3, reps: 20 }, { name: 'Burpees', sets: 3, reps: 10 }, { name: 'Plank', sets: 3, duration: '60s' }] },
      { day: 4, name: 'Steady Cardio', exercises: [{ name: 'Brisk Walk', duration_min: 45 }] }
    ]
  }
};

// ============================================================================
// EXERCISE MET LOOKUP MAP (OPTIMIZATION)
// ============================================================================
const EXERCISE_MET_MAP = new Map();

// Populate map from templates (Order matters: first occurrence wins)
for (const template of Object.values(WORKOUT_TEMPLATES)) {
  for (const split of template.splits) {
    for (const exercise of split.exercises) {
      const name = exercise.name.toLowerCase();
      if (!EXERCISE_MET_MAP.has(name)) {
        EXERCISE_MET_MAP.set(name, exercise.met);
      }
    }
  }
}

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
      // Optimize: Fetch all exercises in a single DB query (Fix N+1)
      const allExercises = tunedProgram.splits.flatMap(s => s.exercises);
      const enrichedAll = await this.enrichExercisesWithDB(allExercises);

      let cursor = 0;
      for (let i = 0; i < tunedProgram.splits.length; i++) {
        const splitCount = tunedProgram.splits[i].exercises.length;
        tunedProgram.splits[i].exercises = enrichedAll.slice(cursor, cursor + splitCount);
        cursor += splitCount;

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
    // Find exercise in optimized lookup map
    const met = EXERCISE_MET_MAP.get(exerciseName.toLowerCase()) || 5.0; // Default moderate intensity

    return calculateCaloriesBurned(met, weight_kg, duration_minutes);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export default new WorkoutLogicEngine();
