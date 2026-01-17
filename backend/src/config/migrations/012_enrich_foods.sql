
-- Migration 012: Enrich Foods Table with Recipe Details
-- Purpose: Store rich recipe information (instructions, image, time) in the foods table

BEGIN;

ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS instructions TEXT[], -- Step-by-step instructions
ADD COLUMN IF NOT EXISTS ingredients JSONB, -- Structured ingredient list
ADD COLUMN IF NOT EXISTS dietary_tags TEXT[]; -- e.g. ['vegan', 'gluten-free', 'high-protein']

COMMIT;
