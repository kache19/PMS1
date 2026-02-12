<?php
/**
 * Automatic Backup Scheduler
 * This file should be called by a cron job or scheduled task every minute
 * Add to cron: * * * * * php /path/to/backend_php/cron_backup.php
 */

require_once __DIR__ . '/config/database.php';

global $pdo;

try {
    // Get backup settings
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ("autoBackupEnabled", "autoBackupTime", "backupRetentionDays")');
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    $autoBackupEnabled = ($settings['autoBackupEnabled'] ?? 'false') === 'true';
    $autoBackupTime = $settings['autoBackupTime'] ?? '00:00';
    $retentionDays = intval($settings['backupRetentionDays'] ?? 30);
    
    if (!$autoBackupEnabled) {
        exit(0);
    }
    
    // Get current time
    $currentTime = date('H:i');
    $currentDate = date('Y-m-d');
    
    // Check if we need to run backup
    // Look for the last backup date
    $backupDir = __DIR__ . '/backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    $lastBackupDateFile = $backupDir . '/.last_backup_date';
    $today = date('Y-m-d');
    
    $shouldRunBackup = false;
    
    if (file_exists($lastBackupDateFile)) {
        $lastBackupDate = trim(file_get_contents($lastBackupDateFile));
        $shouldRunBackup = ($lastBackupDate !== $today && $currentTime >= $autoBackupTime);
    } else {
        $shouldRunBackup = ($currentTime >= $autoBackupTime);
    }
    
    if (!$shouldRunBackup) {
        exit(0);
    }
    
    // Get all data from key tables for backup
    $tables = ['staff', 'branches', 'products', 'branch_inventory', 'sales', 'invoices', 'expenses', 'drug_batches', 'audit_logs'];
    $backupData = [
        'metadata' => [
            'version' => '1.0.0',
            'timestamp' => date('c'),
            'backupBy' => 'System (Automatic)',
            'databaseName' => getenv('DB_NAME') ?? 'malenyap_pharma',
            'totalTables' => count($tables),
            'type' => 'Automatic'
        ],
        'data' => []
    ];
    
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT * FROM $table");
            $backupData['data'][$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Failed to backup table $table: " . $e->getMessage());
            $backupData['data'][$table] = [];
        }
    }
    
    // Save backup with timestamp
    $timestamp = date('Y-m-d_H-i-s');
    $backupFilename = "backup_$timestamp.json";
    $backupPath = $backupDir . '/' . $backupFilename;
    
    if (file_put_contents($backupPath, json_encode($backupData, JSON_PRETTY_PRINT), LOCK_EX)) {
        // Update last backup date
        file_put_contents($lastBackupDateFile, $today, LOCK_EX);
        
        // Log backup action
        try {
            $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, details, severity) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                'SYSTEM',
                'System Scheduler',
                'BACKUP_CREATED',
                'SYSTEM',
                json_encode(['filename' => $backupFilename, 'type' => 'Automatic']),
                'INFO'
            ]);
        } catch (Exception $e) {
            error_log('Failed to log backup action: ' . $e->getMessage());
        }
        
        // Clean old backups
        $files = scandir($backupDir);
        $cutoffTime = time() - ($retentionDays * 24 * 60 * 60);
        
        foreach ($files as $file) {
            if (strpos($file, 'backup_') === 0 && strpos($file, '.json') !== false) {
                $filePath = $backupDir . '/' . $file;
                if (filemtime($filePath) < $cutoffTime) {
                    unlink($filePath);
                }
            }
        }
        
        error_log("Automatic backup created: $backupFilename");
    } else {
        error_log("Failed to create backup file: $backupPath");
    }
    
} catch (Exception $e) {
    error_log('Backup scheduler error: ' . $e->getMessage());
}

exit(0);
?>
