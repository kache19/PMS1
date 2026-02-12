<?php
/**
 * cPanel SMTP Configuration Setup Wizard
 * 
 * This script walks you through configuring your cPanel email credentials
 * for password reset and bulk email functionality.
 * 
 * Run: php setup_cpanel_smtp.php
 */

echo "\n";
echo "╔═══════════════════════════════════════════════════════════════════╗\n";
echo "║  cPanel SMTP Configuration Setup                                 ║\n";
echo "╚═══════════════════════════════════════════════════════════════════╝\n\n";

// If running non-interactively or via web, skip
$interactive = php_sapi_name() === 'cli';

if (!$interactive) {
    echo "This script must be run from the command line.\n";
    echo "Run: php setup_cpanel_smtp.php\n";
    exit(1);
}

echo "This wizard will help you configure your cPanel email for password resets.\n";
echo "You'll need your cPanel email account credentials.\n\n";

// Step 1: Check .htaccess
echo "[Step 1] Checking .htaccess...\n";
if (!file_exists('.htaccess')) {
    echo "⚠ .htaccess file not found.\n";
    echo "Creating a new one...\n";
    file_put_contents('.htaccess', "# Pharmacy System - cPanel Configuration\nRewriteEngine On\n");
    echo "✓ Created .htaccess\n\n";
} else {
    echo "✓ .htaccess found\n\n";
}

// Step 2: Gather SMTP credentials
echo "[Step 2] Gather your cPanel email credentials\n";
echo "You can find these in cPanel:\n";
echo "  1. Login to cPanel\n";
echo "  2. Go to Email Accounts\n";
echo "  3. Click your email (e.g., noreply@yourdomain.com)\n";
echo "  4. You'll see: Mail server, Port, Username, Password\n\n";

echo "Or you can use your hosting provider's SMTP settings.\n";
echo "Common examples:\n";
echo "  - Bluehost: mail.yourdomain.com:465 (SSL)\n";
echo "  - Hostinger: mail.yourdomain.com:465 (SSL)\n";
echo "  - SiteGround: your domain's mail server:465\n\n";

$responses = [];

// Mail Host
echo "Enter your mail server (e.g., mail.yourdomain.com): ";
$responses['host'] = trim(fgets(STDIN)) ?: 'mail.yourdomain.com';

// Mail Port
echo "Enter mail port (typically 465 for SSL or 587 for TLS) [default: 465]: ";
$port = trim(fgets(STDIN));
$responses['port'] = $port ?: 465;

// Mail Username
echo "Enter email username (usually your full email): ";
$responses['username'] = trim(fgets(STDIN)) ?: 'noreply@yourdomain.com';

// Mail Password
echo "Enter email password: ";
system('stty -echo');  // Hide input
$responses['password'] = trim(fgets(STDIN));
system('stty echo');   // Show input again
echo "\n";

// Encryption
echo "Enter encryption type (ssl or tls) [default: ssl]: ";
$encryption = trim(fgets(STDIN));
$responses['encryption'] = strtolower($encryption) ?: 'ssl';

// From Address
echo "Enter 'From' email address (usually same as username): ";
$responses['from_address'] = trim(fgets(STDIN)) ?: $responses['username'];

// From Name
echo "Enter 'From' display name [default: Pharmacy System]: ";
$responses['from_name'] = trim(fgets(STDIN)) ?: 'Pharmacy System';

// Frontend URL
echo "Enter frontend URL for password reset links (e.g., https://yourdomain.com): ";
$frontend = trim(fgets(STDIN)) ?: 'https://yourdomain.com';
$responses['reset_url'] = $frontend . '/auth/reset-password?token=';

// Step 3: Display configuration
echo "\n";
echo "[Step 3] Configuration Summary\n";
echo "─────────────────────────────────────────────────────────────────\n";
echo "Mail Host:        " . $responses['host'] . "\n";
echo "Mail Port:        " . $responses['port'] . "\n";
echo "Mail Username:    " . $responses['username'] . "\n";
echo "Mail Encryption:  " . $responses['encryption'] . "\n";
echo "From Address:     " . $responses['from_address'] . "\n";
echo "From Name:        " . $responses['from_name'] . "\n";
echo "Reset URL:        " . substr($responses['reset_url'], 0, 60) . "...\n";
echo "─────────────────────────────────────────────────────────────────\n\n";

