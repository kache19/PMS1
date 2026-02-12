-- Create user_login_trackers table to track login activity by branch
CREATE TABLE IF NOT EXISTS `user_login_trackers` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `device_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `login_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logout_time` timestamp NULL DEFAULT NULL,
  `session_duration_minutes` int DEFAULT NULL,
  `status` enum('active', 'inactive') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_login_time` (`login_time`),
  KEY `idx_user_branch` (`user_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for common queries
CREATE INDEX idx_recent_logins ON user_login_trackers (login_time DESC);
CREATE INDEX idx_user_logins ON user_login_trackers (user_id, login_time DESC);
CREATE INDEX idx_branch_logins ON user_login_trackers (branch_id, login_time DESC);
