-- Sample seed for demo branches:
-- - BR009: Masaki Medics
-- - BR010: Mikocheni Branch
-- This script is idempotent and safe to re-run.

START TRANSACTION;

-- Shared bcrypt hash for password: admin123
SET @sample_password_hash = '$2y$10$v2vUOfZ6n2kmbebLE9AjbePPe3enc0OPkNdv/usucuUckdDWUY/WS';

-- 1) Branches
INSERT INTO branches (id, name, location, manager_id, status, is_head_office, last_sync)
VALUES
  ('BR009', 'Masaki Medics', 'Masaki, Dar es Salaam', 'ST-SAMPLE-BR009-MGR', 'ACTIVE', 0, NOW()),
  ('BR010', 'Mikocheni Branch', 'Mikocheni, Dar es Salaam', 'ST-SAMPLE-BR010-MGR', 'ACTIVE', 0, NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  location = VALUES(location),
  manager_id = VALUES(manager_id),
  status = VALUES(status),
  is_head_office = VALUES(is_head_office),
  last_sync = VALUES(last_sync);

-- 2) Demo staff
INSERT INTO staff (id, name, role, branch_id, email, phone, status, joined_date, username, password_hash)
VALUES
  ('ST-SAMPLE-BR009-MGR', 'Asha M. Kweka', 'BRANCH_MANAGER', 'BR009', 'asha.masaki@pms.sample', '+255700900001', 'ACTIVE', CURDATE(), 'masaki_manager', @sample_password_hash),
  ('ST-SAMPLE-BR009-DSP', 'Rehema N. Ally', 'DISPENSER', 'BR009', 'rehema.masaki@pms.sample', '+255700900002', 'ACTIVE', CURDATE(), 'masaki_disp', @sample_password_hash),
  ('ST-SAMPLE-BR010-MGR', 'John P. Mtei', 'BRANCH_MANAGER', 'BR010', 'john.mikocheni@pms.sample', '+255700910001', 'ACTIVE', CURDATE(), 'miko_manager', @sample_password_hash),
  ('ST-SAMPLE-BR010-DSP', 'Diana S. Mwaipo', 'DISPENSER', 'BR010', 'diana.mikocheni@pms.sample', '+255700910002', 'ACTIVE', CURDATE(), 'miko_disp', @sample_password_hash)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  branch_id = VALUES(branch_id),
  email = VALUES(email),
  phone = VALUES(phone),
  status = VALUES(status),
  joined_date = VALUES(joined_date),
  username = VALUES(username),
  password_hash = VALUES(password_hash);

-- 3) Core demo products
INSERT INTO products (id, name, generic_name, category, cost_price, base_price, unit, min_stock_level, requires_prescription, supplier_name)
VALUES
  ('PRD-SMPL-AMOX500', 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 450.00, 800.00, 'Capsule', 40, 1, 'Sample Pharma Supplies'),
  ('PRD-SMPL-PARA500', 'Paracetamol 500mg', 'Paracetamol', 'Analgesic', 80.00, 200.00, 'Tablet', 120, 0, 'Sample Pharma Supplies'),
  ('PRD-SMPL-IBU400', 'Ibuprofen 400mg', 'Ibuprofen', 'Anti-inflammatory', 120.00, 300.00, 'Tablet', 80, 0, 'Sample Pharma Supplies'),
  ('PRD-SMPL-ORS', 'ORS Sachet', 'Oral Rehydration Salts', 'Rehydration', 200.00, 500.00, 'Sachet', 60, 0, 'Sample Pharma Supplies'),
  ('PRD-SMPL-CET10', 'Cetirizine 10mg', 'Cetirizine', 'Antihistamine', 90.00, 250.00, 'Tablet', 70, 0, 'Sample Pharma Supplies')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  generic_name = VALUES(generic_name),
  category = VALUES(category),
  cost_price = VALUES(cost_price),
  base_price = VALUES(base_price),
  unit = VALUES(unit),
  min_stock_level = VALUES(min_stock_level),
  requires_prescription = VALUES(requires_prescription),
  supplier_name = VALUES(supplier_name);

