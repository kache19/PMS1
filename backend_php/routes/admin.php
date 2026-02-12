<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';
require_once dirname(__DIR__) . '/utils/mailer.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['subpath'] ?? '';

switch ($method) {
    case 'POST':
        if ($path === 'bulk-send-reset-links') {
            handleBulkSendResetLinks();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function handleBulkSendResetLinks() {
    global $pdo;

    try {
        // Require SUPER_ADMIN role
        $user = authenticateToken();
        if ($user['role'] !== 'SUPER_ADMIN') {
            http_response_code(403);
            echo json_encode(['error' => 'Only SUPER_ADMIN can perform this action']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $staffIds = $input['staffIds'] ?? []; // array of staff IDs or empty to send to all

        // Get all active staff with valid emails
        if (empty($staffIds)) {
            $stmt = $pdo->prepare('SELECT id, name, email FROM staff WHERE status = ? AND email IS NOT NULL AND email != ""');
            $stmt->execute(['ACTIVE']);
        } else {
            $placeholders = implode(',', array_fill(0, count($staffIds), '?'));
            $stmt = $pdo->prepare("SELECT id, name, email FROM staff WHERE id IN ($placeholders) AND email IS NOT NULL AND email != \"\"");
            $stmt->execute($staffIds);
        }

        $staffList = $stmt->fetchAll();

        if (empty($staffList)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid staff members found to send to']);
            return;
        }

        $mailConfig = require dirname(__DIR__) . '/config/mail.php';
        $resetBase = $mailConfig['reset_base_url'] ?? '';

        $sent = 0;
        $failed = 0;

        foreach ($staffList as $staff) {
            try {
                $token = bin2hex(random_bytes(32));
                $expiresAt = date('Y-m-d H:i:s', time() + 60 * 60); // 1 hour

                // Clean old tokens for this staff
                $cleanStmt = $pdo->prepare('DELETE FROM password_resets WHERE staff_id = ?');
                $cleanStmt->execute([$staff['id']]);

                // Store new token
                $tokenStmt = $pdo->prepare('INSERT INTO password_resets (staff_id, token, expires_at) VALUES (?, ?, ?)');
                $tokenStmt->execute([$staff['id'], $token, $expiresAt]);

                $resetLink = $resetBase . $token;
                $subject = 'Password Reset - Action Required';
                $body = "<p>Hello " . htmlspecialchars($staff['name']) . ",</p>" .
                    "<p>A password reset link has been sent to you. Click below to set your password (expires in 1 hour):</p>" .
                    "<p><a href=\"" . htmlspecialchars($resetLink) . "\" style=\"background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;\">" .
                    "Reset Password</a></p>" .
                    "<p>Or copy and paste this link:<br>" .
                    "<code>" . htmlspecialchars($resetLink) . "</code></p>" .
                    "<p>If you did not request this, please contact your administrator.</p>";

                if (@sendMail($staff['email'], $subject, $body)) {
                    $sent++;
                } else {
                    $failed++;
                    error_log("Failed to send reset email to {$staff['email']}");
                }
            } catch (Exception $e) {
                $failed++;
                error_log("Error sending reset to {$staff['id']}: " . $e->getMessage());
            }
        }

        echo json_encode([
            'message' => 'Bulk reset emails sent',
            'sent' => $sent,
            'failed' => $failed,
            'total' => count($staffList)
        ]);
    } catch (Exception $e) {
        error_log('Bulk send error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Server error', 'details' => $e->getMessage()]);
    }
}
?>
