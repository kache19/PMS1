-- Add discount and discount_percent columns to invoice_payments table
-- Run this migration to fix the 500 errors when creating invoices and recording payments

ALTER TABLE invoice_payments 
ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00 AFTER amount,
ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0.00 AFTER discount;