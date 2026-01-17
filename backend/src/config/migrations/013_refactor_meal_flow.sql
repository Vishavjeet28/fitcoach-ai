-- Migration 013: Refactor Meal Flow to Strict Data Model
-- Purpose: Implement strict separation of Targets, Recommendations, and Logs

BEGIN;

-- 1. Ensure meal_distribution_profiles exists (it should, but just in case)
-- This table holds the TARGETS (What user SHOULD eat)
CREATE TABLE IF NOT EXISTS meal_distribution_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    breakfast_calories INTEGER, breakfast_protein_g DECIMAL, breakfast_carbs_g DECIMAL, breakfast_fat_g DECIMAL,
    lunch_calories INTEGER, lunch_protein_g DECIMAL, lunch_carbs_g DECIMAL, lunch_fat_g DECIMAL,
    dinner_calories INTEGER, dinner_protein_g DECIMAL, dinner_carbs_g DECIMAL, dinner_fat_g DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- 2. Create NEW daily_meal_recommendations table
-- This table holds the RECOMMENDATIONS (What app suggests)
CREATE TABLE IF NOT EXISTS daily_meal_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    
    -- Content
    recommended_food_items JSONB NOT NULL, -- The main food list
    recommended_details JSONB, -- Instructions, prep time, etc.
    reasoning TEXT,
    
    -- Target Snapshot (For validation/history)
    target_calories INTEGER,
    target_protein_g DECIMAL,
    target_carbs_g DECIMAL,
    target_fat_g DECIMAL,
    
    -- State
    swap_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, -- Only one active per slot
    
    -- Metadata
    generation_method VARCHAR(50), -- 'database', 'ai', 'manual_swap'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Swap Tracking
    replaced_from_id INTEGER REFERENCES daily_meal_recommendations(id)
);

CREATE INDEX idx_daily_meal_recs_lookup ON daily_meal_recommendations(user_id, date, meal_type);

COMMIT;
