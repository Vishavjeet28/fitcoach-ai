
-- Weight Logging
CREATE TABLE IF NOT EXISTS body_weight_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    weight_kg DECIMAL(5,2) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'manual', -- manual, smart-scale
    notes TEXT
);

-- Weight Trends (Weekly aggregates)
CREATE TABLE IF NOT EXISTS weight_trends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    avg_weight DECIMAL(5,2),
    trend_direction VARCHAR(20), -- up, down, flat
    weekly_change_kg DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plateau Events
CREATE TABLE IF NOT EXISTS plateau_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    detected_on DATE DEFAULT CURRENT_DATE,
    reason VARCHAR(50), -- no_change, rebound
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON body_weight_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_weight_trends_user ON weight_trends(user_id);
