<?php
/**
 * Migration Script: Add last_sync column to branches table
 */

require_once __DIR__ . '/config/database.php';

try {
    // Check if column already exists
    $stmt = $pdo->query("SHOW COLUMNS FROM branches LIKE 'last_sync'");
    $columnExists = $stmt->fetch();

    if (!$columnExists) {
        // Add the column
        $pdo->exec("ALTER TABLE branches ADD COLUMN last_sync TIMESTAMP NULL DEFAULT NULL AFTER is_head_office");
        echo "✓ Column 'last_sync' added successfully\n";

        // Update existing branches with current timestamp
        $pdo->exec("UPDATE branches SET last_sync = CURRENT_TIMESTAMP WHERE last_sync IS NULL");
        echo "✓ Updated existing branches with default timestamp\n";
    } else {
        echo "✓ Column 'last_sync' already exists\n";
    }

    echo "\nMigration completed successfully!\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
