<?php
require_once __DIR__ . '/config/database.php';
global $pdo;

echo "INVOICES TABLE COLUMNS:\n";
$stmt = $pdo->query("DESCRIBE invoices");
$columns = $stmt->fetchAll();
foreach ($columns as $col) {
    $null = $col['Null'] === 'YES' ? 'NULL' : 'NOT NULL';
    $default = $col['Default'] ? " DEFAULT {$col['Default']}" : '';
    echo "  - {$col['Field']} ({$col['Type']}) {$null}{$default}\n";
}
?>