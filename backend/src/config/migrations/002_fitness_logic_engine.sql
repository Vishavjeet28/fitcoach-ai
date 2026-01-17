-- ============================================================================
-- MIGRATION 002: Fitness Logic Engine Schema
-- FitCoach AI - Production Database Migration
-- Date: 2026-01-13
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. USER PHYSIOLOGY EXTENSION
-- Add body_fat_percentage to users table for accurate calculations
-- ----------------------------------------------------------------------------
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 3 AND body_fat_percentage <= 60);

-- Add BMR and TDEE cache columns (recalculated on profile update)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bmr_cached INTEGER,
ADD COLUMN IF NOT EXISTS tdee_cached INTEGER,
ADD COLUMN IF NOT EXISTS bmr_updated_at TIMESTAMP;

-- ----------------------------------------------------------------------------
-- 2. GOALS TABLE - Fitness goal tracking with macro targets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Goal type: fat_loss | maintenance | muscle_gain | recomposition
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('fat_loss', 'maintenance', 'muscle_gain', 'recomposition')),
    
    -- Timeline
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    
    -- Weight targets
    start_weight_kg DECIMAL(5,2),
    target_weight_kg DECIMAL(5,2),
    
    -- Calculated daily targets (stored for performance)
    calorie_target INTEGER NOT NULL,
    protein_target_g INTEGER NOT NULL,
    carb_target_g INTEGER NOT NULL,
    fat_target_g INTEGER NOT NULL,
    
    -- Deficit/Surplus configuration
    calorie_adjustment INTEGER DEFAULT 0, -- Negative for deficit, positive for surplus
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index for active goals (only one active goal per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_active_user 
ON goals (user_id) WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- 3. WEIGHT LOGS TABLE - Daily weight tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weight_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Weight data
    weight_kg DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
    
    -- Source of measurement
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'smart_scale', 'imported')),
    
    -- Optional body composition (from smart scales)
    body_fat_percentage DECIMAL(4,1) CHECK (body_fat_percentage >= 3 AND body_fat_percentage <= 60),
    muscle_mass_kg DECIMAL(5,2),
    water_percentage DECIMAL(4,1),
    
    -- Timing
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Notes
    notes TEXT,
    
    -- One weight per day per user
    CONSTRAINT unique_weight_per_day UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date DESC);

-- ----------------------------------------------------------------------------
-- 4. PLATEAU EVENTS TABLE - Weight stall detection and auto-adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plateau_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    
    -- Detection
    detected_on DATE NOT NULL DEFAULT CURRENT_DATE,
    plateau_start_date DATE NOT NULL,
    plateau_end_date DATE,
    
    -- Analysis
    days_stalled INTEGER NOT NULL,
    weight_at_detection DECIMAL(5,2) NOT NULL,
    average_weight_during DECIMAL(5,2),
    logging_compliance_percentage INTEGER CHECK (logging_compliance_percentage >= 0 AND logging_compliance_percentage <= 100),
    
    -- Reason for detection
    reason TEXT NOT NULL,
    
    -- Action taken
    adjustment_kcal INTEGER, -- Positive or negative adjustment made
    adjustment_type VARCHAR(50) CHECK (adjustment_type IN ('calorie_decrease', 'calorie_increase', 'diet_break', 'none', 'user_dismissed')),
    adjustment_applied_at TIMESTAMP,
    
    -- User response
    user_acknowledged BOOLEAN DEFAULT FALSE,
    user_notes TEXT,
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plateau_events_user ON plateau_events(user_id, detected_on DESC);

-- ----------------------------------------------------------------------------
-- 5. SUBSCRIPTIONS TABLE - Billing and subscription management
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tier: guest | free | paid
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('guest', 'free', 'paid')),
    
    -- Plan details (for paid tier)
    plan_id VARCHAR(50), -- weekly | monthly | yearly
    
    -- Payment provider
    provider VARCHAR(50) CHECK (provider IN ('apple', 'google', 'stripe', 'manual', NULL)),
    provider_subscription_id VARCHAR(255), -- External subscription ID from provider
    provider_customer_id VARCHAR(255),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trial', 'pending')),
    
    -- Dates
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    expires_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Trial
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    
    -- Pricing (stored for historical record)
    price_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at) WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 6. AI USAGE TABLE - Per-day AI request tracking (separate from users table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Nullable for guests
    
    -- Guest tracking (when user_id is null)
    guest_device_id VARCHAR(255),
    
    -- Date-based tracking
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 0,
    
    -- Request types breakdown
    meal_suggestions INTEGER DEFAULT 0,
    food_recognition INTEGER DEFAULT 0,
    insights INTEGER DEFAULT 0,
    coach_messages INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One record per user per day
    CONSTRAINT unique_ai_usage_per_day UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_guest ON ai_usage(guest_device_id, usage_date) WHERE user_id IS NULL;

-- ----------------------------------------------------------------------------
-- 7. DAILY DECISION CACHE - Pre-computed daily status
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_decisions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Status: on_track | over | under | no_data
    status VARCHAR(20) NOT NULL CHECK (status IN ('on_track', 'over', 'under', 'no_data')),
    
    -- Gaps (positive = over, negative = under)
    calorie_gap INTEGER NOT NULL DEFAULT 0,
    protein_gap_g INTEGER NOT NULL DEFAULT 0,
    carb_gap_g INTEGER NOT NULL DEFAULT 0,
    fat_gap_g INTEGER NOT NULL DEFAULT 0,
    
    -- Net calculations
    calories_eaten INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    net_calories INTEGER DEFAULT 0,
    
    -- Targets (snapshot for that day)
    calorie_target INTEGER NOT NULL,
    protein_target_g INTEGER NOT NULL,
    carb_target_g INTEGER NOT NULL,
    fat_target_g INTEGER NOT NULL,
    
    -- Compliance
    logging_complete BOOLEAN DEFAULT FALSE,
    
    -- Actionable insight
    next_action TEXT,
    
    -- AI prompt context (JSON for AI system)
    ai_context JSONB,
    
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_decision_per_day UNIQUE (user_id, decision_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_decisions_user_date ON daily_decisions(user_id, decision_date DESC);

-- ----------------------------------------------------------------------------
-- 8. UPDATE PUSH_TOKENS TABLE (add is_active if missing)
-- ----------------------------------------------------------------------------
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- ----------------------------------------------------------------------------
-- 9. ADD MACRO TARGETS TO DAILY_SUMMARIES
-- ----------------------------------------------------------------------------
ALTER TABLE daily_summaries
ADD COLUMN IF NOT EXISTS protein_target_g INTEGER,
ADD COLUMN IF NOT EXISTS carb_target_g INTEGER,
ADD COLUMN IF NOT EXISTS fat_target_g INTEGER,
ADD COLUMN IF NOT EXISTS net_calories INTEGER,
ADD COLUMN IF NOT EXISTS compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100);

-- ----------------------------------------------------------------------------
-- 10. ADD MET VALUE TO EXERCISE_LOGS IF MISSING
-- ----------------------------------------------------------------------------
ALTER TABLE exercise_logs
ADD COLUMN IF NOT EXISTS met_value DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS user_weight_at_log DECIMAL(5,2);

COMMIT;
