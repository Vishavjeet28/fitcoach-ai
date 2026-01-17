-- ============================================================================
-- MIGRATION 006: Meal Swap Tracking System
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-14
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. MEAL SWAP LOGS
-- Track all macro swaps between meals (audit trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_swap_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Swap details
    date DATE NOT NULL,
    from_meal VARCHAR(50) NOT NULL CHECK (from_meal IN ('breakfast', 'lunch', 'dinner')),
    to_meal VARCHAR(50) NOT NULL CHECK (to_meal IN ('breakfast', 'lunch', 'dinner')),
    
    -- Macro info
    macro_type VARCHAR(20) NOT NULL CHECK (macro_type IN ('protein', 'carbs', 'fat')),
    amount_g INTEGER NOT NULL CHECK (amount_g > 0),
    
    -- Metadata
    reason TEXT, -- Optional user note on why they swapped
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_swap_user_date ON meal_swap_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_swap_macro ON meal_swap_logs(macro_type);

-- ----------------------------------------------------------------------------
-- 2. DAILY MACRO STATE (REAL-TIME TRACKING)
-- Track consumed vs remaining macros throughout the day
-- Used for swap validation and remaining macro calculations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_macro_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Breakfast state
    breakfast_calories_consumed INTEGER DEFAULT 0,
    breakfast_protein_consumed DECIMAL(6,2) DEFAULT 0,
    breakfast_carbs_consumed DECIMAL(6,2) DEFAULT 0,
    breakfast_fat_consumed DECIMAL(6,2) DEFAULT 0,
    breakfast_locked BOOLEAN DEFAULT FALSE, -- Lock after 12pm to prevent changes
    
    -- Lunch state
    lunch_calories_consumed INTEGER DEFAULT 0,
    lunch_protein_consumed DECIMAL(6,2) DEFAULT 0,
    lunch_carbs_consumed DECIMAL(6,2) DEFAULT 0,
    lunch_fat_consumed DECIMAL(6,2) DEFAULT 0,
    lunch_locked BOOLEAN DEFAULT FALSE, -- Lock after 6pm
    
    -- Dinner state
    dinner_calories_consumed INTEGER DEFAULT 0,
    dinner_protein_consumed DECIMAL(6,2) DEFAULT 0,
    dinner_carbs_consumed DECIMAL(6,2) DEFAULT 0,
    dinner_fat_consumed DECIMAL(6,2) DEFAULT 0,
    dinner_locked BOOLEAN DEFAULT FALSE, -- Lock at midnight
    
    -- Daily totals (calculated)
    total_calories_consumed INTEGER GENERATED ALWAYS AS (
        breakfast_calories_consumed + lunch_calories_consumed + dinner_calories_consumed
    ) STORED,
    total_protein_consumed DECIMAL(6,2) GENERATED ALWAYS AS (
        breakfast_protein_consumed + lunch_protein_consumed + dinner_protein_consumed
    ) STORED,
    total_carbs_consumed DECIMAL(6,2) GENERATED ALWAYS AS (
        breakfast_carbs_consumed + lunch_carbs_consumed + dinner_carbs_consumed
    ) STORED,
    total_fat_consumed DECIMAL(6,2) GENERATED ALWAYS AS (
        breakfast_fat_consumed + lunch_fat_consumed + dinner_fat_consumed
    ) STORED,
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_macro_state_user_date ON daily_macro_state(user_id, date);

-- ----------------------------------------------------------------------------
-- 3. MEAL SWAP RULES (CONFIGURABLE)
-- System-wide or user-specific swap rules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_swap_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = system-wide
    
    -- Rule configuration
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('allowed_swap', 'forbidden_swap', 'auto_swap', 'time_restriction')),
    
    -- Rule parameters (JSON for flexibility)
    parameters JSONB NOT NULL,
    /* Example structures:
    
    ALLOWED_SWAP:
    {
      "from_meals": ["breakfast", "lunch"],
      "to_meals": ["lunch", "dinner"],
      "macro_types": ["carbs", "protein"],
      "max_amount_g": 50
    }
    
    TIME_RESTRICTION:
    {
      "meal": "breakfast",
      "cutoff_time": "12:00:00",
      "action": "lock"
    }
    
    FORBIDDEN_SWAP:
    {
      "macro_type": "fat",
      "from_meal": "dinner",
      "reason": "Night fat timing preference"
    }
    */
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority rules checked first
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_swap_rules_user ON meal_swap_rules(user_id, is_active);

