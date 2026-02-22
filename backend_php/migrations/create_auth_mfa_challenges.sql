-- MFA challenge table for AUDITOR login second-factor verification
CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(50) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_mfa_staff (staff_id),
  INDEX idx_mfa_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
