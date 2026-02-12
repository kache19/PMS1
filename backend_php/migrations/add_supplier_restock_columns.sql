-- Migration to add supplier columns and restock status to drug_batches table
-- Run this to fix inventory restock tracking

-- Add supplier columns if they don't exist
ALTER TABLE `drug_batches` 
ADD COLUMN IF NOT EXISTS `supplier_id` varchar(50) DEFAULT NULL AFTER `status`,
ADD COLUMN IF NOT EXISTS `supplier_name` varchar(255) DEFAULT NULL AFTER `supplier_id`,
ADD COLUMN IF NOT EXISTS `restock_status` enum('PENDING','RECEIVED','IN_TRANSIT') DEFAULT 'RECEIVED' AFTER `supplier_name`,
ADD COLUMN IF NOT EXISTS `last_restock_date` timestamp NULL DEFAULT NULL AFTER `restock_status`;

-- Add index on supplier_id for faster lookups
CREATE INDEX IF NOT EXISTS `idx_drug_batches_supplier` ON `drug_batches` (`supplier_id`);

-- Add index on restock_status for filtering
CREATE INDEX IF NOT EXISTS `idx_drug_batches_restock_status` ON `drug_batches` (`restock_status`);
