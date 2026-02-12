<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

switch ($method) {
    case 'POST':
        if ($action === 'create') {
            createBackup();
        } elseif ($action === 'schedule') {
            scheduleAutoBackup();
        }
        break;
    case 'GET':
        if ($action === 'list') {
            listBackups();
        } elseif ($action === 'download') {
            downloadBackup();
        } elseif ($action === 'restore') {
            restoreBackup();
        } elseif ($action === 'status') {
            getBackupStatus();
        }
        break;
    case 'DELETE':
        if ($action === 'delete') {
            deleteBackup();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function createBackup() {
    global $pdo;
    
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $backupDir = __DIR__ . '/../backups';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        // Get all data from key tables
        $tables = ['staff', 'branches', 'products', 'branch_inventory', 'sales', 'invoices', 'expenses', 'drug_batches', 'audit_logs'];
        $backupData = [
            'metadata' => [
                'version' => '1.0.0',
                'timestamp' => date('c'),
                'backupBy' => $user['name'],
                'databaseName' => getenv('DB_NAME') ?? 'malenyap_pharma',
                'totalTables' => count($tables),
                'type' => 'Auto' // Or 'Manual'
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
        
        file_put_contents($backupPath, json_encode($backupData, JSON_PRETTY_PRINT), LOCK_EX);
        
        // Log backup action
        try {
            $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, details, ip_address, user_agent, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $user['id'],
                $user['name'],
                'BACKUP_CREATED',
                'SYSTEM',
                json_encode(['filename' => $backupFilename, 'type' => 'Automatic']),
                $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
                $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN',
                'INFO'
            ]);
        } catch (Exception $e) {
            error_log('Failed to log backup action: ' . $e->getMessage());
        }
        
        // Clean old backups (keep last 30 days)
        cleanOldBackups($backupDir, 30);
        
        echo json_encode([
            'success' => true,
            'message' => 'Backup created successfully',
            'filename' => $backupFilename,
            'timestamp' => date('c'),
            'size' => filesize($backupPath)
        ]);
    } catch (Exception $e) {
        error_log('Backup creation error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function scheduleAutoBackup() {
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $enabled = $input['enabled'] ?? false;
        $backupTime = $input['backupTime'] ?? '00:00';
        $retentionDays = intval($input['retentionDays'] ?? 30);
        
        global $pdo;
        
        // Save auto-backup settings
        $existingSettings = [];
        $stmt = $pdo->query('SELECT setting_key FROM system_settings WHERE setting_key IN ("autoBackupEnabled", "autoBackupTime", "backupRetentionDays")');
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $settings = [
            'autoBackupEnabled' => $enabled ? 'true' : 'false',
            'autoBackupTime' => $backupTime,
            'backupRetentionDays' => (string)$retentionDays
        ];
        
        foreach ($settings as $key => $value) {
            if (in_array($key, $existing)) {
                $stmt = $pdo->prepare('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?');
                $stmt->execute([$value, $key]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO system_settings (id, category, setting_key, setting_value, data_type, description) VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([uniqid('SET_'), 'backup', $key, $value, 'string', "Backup setting: $key"]);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Auto-backup settings saved',
            'settings' => $settings
        ]);
    } catch (Exception $e) {
        error_log('Schedule auto-backup error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function listBackups() {
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $backupDir = __DIR__ . '/../backups';
        $backups = [];
        
        if (is_dir($backupDir)) {
            $files = array_reverse(array_filter(scandir($backupDir), function($f) {
                return strpos($f, 'backup_') === 0 && strpos($f, '.json') !== false;
            }));
            
            foreach ($files as $file) {
                $filePath = $backupDir . '/' . $file;
                $backups[] = [
                    'filename' => $file,
                    'size' => filesize($filePath),
                    'created' => filemtime($filePath),
                    'path' => $file
                ];
            }
        }
        
        echo json_encode($backups);
    } catch (Exception $e) {
        error_log('List backups error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function downloadBackup() {
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $filename = $_GET['filename'] ?? '';
        
        // Prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid filename']);
            return;
        }
        
        $backupDir = __DIR__ . '/../backups';
        $filePath = $backupDir . '/' . $filename;
        
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Backup file not found']);
            return;
        }
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filePath));
        
        readfile($filePath);
        exit;
    } catch (Exception $e) {
        error_log('Download backup error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function restoreBackup() {
    global $pdo;
    
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $filename = $_GET['filename'] ?? '';
        
        // Prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid filename']);
            return;
        }
        
        $backupDir = __DIR__ . '/../backups';
        $filePath = $backupDir . '/' . $filename;
        
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Backup file not found']);
            return;
        }
        
        $backupContent = file_get_contents($filePath);
        $backupData = json_decode($backupContent, true);
        
        if (!$backupData || !isset($backupData['data'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid backup format']);
            return;
        }
        
        // Begin transaction
        $pdo->beginTransaction();
        
        try {
            // Clear all tables and restore from backup
            foreach ($backupData['data'] as $table => $rows) {
                // Clear table
                $pdo->exec("DELETE FROM $table");
                
                if (!empty($rows)) {
                    $columns = array_keys($rows[0]);
                    $placeholders = implode(',', array_fill(0, count($columns), '?'));
                    $columnList = implode(',', $columns);
                    
                    $stmt = $pdo->prepare("INSERT INTO $table ($columnList) VALUES ($placeholders)");
                    
                    foreach ($rows as $row) {
                        $values = array_values($row);
                        $stmt->execute($values);
                    }
                }
            }
            
            $pdo->commit();
            
            // Log restore action
            $stmt = $pdo->prepare('INSERT INTO audit_logs (user_id, user_name, action, entity_type, details, ip_address, user_agent, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $user['id'],
                $user['name'],
                'BACKUP_RESTORED',
                'SYSTEM',
                json_encode(['filename' => $filename]),
                $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
                $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN',
                'WARNING'
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Backup restored successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } catch (Exception $e) {
        error_log('Restore backup error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getBackupStatus() {
    try {
        $user = getCurrentUser();
        
        global $pdo;
        
        // Get auto-backup settings
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ("autoBackupEnabled", "autoBackupTime", "backupRetentionDays")');
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        // Get last backup from audit logs
        $stmt = $pdo->query('SELECT details, timestamp FROM audit_logs WHERE action = "BACKUP_CREATED" ORDER BY timestamp DESC LIMIT 1');
        $lastBackup = $stmt->fetch();
        
        // Count backups
        $backupDir = __DIR__ . '/../backups';
        $backupCount = 0;
        $totalSize = 0;
        
        if (is_dir($backupDir)) {
            $files = array_filter(scandir($backupDir), function($f) {
                return strpos($f, 'backup_') === 0 && strpos($f, '.json') !== false;
            });
            $backupCount = count($files);
            
            foreach ($files as $file) {
                $totalSize += filesize($backupDir . '/' . $file);
            }
        }
        
        echo json_encode([
            'autoBackupEnabled' => $settings['autoBackupEnabled'] === 'true',
            'autoBackupTime' => $settings['autoBackupTime'] ?? '00:00',
            'backupRetentionDays' => intval($settings['backupRetentionDays'] ?? 30),
            'lastBackup' => $lastBackup ? json_decode($lastBackup['details']) : null,
            'lastBackupTime' => $lastBackup['timestamp'] ?? null,
            'backupCount' => $backupCount,
            'totalSize' => $totalSize
        ]);
    } catch (Exception $e) {
        error_log('Get backup status error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteBackup() {
    try {
        $user = getCurrentUser();
        authorizeRoles(['SUPER_ADMIN']);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $filename = $input['filename'] ?? '';
        
        // Prevent directory traversal
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid filename']);
            return;
        }
        
        $backupDir = __DIR__ . '/../backups';
        $filePath = $backupDir . '/' . $filename;
        
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Backup file not found']);
            return;
        }
        
        unlink($filePath);
        
        echo json_encode(['success' => true, 'message' => 'Backup deleted successfully']);
    } catch (Exception $e) {
        error_log('Delete backup error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function cleanOldBackups($backupDir, $retentionDays) {
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
}
?>
