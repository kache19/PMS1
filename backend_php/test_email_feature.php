<?php
/**
 * Comprehensive API Test Suite for Pharmacy Management System
 * 
 * This script tests:
 * - Database connectivity
 * - Mail configuration
 * - Password reset (forgot + reset flow)
 * - Bulk send reset links (admin)
 * - Basic auth endpoints
 * 
 * Usage:
 *   php test_email_feature.php [base_url] [admin_token] [test_email]
 * 
 * Example:
 *   php test_email_feature.php "http://localhost:8000" "your_admin_token" "test@example.com"
 */

$baseUrl = isset($argv[1]) ? $argv[1] : 'http://localhost:8000';
$adminToken = isset($argv[2]) ? $argv[2] : '';
$testEmail = isset($argv[3]) ? $argv[3] : 'test@pharmacy.local';

echo "====================================\n";
echo "Pharmacy System - Email Test Suite\n";
echo "====================================\n\n";

// Test 1: Database Connection
echo "[1] Testing database connection...\n";
try {
    require_once 'config/database.php';
    global $pdo;
    
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM staff');
    $stmt->execute();
    $result = $stmt->fetch();
    echo "✓ Database OK - Found {$result['count']} staff members\n\n";
} catch (Exception $e) {
    echo "✗ Database Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Mail Configuration
echo "[2] Testing mail configuration...\n";
try {
    $mailConfig = require 'config/mail.php';
    $smtp = $mailConfig['smtp'] ?? [];
    
    if (empty($smtp['host'])) {
        echo "⚠ Mail host not configured (using mail() fallback)\n";
    } else {
        echo "✓ Mail configured via " . $smtp['host'] . ":{$smtp['port']}\n";
        echo "  From: {$smtp['from_address']} ({$smtp['from_name']})\n";
    }
    echo "  Reset URL base: " . substr($mailConfig['reset_base_url'], 0, 50) . "...\n\n";
} catch (Exception $e) {
    echo "✗ Mail config error: " . $e->getMessage() . "\n\n";
}

// Test 3: Password Resets Table
echo "[3] Checking password_resets table...\n";
try {
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM password_resets');
    $stmt->execute();
    $result = $stmt->fetch();
    echo "✓ password_resets table exists - {$result['count']} tokens\n\n";
} catch (Exception $e) {
    echo "✗ password_resets table missing: " . $e->getMessage() . "\n";
    echo "  Run migration: mysql -u root -p db_name < migrations/2026_create_password_resets_table.sql\n\n";
}

// Test 4: Test Mailer Function
echo "[4] Testing mailer function...\n";
try {
    require_once 'utils/mailer.php';
    
    // Test with PHPMailer if available
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        echo "✓ PHPMailer available\n";
    } else {
        echo "⚠ PHPMailer not available (using PHP mail() function)\n";
        echo "  To use PHPMailer: composer require phpmailer/phpmailer\n";
    }
    echo "\n";
} catch (Exception $e) {
    echo "✗ Mailer error: " . $e->getMessage() . "\n\n";
}

// Test 5: Forgot Password Endpoint
echo "[5] Testing /api/auth/forgot endpoint...\n";
echo "  Testing with email: $testEmail\n";

$response = callApi($baseUrl . '/api/auth/forgot', 'POST', json_encode(['email' => $testEmail]));
if ($response['status'] === 200) {
    echo "✓ Forgot password request accepted\n";
    echo "  Response: " . (isset($response['json']['message']) ? $response['json']['message'] : 'OK') . "\n";
    
    // Check if token was created
    try {
        $stmt = $pdo->prepare('SELECT token, expires_at FROM password_resets ORDER BY created_at DESC LIMIT 1');
        $stmt->execute();
        $token = $stmt->fetch();
        if ($token) {
            echo "  Token created: " . substr($token['token'], 0, 16) . "...\n";
            echo "  Expires: " . $token['expires_at'] . "\n";
        }
    } catch (Exception $e) {
        echo "  Note: Could not verify token in DB\n";
    }
} else {
    echo "✗ Forgot password failed\n";
    echo "  Status: " . $response['status'] . "\n";
    echo "  Response: " . json_encode($response['json']) . "\n";
}
echo "\n";

// Test 6: Reset Password Endpoint
echo "[6] Testing /api/auth/reset endpoint...\n";
try {
    // Get a valid token from DB
    $stmt = $pdo->prepare('SELECT token, staff_id FROM password_resets WHERE expires_at >= NOW() LIMIT 1');
    $stmt->execute();
    $tokenRow = $stmt->fetch();
    
    if ($tokenRow) {
        $testToken = $tokenRow['token'];
        $response = callApi($baseUrl . '/api/auth/reset', 'POST', json_encode([
            'token' => $testToken,
            'newPassword' => 'TestPass123'
        ]));
        
        if ($response['status'] === 200) {
            echo "✓ Reset password accepted\n";
            echo "  Response: " . (isset($response['json']['message']) ? $response['json']['message'] : 'OK') . "\n";
        } else {
            echo "✗ Reset password failed\n";
            echo "  Status: " . $response['status'] . "\n";
        }
    } else {
        echo "⚠ No valid reset token found in database\n";
        echo "  First run /api/auth/forgot to generate a token\n";
    }
} catch (Exception $e) {
    echo "✗ Reset test error: " . $e->getMessage() . "\n";
}
echo "\n";

// Test 7: Bulk Send (Admin Only)
echo "[7] Testing /api/admin/bulk-send-reset-links endpoint...\n";
if (empty($adminToken)) {
    echo "⚠ Admin token not provided - skipping\n";
    echo "  Pass admin token as second argument: php test_email_feature.php \"$baseUrl\" \"your_token\"\n";
} else {
    $response = callApi($baseUrl . '/api/admin/bulk-send-reset-links', 'POST', json_encode(['staffIds' => []]), $adminToken);
    
    if ($response['status'] === 200) {
        $json = $response['json'];
        echo "✓ Bulk send completed\n";
        echo "  Sent: {$json['sent']} | Failed: {$json['failed']} | Total: {$json['total']}\n";
    } else {
        echo "✗ Bulk send failed\n";
        echo "  Status: " . $response['status'] . "\n";
        echo "  Response: " . json_encode($response['json']) . "\n";
    }
}
echo "\n";

// Test 8: Health Check
echo "[8] Testing /api/health endpoint...\n";
$response = callApi($baseUrl . '/api/health', 'GET', '');
if ($response['status'] === 200) {
    echo "✓ API health check OK\n";
} else {
    echo "✗ Health check failed (status: " . $response['status'] . ")\n";
}
echo "\n";

echo "====================================\n";
echo "Test Suite Complete\n";
echo "====================================\n";

// Helper function to call API
function callApi($url, $method = 'GET', $data = '', $token = '') {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For self-signed certs
    
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    
    if (!empty($token)) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if (!empty($data) && $method !== 'GET') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $json = json_decode($response, true) ?? [];
    
    return [
        'status' => $httpCode,
        'json' => $json,
        'raw' => $response,
        'error' => $error
    ];
}

?>
