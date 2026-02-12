-- Migration: create password_resets table
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `staff_id` VARCHAR(50) NOT NULL,
  `token` VARCHAR(128) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`token`)
);
