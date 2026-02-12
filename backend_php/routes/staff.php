<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';
require_once dirname(__DIR__) . '/utils/email_validator.php';
require_once dirname(__DIR__) . '/utils/mailer.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getStaff($id);
        } else {
            getStaffList();
        }
        break;
    case 'POST':
        createStaff();
        break;
    case 'PUT':
        if ($id) {
            updateStaff($id);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteStaff($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getStaffList() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR', 'PHARMACIST', 'DISPENSER', 'STOREKEEPER', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->query('SELECT id, name, role, branch_id as branchId, email, phone, status, username, last_login as lastLogin, joined_date as joinedDate, created_at FROM staff ORDER BY name ASC');
        $staff = $stmt->fetchAll();
        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Get staff list error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();

        if (!$staff) {
            http_response_code(404);
            echo json_encode(['error' => 'Staff not found']);
            return;
        }

        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Get staff error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createStaff() {
    global $pdo;

    try {
        error_log('Starting staff creation');
        authorizeRoles(['SUPER_ADMIN']);
        error_log('Authorization passed');

        $input = json_decode(file_get_contents('php://input'), true);
        error_log('Input received: ' . json_encode($input));

        $id = $input['id'] ?? '';
        $name = $input['name'] ?? '';
        $role = $input['role'] ?? '';
        $branchId = $input['branchId'] ?? null;
        $email = trim($input['email'] ?? '');
        $phone = $input['phone'] ?? '';
        $status = $input['status'] ?? 'ACTIVE';
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        error_log("Staff data: id=$id, name=$name, role=$role, username=$username");

        if (empty($id) || empty($name) || empty($role) || empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        // Validate email format if provided
        if (!empty($email) && !validateEmailFormat($email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            return;
        }

        // Check for duplicate email
        if (!empty($email) && emailExists($pdo, $email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already in use by another staff member']);
            return;
        }

        $hashedPassword = hashPassword($password);
        $branchIdValue = $branchId === '' ? null : $branchId;

        error_log('Inserting staff into database');
        $stmt = $pdo->prepare('INSERT INTO staff (id, name, role, branch_id, email, phone, status, username, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $name, $role, $branchIdValue, $email, $phone, $status, $username, $hashedPassword]);
        error_log('Staff inserted successfully');

        // Return the inserted staff data
        $staff = [
            'id' => $id,
            'name' => $name,
            'role' => $role,
            'branchId' => $branchIdValue,
            'email' => $email,
            'phone' => $phone,
            'status' => $status,
            'username' => $username
        ];

        // Attempt to send login credentials to the staff email (if provided)
        $emailSent = false;
        if (!empty($email)) {
            $subject = 'Your PMS Pharmacy account credentials';
            $htmlBody = "<p>Hello " . htmlspecialchars($name) . ",</p>" .
                        "<p>Your account has been created. Use the credentials below to login:</p>" .
                        "<ul><li><strong>Username:</strong> " . htmlspecialchars($username) . "</li>" .
                        "<li><strong>Password:</strong> " . htmlspecialchars($password) . "</li></ul>" .
                        "<p>Please change your password after first login.</p>";
            $altBody = "Hello $name\n\nYour account has been created.\nUsername: $username\nPassword: $password\n\nPlease change your password after first login.";

            try {
                $emailSent = sendMail($email, $subject, $htmlBody, $altBody);
                if ($emailSent) {
                    error_log('Credentials email sent to: ' . $email);
                } else {
                    error_log('Failed to send credentials email to: ' . $email);
                }
            } catch (Exception $me) {
                error_log('Exception while sending email: ' . $me->getMessage());
                $emailSent = false;
            }
        }

        error_log('Staff creation completed');

        // Attach a friendly message about email delivery to the response
        $response = $staff;
        if (!empty($email)) {
            if ($emailSent) {
                $response['message'] = 'Email with login credentials sent to ' . $email;
            } else {
                $response['message'] = 'Staff created but failed to send email to ' . $email;
            }
        }

        echo json_encode($response);
    } catch (Exception $e) {
        error_log('Create staff error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateStaff($id) {
    global $pdo;

    try {
        error_log("Update staff request for ID: $id");
        authorizeRoles(['SUPER_ADMIN']);
        
        $rawInput = file_get_contents('php://input');
        error_log("Raw input: $rawInput");
        
        $input = json_decode($rawInput, true);
        error_log("Decoded input: " . json_encode($input));

        if (!$input) {
            error_log("Failed to decode JSON input");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON input']);
            return;
        }

        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $currentStaff = $stmt->fetch();

        if (!$currentStaff) {
            error_log("Staff member not found: $id");
            http_response_code(404);
            echo json_encode(['error' => 'Staff member not found']);
            return;
        }

        error_log("Current staff: " . json_encode($currentStaff));

        // Get values from input, with fallback to current values
        $name = isset($input['name']) && !empty($input['name']) ? trim($input['name']) : $currentStaff['name'];
        $role = isset($input['role']) && !empty($input['role']) ? trim($input['role']) : $currentStaff['role'];
        
        // Handle branchId - can be null, empty string, or valid ID
        if (isset($input['branchId'])) {
            $branchId = ($input['branchId'] === '' || $input['branchId'] === null) ? null : trim($input['branchId']);
        } else {
            $branchId = $currentStaff['branch_id'];
        }
        
        $email = !empty($input['email']) ? trim($input['email']) : $currentStaff['email'];
        $phone = !empty($input['phone']) ? trim($input['phone']) : $currentStaff['phone'];
        $status = isset($input['status']) && !empty($input['status']) ? trim($input['status']) : $currentStaff['status'];

        error_log("Values to update - name: $name, role: $role, branchId: $branchId, email: $email, phone: $phone, status: $status");

        // Validate required fields
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Name is required']);
            return;
        }

        if (empty($role)) {
            http_response_code(400);
            echo json_encode(['error' => 'Role is required']);
            return;
        }

        // Validate email format if email was provided
        if (!empty($email) && !validateEmailFormat($email)) {
            error_log("Invalid email format: $email");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid email format']);
            return;
        }

        // Check for duplicate email (allow same email for current user)
        if (!empty($email) && strtolower($email) !== strtolower($currentStaff['email'])) {
            if (emailExists($pdo, $email, $id)) {
                error_log("Email already in use: $email");
                http_response_code(400);
                echo json_encode(['error' => 'Email already in use by another staff member']);
                return;
            }
        }

        $hashedPassword = $currentStaff['password_hash'];
        if (!empty($input['password'])) {
            error_log("Updating password");
            $hashedPassword = hashPassword($input['password']);
        }

        error_log("Executing update with: name=$name, role=$role, branchId=$branchId, email=$email, phone=$phone, status=$status");
        
        $stmt = $pdo->prepare('UPDATE staff SET name = ?, role = ?, branch_id = ?, email = ?, phone = ?, status = ?, password_hash = ? WHERE id = ?');
        error_log("Prepared statement created");
        
        $result = $stmt->execute([$name, $role, $branchId, $email, $phone, $status, $hashedPassword, $id]);
        error_log("Execute result: " . ($result ? 'SUCCESS' : 'FAILED'));

        if (!$result) {
            error_log("Execute failed. Error: " . json_encode($stmt->errorInfo()));
            throw new Exception("Failed to update staff: " . $stmt->errorInfo()[2]);
        }

        // Get the updated staff data
        $stmt = $pdo->prepare('SELECT * FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();

        error_log("Staff update successful for ID: $id");
        echo json_encode($staff);
    } catch (Exception $e) {
        error_log('Update staff error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update staff: ' . $e->getMessage()]);
    }
}

function deleteStaff($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);

        // Check if staff exists before deletion
        $stmt = $pdo->prepare('SELECT id FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Staff not found']);
            return;
        }

        // Delete the staff
        $stmt = $pdo->prepare('DELETE FROM staff WHERE id = ?');
        $stmt->execute([$id]);

        http_response_code(204);
    } catch (Exception $e) {
        error_log('Delete staff error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>