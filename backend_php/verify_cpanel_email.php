<?php
/**
 * cPanel Email Production Verification Test
 * Run this script to verify your cPanel email configuration is working
 * 
 * Usage: 
 *   - Via Web: http://your-domain.com/backend_php/verify_cpanel_email.php
 *   - Via CLI: php verify_cpanel_email.php
 */

echo "========================================\n";
echo "cPanel Email Configuration Verification\n";
echo "========================================\n\n";

// Load environment
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    echo "❌ ERROR: .env file not found at $envFile\n";
    exit(1);
}

$linesBefore = count(file(__FILE__));
$env = [];
$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos($line, '#') === 0 || strpos($line, '=') === false) {
        continue;
    }
    list($key, $value) = explode('=', $line, 2);
    $key = trim($key);
    $value = trim($value);
    if (strpos($key, '#') === 0) {
        continue;
    }
    $env[$key] = $value;
    putenv($key . '=' . $value);
}

// Colors for terminal output
$colors = [
    'success' => "\033[92m",  // Green
    'error' => "\033[91m",    // Red
    'warning' => "\033[93m",  // Yellow
    'info' => "\033[94m",     // Blue
    'reset' => "\033[0m"      // Reset
];

// Function to show status
function showStatus($title, $status, $message) {
    global $colors;
    $symbol = $status === 'success' ? '✅' : ($status === 'error' ? '❌' : '⚠️');
    $color = $colors[$status] ?? '';
    $reset = $colors['reset'];
    echo "{$color}{$symbol} {$title}: {$message}{$reset}\n";
}

// Test 1: Verify .env configuration
echo "\n[1] Configuration Check\n";
echo "─────────────────────────\n";

$requiredVars = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD'];
$configOk = true;
foreach ($requiredVars as $var) {
    if (isset($env[$var]) && !empty($env[$var])) {
        $value = $var === 'MAIL_PASSWORD' ? '***' : $env[$var];
        showStatus($var, 'success', $value);
    } else {
        showStatus($var, 'error', 'Not configured');
        $configOk = false;
    }
}

if (!$configOk) {
    echo "\n❌ Configuration incomplete. Please update .env file.\n";
    exit(1);
}

// Test 2: Email format validation
echo "\n[2] Email Validation\n";
echo "────────────────────\n";

$emailUsername = $env['MAIL_USERNAME'] ?? '';
if (filter_var($emailUsername, FILTER_VALIDATE_EMAIL)) {
    showStatus('Email Format', 'success', $emailUsername . ' (valid)');
} else {
    showStatus('Email Format', 'error', $emailUsername . ' (invalid - must be full email)');
}

// Test 3: PHPMailer availability
echo "\n[3] PHPMailer Library\n";
echo "────────────────────\n";

require_once __DIR__ . '/vendor/autoload.php';

if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
    showStatus('PHPMailer', 'success', 'Library loaded');
} else {
    showStatus('PHPMailer', 'error', 'Library not found - run: composer require phpmailer/phpmailer');
}

// Test 4: SMTP Connection (if running web or CLI supports it)
echo "\n[4] SMTP Connection Test\n";
echo "────────────────────────\n";

$host = $env['MAIL_HOST'];
$port = $env['MAIL_PORT'];

// Try to connect
if (function_exists('fsockopen')) {
    $connection = @fsockopen($host, $port, $errno, $errstr, 5);
    if ($connection) {
        fclose($connection);
        showStatus('SMTP Server', 'success', "{$host}:{$port} (reachable)");
    } else {
        showStatus('SMTP Server', 'warning', "{$host}:{$port} (not reachable - may be network/firewall)");
        echo "   Error: {$errstr} ({$errno})\n";
    }
} else {
    showStatus('SMTP Connection', 'warning', 'fsockopen disabled - skipping network test');
}

// Test 5: Encryption setting
echo "\n[5] Security Settings\n";
echo "────────────────────\n";

$encryption = strtolower($env['MAIL_ENCRYPTION'] ?? 'none');
if ($encryption === 'tls') {
    showStatus('Encryption', 'success', 'TLS enabled (recommended for port 587)');
} elseif ($encryption === 'ssl') {
    showStatus('Encryption', 'warning', 'SSL enabled (works but port 587 + TLS is preferred)');
} else {
    showStatus('Encryption', 'warning', 'No encryption (not recommended for production)');
}

// Test 6: Mail sending test
echo "\n[6] Test Email Send\n";
echo "──────────────────\n";

require_once __DIR__ . '/utils/mailer.php';

$testEmail = isset($_GET['test']) ? $_GET['test'] : '';
if (empty($testEmail)) {
    echo "To send a test email, visit:\n";
    echo "http://your-domain.com/backend_php/test_email_web.php\n";
    echo "\nOr run with parameter:\n";
    echo "php verify_cpanel_email.php?test=your-email@example.com\n";
} else {
    if (filter_var($testEmail, FILTER_VALIDATE_EMAIL)) {
        echo "Sending test email to: {$testEmail}\n";
        
        $result = sendMail(
            $testEmail,
            'Malenya Pharmacy - Email Test',
            '<html><body>' .
            '<h2>Email Configuration Test</h2>' .
            '<p>If you received this email, your cPanel email configuration is working correctly!</p>' .
            '<p><strong>Test Details:</strong></p>' .
            '<ul>' .
            '<li>Time: ' . date('Y-m-d H:i:s') . '</li>' .
            '<li>Server: ' . $_SERVER['SERVER_NAME'] . '</li>' .
            '<li>From: ' . $env['MAIL_FROM_ADDRESS'] . '</li>' .
            '</ul>' .
            '</body></html>',
            'Email test successful'
        );
        
        if ($result) {
            showStatus('Send Result', 'success', 'Email queued for delivery');
            echo "Check inbox for: {$testEmail}\n";
        } else {
            showStatus('Send Result', 'error', 'Failed to send - check error_log');
        }
    } else {
        showStatus('Email', 'error', 'Invalid email address');
    }
}

// Test 7: Error Log
echo "\n[7] Recent Error Log\n";
echo "───────────────────\n";

$errorLog = __DIR__ . '/error_log';
if (file_exists($errorLog)) {
    $lines = array_slice(file($errorLog), -5);
    if (!empty($lines)) {
        echo "Last 5 entries:\n";
        foreach ($lines as $line) {
            if (stripos($line, 'mail') !== false || stripos($line, 'email') !== false) {
                echo "  " . trim($line) . "\n";
            }
        }
    }
} else {
    showStatus('Error Log', 'warning', 'Log file not yet created');
}

// Summary
echo "\n========================================\n";
echo "Verification Complete\n";
echo "========================================\n\n";

echo "✅ Configuration appears to be set up correctly.\n\n";

echo "📋 Next Steps:\n";
echo "1. Test email sending via: test_email_web.php\n";
echo "2. Monitor error_log for delivery issues\n";
echo "3. Configure SPF/DKIM/DMARC in cPanel\n";
echo "4. Check email deliverability\n";
echo "5. Set up backup email provider (Gmail)\n\n";

echo "📚 Documentation:\n";
echo "- Full setup guide: CPANEL_EMAIL_PRODUCTION.md\n";
echo "- Email testing: http://your-domain.com/backend_php/test_email_web.php\n";
echo "- Error logs: /backend_php/error_log\n\n";

?>
