-- Expand financial amount precision to support high-value shipments/invoices
-- Reason: DECIMAL(10,2) max is 99,999,999.99 which is too low for some transfers.

ALTER TABLE shipments
  MODIFY COLUMN total_value DECIMAL(15,2) DEFAULT NULL;

ALTER TABLE invoices
  MODIFY COLUMN total_amount DECIMAL(15,2) NOT NULL,
  MODIFY COLUMN paid_amount DECIMAL(15,2) DEFAULT 0.00;

