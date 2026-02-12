-- Combined Migration Sheet
-- Path: backend_php/migrations/combined_migration_sheet.sql
-- Usage: Review and adapt sections, then run via mysql client or wrap in a migration runner.
-- Always back up the DB before applying: mysqldump -u root -p your_db > backup_before.sql

-- ==================================================================
-- 1) Add column (MySQL 8.0.16+ supports IF NOT EXISTS)
-- ==================================================================
ALTER TABLE `your_table`
  ADD COLUMN IF NOT EXISTS `new_column` VARCHAR(255) NULL AFTER `existing_column`;

-- ==================================================================
-- 2) Portable add-column pattern (check INFORMATION_SCHEMA)
-- Run as a multi-statement script from a client that allows multiple statements.
-- ==================================================================
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'your_table' AND COLUMN_NAME = 'new_column'
);

-- If not exists, prepare and execute the ALTER
SET @sql := IF(@exists = 0, CONCAT('ALTER TABLE `your_table` ADD COLUMN `new_column` VARCHAR(255) NULL;'), 'SELECT "column_exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================================================================
-- 3) Modify column type / attributes
-- ==================================================================
ALTER TABLE `your_table`
  MODIFY COLUMN `existing_column` TEXT NOT NULL;

-- ==================================================================
-- 4) Rename column (CHANGE): also allows changing type
-- ==================================================================
ALTER TABLE `your_table`
  CHANGE COLUMN `old_name` `new_name` DECIMAL(10,2) NOT NULL;

-- ==================================================================
-- 5) Drop column (MySQL 8+ supports IF EXISTS)
-- ==================================================================
ALTER TABLE `your_table` DROP COLUMN IF EXISTS `old_column`;

-- ==================================================================
-- 6) Create new table example (user_login_trackers)
-- ==================================================================
CREATE TABLE IF NOT EXISTS `user_login_trackers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(255),
  `branch_id` VARCHAR(64),
  `branch_name` VARCHAR(255),
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `device_info` JSON,
  `login_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_time` DATETIME NULL,
  `session_duration_minutes` INT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  INDEX (`user_id`),
  INDEX (`branch_id`),
  INDEX (`login_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================================
-- 7) Add foreign key (example)
-- Note: ensure referenced key and engine/charset match; create FK in a separate ALTER after ensuring both sides exist.
-- ==================================================================
ALTER TABLE `child_table`
  ADD CONSTRAINT `fk_child_parent`
  FOREIGN KEY (`parent_id`) REFERENCES `parent_table` (`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================================
-- 8) Create index
-- ==================================================================
CREATE INDEX `idx_branch_login_time` ON `user_login_trackers` (`branch_id`, `login_time`);

-- ==================================================================
-- 9) Insert or update a settings key (upsert)
-- ==================================================================
INSERT INTO `system_settings` (`setting_key`, `setting_value`)
VALUES ('autoBackupEnabled', 'true')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ==================================================================
-- 10) Wrap changes in a transaction (safe grouping)
-- ==================================================================
START TRANSACTION;
  -- Example: add column then backfill
  ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `legacy_note` TEXT NULL;
  UPDATE `orders`
  SET `legacy_note` = CONCAT('Migrated: ', `old_field`)
  WHERE `legacy_note` IS NULL;
COMMIT;

-- ==================================================================
-- 11) Safe data-migration pattern (backfill example)
-- ==================================================================
-- ALTER TABLE `orders` ADD COLUMN `legacy_note` TEXT NULL;
-- UPDATE `orders` SET `legacy_note` = CONCAT('Migrated: ', `old_field`) WHERE `legacy_note` IS NULL;

-- ==================================================================
-- 12) Remove FK safely
-- ==================================================================
ALTER TABLE `child_table` DROP FOREIGN KEY `fk_child_parent`;
ALTER TABLE `child_table` DROP COLUMN `parent_id`;

-- ==================================================================
-- 13) Drop table (if needed) with safety check
-- ==================================================================
DROP TABLE IF EXISTS `temp_table_for_migration`;

-- ==================================================================
-- 14) Helpful notes
-- - Use `mysqldump` to snapshot before running migrations.
-- - If your server runs an older MySQL, adjust or remove IF [NOT] EXISTS clauses and use INFORMATION_SCHEMA checks instead.
-- - Run DDL in maintenance windows; large ALTERs may lock tables.
-- - Consider creating a small PHP/CLI migration runner under `backend_php/migrations/` to execute these safely with logging.

-- End of combined migration sheet
