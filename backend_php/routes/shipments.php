<?php
ini_set('error_log', __DIR__ . '/debug.log');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getShipment($id);
        } else {
            getShipments();
        }
        break;
    case 'POST':
        if ($_GET['action'] === 'create-direct') {
            createDirectShipment();
        } else {
            createShipment();
        }
        break;
    case 'PUT':
        if ($id) {
            updateShipment($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getShipments() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $stmt = $pdo->query('SELECT * FROM shipments ORDER BY created_at DESC');
        $shipments = $stmt->fetchAll();
        echo json_encode($shipments);
    } catch (Exception $e) {
        error_log('Failed to fetch shipments: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shipments']);
    }
}

function getShipment($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $stmt = $pdo->prepare('SELECT * FROM shipments WHERE id = ?');
        $stmt->execute([$id]);
        $shipment = $stmt->fetch();

        if (!$shipment) {
            http_response_code(404);
            echo json_encode(['error' => 'Shipment not found']);
            return;
        }

        echo json_encode($shipment);
    } catch (Exception $e) {
        error_log('Failed to fetch shipment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shipment']);
    }
}

function createShipment() {
    global $pdo;

    try {
        // Log the incoming request for debugging
        error_log('Shipment creation request received');
        error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
        error_log('Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

        // Check authentication
        try {
            authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
            $user = getCurrentUser();
            error_log('User authenticated: ' . ($user['id'] ?? 'unknown'));
        } catch (Exception $authError) {
            error_log('Authentication failed: ' . $authError->getMessage());
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required', 'details' => $authError->getMessage()]);
            return;
        }

        // Get and validate input
        $rawInput = file_get_contents('php://input');
        error_log('Raw input: ' . $rawInput);

        $input = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON decode error: ' . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data', 'details' => json_last_error_msg()]);
            return;
        }

        error_log('Decoded input: ' . json_encode($input));

        // Validate required fields
        $transferId = $input['transferId'] ?? '';
        $fromBranchId = $input['fromBranchId'] ?? '';
        $toBranchId = $input['toBranchId'] ?? '';
        $status = $input['status'] ?? 'PENDING';
        $totalValue = $input['totalValue'] ?? 0;
        $notes = $input['notes'] ?? '';
        $items = $input['items'] ?? [];

        error_log("Validation - transferId: '$transferId', fromBranchId: '$fromBranchId', toBranchId: '$toBranchId'");

        if (empty($transferId) || empty($fromBranchId) || empty($toBranchId)) {
            error_log('Missing required fields');
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: transferId, fromBranchId, toBranchId']);
            return;
        }

        // Verify transfer exists
        $stmt = $pdo->prepare('SELECT id FROM stock_transfers WHERE id = ?');
        $stmt->execute([$transferId]);
        if (!$stmt->fetch()) {
            error_log("Transfer not found: $transferId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transfer ID - transfer does not exist']);
            return;
        }

        // Verify branches exist
        $stmt = $pdo->prepare('SELECT id FROM branches WHERE id = ?');
        $stmt->execute([$fromBranchId]);
        if (!$stmt->fetch()) {
            error_log("From branch not found: $fromBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid from branch ID']);
            return;
        }

        $stmt->execute([$toBranchId]);
        if (!$stmt->fetch()) {
            error_log("To branch not found: $toBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid to branch ID']);
            return;
        }

        // STOCK VERIFICATION: Validate that all items have sufficient stock in from_branch
        $validationErrors = [];
        foreach ($items as $item) {
            $productId = $item['productId'] ?? $item['product_id'] ?? null;
            $quantity = (int)($item['quantity'] ?? 0);
            
            if (!$productId || $quantity <= 0) {
                continue;
            }

            // Check stock availability
            $stmt = $pdo->prepare('SELECT quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$fromBranchId, $productId]);
            $inventory = $stmt->fetch();
            
            if (!$inventory || $inventory['quantity'] < $quantity) {
                $available = $inventory ? $inventory['quantity'] : 0;
                $validationErrors[] = [
                    'productId' => $productId,
                    'requested' => $quantity,
                    'available' => $available,
                    'message' => "Insufficient stock for product $productId: available $available, requested $quantity"
                ];
            }
        }

        if (!empty($validationErrors)) {
            error_log('Stock validation failed: ' . json_encode($validationErrors));
            http_response_code(400);
            echo json_encode([
                'error' => 'Stock validation failed',
                'validationErrors' => $validationErrors
            ]);
            return;
        }

        $pdo->beginTransaction();

        try {
            $shipmentId = 'SHIP-' . uniqid();
            error_log("Creating shipment with ID: $shipmentId");

            // Use NULL for verification_code to avoid unique constraint issues
            $verificationCode = null;

            $stmt = $pdo->prepare('INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $result = $stmt->execute([$shipmentId, $transferId, $fromBranchId, $toBranchId, $status, $verificationCode, $totalValue, $notes, $user['id'] ?? null]);

            if (!$result) {
                throw new Exception('Failed to insert shipment');
            }

            // Get the created shipment
            $stmt = $pdo->prepare('SELECT * FROM shipments WHERE id = ?');
            $stmt->execute([$shipmentId]);
            $shipment = $stmt->fetch();

            if (!$shipment) {
                throw new Exception('Failed to retrieve created shipment');
            }

            error_log('Shipment created successfully: ' . $shipmentId);

            // Create invoices for both branches so the shipment appears under both
            $invoiceItems = array_map(function($item) {
                return [
                    'productId' => $item['productId'] ?? $item['product_id'],
                    'name' => $item['productName'] ?? '',
                    'quantity' => (int)($item['quantity'] ?? 0),
                    'price' => (float)($item['price'] ?? 0),
                    'total' => ((int)($item['quantity'] ?? 0)) * ((float)($item['price'] ?? 0))
                ];
            }, $items);

            $baseDesc = "Shipment Invoice - Shipment ID: {$shipmentId} (Transfer: {$transferId})";

            // Get branch names for display
            $stmt = $pdo->prepare('SELECT name FROM branches WHERE id = ?');
            $stmt->execute([$fromBranchId]);
            $fromBranch = $stmt->fetch();
            $fromBranchName = $fromBranch ? $fromBranch['name'] : $fromBranchId;

            $stmt->execute([$toBranchId]);
            $toBranch = $stmt->fetch();
            $toBranchName = $toBranch ? $toBranch['name'] : $toBranchId;

            // From-branch invoice
            $invoiceIdFrom = 'INV-SHIP-' . str_replace('.', '', uniqid('', true));
            $stmt = $pdo->prepare('INSERT INTO invoices (id, branch_id, customer_name, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $customerName = "Branch Transfer: {$fromBranchName} to {$toBranchName}";
            $okFrom = $stmt->execute([$invoiceIdFrom, $fromBranchId, $customerName, $totalValue, 0, 'UNPAID', null, $baseDesc, 'SHIPMENT', json_encode($invoiceItems), 0]);
            if (!$okFrom) {
                $err = $stmt->errorInfo();
                error_log('Invoice insert failed (from): ' . json_encode($err));
                throw new Exception('Failed to create from-branch invoice: ' . json_encode($err));
            }
            error_log('Invoice created (from): ' . $invoiceIdFrom);

            // To-branch invoice (so receiving branch also sees the invoice)
            $invoiceIdTo = 'INV-RECV-' . str_replace('.', '', uniqid('', true));
            $okTo = $stmt->execute([$invoiceIdTo, $toBranchId, $customerName, $totalValue, 0, 'UNPAID', null, $baseDesc, 'SHIPMENT', json_encode($invoiceItems), 0]);
            if (!$okTo) {
                $err2 = $stmt->errorInfo();
                error_log('Invoice insert failed (to): ' . json_encode($err2));
                throw new Exception('Failed to create to-branch invoice: ' . json_encode($err2));
            }
            error_log('Invoice created (to): ' . $invoiceIdTo);

            // Deduct inventory from from-branch and add to to-branch
            foreach ($items as $item) {
                $productId = $item['productId'] ?? $item['product_id'];
                $quantity = (int)($item['quantity'] ?? 0);

                if (!$productId || $quantity <= 0) {
                    error_log("Skipping item - productId: $productId, quantity: $quantity");
                    continue;
                }

                error_log("Deducting inventory - productId: $productId, quantity: $quantity, from: $fromBranchId, to: $toBranchId");

                // Deduct from from_branch
                $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?');
                $deductResult = $stmt->execute([$quantity, $fromBranchId, $productId]);
                if (!$deductResult) {
                    $err = $stmt->errorInfo();
                    error_log('Inventory deduction failed: ' . json_encode($err));
                    throw new Exception('Failed to deduct inventory: ' . json_encode($err));
                }
                error_log('Deducted ' . $quantity . ' from ' . $fromBranchId);

                // Add to to_branch
                $stmt = $pdo->prepare("INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
                $addResult = $stmt->execute([$toBranchId, $productId, $quantity]);
                if (!$addResult) {
                    $err = $stmt->errorInfo();
                    error_log('Inventory addition failed: ' . json_encode($err));
                    throw new Exception('Failed to add inventory: ' . json_encode($err));
                }
                error_log('Added ' . $quantity . ' to ' . $toBranchId);

                // Handle batches if batch number exists
                if (isset($item['batchNumber'])) {
                    $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                    $batchResult = $stmt->execute([$toBranchId, $fromBranchId, $productId, $item['batchNumber']]);
                    if (!$batchResult) {
                        error_log('Batch move failed for batch ' . $item['batchNumber']);
                    }
                }
            }

            error_log('Inventory deducted for shipment: ' . $shipmentId);

            $pdo->commit();

            $response = [
                'message' => 'Shipment created successfully',
                'shipment' => $shipment,
                'invoices' => [
                    'fromBranchInvoice' => $invoiceIdFrom,
                    'toBranchInvoice' => $invoiceIdTo,
                    'status' => 'created'
                ],
                'inventory' => [
                    'status' => 'deducted',
                    'message' => 'Inventory transferred from ' . $fromBranchName . ' to ' . $toBranchName
                ],
                'validationPassed' => true
            ];
            echo json_encode($response);

        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Failed to create shipment: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            http_response_code(500);
            
            // Determine what failed
            $failureType = 'unknown';
            if (strpos($e->getMessage(), 'invoice') !== false) {
                $failureType = 'invoice creation';
            } elseif (strpos($e->getMessage(), 'inventory') !== false) {
                $failureType = 'inventory deduction';
            }
            
            echo json_encode([
                'error' => 'Failed to create shipment',
                'failureType' => $failureType,
                'details' => $e->getMessage()
            ]);
        }

    } catch (Exception $e) {
        error_log('Failed to create shipment: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to create shipment',
            'details' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]);
    }
}

function createDirectShipment() {
    global $pdo;

    try {
        // Log the incoming request for debugging
        error_log('Direct shipment creation request received');

        // Check authentication
        try {
            authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER', 'STOREKEEPER', 'PHARMACIST', 'DISPENSER']);
            $user = getCurrentUser();
            error_log('User authenticated: ' . ($user['id'] ?? 'unknown'));
        } catch (Exception $authError) {
            error_log('Authentication failed: ' . $authError->getMessage());
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required', 'details' => $authError->getMessage()]);
            return;
        }

        // Get and validate input
        $rawInput = file_get_contents('php://input');
        error_log('Raw input: ' . $rawInput);

        $input = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('JSON decode error: ' . json_last_error_msg());
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data', 'details' => json_last_error_msg()]);
            return;
        }

        error_log('Decoded input: ' . json_encode($input));

        // Validate required fields
        $fromBranchId = $input['fromBranchId'] ?? $user['branch_id'] ?? '';
        $toBranchId = $input['toBranchId'] ?? '';
        $status = $input['status'] ?? 'PENDING';
        $totalValue = $input['totalValue'] ?? 0;
        $notes = $input['notes'] ?? '';
        $items = $input['items'] ?? [];

        error_log("Validation - fromBranchId: '$fromBranchId', toBranchId: '$toBranchId', items count: " . count($items));

        if (empty($fromBranchId) || empty($toBranchId)) {
            error_log('Missing required fields');
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: fromBranchId, toBranchId']);
            return;
        }

        // Verify branches exist
        $stmt = $pdo->prepare('SELECT id FROM branches WHERE id = ?');
        $stmt->execute([$fromBranchId]);
        if (!$stmt->fetch()) {
            error_log("From branch not found: $fromBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid from branch ID']);
            return;
        }

        $stmt->execute([$toBranchId]);
        if (!$stmt->fetch()) {
            error_log("To branch not found: $toBranchId");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid to branch ID']);
            return;
        }

        // STOCK VERIFICATION: Validate that all items have sufficient stock in from_branch
        $validationErrors = [];
        foreach ($items as $item) {
            $productId = $item['productId'] ?? $item['product_id'] ?? null;
            $quantity = (int)($item['quantity'] ?? 0);

            if (!$productId || $quantity <= 0) {
                continue;
            }

            // Check stock availability
            $stmt = $pdo->prepare('SELECT quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$fromBranchId, $productId]);
            $inventory = $stmt->fetch();

            if (!$inventory || $inventory['quantity'] < $quantity) {
                $available = $inventory ? $inventory['quantity'] : 0;
                $validationErrors[] = [
                    'productId' => $productId,
                    'requested' => $quantity,
                    'available' => $available,
                    'message' => "Insufficient stock for product $productId: available $available, requested $quantity"
                ];
            }
        }

        if (!empty($validationErrors)) {
            error_log('Stock validation failed: ' . json_encode($validationErrors));
            http_response_code(400);
            echo json_encode([
                'error' => 'Stock validation failed',
                'validationErrors' => $validationErrors
            ]);
            return;
        }

        $pdo->beginTransaction();

        try {
            // Create transfer
            $transferId = 'TRANSFER-' . uniqid();
            $transferItems = array_map(function($item) {
                return [
                    'productId' => $item['productId'] ?? $item['product_id'],
                    'productName' => $item['productName'] ?? '',
                    'quantity' => (int)($item['quantity'] ?? 0),
                    'batchNumber' => $item['batchNumber'] ?? '',
                    'expiryDate' => $item['expiryDate'] ?? '',
                    'price' => (float)($item['price'] ?? 0)
                ];
            }, $items);

            $stmt = $pdo->prepare("
                INSERT INTO stock_transfers
                (id, from_branch_id, to_branch_id, products, status, notes, created_by, created_at)
                VALUES (?, ?, ?, ?, 'IN_TRANSIT', ?, ?, NOW())
            ");
            $stmt->execute([$transferId, $fromBranchId, $toBranchId, json_encode($transferItems), $notes, $user['id'] ?? null]);

            // Create shipment
            $shipmentId = 'SHIP-' . uniqid();
            $verificationCode = null;

            $stmt = $pdo->prepare('INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $stmt->execute([$shipmentId, $transferId, $fromBranchId, $toBranchId, $status, $verificationCode, $totalValue, $notes, $user['id'] ?? null]);

            // Generate invoice immediately (use higher-entropy id to avoid collisions)
            $invoiceId = 'INV-SHIP-' . str_replace('.', '', uniqid('', true));
            $invoiceItems = array_map(function($item) {
                return [
                    'productId' => $item['productId'] ?? $item['product_id'],
                    'name' => $item['productName'] ?? '',
                    'quantity' => (int)($item['quantity'] ?? 0),
                    'price' => (float)($item['price'] ?? 0),
                    'total' => ((int)($item['quantity'] ?? 0)) * ((float)($item['price'] ?? 0))
                ];
            }, $items);

            // Get branch names for display
            $stmt = $pdo->prepare('SELECT name FROM branches WHERE id = ?');
            $stmt->execute([$fromBranchId]);
            $fromBranch = $stmt->fetch();
            $fromBranchName = $fromBranch ? $fromBranch['name'] : $fromBranchId;

            $stmt->execute([$toBranchId]);
            $toBranch = $stmt->fetch();
            $toBranchName = $toBranch ? $toBranch['name'] : $toBranchId;

            // Insert invoice (remove customer_phone as it doesn't exist in invoices table)
            $stmt = $pdo->prepare('INSERT INTO invoices (id, branch_id, customer_name, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $customerName = "Branch Transfer: {$fromBranchName} to {$toBranchName}";
            $description = "Shipment Invoice - Transfer ID: {$transferId}";
            error_log('About to insert invoice: ' . $invoiceId);
            $invoiceResult = $stmt->execute([$invoiceId, $fromBranchId, $customerName, $totalValue, 0, 'UNPAID', null, $description, 'SHIPMENT', json_encode($invoiceItems), 0]);
            if (!$invoiceResult) {
                $err = $stmt->errorInfo();
                error_log('Invoice insert failed: ' . json_encode($err));
                throw new Exception('Failed to create invoice: ' . json_encode($err));
            }
            error_log('Invoice created successfully: ' . $invoiceId);

            // Deduct inventory from from-branch and add to to-branch
            foreach ($items as $item) {
                $productId = $item['productId'] ?? $item['product_id'];
                $quantity = (int)($item['quantity'] ?? 0);

                if (!$productId || $quantity <= 0) {
                    error_log("Skipping item - productId: $productId, quantity: $quantity");
                    continue;
                }

                error_log("Deducting inventory - productId: $productId, quantity: $quantity, from: $fromBranchId, to: $toBranchId");

                // Deduct from from_branch
                $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = quantity - ? WHERE branch_id = ? AND product_id = ?');
                $deductResult = $stmt->execute([$quantity, $fromBranchId, $productId]);
                if (!$deductResult) {
                    $err = $stmt->errorInfo();
                    error_log('Inventory deduction failed: ' . json_encode($err));
                    throw new Exception('Failed to deduct inventory: ' . json_encode($err));
                }
                error_log('Deducted ' . $quantity . ' from ' . $fromBranchId);

                // Add to to_branch
                $stmt = $pdo->prepare("INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
                $addResult = $stmt->execute([$toBranchId, $productId, $quantity]);
                if (!$addResult) {
                    $err = $stmt->errorInfo();
                    error_log('Inventory addition failed: ' . json_encode($err));
                    throw new Exception('Failed to add inventory: ' . json_encode($err));
                }
                error_log('Added ' . $quantity . ' to ' . $toBranchId);

                // Handle batches if batch number exists
                if (isset($item['batchNumber'])) {
                    $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                    $batchResult = $stmt->execute([$toBranchId, $fromBranchId, $productId, $item['batchNumber']]);
                    if (!$batchResult) {
                        error_log('Batch move failed for batch ' . $item['batchNumber']);
                    }
                }
            }

            error_log('Inventory deducted for direct shipment: ' . $shipmentId);

            $pdo->commit();

            error_log('Direct shipment and invoice created successfully: ' . $shipmentId);

            // Return success response
            $response = [
                'message' => 'Shipment created successfully with invoice',
                'shipment' => [
                    'id' => $shipmentId,
                    'transferId' => $transferId,
                    'fromBranchId' => $fromBranchId,
                    'toBranchId' => $toBranchId,
                    'status' => $status,
                    'totalValue' => $totalValue,
                    'notes' => $notes,
                    'createdBy' => $user['id'] ?? null
                ],
                'invoice' => [
                    'id' => $invoiceId,
                    'totalAmount' => $totalValue,
                    'status' => 'UNPAID',
                    'created' => true,
                    'message' => 'Invoice created successfully'
                ],
                'inventory' => [
                    'status' => 'deducted',
                    'message' => 'Inventory transferred from ' . $fromBranchName . ' to ' . $toBranchName,
                    'fromBranch' => $fromBranchName,
                    'toBranch' => $toBranchName
                ],
                'validationPassed' => true
            ];
            echo json_encode($response);

        } catch (Exception $innerE) {
            $pdo->rollBack();
            throw $innerE;
        }

    } catch (Exception $e) {
        error_log('Failed to create direct shipment: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        
        // Determine what failed
        $failureType = 'unknown';
        if (strpos($e->getMessage(), 'invoice') !== false) {
            $failureType = 'invoice creation';
        } elseif (strpos($e->getMessage(), 'inventory') !== false) {
            $failureType = 'inventory deduction';
        }
        
        echo json_encode([
            'error' => 'Failed to create shipment',
            'failureType' => $failureType,
            'details' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]);
    }
}

function updateShipment($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $input = json_decode(file_get_contents('php://input'), true);
        $user = getCurrentUser();

        $updates = [];
        $values = [];

        // Only AUDITOR can verify and mark as ready for sale
        if ($user['role'] === 'AUDITOR') {
            // Auditor can only verify shipments, not change status
            if (isset($input['verified']) || isset($input['readyForSale'])) {
                if (isset($input['readyForSale']) && $input['readyForSale']) {
                    $updates[] = 'ready_for_sale = ?';
                    $values[] = 1;
                    $updates[] = 'verified_by = ?';
                    $values[] = $user['id'];
                    $updates[] = 'verified_at = NOW()';
                }
            }
        } else {
            // Other roles can update status
            $fields = ['status', 'verification_code', 'total_value', 'notes', 'approved_by'];
            foreach ($fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $values[] = $input[$field];
                }
            }

            if (isset($input['status']) && $input['status'] === 'APPROVED') {
                $updates[] = 'approved_at = NOW()';
            }
        }

        if (!empty($updates)) {
            $values[] = $id;
            $query = 'UPDATE shipments SET ' . implode(', ', $updates) . ' WHERE id = ?';
            $stmt = $pdo->prepare($query);
            $stmt->execute($values);
        }

        if (isset($input['status']) && $input['status'] === 'APPROVED') {
            // Inventory already deducted at shipment creation
            // Just update transfer status to COMPLETED
            $stmt = $pdo->prepare('SELECT transfer_id FROM shipments WHERE id = ?');
            $stmt->execute([$id]);
            $shipment = $stmt->fetch();

            if ($shipment) {
                $transferId = $shipment['transfer_id'];
                // Update transfer status to COMPLETED
                $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
                $stmt->execute(['COMPLETED', $transferId]);
                error_log('Transfer status updated to COMPLETED for shipment: ' . $id);
            }
        }

        echo json_encode(['message' => 'Shipment updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update shipment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update shipment']);
    }
}
?>