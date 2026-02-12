<?php
/**
 * Email Validation Utilities
 * 
 * Functions to validate and verify email addresses
 */

/**
 * Validate email format using PHP's FILTER_VALIDATE_EMAIL
 * 
 * @param string $email
 * @return bool
 */
function validateEmailFormat($email) {
    $email = trim($email);
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Check if email exists in staff table (case-insensitive)
 * 
 * @param PDO $pdo
 * @param string $email
 * @param string $excludeStaffId (optional - for update operations, exclude this staff member)
 * @return bool
 */
function emailExists($pdo, $email, $excludeStaffId = null) {
    $email = trim($email);
    
    if (empty($email)) {
        return false;
    }
    
    try {
        if ($excludeStaffId) {
            // Check if another staff member has this email
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE LOWER(email) = LOWER(?) AND id != ?');
            $stmt->execute([$email, $excludeStaffId]);
        } else {
            // Check if any staff member has this email
            $stmt = $pdo->prepare('SELECT id FROM staff WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$email]);
        }
        
        return $stmt->fetch() !== false;
    } catch (Exception $e) {
        error_log('Email check error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Find staff by email (case-insensitive)
 * 
 * @param PDO $pdo
 * @param string $email
 * @return array|false
 */
function findStaffByEmail($pdo, $email) {
    $email = trim($email);
    
    if (!validateEmailFormat($email)) {
        return false;
    }
    
    try {
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE LOWER(email) = LOWER(?)');
        $stmt->execute([$email]);
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log('Find staff by email error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Validate email and check if it's registered and active
 * 
 * @param PDO $pdo
 * @param string $email
 * @return array|false Returns staff data if valid and active, false otherwise
 */
function validateAndFindActiveStaff($pdo, $email) {
    if (!validateEmailFormat($email)) {
        return false;
    }
    
    try {
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE LOWER(email) = LOWER(?) AND status = ?');
        $stmt->execute([$email, 'ACTIVE']);
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log('Validate active staff error: ' . $e->getMessage());
        return false;
    }
}

?>
