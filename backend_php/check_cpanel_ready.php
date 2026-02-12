<?php
/**
 * cPanel Email Integration Readiness Checker
 * 
 * This script verifies that the system is ready to connect to a cPanel email account
 * for sending password reset links and bulk communications.
 * 
 * Run this on your cPanel server to verify everything is configured correctly.
 * 
 * Usage:
 *   php check_cpanel_ready.php
 */

echo "\n";
echo "╔════════════════════════════════════════════════════════════════════╗\n";
echo "║  Pharmacy System - cPanel Email Readiness Check                   ║\n";
echo "╚════════════════════════════════════════════════════════════════════╝\n\n";

$checks = [];
$passCount = 0;
$warnCount = 0;
$failCount = 0;

// ============================================================================
// CHECK 1: PHP Version
// ============================================================================
echo "[1] PHP Version & Extensions\n";
$phpVersion = phpversion();
$recommended = version_compare($phpVersion, '7.4', '>=');

if ($recommended) {
    $checks[] = "✓ PHP version {$phpVersion} (✓ >= 7.4 required)";
    $passCount++;
} else {
    $checks[] = "✗ PHP version {$phpVersion} (requires >= 7.4)";
    $failCount++;
}

// Check required extensions
$requiredExts = ['curl', 'json', 'pdo', 'pdo_mysql', 'mbstring'];
$missingExts = [];
foreach ($requiredExts as $ext) {
    if (!extension_loaded($ext)) {
        $missingExts[] = $ext;
    }
}

if (empty($missingExts)) {
    $checks[] = "✓ All required extensions loaded: " . implode(', ', $requiredExts);
    $passCount++;
} else {
    $checks[] = "✗ Missing extensions: " . implode(', ', $missingExts);
    $failCount++;
}

