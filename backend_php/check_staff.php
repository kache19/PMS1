<?php
require_once __DIR__ . '/config/database.php';
global $pdo;

$stmt = $pdo->query('SELECT id, name, role FROM staff LIMIT 5');
$staff = $stmt->fetchAll();
echo "Valid Staff IDs:\n";
foreach ($staff as $s) {
    echo "  {$s['id']}: {$s['name']} ({$s['role']})\n";
}
?>