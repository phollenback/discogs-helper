-- Migration: Add public_resources column to users table
-- This allows users to control visibility of their collections and wantlists

USE Discogs;

-- Add public_resources column to users table (if it doesn't exist)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so check manually first
-- Run: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'Discogs' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'public_resources';
-- If no results, then run the ALTER TABLE below

ALTER TABLE users 
ADD COLUMN public_resources BOOLEAN DEFAULT TRUE 
AFTER user_image;

-- Add index for performance (if it doesn't exist)
-- Check first: SHOW INDEXES FROM users WHERE Key_name = 'idx_users_public_resources';
-- If no results, then run the CREATE INDEX below

CREATE INDEX idx_users_public_resources ON users(public_resources);

-- Update existing users to have public_resources = TRUE by default (if NULL)
UPDATE users SET public_resources = TRUE WHERE public_resources IS NULL;

