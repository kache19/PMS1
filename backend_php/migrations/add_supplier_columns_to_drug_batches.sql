-- Migration: add supplier columns to drug_batches
ALTER TABLE `drug_batches`
  ADD COLUMN `supplier_id` VARCHAR(100) NULL AFTER `quantity`,
  ADD COLUMN `supplier_name` VARCHAR(255) NULL AFTER `supplier_id`;

-- Optional: create index for supplier_id
CREATE INDEX `idx_drugbatches_supplier` ON `drug_batches` (`supplier_id`);
