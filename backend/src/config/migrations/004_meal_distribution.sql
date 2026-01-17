-- Meal Distribution Profiles Schema

CREATE TABLE IF NOT EXISTS meal_distribution_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Settings Snapshot
    meal_style VARCHAR(50) DEFAULT 'fixed', -- 'fixed', 'swap_friendly'
    goal_style VARCHAR(50) DEFAULT 'balanced', -- 'aggressive', 'balanced', 'conservative'
    
    -- Breakfast
    breakfast_calories INTEGER DEFAULT 0,
    breakfast_protein_g INTEGER DEFAULT 0,
    breakfast_carbs_g INTEGER DEFAULT 0,
    breakfast_fat_g INTEGER DEFAULT 0,
    
    -- Lunch
    lunch_calories INTEGER DEFAULT 0,
    lunch_protein_g INTEGER DEFAULT 0,
    lunch_carbs_g INTEGER DEFAULT 0,
    lunch_fat_g INTEGER DEFAULT 0,
    
    -- Dinner
    dinner_calories INTEGER DEFAULT 0,
    dinner_protein_g INTEGER DEFAULT 0,
    dinner_carbs_g INTEGER DEFAULT 0,
    dinner_fat_g INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_meal_profiles_date ON meal_distribution_profiles(user_id, date);
