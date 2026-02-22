<?php
/**
 * Mailer utility using PHPMailer
 * Configure SMTP in config/mail.php
 */

// Load Composer autoloader
// Try to find vendor directory - could be in parent or sibling directories
$autoload = null;
$checkPaths = [
    __DIR__ . '/../vendor/autoload.php',  // If called from utils/
    __DIR__ . '/vendor/autoload.php',      // If called from backend_php/
    dirname(__DIR__) . '/vendor/autoload.php',  // If called from backend_php/ via parent
];

foreach ($checkPaths as $path) {
    if (file_exists($path)) {
        $autoload = $path;
        break;
    }
}

if ($autoload) {
    require_once $autoload;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendMail($to, $subject, $htmlBody, $altBody = '') {
    $mailConfig = require __DIR__ . '/../config/mail.php';
    $smtp = $mailConfig['smtp'] ?? [];
    $production = $mailConfig['production'] ?? [];
    
    // Validate email address
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        error_log('Invalid email address: ' . $to);
        return false;
    }

    // Check if PHPMailer is available
    if (class_exists(PHPMailer::class)) {
        $mail = new PHPMailer(true);
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
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // SSL/TLS on port 465
            } elseif ($encryption === 'tls' || $encryption === 'starttls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // STARTTLS on port 587
            } else {
                $mail->SMTPSecure = ''; // No encryption
            }
            
            $mail->Port = (int)($smtp['port'] ?? 587);
            
            // Avoid writing unknown dynamic properties on newer PHP/PHPMailer combinations.
            if (property_exists($mail, 'Timeout')) {
                $mail->Timeout = (int)($production['timeout'] ?? 15);
            }
            if (property_exists($mail, 'SMTPOptions')) {
                $mail->SMTPOptions = array(
                    'ssl' => array(
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true
                    )
                );
            }

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

            // Send email
            $result = $mail->send();
            
            // Log successful send
            if ($production['log_emails'] ?? true) {
                error_log('[EMAIL_SUCCESS] Sent to: ' . $to . ' | Subject: ' . $subject . ' | From: ' . $smtp['from_address']);
            }
            
            return $result;
        } catch (\Exception $e) {
            $errorMsg = 'PHPMailer error: ' . ($mail->ErrorInfo ?? $e->getMessage());
            error_log('[EMAIL_ERROR] ' . $errorMsg . ' | To: ' . $to . ' | Host: ' . $smtp['host'] . ':' . $smtp['port']);
            return false;
        }
    }

    // Fallback: basic mail() usage if PHPMailer is not available
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8\r\n";
    $headers .= 'From: ' . ($smtp['from_name'] ?? 'No Reply') . ' <' . ($smtp['from_address'] ?? 'no-reply@example.com') . '>' . "\r\n";

    // Log the fallback attempt
    error_log('[EMAIL_FALLBACK] Using PHP mail() for: ' . $to . ' | Subject: ' . $subject);
    
    $result = mail($to, $subject, $htmlBody, $headers);
    if (!$result) {
        error_log('[EMAIL_FALLBACK_FAILED] PHP mail() failed for: ' . $to . '. Check php.ini SMTP and smtp_port settings.');
    }
    return $result;
}
