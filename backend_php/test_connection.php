<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'ok',
    'message' => 'Backend is running',
    'time' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION
]);

// Test database connection
try {
    require_once 'config/database.php';
    global $pdo, $dbname;
    echo json_encode([
        'database' => 'connected',
        'database_name' => $dbname
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'database' => 'error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
