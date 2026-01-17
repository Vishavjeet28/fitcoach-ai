-- ============================================================================
-- MIGRATION 010: Extended Profile & Meal Details
-- FitCoach AI
-- ============================================================================

BEGIN;

-- 1. Add Extended Profile Fields to Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS goal_aggressiveness VARCHAR(20) DEFAULT 'balanced', -- aggressive, balanced, conservative
ADD COLUMN IF NOT EXISTS workout_level VARCHAR(20) DEFAULT 'intermediate',   -- beginner, intermediate, advanced
ADD COLUMN IF NOT EXISTS meal_style VARCHAR(20) DEFAULT 'fixed',             -- fixed, swap_friendly
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
ADD COLUMN IF NOT EXISTS preferred_cuisines TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT;

-- 2. Add Rich Details to Recommended Meals
-- Stores: recipe_instructions, prep_time, cook_time, difficulty, tips, alternatives, allergens
ALTER TABLE recommended_meals
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

COMMIT;
