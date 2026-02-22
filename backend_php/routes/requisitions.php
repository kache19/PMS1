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

function getNextRequisitionShipmentInvoiceSequence(string $prefix): int {
    global $pdo;

    $startPos = strlen($prefix) + 1;
    $regex = '^' . preg_quote($prefix, '/') . '[0-9]{4}$';
    $stmt = $pdo->prepare("
        SELECT COALESCE(MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)), 0) AS max_num
        FROM invoices
        WHERE id REGEXP ?
    ");
    $stmt->execute([$startPos, $regex]);
    $row = $stmt->fetch();

    return ((int)($row['max_num'] ?? 0)) + 1;
}

function generateNextShipmentInvoiceNumber() {
    $prefix = "INV-SHIP-";
    $nextNumber = getNextRequisitionShipmentInvoiceSequence($prefix);
    return $prefix . str_pad((string)$nextNumber, 4, '0', STR_PAD_LEFT);
}

function generateNextRequisitionRequestInvoiceNumber(): string {
    $prefix = "INV-REQ-";
    $nextNumber = getNextRequisitionShipmentInvoiceSequence($prefix);
    return $prefix . str_pad((string)$nextNumber, 4, '0', STR_PAD_LEFT);
}

function generateNextRequisitionTransferId(): string {
    global $pdo;

    $stmt = $pdo->query("
        SELECT COALESCE(MAX(
            CASE
                WHEN id REGEXP '^TRANS-[0-9]+$' THEN CAST(SUBSTRING(id, 7) AS UNSIGNED)
                WHEN id REGEXP '^[0-9]+$' THEN CAST(id AS UNSIGNED)
                ELSE 0
            END
        ), 0) AS max_num
        FROM stock_transfers
    ");
    $row = $stmt->fetch();
    $nextNumber = ((int)($row['max_num'] ?? 0)) + 1;
    return 'TRANS-' . str_pad((string)$nextNumber, 4, '0', STR_PAD_LEFT);
}

function generateNextRequisitionShipmentId(): string {
    global $pdo;

    $stmt = $pdo->query("
        SELECT COALESCE(MAX(CAST(id AS UNSIGNED)), 0) AS max_num
        FROM shipments
        WHERE id REGEXP '^[0-9]+$'
    ");
    $row = $stmt->fetch();
    $nextNumber = ((int)($row['max_num'] ?? 0)) + 1;
    return str_pad((string)$nextNumber, 4, '0', STR_PAD_LEFT);
}

function requisitionInvoicesHasColumn(string $columnName): bool {
    global $pdo;
    static $columnCache = [];

    if (array_key_exists($columnName, $columnCache)) {
        return $columnCache[$columnName];
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS c
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'invoices'
          AND COLUMN_NAME = ?
    ");
    $stmt->execute([$columnName]);
    $result = $stmt->fetch();
    $columnCache[$columnName] = ((int)($result['c'] ?? 0) > 0);

    return $columnCache[$columnName];
}

function insertRequisitionShipmentInvoice(
    string $invoiceId,
    string $branchId,
    string $customerName,
    float $totalValue,
    ?string $description,
    string $itemsJson
): void {
    global $pdo;

    $hasCustomerPhone = requisitionInvoicesHasColumn('customer_phone');
    if ($hasCustomerPhone) {
        $stmt = $pdo->prepare('
            INSERT INTO invoices
              (id, branch_id, customer_name, customer_phone, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $ok = $stmt->execute([$invoiceId, $branchId, $customerName, '', $totalValue, 0, 'UNPAID', null, $description, 'SHIPMENT', $itemsJson, 0]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO invoices
              (id, branch_id, customer_name, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $ok = $stmt->execute([$invoiceId, $branchId, $customerName, $totalValue, 0, 'UNPAID', null, $description, 'SHIPMENT', $itemsJson, 0]);
    }

    if (!$ok) {
        $err = $stmt->errorInfo();
        throw new Exception('Failed to create requisition shipment invoice: ' . json_encode($err));
    }
}

function insertRequisitionRequestInvoice(
    string $invoiceId,
    string $branchId,
    string $customerName,
    float $totalValue,
    ?string $description,
    string $itemsJson
): void {
    global $pdo;

    $hasCustomerPhone = requisitionInvoicesHasColumn('customer_phone');
    if ($hasCustomerPhone) {
        $stmt = $pdo->prepare('
            INSERT INTO invoices
              (id, branch_id, customer_name, customer_phone, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $ok = $stmt->execute([$invoiceId, $branchId, $customerName, '', $totalValue, 0, 'UNPAID', null, $description, 'REQUISITION', $itemsJson, 0]);
    } else {
        $stmt = $pdo->prepare('
            INSERT INTO invoices
              (id, branch_id, customer_name, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $ok = $stmt->execute([$invoiceId, $branchId, $customerName, $totalValue, 0, 'UNPAID', null, $description, 'REQUISITION', $itemsJson, 0]);
    }

    if (!$ok) {
        $err = $stmt->errorInfo();
        throw new Exception('Failed to create requisition request invoice: ' . json_encode($err));
    }
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
        if ($id && (($_GET['action'] ?? null) === 'initiate-shipment')) {
            initiateShipment($id);
        } else {
            createRequisition();
        }
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
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);

        // Build query based on user role
        $query = 'SELECT * FROM stock_requisitions';
        $params = [];

        if ($user['role'] !== 'SUPER_ADMIN') {
            $query .= ' WHERE branch_id = ?';
            $params[] = $user['branch_id'];
        }

        $query .= ' ORDER BY created_at DESC';

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $requisitions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get main branch ID for stock lookup
        $mainBranchStmt = $pdo->prepare('SELECT id FROM branches WHERE is_head_office = 1');
        $mainBranchStmt->execute();
        $mainBranch = $mainBranchStmt->fetch();
        $mainBranchId = $mainBranch ? $mainBranch['id'] : null;

        // Fetch items for each requisition
        foreach ($requisitions as &$req) {
            $itemStmt = $pdo->prepare('SELECT sri.*, p.name as product_name FROM stock_requisition_items sri JOIN products p ON sri.product_id = p.id WHERE sri.requisition_id = ?');
            $itemStmt->execute([$req['id']]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            // Transform items to match frontend interface
            $req['items'] = array_map(function($item) use ($pdo, $mainBranchId) {
                // Fetch current stock from main branch
                $currentStock = 0;
                if ($mainBranchId) {
                    $stockStmt = $pdo->prepare('SELECT quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
                    $stockStmt->execute([$mainBranchId, $item['product_id']]);
                    $stockResult = $stockStmt->fetch();
                    $currentStock = $stockResult ? (int)$stockResult['quantity'] : 0;
                }

                return [
                    'productName' => $item['product_name'],
                    'productId' => $item['product_id'],
                    'requestedQty' => (int)$item['quantity_requested'],
                    'currentStock' => $currentStock
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
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);
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
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $requestedBy = $input['requestedBy'] ?? '';
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';
        $priority = $input['priority'] ?? 'NORMAL';

        if (empty($branchId) || empty($requestedBy) || !is_array($items) || count($items) === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'branchId, requestedBy and at least one item are required']);
            return;
        }

        $pdo->beginTransaction();

        // Keep legacy REQ-* format for requisition IDs to avoid breaking existing references.
        $requisitionId = 'REQ-' . time();

        $stmt = $pdo->prepare('INSERT INTO stock_requisitions (id, branch_id, requested_by, status, total_items, notes, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$requisitionId, $branchId, $requestedBy, 'PENDING', count($items), $notes, $priority]);

        // Insert requisition items + build invoice line items from product prices.
        $itemStmt = $pdo->prepare('INSERT INTO stock_requisition_items (requisition_id, product_id, quantity_requested, notes, created_at) VALUES (?, ?, ?, ?, NOW())');
        $productStmt = $pdo->prepare('SELECT name, base_price FROM products WHERE id = ? LIMIT 1');
        $invoiceItems = [];
        foreach ($items as $item) {
            $productId = $item['productId'] ?? '';
            $quantityRequested = (int)($item['quantityRequested'] ?? 0);
            if ($productId === '' || $quantityRequested <= 0) {
                throw new Exception('Invalid requisition item payload');
            }
            $itemStmt->execute([$requisitionId, $productId, $quantityRequested, $item['notes'] ?? '']);

            $productStmt->execute([$productId]);
            $product = $productStmt->fetch(PDO::FETCH_ASSOC) ?: ['name' => $productId, 'base_price' => 0];
            $unitPrice = (float)($product['base_price'] ?? 0);
            $invoiceItems[] = [
                'productId' => $productId,
                'name' => $product['name'] ?? $productId,
                'quantity' => $quantityRequested,
                'price' => $unitPrice,
                'total' => $quantityRequested * $unitPrice
            ];
        }

        $totalValue = array_reduce($invoiceItems, function($sum, $line) {
            return $sum + ((float)($line['total'] ?? 0));
        }, 0.0);
        $invoiceId = generateNextRequisitionRequestInvoiceNumber();
        $description = 'Stock Requisition Invoice - Requisition ID: ' . $requisitionId;
        $customerName = 'Stock Requisition - Branch ' . $branchId;
        insertRequisitionRequestInvoice($invoiceId, $branchId, $customerName, $totalValue, $description, json_encode($invoiceItems));

        $pdo->commit();

        echo json_encode([
            'id' => $requisitionId,
            'invoiceId' => $invoiceId,
            'message' => 'Requisition created successfully with invoice'
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
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

        // Log incoming payload for debugging
        error_log('updateRequisition payload: ' . json_encode($input));

        $status = $input['status'] ?? '';
        $approvedBy = $input['approvedBy'] ?? null;

        // Validate status
        if (!in_array($status, ['PENDING', 'APPROVED', 'REJECTED'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status value']);
            return;
        }

        // Update requisition status
        $stmt = $pdo->prepare('UPDATE stock_requisitions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?');
        $stmt->execute([$status, $approvedBy, $id]);

        // Note: Stock transfer is now handled separately through shipment initiation
        // Approval only sets the status, actual transfer happens when shipment is created

        echo json_encode(['message' => 'Requisition updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update requisition: ' . $e->getMessage());
        // Return error details to aid debugging in dev environment
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update requisition', 'details' => $e->getMessage()]);
    }
}

function initiateShipment($requisitionId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $user = getCurrentUser();
        $input = json_decode(file_get_contents('php://input'), true);

        $customizedItems = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';
        $branchId = $input['branchId'] ?? null;

        // Get requisition details
        $stmt = $pdo->prepare('SELECT * FROM stock_requisitions WHERE id = ?');
        $stmt->execute([$requisitionId]);
        $requisition = $stmt->fetch();

        if (!$requisition) {
            http_response_code(404);
            echo json_encode(['error' => 'Requisition not found']);
            return;
        }

        // Use branch ID from requisition if not provided
        if (!$branchId) {
            $branchId = $requisition['branch_id'];
        }

        // Get main branch ID
        $mainBranchId = getMainBranchId();

        // COMPREHENSIVE STOCK VALIDATION
        $validationErrors = [];
        $validationWarnings = [];
        
        foreach ($customizedItems as $item) {
            $productId = $item['productId'];
            $quantity = (int)$item['quantity'];
            $requestedQty = (int)($item['requestedQty'] ?? $quantity);

            // Check stock in main branch
            $stmt = $pdo->prepare('SELECT quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$mainBranchId, $productId]);
            $stock = $stmt->fetch();

            $availableStock = $stock ? (int)$stock['quantity'] : 0;

            if ($availableStock < $quantity) {
                $validationErrors[] = [
                    'productId' => $productId,
                    'productName' => $item['productName'] ?? '',
                    'requested' => $quantity,
                    'available' => $availableStock,
                    'message' => "Insufficient stock for {$item['productName']}: Available {$availableStock}, Requested {$quantity}"
                ];
            } elseif ($quantity < $requestedQty) {
                // Warning if shipment quantity is less than originally requested
                $validationWarnings[] = [
                    'productId' => $productId,
                    'productName' => $item['productName'] ?? '',
                    'original' => $requestedQty,
                    'shipment' => $quantity,
                    'message' => "Shipment quantity ({$quantity}) is less than requested ({$requestedQty}) for {$item['productName']}"
                ];
            }
        }

        // Return validation errors if any critical issues
        if (!empty($validationErrors)) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Stock validation failed',
                'validationErrors' => $validationErrors,
                'validationWarnings' => $validationWarnings
            ]);
            return;
        }

        // Log warnings but allow shipment to proceed
        if (!empty($validationWarnings)) {
            error_log('Shipment initiated with warnings: ' . json_encode($validationWarnings));
        }

        $pdo->beginTransaction();

        try {
            // First, approve the requisition status
            $stmt = $pdo->prepare('UPDATE stock_requisitions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?');
            $stmt->execute(['APPROVED', $user['id'] ?? null, $requisitionId]);

            // Create transfer with item details
            $transferId = generateNextRequisitionTransferId();
            $transferItems = array_map(function($item) {
                return [
                    'productId' => $item['productId'],
                    'productName' => $item['productName'] ?? '',
                    'quantity' => (int)$item['quantity'],
                    'batchNumber' => $item['batchNumber'] ?? '',
                    'expiryDate' => $item['expiryDate'] ?? '',
                    'availableStock' => (int)($item['availableStock'] ?? 0)
                ];
            }, $customizedItems);

            $stmt = $pdo->prepare("
                INSERT INTO stock_transfers
                (id, from_branch_id, to_branch_id, products, status, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, 'IN_TRANSIT', ?, ?, NOW())
            ");
            $stmt->execute([$transferId, $mainBranchId, $branchId, json_encode($transferItems), $notes, $user['id'] ?? null]);

            // Prepare invoice items and calculate total value
            $invoiceItems = array_map(function($item) {
                $price = (float)($item['price'] ?? 0);
                $quantity = (int)($item['quantity'] ?? 0);
                return [
                    'productId' => $item['productId'],
                    'name' => $item['productName'] ?? '',
                    'quantity' => $quantity,
                    'price' => $price,
                    'total' => $price * $quantity
                ];
            }, $customizedItems);

            // Calculate total value from items
            $totalValue = array_reduce($invoiceItems, function($sum, $item) {
                return $sum + ($item['total'] ?? 0);
            }, 0);

            // Get branch names for display
            $stmt = $pdo->prepare('SELECT name FROM branches WHERE id = ?');
            $stmt->execute([$mainBranchId]);
            $fromBranch = $stmt->fetch();
            $fromBranchName = $fromBranch ? $fromBranch['name'] : $mainBranchId;

            $stmt->execute([$branchId]);
            $toBranch = $stmt->fetch();
            $toBranchName = $toBranch ? $toBranch['name'] : $branchId;

            // Create shipment with PENDING status (awaiting verification)
            $shipmentId = generateNextRequisitionShipmentId();
            $verificationCode = null;

            $stmt = $pdo->prepare('INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $stmt->execute([$shipmentId, $transferId, $mainBranchId, $branchId, 'PENDING', $verificationCode, $totalValue, $notes, $user['id'] ?? null]);

            // Create a single shipment invoice (INV-SHIP-*) per initiated shipment.
            $baseDesc = "Shipment Invoice - Shipment ID: {$shipmentId} (Transfer: {$transferId})";
            $customerName = "Branch Transfer: {$fromBranchName} to {$toBranchName}";
            $invoiceId = generateNextShipmentInvoiceNumber();
            insertRequisitionShipmentInvoice($invoiceId, $mainBranchId, $customerName, $totalValue, $baseDesc, json_encode($invoiceItems));

            $pdo->commit();

            echo json_encode([
                'message' => 'Shipment initiated successfully with invoice',
                'transferId' => $transferId,
                'shipmentId' => $shipmentId,
                'requisitionId' => $requisitionId,
                'invoiceId' => $invoiceId,
                'validationWarnings' => $validationWarnings,
                'status' => 'PENDING_VERIFICATION',
                'notes' => 'Shipment is pending verification by storekeeper and inventory controller'
            ]);
        } catch (Exception $innerE) {
            $pdo->rollBack();
            throw $innerE;
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to initiate shipment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to initiate shipment: ' . $e->getMessage()]);
    }
}
?>
