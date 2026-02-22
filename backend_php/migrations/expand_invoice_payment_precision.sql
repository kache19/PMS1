-- Expand invoice payment precision to support high-value shipment invoices.
-- Run once on existing databases.

ALTER TABLE invoice_payments
  MODIFY COLUMN amount DECIMAL(15,2) NOT NULL,
  MODIFY COLUMN discount DECIMAL(15,2) DEFAULT 0.00;
