<?php
/**
 * Migration script to add supplier and restock status columns to drug_batches table
 * Run this file to apply the migration
 */

require_once dirname(__DIR__) . '/config/database.php';

global $pdo;

try {
    echo "Starting migration: Add supplier columns and restock status to drug_batches\n";
    
    // Add supplier_id column
    $sql = "ALTER TABLE `drug_batches` ADD COLUMN IF NOT EXISTS `supplier_id` varchar(50) DEFAULT NULL AFTER `status`";
    $pdo->exec($sql);
    echo "✓ Added supplier_id column\n";
    
    // Add supplier_name column
    $sql = "ALTER TABLE `drug_batches` ADD COLUMN IF NOT EXISTS `supplier_name` varchar(255) DEFAULT NULL AFTER `supplier_id`";
    $pdo->exec($sql);
    echo "✓ Added supplier_name column\n";
    
    // Add restock_status column
    $sql = "ALTER TABLE `drug_batches` ADD COLUMN IF NOT EXISTS `restock_status` enum('PENDING','RECEIVED','IN_TRANSIT') DEFAULT 'RECEIVED' AFTER `supplier_name`";
    $pdo->exec($sql);
    echo "✓ Added restock_status column\n";
    
    // Add last_restock_date column
    $sql = "ALTER TABLE `drug_batches` ADD COLUMN IF NOT EXISTS `last_restock_date` timestamp NULL DEFAULT NULL AFTER `restock_status`";
    $pdo->exec($sql);
    echo "✓ Added last_restock_date column\n";
    
    // Add indexes
    try {
        $pdo->exec("CREATE INDEX IF NOT EXISTS `idx_drug_batches_supplier` ON `drug_batches` (`supplier_id`)");
        echo "✓ Added supplier_id index\n";
    } catch (Exception $e) {
        echo "✓ Index idx_drug_batches_supplier already exists or error: " . $e->getMessage() . "\n";
    }
    
    try {
        $pdo->exec("CREATE INDEX IF NOT EXISTS `idx_drug_batches_restock_status` ON `drug_batches` (`restock_status`)");
        echo "✓ Added restock_status index\n";
    } catch (Exception $e) {
        echo "✓ Index idx_drug_batches_restock_status already exists or error: " . $e->getMessage() . "\n";
    }
    
    echo "\n✅ Migration completed successfully!\n";
    
    // Verify columns exist
    $stmt = $pdo->query("DESCRIBE drug_batches");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "\nCurrent drug_batches columns:\n";
    foreach ($columns as $col) {
        echo "  - $col\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
