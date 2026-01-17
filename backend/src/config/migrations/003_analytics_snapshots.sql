-- Analytics Snapshots Schema

-- Daily Snapshots
CREATE TABLE IF NOT EXISTS analytics_daily_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Weight Metrics
    weight_kg DECIMAL(5, 2),
    weight_rolling_avg_7d DECIMAL(5, 2),
    
    -- Nutrition Metrics
    total_calories INTEGER,
    calorie_target INTEGER,
    protein_g INTEGER,
    carbs_g INTEGER,
    fat_g INTEGER,
    
    -- Adherence
    calories_within_range BOOLEAN DEFAULT FALSE, -- e.g. within +/- 10% of target
    
    -- Activity
    workout_completed BOOLEAN DEFAULT FALSE,
    workout_calories_burned INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Weekly Snapshots
CREATE TABLE IF NOT EXISTS analytics_weekly_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Aggregates
    avg_weight_kg DECIMAL(5, 2),
    weight_change_kg DECIMAL(5, 2), -- Change from previous week
    
    avg_calories INTEGER,
    calorie_adherence_percent INTEGER, -- % of days within range
    
    avg_protein_g INTEGER,
    avg_carbs_g INTEGER,
    avg_fat_g INTEGER,
    
    workout_count INTEGER,
    total_workout_calories INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, start_date)
);

-- Monthly Snapshots
CREATE TABLE IF NOT EXISTS analytics_monthly_snapshots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    month_start_date DATE NOT NULL, -- First day of month
    
    -- Aggregates
    avg_weight_kg DECIMAL(5, 2),
    weight_change_kg DECIMAL(5, 2), -- Change from start to end of month
    
    avg_calories INTEGER,
    calorie_adherence_percent INTEGER,
    
    avg_protein_g INTEGER,
    avg_carbs_g INTEGER,
    avg_fat_g INTEGER,
    
    workout_count INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_start_date)
);

-- Index for fast range queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_snapshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_weekly_date ON analytics_weekly_snapshots(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_analytics_monthly_date ON analytics_monthly_snapshots(user_id, month_start_date);
