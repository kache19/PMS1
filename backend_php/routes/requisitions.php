<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

function getMainBranchId() {
    global $pdo;
    $stmt = $pdo->prepare('SELECT id FROM branches WHERE is_head_office = 1 LIMIT 1');
    $stmt->execute();
    $branch = $stmt->fetch();
    return $branch ? $branch['id'] : 'HEAD_OFFICE';
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getRequisition($id);
        } else {
            getRequisitions();
        }
        break;
    case 'POST':
        createRequisition();
        break;
    case 'PUT':
        if ($id) {
            updateRequisition($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getRequisitions() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);

        // Fetch requisitions
        $stmt = $pdo->query('SELECT * FROM stock_requisitions ORDER BY created_at DESC');
        $requisitions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch items for each requisition
        foreach ($requisitions as &$req) {
            $itemStmt = $pdo->prepare('SELECT sri.*, p.name as product_name FROM stock_requisition_items sri JOIN products p ON sri.product_id = p.id WHERE sri.requisition_id = ?');
            $itemStmt->execute([$req['id']]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            // Transform items to match frontend interface
            $req['items'] = array_map(function($item) {
                return [
                    'productName' => $item['product_name'],
                    'productId' => $item['product_id'],
                    'requestedQty' => (int)$item['quantity_requested'],
                    'currentStock' => 0 // TODO: Calculate current stock if needed
                ];
            }, $items);

            // Transform field names to camelCase
            $req['branchId'] = $req['branch_id'];
            $req['requestDate'] = $req['created_at'];
            $req['requestedBy'] = $req['requested_by'];
            unset($req['branch_id'], $req['created_at'], $req['requested_by']);
        }

        echo json_encode($requisitions);
    } catch (Exception $e) {
        error_log('Failed to fetch requisitions: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch requisitions']);
    }
}

function getRequisition($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $stmt = $pdo->prepare('SELECT * FROM stock_requisitions WHERE id = ?');
        $stmt->execute([$id]);
        $requisition = $stmt->fetch();

        if (!$requisition) {
            http_response_code(404);
            echo json_encode(['error' => 'Requisition not found']);
            return;
        }

        echo json_encode($requisition);
    } catch (Exception $e) {
        error_log('Failed to fetch requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch requisition']);
    }
}

function createRequisition() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $requestedBy = $input['requestedBy'] ?? '';
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';
        $priority = $input['priority'] ?? 'NORMAL';

        $requisitionId = 'REQ-' . time();

        $stmt = $pdo->prepare('INSERT INTO stock_requisitions (id, branch_id, requested_by, status, total_items, notes, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$requisitionId, $branchId, $requestedBy, 'PENDING', count($items), $notes, $priority]);

        // Insert requisition items
        if (!empty($items)) {
            $itemStmt = $pdo->prepare('INSERT INTO stock_requisition_items (requisition_id, product_id, quantity_requested, notes, created_at) VALUES (?, ?, ?, ?, NOW())');
            foreach ($items as $item) {
                $itemStmt->execute([$requisitionId, $item['productId'], $item['quantity'], $item['notes'] ?? '']);
            }
        }

        echo json_encode([
            'id' => $requisitionId,
            'message' => 'Requisition created successfully'
        ]);
    } catch (Exception $e) {
        error_log('Failed to create requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create requisition']);
    }
}

function updateRequisition($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? '';
        $approvedBy = $input['approvedBy'] ?? '';

        // Update requisition status
        $stmt = $pdo->prepare('UPDATE stock_requisitions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?');
        $stmt->execute([$status, $approvedBy, $id]);

        // If approved, create a stock transfer from requesting branch to HEAD_OFFICE
        if ($status === 'APPROVED') {
            // Get requisition details
            $stmt = $pdo->prepare('SELECT * FROM stock_requisitions WHERE id = ?');
            $stmt->execute([$id]);
            $requisition = $stmt->fetch();

            if ($requisition) {
                // Get requisition items
                $itemStmt = $pdo->prepare('SELECT * FROM stock_requisition_items WHERE requisition_id = ?');
                $itemStmt->execute([$id]);
                $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($items)) {
                    // Get the main branch ID dynamically
                    $mainBranchId = getMainBranchId();

                    // Create stock transfer
                    $transferId = 'TRANSFER-' . time() . '-' . rand(1000, 9999);
                    $transferStmt = $pdo->prepare('INSERT INTO stock_transfers (id, from_branch_id, to_branch_id, products, status, date_sent, notes, created_by) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)');
                    $productsJson = json_encode($items); // Store items as JSON for now
                    $transferStmt->execute([$transferId, $requisition['branch_id'], $mainBranchId, $productsJson, 'IN_TRANSIT', 'Transfer for approved requisition ' . $id, $approvedBy]);

                    // Insert transfer items
                    $transferItemStmt = $pdo->prepare('INSERT INTO stock_transfer_items (transfer_id, product_id, product_name, quantity, batch_number, expiry_date) VALUES (?, ?, ?, ?, ?, ?)');
                    $totalValue = 0;
                    foreach ($items as $item) {
                        // Get product name and price
                        $productStmt = $pdo->prepare('SELECT name, base_price FROM products WHERE id = ?');
                        $productStmt->execute([$item['product_id']]);
                        $product = $productStmt->fetch();
                        $productName = $product ? $product['name'] : 'Unknown Product';
                        $productPrice = $product ? $product['base_price'] : 0;
                        $totalValue += $productPrice * $item['quantity_requested'];

                        $transferItemStmt->execute([
                            $transferId,
                            $item['product_id'],
                            $productName,
                            $item['quantity_requested'],
                            'BATCH-' . time() . '-' . rand(100, 999),
                            date('Y-m-d', strtotime('+1 year')) // Default expiry 1 year from now
                        ]);
                    }

                    // Create shipment for the transfer
                    $shipmentId = 'SHIP-' . time() . '-' . rand(1000, 9999);
                    $verificationCode = strtoupper(substr(md5(uniqid()), 0, 6));
                    $shipmentStmt = $pdo->prepare('INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    $shipmentStmt->execute([
                        $shipmentId,
                        $transferId,
                        $requisition['branch_id'],
                        $mainBranchId,
                        'PENDING',
                        $verificationCode,
                        $totalValue,
                        'Shipment for approved requisition ' . $id,
                        $approvedBy
                    ]);
                }
            }
        }

        echo json_encode(['message' => 'Requisition updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update requisition: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update requisition']);
    }
}
?>