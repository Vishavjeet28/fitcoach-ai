-- FitCoach Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Profile information
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    age INTEGER,
    gender VARCHAR(20),
    activity_level VARCHAR(50),
    goal VARCHAR(100),
    calorie_target INTEGER DEFAULT 2000,
    
    -- Preferences
    dietary_restrictions TEXT[],
    preferred_cuisines TEXT[],
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Food reference database
CREATE TABLE IF NOT EXISTS foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    serving_size VARCHAR(100),
    serving_unit VARCHAR(50),
    calories INTEGER,
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    fiber DECIMAL(6,2),
    sugar DECIMAL(6,2),
    sodium DECIMAL(6,2),
    
    -- Categories
    category VARCHAR(100),
    subcategory VARCHAR(100),
    cuisine_type VARCHAR(100),
    
    -- External IDs
    usda_fdc_id VARCHAR(50),
    barcode VARCHAR(50),
    
    -- Metadata
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User food logs
CREATE TABLE IF NOT EXISTS food_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id),
    
    -- Custom food info (if food_id is null)
    custom_food_name VARCHAR(255),
    
    -- Serving information
    servings DECIMAL(6,2) DEFAULT 1.0,
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
    
    -- Nutrition (calculated based on servings)
    calories INTEGER,
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    
    -- Timing
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meal_date DATE DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercise reference database
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- cardio, strength, flexibility, sports
    muscle_groups TEXT[],
    equipment_needed TEXT[],
    difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
    
    -- Calorie burn (MET values - Metabolic Equivalent of Task)
    met_value DECIMAL(4,2), -- Used to calculate calories burned
    
    -- Instructions
    instructions TEXT,
    tips TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User exercise logs
CREATE TABLE IF NOT EXISTS exercise_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id),
    
    -- Custom exercise info (if exercise_id is null)
    custom_exercise_name VARCHAR(255),
    
    -- Activity details
    duration_minutes INTEGER,
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(6,2),
    distance_km DECIMAL(6,2),
    
    -- Calculated values
    calories_burned INTEGER,
    intensity VARCHAR(50), -- light, moderate, vigorous
    
    -- Timing
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    workout_date DATE DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Water intake logs
CREATE TABLE IF NOT EXISTS water_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_date DATE DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily summaries (for analytics and quick lookups)
CREATE TABLE IF NOT EXISTS daily_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    
    -- Nutrition totals
    total_calories INTEGER DEFAULT 0,
    total_protein DECIMAL(8,2) DEFAULT 0,
    total_carbs DECIMAL(8,2) DEFAULT 0,
    total_fat DECIMAL(8,2) DEFAULT 0,
    
    -- Activity totals
    total_exercise_calories INTEGER DEFAULT 0,
    total_exercise_minutes INTEGER DEFAULT 0,
    
    -- Hydration
    total_water_ml INTEGER DEFAULT 0,
    
    -- Goals
    calorie_target INTEGER,
    water_target_ml INTEGER DEFAULT 3000,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, summary_date)
);

-- AI recommendations and insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(100), -- meal_suggestion, workout_plan, nutrition_tip, etc.
    content TEXT NOT NULL,
    metadata JSONB, -- Structured data for specific recommendations
    
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id, created_at);
