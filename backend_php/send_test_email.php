<?php
/**
 * Simple Email Test Script
 * 
 * Usage:
 *   php send_test_email.php user@example.com [subject] [template]
 * 
 * Examples:
 *   php send_test_email.php test@pharmacy.local
 *   php send_test_email.php user@example.com "Welcome!" welcome
 *   php send_test_email.php admin@example.com "Password Reset" reset
 */

// Get arguments
$to = isset($argv[1]) ? $argv[1] : '';
$subject = isset($argv[2]) ? $argv[2] : 'Test Email from Pharmacy System';
$template = isset($argv[3]) ? $argv[3] : 'welcome';

if (empty($to)) {
    echo "Usage: php send_test_email.php <email> [subject] [template]\n";
    echo "\nTemplates available:\n";
    echo "  - welcome    (Default welcome email)\n";
    echo "  - reset      (Password reset email)\n";
    echo "  - alert      (System alert email)\n";
    echo "\nExample:\n";
    echo "  php send_test_email.php test@example.com 'Welcome!' welcome\n";
    exit(1);
}

echo "====================================\n";
echo "Email Test - Sending Test Email\n";
echo "====================================\n\n";

echo "Configuration:\n";
echo "  To: $to\n";
echo "  Subject: $subject\n";
echo "  Template: $template\n\n";

// Load configuration and mailer
// Skip database (not needed for simple email test)
try {
    require_once 'config/mail.php';
    require_once 'utils/mailer.php';
} catch (Exception $e) {
    echo "ERROR: Could not load mailer - " . $e->getMessage() . "\n";
    exit(1);
}

// Show mail configuration
echo "Mail Configuration:\n";
$mailConfig = require 'config/mail.php';
$smtp = $mailConfig['smtp'] ?? [];
echo "  SMTP Host: " . $smtp['host'] . "\n";
echo "  SMTP Port: " . $smtp['port'] . "\n";
echo "  From: " . $smtp['from_address'] . " (" . $smtp['from_name'] . ")\n\n";

// Prepare email body based on template
$htmlBody = '';
$altBody = '';

switch ($template) {
    case 'welcome':
        $htmlBody = getWelcomeEmailHTML();
        $altBody = getWelcomeEmailText();
        break;
    
    case 'reset':
        $resetLink = 'https://malenyapharmacy.com/auth/reset-password?token=test_token_12345';
        $htmlBody = getPasswordResetEmailHTML($resetLink);
        $altBody = getPasswordResetEmailText($resetLink);
        break;
    
    case 'alert':
        $htmlBody = getAlertEmailHTML();
        $altBody = getAlertEmailText();
        break;
    
    default:
        $htmlBody = getWelcomeEmailHTML();
        $altBody = getWelcomeEmailText();
}

// Send email
echo "Sending email...\n\n";
$result = sendMailDebug($to, $subject, $htmlBody, $altBody);

if ($result) {
    echo "✓ Email sent successfully to: $to\n";
    echo "\nEmail Details:\n";
    echo "  Subject: $subject\n";
    echo "  Body: " . substr(strip_tags($htmlBody), 0, 100) . "...\n";
} else {
    echo "✗ Failed to send email\n";
    echo "\nTroubleshooting:\n";
    echo "  1. Check SMTP configuration in .env file\n";
    echo "  2. Verify PHPMailer is installed: composer install\n";
    echo "  3. Check error_log for detailed error messages\n";
    echo "  4. Ensure credentials are correct for your SMTP server\n";
}

echo "\n====================================\n";

// ===== EMAIL TEMPLATES =====

function getWelcomeEmailHTML() {
    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; }
            .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; }
            .button { background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Pharmacy Management System</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Welcome to the Malenya Pharmacy Management System!</p>
                <p>Your account has been successfully created. You can now log in using your credentials.</p>
                <p style="text-align: center;">
                    <a href="https://malenyapharmacy.com" class="button">Access System</a>
                </p>
                <p>If you have any questions or need assistance, please contact our support team.</p>
                <p>Best regards,<br><strong>Malenya Pharmacy Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Malenya Pharmacy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    HTML;
}

