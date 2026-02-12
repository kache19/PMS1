-- Migration: Add AUDITOR role to staff table
-- Purpose: Allow auditors to verify shipments and ensure inventory is ready for sale

-- Update the ENUM for the 'role' column in the 'staff' table to include 'AUDITOR'
ALTER TABLE `staff` 
MODIFY COLUMN `role` ENUM('SUPER_ADMIN','BRANCH_MANAGER','ACCOUNTANT','INVENTORY_CONTROLLER','PHARMACIST','DISPENSER','STOREKEEPER','AUDITOR') DEFAULT NULL;

-- Create shipment_verifications table for audit trail
CREATE TABLE IF NOT EXISTS `shipment_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipment_id` varchar(50) NOT NULL,
  `verified_by` varchar(50) NOT NULL,
  `verification_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `verification_status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `verification_notes` text DEFAULT NULL,
  `verification_code` varchar(20) DEFAULT NULL,
  `ready_for_sale` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_shipment_verification` (`shipment_id`),
  KEY `verified_by` (`verified_by`),
  CONSTRAINT `shipment_verifications_ibfk_1` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`),
  CONSTRAINT `shipment_verifications_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `staff` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add verification timestamp column to shipments table if not exists
ALTER TABLE `shipments` 
ADD COLUMN IF NOT EXISTS `verified_at` timestamp NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `verified_by` varchar(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `ready_for_sale` tinyint(1) DEFAULT 0;

-- Add foreign key for verified_by to shipments table
ALTER TABLE `shipments`
ADD CONSTRAINT `shipments_ibfk_6` FOREIGN KEY (`verified_by`) REFERENCES `staff` (`id`);
