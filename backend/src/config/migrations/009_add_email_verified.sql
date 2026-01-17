-- Migration: Add email_verified column to users table
-- This column is used by getCurrentUser endpoint to return email verification status

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