// Check PHP Mail function
if (function_exists('mail')) {
    $checks[] = "✓ PHP mail() function available (fallback for email sending)";
    $passCount++;
} else {
    $checks[] = "⚠ PHP mail() function not available (must use SMTP)";
    $warnCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 2: File Structure
// ============================================================================
echo "[2] Application File Structure\n";

$requiredFiles = [
    'config/database.php' => 'Database configuration',
    'config/mail.php' => 'Mail/SMTP configuration',
    'utils/mailer.php' => 'Mailer utility (PHPMailer wrapper)',
    'utils/auth.php' => 'Authentication utilities',
    'utils/jwt.php' => 'JWT token handler',
    'routes/auth.php' => 'Auth endpoints (forgot, reset)',
    'routes/admin.php' => 'Admin endpoints (bulk-send)',
    'migrations/2026_create_password_resets_table.sql' => 'Password resets table migration',
    'index.php' => 'API router',
    'vendor/autoload.php' => 'Composer dependencies (PHPMailer)',
];

foreach ($requiredFiles as $file => $description) {
    if (file_exists(__DIR__ . '/' . $file)) {
        $checks[] = "✓ " . $file;
        $passCount++;
    } else {
        $checks[] = "✗ " . $file . " - MISSING";
        $failCount++;
    }
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 3: Database Connection
// ============================================================================
echo "[3] Database Connection\n";

try {
    require_once 'config/database.php';
    global $pdo;
    
    // Test connection
    $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ?');
    $stmt->execute([getenv('DB_NAME') ?: 'malenyap_pms_db']);
    $result = $stmt->fetch();
    
    $checks[] = "✓ MySQL database connection successful";
    $passCount++;
    
    // Check password_resets table
    try {
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM password_resets');
        $stmt->execute();
        $count = $stmt->fetch()['count'];
        $checks[] = "✓ password_resets table exists ({$count} tokens)";
        $passCount++;
    } catch (Exception $e) {
        $checks[] = "✗ password_resets table missing or inaccessible";
        $checks[] = "   Run migration: mysql -u user -p db < migrations/2026_create_password_resets_table.sql";
        $failCount++;
    }
    
    // Check staff table
    try {
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM staff WHERE email IS NOT NULL AND email != ""');
        $stmt->execute();
        $staffCount = $stmt->fetch()['count'];
        $checks[] = "✓ staff table accessible ({$staffCount} users with email)";
        $passCount++;
    } catch (Exception $e) {
        $checks[] = "✗ staff table not found";
        $failCount++;
    }
    
} catch (Exception $e) {
    $checks[] = "✗ Database connection failed: " . $e->getMessage();
    $failCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 4: PHPMailer & Dependencies
// ============================================================================
echo "[4] PHPMailer & Composer Dependencies\n";

if (file_exists(__DIR__ . '/vendor/autoload.php') && class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    $checks[] = "✓ PHPMailer installed and loaded";
    $checks[] = "✓ Composer dependencies available";
    $passCount += 2;
} else {
    $checks[] = "⚠ PHPMailer not installed";
    $checks[] = "   Run: composer install";
    $checks[] = "   Or upload vendor/ directory from local machine";
    $warnCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 5: Mail Configuration
// ============================================================================
echo "[5] SMTP Configuration\n";

try {
    $mailConfig = require 'config/mail.php';
    $smtp = $mailConfig['smtp'] ?? [];
    
    // Check configuration values
    $host = $smtp['host'] ?? 'not-set';
    $port = $smtp['port'] ?? 0;
    $user = $smtp['username'] ?? 'not-set';
    $pass = $smtp['password'] ?? 'not-set';
    $from = $smtp['from_address'] ?? 'not-set';
    $resetUrl = $mailConfig['reset_base_url'] ?? 'not-set';
    
    // Determine if using placeholder values
    $usingPlaceholders = (
        strpos($host, 'mailtrap.io') !== false ||
        strpos($user, 'your_') === 0 ||
        strpos($pass, 'your_') === 0
    );
    
    if ($usingPlaceholders) {
        $checks[] = "⚠ Using placeholder SMTP credentials";
        $checks[] = "   Host: " . $host;
        $checks[] = "   User: " . substr($user, 0, 20) . "...";
        $checks[] = sprintf("   Port: %d", $port);
        $checks[] = "   Update config/mail.php with your cPanel email credentials:";
        $checks[] = "      - Host: mail.yourdomain.com or your hosting provider's mail server";
        $checks[] = "      - Port: 465 (SSL) or 587 (TLS)";
        $checks[] = "      - Username: your_email@yourdomain.com";
        $checks[] = "      - Password: your_cPanel_email_password";
        $warnCount++;
    } else {
        $checks[] = "✓ SMTP Host: " . $host;
        $checks[] = "✓ SMTP Port: " . $port;
        $checks[] = "✓ From Address: " . $from;
        $checks[] = "✓ Reset Base URL: " . substr($resetUrl, 0, 60) . "...";
        $passCount += 4;
    }
    
    // Check environment variables (for cPanel .htaccess)
    $envVars = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD'];
    $envSet = array_filter($envVars, fn($var) => !empty(getenv($var)));
    
    if (count($envSet) > 0) {
        $checks[] = "✓ Environment variables set: " . implode(', ', $envSet);
        $passCount++;
    }
    
} catch (Exception $e) {
    $checks[] = "✗ Could not load mail config: " . $e->getMessage();
    $failCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 6: API Routes Registered
// ============================================================================
echo "[6] API Routes & Endpoints\n";

$requiredRoutes = [
    '/auth/forgot' => 'Request password reset link',
    '/auth/reset' => 'Apply new password using token',
    '/auth/change-password' => 'Change password (authenticated user)',
    '/admin/bulk-send-reset-links' => 'Send reset links to users (admin only)',
];

$routerFile = file_get_contents('index.php');

foreach ($requiredRoutes as $route => $description) {
    if (strpos($routerFile, $route) !== false) {
        $checks[] = "✓ " . $route . " - " . $description;
        $passCount++;
    } else {
        $checks[] = "✗ " . $route . " - NOT FOUND in router";
        $failCount++;
    }
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 7: cPanel-Specific Configuration
// ============================================================================
echo "[7] cPanel Integration Ready\n";

// Check if running on cPanel (common indicators)
$htaccessExists = file_exists('.htaccess');
$onCpanel = (
    strpos($_SERVER['HTTP_HOST'] ?? '', '.') !== false ||
    file_exists("/usr/local/cpanel") ||
    function_exists('mysql_connect') // Legacy indicator
);

if ($htaccessExists) {
    $htaccessContent = file_get_contents('.htaccess');
    if (strpos($htaccessContent, 'SetEnv MAIL_HOST') !== false) {
        $checks[] = "✓ .htaccess contains environment variables for SMTP";
        $passCount++;
    } else {
        $checks[] = "⚠ .htaccess found but no SMTP environment variables";
        $checks[] = "   Add these to .htaccess for production:";
        $checks[] = "      SetEnv MAIL_HOST mail.yourdomain.com";
        $checks[] = "      SetEnv MAIL_PORT 587";
        $checks[] = "      SetEnv MAIL_USERNAME your_email@yourdomain.com";
        $checks[] = "      SetEnv MAIL_PASSWORD your_password";
        $checks[] = "      SetEnv MAIL_FROM_ADDRESS noreply@yourdomain.com";
        $checks[] = "      SetEnv RESET_BASE_URL https://yourdomain.com/auth/reset-password?token=";
        $warnCount++;
    }
} else {
    $checks[] = "⚠ No .htaccess file found";
    $checks[] = "   Create .htaccess to protect sensitive files and set env vars";
    $warnCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// CHECK 8: Test Functions
// ============================================================================
echo "[8] Mailer Function Test\n";

try {
    require_once 'utils/mailer.php';
    
    // Test mailer (won't actually send, just check it loads)
    if (function_exists('sendMail')) {
        $checks[] = "✓ sendMail() function available";
        $passCount++;
    }
    
    // Check if can instantiate PHPMailer
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        $mail = new PHPMailer\PHPMailer\PHPMailer(false); // Don't throw exceptions in test
        $checks[] = "✓ PHPMailer can be instantiated";
        $passCount++;
    } else {
        $checks[] = "⚠ PHPMailer class not available";
        $warnCount++;
    }
    
} catch (Exception $e) {
    $checks[] = "✗ Mailer test failed: " . $e->getMessage();
    $failCount++;
}

echo implode("\n", $checks) . "\n\n";
$checks = [];

// ============================================================================
// SUMMARY
// ============================================================================
$totalChecks = $passCount + $warnCount + $failCount;

echo "╔════════════════════════════════════════════════════════════════════╗\n";
echo "║ READINESS SUMMARY                                                  ║\n";
echo "╚════════════════════════════════════════════════════════════════════╝\n\n";

printf("✓ Passed:  %d/%d\n", $passCount, $totalChecks);
printf("⚠ Warnings: %d/%d\n", $warnCount, $totalChecks);
printf("✗ Failed:  %d/%d\n", $failCount, $totalChecks);

echo "\n";

if ($failCount === 0 && $warnCount === 0) {
    echo "🎉 SYSTEM READY FOR cPANEL DEPLOYMENT!\n\n";
    echo "Next steps:\n";
    echo "  1. Update config/mail.php with your cPanel email credentials\n";
    echo "  2. Test the /api/auth/forgot endpoint\n";
    echo "  3. Verify you receive the password reset email\n";
    echo "  4. Deploy to production (update frontend API URL)\n";
    exit(0);
} elseif ($failCount > 0) {
    echo "❌ SYSTEM NOT READY - Fix failures before deploying\n\n";
    echo "Failed checks must be resolved. See details above.\n";
    exit(1);
} else {
    echo "⚠️  SYSTEM READY BUT NEEDS CONFIGURATION\n\n";
    echo "Warnings should be addressed:\n";
    echo "  1. Configure SMTP credentials (not using placeholders)\n";
    echo "  2. Set up .htaccess with environment variables\n";
    echo "  3. Then test thoroughly before deploying\n";
    exit(0);
}

?>
