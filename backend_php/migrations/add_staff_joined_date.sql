-- Migration: Add joined_date column to staff table
-- This migration adds a joined_date column to track when staff members joined the organization

ALTER TABLE `staff`
ADD COLUMN `joined_date` date DEFAULT NULL AFTER `status`;

-- Update existing staff with their created_at date as joined_date
UPDATE `staff`
SET `joined_date` = DATE(`created_at`)
WHERE `joined_date` IS NULL;

-- Create index for joined_date for faster filtering
ALTER TABLE `staff`
ADD INDEX `idx_staff_joined_date` (`joined_date`);

-- Migration completed successfully
