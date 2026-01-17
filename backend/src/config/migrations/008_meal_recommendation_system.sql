-- ============================================================================
-- MIGRATION 008: Meal Recommendation System
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-15
-- 
-- Purpose: Enable AI-powered daily meal recommendations with swap functionality
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. RECOMMENDED MEALS TABLE (CORE)
-- Stores AI-generated meal recommendations for breakfast/lunch/dinner
-- These are PLANS, not logged food
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommended_meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Meal metadata
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    
    -- Meal content (JSON array of food items)
    -- Example: [{"name": "Oatmeal", "quantity": 150, "unit": "g"}, {...}]
    food_items JSONB NOT NULL,
    
    -- Calculated totals (MUST match meal_distribution targets ±5%)
    calories INTEGER NOT NULL CHECK (calories > 0),
    protein_g DECIMAL(6,2) NOT NULL CHECK (protein_g >= 0),
    carbs_g DECIMAL(6,2) NOT NULL CHECK (carbs_g >= 0),
    fat_g DECIMAL(6,2) NOT NULL CHECK (fat_g >= 0),
    
    -- Active status (for swap history)
    is_active BOOLEAN DEFAULT TRUE,
    
    -- AI generation metadata
    generation_method VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual', 'template'
    ai_reasoning TEXT, -- Why this meal was recommended
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replaced_at TIMESTAMP DEFAULT NULL,
    replaced_by INTEGER REFERENCES recommended_meals(id) -- Swap chain
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_recommended_meals_user_date ON recommended_meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recommended_meals_active ON recommended_meals(user_id, date, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recommended_meals_meal_type ON recommended_meals(meal_type);

-- Unique constraint: Only ONE active meal per user/date/meal_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommended_meals_unique_active 
    ON recommended_meals(user_id, date, meal_type) 
    WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- 2. MEAL COMPLIANCE TRACKING (ANALYTICS)
-- Track how well users follow recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_compliance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    
    -- Recommended vs Actual
    recommended_calories INTEGER NOT NULL,
    consumed_calories INTEGER DEFAULT 0,
    
    -- Compliance score (0-100)
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
    
    -- Metadata
    was_followed BOOLEAN DEFAULT FALSE, -- Did they log this meal?
    was_swapped BOOLEAN DEFAULT FALSE, -- Did they request AI swap?
    swap_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_meal_compliance_user_date ON meal_compliance(user_id, date);

-- ----------------------------------------------------------------------------
-- 3. VERIFY MEAL_DISTRIBUTION_PROFILES EXISTS
-- This should already exist, but ensure it has correct structure
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_distribution_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Daily targets (from FLE)
    daily_calories INTEGER NOT NULL,
    daily_protein_g DECIMAL(6,2) NOT NULL,
    daily_carbs_g DECIMAL(6,2) NOT NULL,
    daily_fat_g DECIMAL(6,2) NOT NULL,
    
    -- Meal split percentages
    breakfast_percentage INTEGER DEFAULT 30 CHECK (breakfast_percentage >= 0 AND breakfast_percentage <= 100),
    lunch_percentage INTEGER DEFAULT 40 CHECK (lunch_percentage >= 0 AND lunch_percentage <= 100),
    dinner_percentage INTEGER DEFAULT 30 CHECK (dinner_percentage >= 0 AND dinner_percentage <= 100),
    
    -- Calculated meal targets
    breakfast_calories INTEGER,
    breakfast_protein_g DECIMAL(6,2),
    breakfast_carbs_g DECIMAL(6,2),
    breakfast_fat_g DECIMAL(6,2),
    
    lunch_calories INTEGER,
    lunch_protein_g DECIMAL(6,2),
    lunch_carbs_g DECIMAL(6,2),
    lunch_fat_g DECIMAL(6,2),
    
    dinner_calories INTEGER,
    dinner_protein_g DECIMAL(6,2),
    dinner_carbs_g DECIMAL(6,2),
    dinner_fat_g DECIMAL(6,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_meal_distribution_user_date ON meal_distribution_profiles(user_id, date);

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (Run after migration)
-- ============================================================================

-- Check table exists
-- SELECT COUNT(*) FROM recommended_meals;
-- SELECT COUNT(*) FROM meal_compliance;
-- SELECT COUNT(*) FROM meal_distribution_profiles;
