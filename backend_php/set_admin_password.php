<?php
require_once 'config/database.php';
require_once 'utils/auth.php';

global $pdo;

try {
    $newPassword = 'admin123';
    $hash = hashPassword($newPassword);

    $stmt = $pdo->prepare('UPDATE staff SET password_hash = ? WHERE username = ?');
    $stmt->execute([$hash, 'admin']);

    echo json_encode(['success' => true, 'message' => 'Admin password reset to admin123']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to reset admin password', 'details' => $e->getMessage()]);
}
?>