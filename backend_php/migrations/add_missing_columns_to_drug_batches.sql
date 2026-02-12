-- Migration: Add missing columns to drug_batches
ALTER TABLE `drug_batches`
  ADD COLUMN `supplier_id` VARCHAR(100) NULL AFTER `quantity`,
  ADD COLUMN `restock_status` VARCHAR(50) DEFAULT 'RECEIVED' AFTER `supplier_name`,
  ADD COLUMN `last_restock_date` TIMESTAMP NULL AFTER `restock_status`;

CREATE INDEX `idx_drugbatches_supplier_id` ON `drug_batches` (`supplier_id`);
CREATE INDEX `idx_drugbatches_restock_status` ON `drug_batches` (`restock_status`);
