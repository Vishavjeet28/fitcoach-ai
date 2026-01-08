-- Add OAuth provider fields to users table
-- This migration adds support for Google and Apple Sign-In

-- Add OAuth provider fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Make password_hash optional for OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add index for faster OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

-- Add comments
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.apple_id IS 'Apple OAuth unique identifier';
COMMENT ON COLUMN users.auth_provider IS 'Authentication method: email, google, apple, or multiple';
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture from OAuth provider';