// Step 4: Confirmation
echo "Is this correct? (y/n) [default: y]: ";
$confirm = trim(fgets(STDIN)) ?: 'y';

if (strtolower($confirm) !== 'y') {
    echo "Configuration cancelled.\n";
    exit(0);
}

// Step 5: Update .htaccess
echo "\n[Step 4] Updating .htaccess...\n";

$htaccess = file_get_contents('.htaccess');

// Remove old SMTP settings
$htaccess = preg_replace('/SetEnv MAIL_HOST.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_PORT.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_USERNAME.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_PASSWORD.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_ENCRYPTION.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_FROM_ADDRESS.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv MAIL_FROM_NAME.*/m', '', $htaccess);
$htaccess = preg_replace('/SetEnv RESET_BASE_URL.*/m', '', $htaccess);

// Remove extra blank lines
$htaccess = preg_replace("/\n\n+/", "\n\n", $htaccess);

// Add new SMTP settings
$smtp_config = "\n# SMTP Configuration - Updated " . date('Y-m-d H:i:s') . "\n";
$smtp_config .= "SetEnv MAIL_HOST " . $responses['host'] . "\n";
$smtp_config .= "SetEnv MAIL_PORT " . $responses['port'] . "\n";
$smtp_config .= "SetEnv MAIL_USERNAME " . $responses['username'] . "\n";
$smtp_config .= "SetEnv MAIL_PASSWORD " . $responses['password'] . "\n";
$smtp_config .= "SetEnv MAIL_ENCRYPTION " . $responses['encryption'] . "\n";
$smtp_config .= "SetEnv MAIL_FROM_ADDRESS " . $responses['from_address'] . "\n";
$smtp_config .= "SetEnv MAIL_FROM_NAME " . $responses['from_name'] . "\n";
$smtp_config .= "SetEnv RESET_BASE_URL " . $responses['reset_url'] . "\n";

$htaccess .= $smtp_config;

file_put_contents('.htaccess', $htaccess);
echo "✓ .htaccess updated with SMTP configuration\n";

// Step 6: Update config/mail.php as backup
echo "\n[Step 5] Updating config/mail.php as backup...\n";

$mail_config = <<<'PHP'
<?php
return [
    // SMTP configuration - read from .htaccess environment variables
    'smtp' => [
        'host' => getenv('MAIL_HOST') ?: 'mail.example.com',
        'port' => getenv('MAIL_PORT') ?: 465,
        'username' => getenv('MAIL_USERNAME') ?: 'your_email@example.com',
        'password' => getenv('MAIL_PASSWORD') ?: 'your_password',
        'secure' => getenv('MAIL_ENCRYPTION') ?: 'ssl',
        'from_address' => getenv('MAIL_FROM_ADDRESS') ?: 'noreply@example.com',
        'from_name' => getenv('MAIL_FROM_NAME') ?: 'Pharmacy System',
    ],
    // Reset link base URL from environment or default
    'reset_base_url' => getenv('RESET_BASE_URL') ?: 'https://example.com/auth/reset-password?token=',
];
PHP;

file_put_contents('config/mail.php', $mail_config);
echo "✓ config/mail.php updated\n";

// Step 7: Verify
echo "\n[Step 6] Verifying configuration...\n";

$mailConfig = require 'config/mail.php';
$smtp = $mailConfig['smtp'] ?? [];

if (!empty($smtp['host']) && strpos($smtp['host'], 'example') === false) {
    echo "✓ Configuration verified\n";
} else {
    echo "✗ Configuration may not be set correctly\n";
}

// Final summary
echo "\n";
echo "╔═══════════════════════════════════════════════════════════════════╗\n";
echo "║ SETUP COMPLETE                                                    ║\n";
echo "╚═══════════════════════════════════════════════════════════════════╝\n\n";

echo "Next steps:\n";
echo "  1. Test the email system with a quick reset link:\n";
echo "     curl -X POST http://localhost:8000/api/auth/forgot \\\n";
echo "       -H 'Content-Type: application/json' \\\n";
echo "       -d '{\"email\":\"admin@yourdomain.com\"}'\n\n";
echo "  2. Check your email for the password reset link\n\n";
echo "  3. Verify everything with:\n";
echo "     php check_cpanel_ready.php\n\n";

echo "Configuration has been saved to:\n";
echo "  - .htaccess (environment variables)\n";
echo "  - config/mail.php (backup)\n\n";

echo "Your SMTP credentials are now configured for production use!\n";

?>
