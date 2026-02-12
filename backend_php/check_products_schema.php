<?php
require_once __DIR__ . '/config/database.php';
global $pdo;

echo "PRODUCTS TABLE COLUMNS:\n";
$stmt = $pdo->query("DESCRIBE products");
$columns = $stmt->fetchAll();
foreach ($columns as $col) {
    echo "  - {$col['Field']} ({$col['Type']})\n";
}
?>