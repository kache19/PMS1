<?php
require_once 'jwt.php';

function hashPassword($password) {
    $options = [
        'cost' => 10,
    ];
    return password_hash($password, PASSWORD_BCRYPT, $options);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($user) {
    $payload = [
        'id' => $user['id'],
        'role' => $user['role'],
        'branch_id' => $user['branch_id'],
        'iat' => time(),
        'exp' => time() + (8 * 60 * 60) // 8 hours
    ];
    return JWT::encode($payload);
}

function authenticateToken() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

    // Also check $_SERVER for Authorization header (for CLI testing)
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!$authHeader && isset($_SERVER['Authorization'])) {
        $authHeader = $_SERVER['Authorization'];
    }

    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        error_log('Authentication failed: No Authorization header or invalid format');
        http_response_code(401);
        echo json_encode(['error' => 'Access token required']);
        exit;
    }

    $token = $matches[1];
    error_log('Attempting to decode token: ' . substr($token, 0, 20) . '...');
    
    try {
        $payload = JWT::decode($token);
    } catch (Exception $e) {
        error_log('JWT decode exception: ' . $e->getMessage());
        http_response_code(403);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }

    // JWT::decode() returns false if signature doesn't match or token is invalid
    if ($payload === false || $payload === null) {
        error_log('JWT decode returned false/null - invalid signature or malformed token');
        http_response_code(403);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }

    // Check if token is expired
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        error_log('Token expired. Expiry time: ' . $payload['exp'] . ', Current time: ' . time());
        http_response_code(403);
        echo json_encode(['error' => 'Token expired']);
        exit;
    }

    return $payload;
}

function authorizeRoles($allowedRoles) {
    // Allow unauthenticated GET requests (read operations)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return null;
    }

    $user = authenticateToken();
    if (in_array($user['role'], $allowedRoles)) {
        return $user;
    }

    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    exit;
}

function getCurrentUser() {
    return authenticateToken();
}
?>