-- 4) Branch inventory snapshot
INSERT INTO branch_inventory (branch_id, product_id, quantity, custom_price)
VALUES
  ('BR009', 'PRD-SMPL-AMOX500', 140, 850.00),
  ('BR009', 'PRD-SMPL-PARA500', 420, 220.00),
  ('BR009', 'PRD-SMPL-IBU400', 260, 320.00),
  ('BR009', 'PRD-SMPL-ORS', 180, 520.00),
  ('BR009', 'PRD-SMPL-CET10', 210, 270.00),
  ('BR010', 'PRD-SMPL-AMOX500', 120, 840.00),
  ('BR010', 'PRD-SMPL-PARA500', 390, 210.00),
  ('BR010', 'PRD-SMPL-IBU400', 230, 310.00),
  ('BR010', 'PRD-SMPL-ORS', 170, 510.00),
  ('BR010', 'PRD-SMPL-CET10', 190, 260.00)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  custom_price = VALUES(custom_price);

-- 5) Demo batches (insert only if batch number does not exist)
INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, supplier_name, supplier_id, restock_status, last_restock_date)
SELECT 'BR009', 'PRD-SMPL-AMOX500', 'MSK-AMX-2026-01', '2027-08-31', 140, 'ACTIVE', 'Sample Pharma Supplies', 'SUP-SAMPLE-001', 'RECEIVED', NOW()
WHERE NOT EXISTS (SELECT 1 FROM drug_batches WHERE batch_number = 'MSK-AMX-2026-01');
INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, supplier_name, supplier_id, restock_status, last_restock_date)
SELECT 'BR009', 'PRD-SMPL-PARA500', 'MSK-PAR-2026-01', '2028-01-31', 420, 'ACTIVE', 'Sample Pharma Supplies', 'SUP-SAMPLE-001', 'RECEIVED', NOW()
WHERE NOT EXISTS (SELECT 1 FROM drug_batches WHERE batch_number = 'MSK-PAR-2026-01');
INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, supplier_name, supplier_id, restock_status, last_restock_date)
SELECT 'BR010', 'PRD-SMPL-AMOX500', 'MIK-AMX-2026-01', '2027-07-31', 120, 'ACTIVE', 'Sample Pharma Supplies', 'SUP-SAMPLE-001', 'RECEIVED', NOW()
WHERE NOT EXISTS (SELECT 1 FROM drug_batches WHERE batch_number = 'MIK-AMX-2026-01');
INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, supplier_name, supplier_id, restock_status, last_restock_date)
SELECT 'BR010', 'PRD-SMPL-IBU400', 'MIK-IBU-2026-01', '2027-12-31', 230, 'ACTIVE', 'Sample Pharma Supplies', 'SUP-SAMPLE-001', 'RECEIVED', NOW()
WHERE NOT EXISTS (SELECT 1 FROM drug_batches WHERE batch_number = 'MIK-IBU-2026-01');

