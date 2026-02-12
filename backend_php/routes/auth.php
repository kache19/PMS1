<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/utils/email_validator.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['subpath'] ?? '';

switch ($method) {
    case 'POST':
        if ($path === 'login') {
            handleLogin();
        } elseif ($path === 'refresh') {
            handleRefresh();
        } elseif ($path === 'logout') {
            handleLogout();
        } elseif ($path === 'change-password') {
            handleChangePassword();
        } elseif ($path === 'forgot') {
            handleForgotPassword();
        } elseif ($path === 'reset') {
            handleResetPassword();
        }
        break;
    case 'GET':
        if ($path === 'me') {
            handleMe();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleLogin() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password required']);
        return;
    }

    try {
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !verifyPassword($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        $token = generateToken($user);

        // Update last login
        $stmt = $pdo->prepare('UPDATE staff SET last_login = NOW() WHERE id = ?');
        $stmt->execute([$user['id']]);

        // Log login activity to user_login_trackers
        try {
            $loginId = uniqid('LGN_', true);
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';
            
            // Parse user agent for device info
            $deviceInfo = 'Unknown Device';
            if (strpos($userAgent, 'Mobile') !== false || strpos($userAgent, 'Android') !== false) {
                $deviceInfo = 'Mobile';
            } elseif (strpos($userAgent, 'Windows') !== false) {
                $deviceInfo = 'Windows';
            } elseif (strpos($userAgent, 'Macintosh') !== false) {
                $deviceInfo = 'macOS';
            } elseif (strpos($userAgent, 'Linux') !== false) {
                $deviceInfo = 'Linux';
            }
            
            // Get branch name
            $branchStmt = $pdo->prepare('SELECT name FROM branches WHERE id = ?');
            $branchStmt->execute([$user['branch_id']]);
            $branchData = $branchStmt->fetch();
            $branchName = $branchData['name'] ?? 'Unknown Branch';
            
            $trackerStmt = $pdo->prepare('INSERT INTO user_login_trackers (id, user_id, user_name, branch_id, branch_name, ip_address, user_agent, device_info, login_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), \'active\')');
            $trackerStmt->execute([$loginId, $user['id'], $user['name'], $user['branch_id'], $branchName, $ipAddress, $userAgent, $deviceInfo]);
        } catch (Exception $trackerErr) {
            // Log tracker error but don't fail login
            error_log('Failed to log login activity: ' . $trackerErr->getMessage());
        }

        $staffData = [
            'id' => $user['id'],
            'name' => $user['name'],
            'role' => $user['role'],
            'branchId' => $user['branch_id'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'status' => $user['status'],
            'username' => $user['username'],
            'joinedDate' => $user['created_at']
        ];

        echo json_encode(['token' => $token, 'user' => $staffData]);
    } catch (Exception $e) {
        error_log('Login error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleMe() {
    global $pdo;

    try {
        $user = getCurrentUser();
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();

        if (!$userData) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $staffData = [
            'id' => $userData['id'],
            'name' => $userData['name'],
            'role' => $userData['role'],
            'branchId' => $userData['branch_id'],
            'email' => $userData['email'],
            'phone' => $userData['phone'],
            'status' => $userData['status'],
            'username' => $userData['username'],
            'joinedDate' => $userData['created_at']
        ];

        echo json_encode(['user' => $staffData]);
    } catch (Exception $e) {
        error_log('Get profile error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleRefresh() {
    global $pdo;

    try {
        $user = getCurrentUser();
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();

        if (!$userData) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        $newToken = generateToken($userData);
        echo json_encode(['token' => $newToken]);
    } catch (Exception $e) {
        error_log('Token refresh error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleLogout() {
    global $pdo;
    
    try {
        $user = getCurrentUser();
        
        // Mark the most recent active login as logged out
        $stmt = $pdo->prepare('UPDATE user_login_trackers SET status = \'inactive\', logout_time = NOW(), session_duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, NOW()) WHERE user_id = ? AND status = \'active\' ORDER BY login_time DESC LIMIT 1');
        $stmt->execute([$user['id']]);
    } catch (Exception $e) {
        error_log('Failed to log logout activity: ' . $e->getMessage());
    }
    
    // Client-side token removal is sufficient
    echo json_encode(['message' => 'Logged out successfully']);
}

function handleChangePassword() {
    global $pdo;

    try {
        $user = getCurrentUser();
        $input = json_decode(file_get_contents('php://input'), true);

        $currentPassword = $input['currentPassword'] ?? '';
        $newPassword = $input['newPassword'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['error' => 'Current password and new password are required']);
            return;
        }

        if (strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode(['error' => 'New password must be at least 8 characters']);
            return;
        }

        // Get current user with password hash
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$user['id']]);
        $staff = $stmt->fetch();

        if (!$staff) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        // Verify current password
        if (!verifyPassword($currentPassword, $staff['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Current password is incorrect']);
            return;
        }

        // Hash and update new password
        $hashedPassword = hashPassword($newPassword);
        $stmt = $pdo->prepare('UPDATE staff SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hashedPassword, $user['id']]);

        echo json_encode(['message' => 'Password changed successfully']);
    } catch (Exception $e) {
        error_log('Change password error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleForgotPassword() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');

    if (empty($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        return;
    }

    // Validate email format
    if (!validateEmailFormat($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }

    try {
        // Check if email exists and user is active
        $user = validateAndFindActiveStaff($pdo, $email);

        // Always return success to avoid leaking whether an email exists
        if (!$user) {
            echo json_encode(['message' => 'If an account with that email exists, a reset link has been sent']);
            return;
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 60 * 60); // 1 hour

        // Clean old tokens for this staff
        $cleanStmt = $pdo->prepare('DELETE FROM password_resets WHERE staff_id = ?');
        $cleanStmt->execute([$user['id']]);

        // Store token
        $stmt = $pdo->prepare('INSERT INTO password_resets (staff_id, token, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([$user['id'], $token, $expiresAt]);

        $mailConfig = require dirname(__DIR__) . '/config/mail.php';
        $resetBase = $mailConfig['reset_base_url'] ?? '';
        $resetLink = $resetBase . $token;

        $subject = 'Password reset request';
        $body = "<p>Hello " . htmlspecialchars($user['name']) . ",</p>" .
            "<p>We received a request to reset your password. Click the link below to set a new password (expires in 1 hour):</p>" .
            "<p><a href=\"" . htmlspecialchars($resetLink) . "\">" . htmlspecialchars($resetLink) . "</a></p>" .
            "<p>If you did not request this, please ignore this email.</p>";

        // send mail (best-effort)
        $mailSent = @sendMail($user['email'], $subject, $body);
        
        if ($mailSent) {
            error_log("Password reset email sent to {$user['email']}");
        } else {
            error_log("Failed to send password reset email to {$user['email']}");
        }

        echo json_encode(['message' => 'If an account with that email exists, a reset link has been sent']);
    } catch (Exception $e) {
        error_log('Forgot password error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleResetPassword() {
    global $pdo;

    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    $newPassword = $input['newPassword'] ?? '';

    if (empty($token) || empty($newPassword)) {
        http_response_code(400);
        echo json_encode(['error' => 'Token and newPassword are required']);
        return;
    }

    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'New password must be at least 8 characters']);
        return;
    }

    try {
        $stmt = $pdo->prepare('SELECT * FROM password_resets WHERE token = ? AND expires_at >= NOW()');
        $stmt->execute([$token]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired token']);
            return;
        }

        $staffId = $row['staff_id'];
        $hashed = hashPassword($newPassword);

        $stmt = $pdo->prepare('UPDATE staff SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hashed, $staffId]);

        // Delete used token(s)
        $stmt = $pdo->prepare('DELETE FROM password_resets WHERE staff_id = ?');
        $stmt->execute([$staffId]);

        echo json_encode(['message' => 'Password reset successful']);
    } catch (Exception $e) {
        error_log('Reset password error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}
?>