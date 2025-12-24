<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        getSettings();
        break;
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'upload-logo') {
            uploadLogo();
        } else {
            createSetting();
        }
        break;
    case 'PUT':
        if ($id) {
            updateSetting($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getSettings() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'AUDITOR', 'PHARMACIST', 'DISPENSER', 'STOREKEEPER', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->query('SELECT * FROM system_settings ORDER BY category, setting_key');
        $settings = $stmt->fetchAll();

        $result = array_map(function($s) {
            return [
                'id' => $s['id'],
                'category' => $s['category'],
                'settingKey' => $s['setting_key'],
                'settingValue' => $s['setting_value'],
                'dataType' => $s['data_type'],
                'description' => $s['description'],
                'updatedAt' => $s['updated_at']
            ];
        }, $settings);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Get settings error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createSetting() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $category = $input['category'] ?? '';
        $settingKey = $input['settingKey'] ?? '';
        $settingValue = $input['settingValue'] ?? '';
        $dataType = $input['dataType'] ?? 'string';
        $description = $input['description'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO system_settings (id, category, setting_key, setting_value, data_type, description) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $category, $settingKey, $settingValue, $dataType, $description]);

        // Get the inserted setting
        $stmt = $pdo->prepare('SELECT * FROM system_settings WHERE id = ?');
        $stmt->execute([$id]);
        $setting = $stmt->fetch();

        echo json_encode($setting);
    } catch (Exception $e) {
        error_log('Create setting error: ' . $e->getMessage());
        if ($e->getCode() == 23000) { // Duplicate entry
            http_response_code(409);
            echo json_encode(['error' => 'Setting already exists']);
            return;
        }
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateSetting($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);
        $input = json_decode(file_get_contents('php://input'), true);

        $settingValue = $input['settingValue'] ?? $input['value'] ?? '';

        $stmt = $pdo->prepare('UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$settingValue, $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Setting not found']);
            return;
        }

        // Get the updated setting
        $stmt = $pdo->prepare('SELECT * FROM system_settings WHERE id = ?');
        $stmt->execute([$id]);
        $setting = $stmt->fetch();

        echo json_encode($setting);
    } catch (Exception $e) {
        error_log('Update setting error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function uploadLogo() {
    try {
        authorizeRoles(['SUPER_ADMIN']);

        if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No logo file uploaded or upload error']);
            return;
        }

        $file = $_FILES['logo'];

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.']);
            return;
        }

        // Validate file size (2MB max)
        if ($file['size'] > 2 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['error' => 'File too large. Maximum size is 2MB.']);
            return;
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'logo_' . time() . '_' . uniqid() . '.' . $extension;
        $uploadPath = __DIR__ . '/../uploads/logos/' . $filename;

        // Ensure upload directory exists
        $uploadDir = dirname($uploadPath);
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save uploaded file']);
            return;
        }

        // Return the full URL for frontend use
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $fullUrl = $protocol . '://' . $host . '/backend_php/uploads/logos/' . $filename;
        $relativePath = '/backend_php/uploads/logos/' . $filename;

        echo json_encode([
            'message' => 'Logo uploaded successfully',
            'path' => $fullUrl,
            'relativePath' => $relativePath
        ]);

    } catch (Exception $e) {
        error_log('Upload logo error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>