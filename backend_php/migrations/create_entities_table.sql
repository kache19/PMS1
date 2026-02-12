-- Migration: Create entities table for customers and suppliers
-- This table enables recursive sales by allowing selection of saved customers
-- and restocking from saved suppliers

DROP TABLE IF EXISTS `entities`;

CREATE TABLE `entities` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('CUSTOMER','SUPPLIER','BOTH') NOT NULL DEFAULT 'CUSTOMER',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Tanzania',
  `tin` varchar(50) DEFAULT NULL,
  `vat_number` varchar(50) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(10,2) DEFAULT 0.00,
  `current_balance` decimal(10,2) DEFAULT 0.00,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `tax_exempt` tinyint(1) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','BLOCKED') DEFAULT 'ACTIVE',
  `parent_entity_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_entities_type` (`type`),
  KEY `idx_entities_status` (`status`),
  KEY `idx_entities_name` (`name`),
  KEY `idx_entities_phone` (`phone`),
  KEY `idx_entities_email` (`email`),
  KEY `idx_entities_branch` (`branch_id`),
  KEY `idx_entities_parent` (`parent_entity_id`),
  KEY `fk_parent_entity` (`parent_entity_id`),
  CONSTRAINT `fk_parent_entity` FOREIGN KEY (`parent_entity_id`) REFERENCES `entities` (`id`) ON DELETE SET NULL,
  CONSTRAINT `entities_ibfk_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `entities_ibfk_created_by` FOREIGN KEY (`created_by`) REFERENCES `staff` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create index for faster searches
CREATE INDEX `idx_entities_search` ON `entities`(`name`, `phone`, `email`, `type`);

-- Create a view for customers only
CREATE OR REPLACE VIEW `view_customers` AS
SELECT * FROM `entities` WHERE `type` IN ('CUSTOMER', 'BOTH') AND `status` = 'ACTIVE';

-- Create a view for suppliers only
CREATE OR REPLACE VIEW `view_suppliers` AS
SELECT * FROM `entities` WHERE `type` IN ('SUPPLIER', 'BOTH') AND `status` = 'ACTIVE';

-- Insert sample data for testing
INSERT INTO `entities` (`id`, `name`, `type`, `email`, `phone`, `address`, `city`, `country`, `tin`, `payment_terms`, `credit_limit`, `status`, `created_by`) VALUES
('ENT-001', 'Walk-In Customer', 'CUSTOMER', NULL, NULL, NULL, NULL, 'Tanzania', NULL, 'CASH', 0.00, 'ACTIVE', 'ADMIN-001'),
('ENT-002', 'Local Pharmacy Suppliers', 'SUPPLIER', 'suppliers@local.co.tz', '+255700000000', 'Mwanza Road', 'Mwanza', 'Tanzania', '123456789', 'NET30', 100000.00, 'ACTIVE', 'ADMIN-001'),
('ENT-003', 'Dr. John Smith', 'CUSTOMER', 'john.smith@email.com', '+255700111111', 'Plot 45, Block C', 'Mpanda', 'Tanzania', NULL, 'CASH', 0.00, 'ACTIVE', 'ADMIN-001'),
('ENT-004', 'MediCare Pharmacy', 'BOTH', 'info@medicare.co.tz', '+255700222222', 'Main Street', 'Singida', 'Tanzania', '987654321', 'NET30', 50000.00, 'ACTIVE', 'ADMIN-001');