-- ----------------------------------------------------------------------------
-- 4. TRIGGER: Auto-update daily_macro_state from food_logs
-- Keeps macro state in sync with food logging
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_daily_macro_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update macro state for the date
    INSERT INTO daily_macro_state (
        user_id,
        date,
        breakfast_calories_consumed,
        breakfast_protein_consumed,
        breakfast_carbs_consumed,
        breakfast_fat_consumed,
        lunch_calories_consumed,
        lunch_protein_consumed,
        lunch_carbs_consumed,
        lunch_fat_consumed,
        dinner_calories_consumed,
        dinner_protein_consumed,
        dinner_carbs_consumed,
        dinner_fat_consumed
    )
    SELECT
        user_id,
        meal_date,
        COALESCE(SUM(CASE WHEN meal_type = 'breakfast' THEN calories ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'breakfast' THEN protein ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'breakfast' THEN carbs ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'breakfast' THEN fat ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'lunch' THEN calories ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'lunch' THEN protein ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'lunch' THEN carbs ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'lunch' THEN fat ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'dinner' THEN calories ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'dinner' THEN protein ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'dinner' THEN carbs ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN meal_type = 'dinner' THEN fat ELSE 0 END), 0)
    FROM food_logs
    WHERE user_id = NEW.user_id AND meal_date = NEW.meal_date
    GROUP BY user_id, meal_date
    ON CONFLICT (user_id, date) DO UPDATE SET
        breakfast_calories_consumed = EXCLUDED.breakfast_calories_consumed,
        breakfast_protein_consumed = EXCLUDED.breakfast_protein_consumed,
        breakfast_carbs_consumed = EXCLUDED.breakfast_carbs_consumed,
        breakfast_fat_consumed = EXCLUDED.breakfast_fat_consumed,
        lunch_calories_consumed = EXCLUDED.lunch_calories_consumed,
        lunch_protein_consumed = EXCLUDED.lunch_protein_consumed,
        lunch_carbs_consumed = EXCLUDED.lunch_carbs_consumed,
        lunch_fat_consumed = EXCLUDED.lunch_fat_consumed,
        dinner_calories_consumed = EXCLUDED.dinner_calories_consumed,
        dinner_protein_consumed = EXCLUDED.dinner_protein_consumed,
        dinner_carbs_consumed = EXCLUDED.dinner_carbs_consumed,
        dinner_fat_consumed = EXCLUDED.dinner_fat_consumed,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to food_logs
DROP TRIGGER IF EXISTS trigger_update_macro_state ON food_logs;
CREATE TRIGGER trigger_update_macro_state
AFTER INSERT OR UPDATE OR DELETE ON food_logs
FOR EACH ROW
EXECUTE FUNCTION update_daily_macro_state();

-- ----------------------------------------------------------------------------
-- 5. INSERT DEFAULT SYSTEM-WIDE RULES
-- Core swap rules that apply to all users
-- ----------------------------------------------------------------------------

-- Rule 1: Same-macro swaps only
INSERT INTO meal_swap_rules (user_id, rule_name, rule_type, parameters, priority) VALUES
(NULL, 'Same Macro Swaps Only', 'allowed_swap', 
 '{"macro_types": ["protein", "carbs", "fat"], "same_macro_only": true}'::jsonb, 
 100);

-- Rule 2: No cross-macro swaps
INSERT INTO meal_swap_rules (user_id, rule_name, rule_type, parameters, priority) VALUES
(NULL, 'Forbidden Cross-Macro Swap', 'forbidden_swap', 
 '{"reason": "Cross-macro swaps violate system integrity"}'::jsonb, 
 100);

-- Rule 3: Daily total protection
INSERT INTO meal_swap_rules (user_id, rule_name, rule_type, parameters, priority) VALUES
(NULL, 'Daily Total Protection', 'allowed_swap', 
 '{"daily_total_locked": true, "tolerance_kcal": 0}'::jsonb, 
 100);

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================================================

-- Uncomment to rollback:
-- DROP TRIGGER IF EXISTS trigger_update_macro_state ON food_logs;
-- DROP FUNCTION IF EXISTS update_daily_macro_state();
-- DROP TABLE IF EXISTS meal_swap_rules CASCADE;
-- DROP TABLE IF EXISTS daily_macro_state CASCADE;
-- DROP TABLE IF EXISTS meal_swap_logs CASCADE;
