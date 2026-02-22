<?php
require_once 'jwt.php';

function normalizeRoleKey($role) {
    return strtoupper(preg_replace('/[^A-Z0-9]/i', '', (string)$role));
}

function isAuditorUser($user) {
    return normalizeRoleKey($user['role'] ?? '') === 'AUDITOR';
}

function getRequestPathForPolicy() {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    $path = parse_url($requestUri, PHP_URL_PATH) ?: '';
    $path = str_replace('/malenya_pharmacy/backend_php/index.php', '', $path);
    $path = str_replace('/pharmacy/backend_php/index.php', '', $path);
    $path = str_replace('/backend_php/index.php', '', $path);
    $path = str_replace('/api', '', $path);
    if ($path === '') {
        $path = '/';
    }
    return $path;
}

function getClientIpAddress() {
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (!empty($forwarded)) {
        $parts = explode(',', $forwarded);
        $candidate = trim($parts[0]);
        if (!empty($candidate)) {
            return $candidate;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

function getSanitizedRequestBody() {
    $decoded = $_POST;
    if (!is_array($decoded) || empty($decoded)) {
        return null;
    }

    $mask = function ($value) use (&$mask) {
        if (!is_array($value)) {
            return $value;
        }
        $out = [];
        foreach ($value as $key => $entry) {
            $normalizedKey = strtolower((string)$key);
            $isSensitive = in_array($normalizedKey, [
                'password',
                'currentpassword',
                'newpassword',
                'token',
                'mfacode',
                'otp',
                'authorization'
            ], true);
            if ($isSensitive) {
                $out[$key] = '***';
            } else {
                $out[$key] = $mask($entry);
            }
        }
        return $out;
    };

    return $mask($decoded);
}

function isReadOnlyAuditorPath($path) {
    return preg_match('#^/(finance|sales|expenses|audit-logs|reports|archive|invoice|expense)(/|$)#', $path) === 1;
}

function enforceAuditorPolicies($user) {
    if (!isAuditorUser($user)) {
        return;
    }

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $path = getRequestPathForPolicy();

    if ($method !== 'GET' && isReadOnlyAuditorPath($path)) {
        http_response_code(403);
        echo json_encode(['error' => 'AUDITOR access is read-only for Finance, Reports, and Archive modules']);
        exit;
    }
}

function logAuditorRequest($user) {
    global $pdo;
    static $alreadyLogged = false;

    if ($alreadyLogged || !isAuditorUser($user)) {
        return;
    }
    $alreadyLogged = true;

    try {
        $path = getRequestPathForPolicy();
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $pathParts = array_values(array_filter(explode('/', trim($path, '/')), function ($part) {
            return $part !== '';
        }));
        $entityType = isset($pathParts[0]) ? strtoupper($pathParts[0]) : 'SYSTEM';
        $entityId = $pathParts[1] ?? null;

        $newValues = null;
        if ($method !== 'GET') {
            $sanitizedBody = getSanitizedRequestBody();
            if ($sanitizedBody !== null) {
                $newValues = json_encode($sanitizedBody);
            } else {
                $newValues = json_encode([
                    'method' => $method,
                    'path' => $path,
                    'note' => 'No form-encoded body payload captured'
                ]);
            }
        }

        $stmt = $pdo->prepare('
            INSERT INTO audit_logs
            (user_id, user_name, action, entity_type, entity_id, details, old_values, new_values, ip_address, user_agent, branch_id, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $branchId = $user['branch_id'] ?? null;
        if ($branchId === '' || strtoupper((string)$branchId) === 'HEAD_OFFICE') {
            $branchId = null;
        }
        $stmt->execute([
            $user['id'] ?? null,
            $user['name'] ?? 'AUDITOR',
            'AUDITOR_' . $method,
            $entityType,
            $entityId,
            'AUDITOR request ' . $method . ' ' . $path,
            null,
            $newValues,
            getClientIpAddress(),
            $_SERVER['HTTP_USER_AGENT'] ?? null,
            $branchId,
            'INFO'
        ]);
    } catch (Exception $e) {
        error_log('Failed to auto-log auditor request: ' . $e->getMessage());
    }
}

function hashPassword($password) {
    $options = [
        'cost' => 10,
    ];
    return password_hash($password, PASSWORD_BCRYPT, $options);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($user, $options = []) {
    $ttlSeconds = isset($options['ttl']) ? max(60, (int)$options['ttl']) : (8 * 60 * 60);
    $iat = time();
    $exp = $iat + $ttlSeconds;
    if (isset($options['sessionExpiresAt'])) {
        $exp = min($exp, (int)$options['sessionExpiresAt']);
    }

    $payload = [
        'id' => $user['id'],
        'role' => $user['role'],
        'branch_id' => $user['branch_id'],
        'name' => $user['name'] ?? null,
        'iat' => $iat,
        'exp' => $exp
    ];

    if (isset($options['mfaVerified'])) {
        $payload['mfa_verified'] = (bool)$options['mfaVerified'];
    }
    if (isset($options['sessionExpiresAt'])) {
        $payload['session_expires_at'] = (int)$options['sessionExpiresAt'];
    }
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

    enforceAuditorPolicies($payload);
    logAuditorRequest($payload);

    return $payload;
}

function authorizeRoles($allowedRoles) {
    $user = authenticateToken();
    $normalizedUserRole = normalizeRoleKey($user['role'] ?? '');
    $normalizedAllowedRoles = array_map('normalizeRoleKey', $allowedRoles);

    if (in_array($normalizedUserRole, $normalizedAllowedRoles, true)) {
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