-- 6) Demo sales and sale items
INSERT INTO sales (id, branch_id, total_amount, profit, payment_method, customer_name, created_at)
VALUES
  ('SALE-BR009-S001', 'BR009', 36500.00, 15200.00, 'CASH', 'Masaki Walk-in', NOW() - INTERVAL 2 DAY),
  ('SALE-BR010-S001', 'BR010', 42800.00, 17600.00, 'MOBILE_MONEY', 'Mikocheni Walk-in', NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE
  branch_id = VALUES(branch_id),
  total_amount = VALUES(total_amount),
  profit = VALUES(profit),
  payment_method = VALUES(payment_method),
  customer_name = VALUES(customer_name);

DELETE FROM sale_items WHERE sale_id IN ('SALE-BR009-S001', 'SALE-BR010-S001');
INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, batch_number)
VALUES
  ('SALE-BR009-S001', 'PRD-SMPL-PARA500', 60, 220.00, 80.00, 'MSK-PAR-2026-01'),
  ('SALE-BR009-S001', 'PRD-SMPL-ORS', 20, 520.00, 200.00, 'MSK-AMX-2026-01'),
  ('SALE-BR009-S001', 'PRD-SMPL-CET10', 40, 270.00, 90.00, 'MSK-PAR-2026-01'),
  ('SALE-BR010-S001', 'PRD-SMPL-PARA500', 80, 210.00, 80.00, 'MIK-IBU-2026-01'),
  ('SALE-BR010-S001', 'PRD-SMPL-IBU400', 40, 310.00, 120.00, 'MIK-IBU-2026-01'),
  ('SALE-BR010-S001', 'PRD-SMPL-AMOX500', 15, 840.00, 450.00, 'MIK-AMX-2026-01');

-- 7) Demo invoices and payments
INSERT INTO invoices (id, branch_id, customer_name, customer_phone, total_amount, paid_amount, status, due_date, description, source, items, archived)
VALUES
  ('INV-BR009-S001', 'BR009', 'Masaki Clinic', '+255711100001', 120000.00, 70000.00, 'PARTIAL', CURDATE() + INTERVAL 14 DAY, 'Sample credit invoice for partner clinic', 'MANUAL', NULL, 0),
  ('INV-BR010-S001', 'BR010', 'Mikocheni Community Pharmacy', '+255711100002', 95000.00, 95000.00, 'PAID', CURDATE() + INTERVAL 7 DAY, 'Sample wholesale invoice', 'MANUAL', NULL, 0)
ON DUPLICATE KEY UPDATE
  branch_id = VALUES(branch_id),
  customer_name = VALUES(customer_name),
  customer_phone = VALUES(customer_phone),
  total_amount = VALUES(total_amount),
  paid_amount = VALUES(paid_amount),
  status = VALUES(status),
  due_date = VALUES(due_date),
  description = VALUES(description),
  source = VALUES(source),
  archived = VALUES(archived);

DELETE FROM invoice_payments WHERE invoice_id IN ('INV-BR009-S001', 'INV-BR010-S001');
INSERT INTO invoice_payments (invoice_id, amount, discount, discount_percent, method, receipt_number, created_at)
VALUES
  ('INV-BR009-S001', 70000.00, 0.00, 0.00, 'BANK_TRANSFER', 'RCPT-BR009-001', NOW() - INTERVAL 1 DAY),
  ('INV-BR010-S001', 95000.00, 2000.00, 2.06, 'MOBILE_MONEY', 'RCPT-BR010-001', NOW() - INTERVAL 12 HOUR);

-- 8) Demo expenses (insert only once per branch/description/date)
INSERT INTO expenses (category, description, amount, date, status, branch_id, archived)
SELECT 'Utilities', 'Electricity - Masaki Medics sample', 185000.00, CURDATE() - INTERVAL 3 DAY, 'Approved', 'BR009', 0
WHERE NOT EXISTS (
  SELECT 1 FROM expenses
  WHERE branch_id = 'BR009'
    AND description = 'Electricity - Masaki Medics sample'
    AND date = CURDATE() - INTERVAL 3 DAY
);

INSERT INTO expenses (category, description, amount, date, status, branch_id, archived)
SELECT 'Rent', 'Shop rent - Mikocheni sample', 850000.00, CURDATE() - INTERVAL 5 DAY, 'Approved', 'BR010', 0
WHERE NOT EXISTS (
  SELECT 1 FROM expenses
  WHERE branch_id = 'BR010'
    AND description = 'Shop rent - Mikocheni sample'
    AND date = CURDATE() - INTERVAL 5 DAY
);

COMMIT;
