-- Migration: Add last_sync column to branches table
-- Run this to add the last_sync timestamp column

ALTER TABLE branches
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP NULL DEFAULT NULL AFTER is_head_office;

-- Update existing branches to have a default last_sync value (current timestamp)
UPDATE branches SET last_sync = CURRENT_TIMESTAMP WHERE last_sync IS NULL;
