<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        getReleases();
        break;
    case 'POST':
        createRelease();
        break;
    case 'PUT':
        if ($id) {
            updateRelease($id);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing release id']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getReleases() {
    global $pdo;
    try {
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'STOREKEEPER', 'INVENTORY_CONTROLLER']);
        
        // If user is null (unauthenticated GET request), allow access without filtering
        $userRole = $user['role'] ?? '';
        $userBranchId = $user['branch_id'] ?? null;
        
        // Build query based on role
        $query = 'SELECT * FROM stock_release_requests';
        $params = [];
        
        // Non-super admins can only see releases for their branch
        if ($userRole !== 'SUPER_ADMIN' && $userBranchId) {
            $query .= ' WHERE branch_id = ?';
            $params[] = $userBranchId;
        }
        
        $query .= ' ORDER BY created_at DESC';
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $releases = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Transform field names to camelCase
        $releases = array_map(function($release) {
            return [
                'id' => $release['id'],
                'branchId' => $release['branch_id'],
                'requestedBy' => $release['requested_by'],
                'date' => $release['created_at'],
                'status' => $release['status'],
                'items' => json_decode($release['items'] ?? '[]', true)
            ];
        }, $releases);
        
        echo json_encode($releases);
    } catch (Exception $e) {
        error_log('Failed to fetch releases: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch releases', 'details' => $e->getMessage()]);
    }
}

function updateRelease($id) {
    global $pdo;
    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);
        error_log('updateRelease payload: ' . json_encode($input));

        $status = $input['status'] ?? '';
        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status value']);
            return;
        }

        $stmt = $pdo->prepare('UPDATE stock_release_requests SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        echo json_encode(['message' => 'Release request updated']);
    } catch (Exception $e) {
        error_log('Failed to update release: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update release', 'details' => $e->getMessage()]);
    }
}

function createRelease() {
    global $pdo;
    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'DISPENSER', 'STOREKEEPER']);
        $user = getCurrentUser();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $branchId = $input['branchId'] ?? $user['branch_id'] ?? null;
        $items = $input['items'] ?? [];
        
        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Release items are required']);
            return;
        }
        
        $releaseId = 'REL-' . time() . '-' . substr(uniqid(), -6);
        
        $stmt = $pdo->prepare('INSERT INTO stock_release_requests (id, branch_id, requested_by, items, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$releaseId, $branchId, $user['id'] ?? null, json_encode($items)]);
        
        echo json_encode([
            'id' => $releaseId,
            'branchId' => $branchId,
            'requestedBy' => $user['name'] ?? $user['username'] ?? 'Unknown',
            'date' => date('Y-m-d H:i:s'),
            'status' => 'PENDING',
            'items' => $items
        ]);
    } catch (Exception $e) {
        error_log('Failed to create release: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create release', 'details' => $e->getMessage()]);
    }
}