function getWelcomeEmailText() {
    return <<<TEXT
    Welcome to Pharmacy Management System
    
    Hello,
    
    Welcome to the Malenya Pharmacy Management System!
    
    Your account has been successfully created. You can now log in using your credentials.
    
    Visit: https://malenyapharmacy.com
    
    If you have any questions or need assistance, please contact our support team.
    
    Best regards,
    Malenya Pharmacy Team
    
    © 2026 Malenya Pharmacy. All rights reserved.
    TEXT;
}

function getPasswordResetEmailHTML($resetLink) {
    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; }
            .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; }
            .button { background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
            .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to proceed:</p>
                <p style="text-align: center;">
                    <a href="$resetLink" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
                    $resetLink
                </p>
                <div class="warning">
                    <strong>Note:</strong> This link will expire in 1 hour.
                </div>
                <p>If you didn't request a password reset, please ignore this email.</p>
                <p>Best regards,<br><strong>Malenya Pharmacy Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Malenya Pharmacy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    HTML;
}

function getPasswordResetEmailText($resetLink) {
    return <<<TEXT
    Password Reset Request
    
    Hello,
    
    We received a request to reset your password. Use the link below:
    
    $resetLink
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email.
    
    Best regards,
    Malenya Pharmacy Team
    
    © 2026 Malenya Pharmacy. All rights reserved.
    TEXT;
}

function getAlertEmailHTML() {
    return <<<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
            .header { background-color: #f39c12; color: white; padding: 20px; text-align: center; }
            .content { background-color: white; padding: 20px; }
            .footer { background-color: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; }
            .alert { background-color: #f8d7da; padding: 15px; border-left: 4px solid #f5c6cb; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>System Alert</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <div class="alert">
                    <strong>Alert:</strong> This is a test alert email from the Pharmacy Management System.
                </div>
                <p>Timestamp: <?php echo date('Y-m-d H:i:s'); ?></p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br><strong>Malenya Pharmacy Team</strong></p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Malenya Pharmacy. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    HTML;
}

function getAlertEmailText() {
    return <<<TEXT
    System Alert
    
    Hello,
    
    This is a test alert email from the Pharmacy Management System.
    
    Timestamp: $(date 'Y-m-d H:i:s')
    
    If you have any questions, please contact our support team.
    
    Best regards,
    Malenya Pharmacy Team
    
    © 2026 Malenya Pharmacy. All rights reserved.
    TEXT;
}

// Debug version of sendMail function that shows detailed error info
function sendMailDebug($to, $subject, $htmlBody, $altBody = '') {
    $mailConfig = require __DIR__ . '/config/mail.php';
    $smtp = $mailConfig['smtp'] ?? [];

    // Check if PHPMailer is available
    if (class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->SMTPDebug = 2; // Enable debug output
        $mail->Debugoutput = 'echo';
        
        try {
            // SMTP configuration
            $mail->isSMTP();
            $mail->Host = $smtp['host'] ?? 'localhost';
            $mail->SMTPAuth = !empty($smtp['username']) && !empty($smtp['password']);
            $mail->Username = $smtp['username'] ?? '';
            $mail->Password = $smtp['password'] ?? '';
            
            // Map encryption type from config to PHPMailer constants
            $encryption = strtolower($smtp['secure'] ?? 'tls');
            if ($encryption === 'ssl' || $encryption === 'smtps') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($encryption === 'tls' || $encryption === 'starttls') {
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = '';
            }
            
            $mail->Port = (int)($smtp['port'] ?? 587);

            // From configuration
            $mail->setFrom(
                $smtp['from_address'] ?? 'no-reply@example.com',
                $smtp['from_name'] ?? 'No Reply'
            );

            // Recipients
            $mail->addAddress($to);

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            if ($altBody) {
                $mail->AltBody = $altBody;
            }

            echo "Connecting to SMTP server...\n";
            $mail->send();
            return true;
        } catch (\Exception $e) {
            echo "\n✗ Error details:\n";
            echo "  Error: " . $e->getMessage() . "\n";
            echo "  PHPMailer Error: " . ($mail->ErrorInfo ?? 'None') . "\n";
            return false;
        }
    } else {
        echo "✗ PHPMailer not available\n";
        return false;
    }
}

?>
