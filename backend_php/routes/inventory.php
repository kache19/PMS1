<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/auth.php';
require_once dirname(__DIR__) . '/vendor/autoload.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Try to extract action reliably from URI (supports /api/inventory/addStock and variants)
$action = null;
$id = null;
$id2 = null;

if (preg_match('#/api/(?:backend_php/index.php/)?(?:inventory|stock)(?:/([^/]+))?#', $path, $m)) {
    // $m[1] will be the first segment after /inventory or /stock (e.g. BR003 or addStock)
    $first = $m[1] ?? null;
    if ($first) {
        // If first segment starts with a letter assume it's an action (like 'addStock'), otherwise treat as id
        if (preg_match('/^[A-Za-z]/', $first)) {
            $action = $first;
        } else {
            $id = $first;
        }
    }
    // Also attempt to capture a second segment
    if (preg_match('#/api/(?:backend_php/index.php/)?(?:inventory|stock)/(?:[^/]+)/(?:([^/]+))#', $path, $m2)) {
        $id2 = $m2[1] ?? null;
    }
}
error_log("Inventory route - PATH: $path");
error_log("Inventory route - action: " . ($action ?? 'NULL') . ", id: " . ($id ?? 'NULL') . ", id2: " . ($id2 ?? 'NULL'));
error_log("Inventory route - \$_GET: " . json_encode($_GET));

// Also support query parameters as fallback
if (isset($_GET['id'])) $id = $_GET['id'];
if (isset($_GET['id2'])) $id2 = $_GET['id2'];
if (isset($_GET['subpath'])) $action = $_GET['subpath'];

switch ($method) {
    case 'GET':
        // Support both path-based (/api/inventory/BR002) and query-based (/api/inventory?id=BR002) routing
        $branchId = $id ?: ($_GET['id'] ?? null);
        if ($branchId) {
            getBranchInventory($branchId);
        } else {
            getAllInventory();
        }
        break;
    case 'POST':
        // Accept both singular 'transfer' and plural 'transfers' (frontend uses 'inventory/transfers')
        if ($action === 'transfer' || $action === 'transfers' || $path === '/inventory/transfers' || (isset($_GET['subpath']) && $_GET['subpath'] === 'transfers')) {
            createTransfer();
        } elseif ($action === 'addStock' || $action === 'add') {
            addStock();
        } elseif ($action === 'adjust') {
            adjustStock();
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
        }
        break;
    case 'PUT':
        if ($id && $action === 'verify') {
            verifyTransferByStoreKeeper($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getAllInventory() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);

        $stmt = $pdo->query("
            SELECT
                bi.branch_id,
                bi.product_id,
                bi.quantity,
                bi.custom_price,
                p.name, p.generic_name, p.category, p.cost_price, p.base_price, p.unit, p.min_stock_level
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            ORDER BY p.name
        ");
        $rows = $stmt->fetchAll();

        $inventoryMap = [];
        foreach ($rows as $row) {
            $branchId = $row['branch_id'];
            $productId = $row['product_id'];

            // Get batches for this product
            $batchStmt = $pdo->prepare("
                SELECT batch_number, expiry_date, quantity, status, supplier_id, supplier_name, restock_status, last_restock_date
                FROM drug_batches
                WHERE branch_id = ? AND product_id = ?
                ORDER BY expiry_date
            ");
            $batchStmt->execute([$branchId, $productId]);
            $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);

            $inventoryMap[$branchId][] = [
                'productId' => $productId,
                'name' => $row['name'],
                'genericName' => $row['generic_name'],
                'category' => $row['category'],
                'quantity' => (int)$row['quantity'],
                'customPrice' => (float)$row['custom_price'],
                'costPrice' => (float)$row['cost_price'],
                'basePrice' => (float)$row['base_price'],
                'unit' => $row['unit'],
                'minStockLevel' => (int)$row['min_stock_level'],
                'batches' => array_map(function($batch) {
                    return [
                        'batchNumber' => $batch['batch_number'],
                        'expiryDate' => $batch['expiry_date'],
                        'quantity' => (int)$batch['quantity'],
                        'status' => $batch['status'],
                        'supplierId' => $batch['supplier_id'] ?? null,
                        'supplierName' => $batch['supplier_name'] ?? null,
                        'restockStatus' => $batch['restock_status'] ?? null,
                        'lastRestockDate' => $batch['last_restock_date'] ?? null
                    ];
                }, $batches)
            ];
        }

        echo json_encode($inventoryMap);
    } catch (Exception $e) {
        error_log('Failed to fetch inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function exportInventory() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER', 'ACCOUNTANT']);

        $format = strtolower($_GET['format'] ?? 'pdf');
        $branchId = $_GET['branchId'] ?? null;

        // Get inventory data
        $query = "SELECT bi.branch_id, bi.product_id, bi.quantity, bi.custom_price, p.name, p.generic_name, p.category, p.base_price, p.unit FROM branch_inventory bi JOIN products p ON bi.product_id = p.id";
        $params = [];
        if ($branchId) {
            $query .= " WHERE bi.branch_id = ?";
            $params[] = $branchId;
        }
        $query .= " ORDER BY p.name";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get branch name if filtering by branch
        $branchName = $branchId;
        if ($branchId) {
            $branchStmt = $pdo->prepare("SELECT name FROM branches WHERE id = ?");
            $branchStmt->execute([$branchId]);
            $branchRow = $branchStmt->fetch();
            $branchName = $branchRow ? $branchRow['name'] : $branchId;
        }

        // Build professional inventory report HTML
        $totalValue = 0;
        $totalQuantity = 0;
        foreach ($rows as $r) {
            $totalQuantity += (int)$r['quantity'];
            $totalValue += ((float)$r['custom_price'] ?: (float)$r['base_price']) * (int)$r['quantity'];
        }

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Inventory Report</title>
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 40px; }
        .header { border-bottom: 3px solid #0066cc; margin-bottom: 30px; padding-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #0066cc; margin-bottom: 10px; }
        .report-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 5px; }
        .report-info { font-size: 13px; color: #666; margin-top: 10px; }
        .summary { display: flex; gap: 40px; margin: 30px 0; padding: 20px; background: #f5f9ff; border-left: 4px solid #0066cc; border-radius: 4px; }
        .summary-item { flex: 1; }
        .summary-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-value { font-size: 24px; font-weight: bold; color: #0066cc; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        thead { background: #0066cc; color: white; }
        th { padding: 14px; text-align: left; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0066cc; }
        td { padding: 12px 14px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr:hover { background: #f0f5ff; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .product-name { font-weight: 600; color: #0066cc; }
        .category-badge { display: inline-block; padding: 4px 8px; background: #e0e0e0; border-radius: 3px; font-size: 11px; }
        tfoot { background: #f5f5f5; font-weight: 600; }
        tfoot td { border-top: 2px solid #0066cc; padding: 14px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        @media print { body { padding: 0; } .container { padding: 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">PHARMACY MANAGEMENT SYSTEM</div>
            <div class="report-title">📊 Inventory Status Report</div>
            <div class="report-info">
                <strong>Branch:</strong> ' . htmlspecialchars($branchName) . ' | 
                <strong>Generated:</strong> ' . date('M d, Y @ H:i:s') . ' | 
                <strong>Total Items:</strong> ' . count($rows) . ' products
            </div>
        </div>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-label">Total Quantity</div>
                <div class="summary-value">' . $totalQuantity . ' units</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Inventory Value</div>
                <div class="summary-value">₱' . number_format($totalValue, 2) . '</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Average Unit Price</div>
                <div class="summary-value">₱' . (count($rows) > 0 ? number_format($totalValue / count($rows), 2) : '0.00') . '</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th class="text-center">Unit</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total Value</th>
                </tr>
            </thead>
            <tbody>';

        foreach ($rows as $r) {
            $unitPrice = (float)$r['custom_price'] ?: (float)$r['base_price'];
            $itemValue = $unitPrice * (int)$r['quantity'];
            $html .= '<tr>
                <td><span class="product-name">' . htmlspecialchars($r['name']) . '</span></td>
                <td><span class="category-badge">' . htmlspecialchars($r['category']) . '</span></td>
                <td class="text-center">' . htmlspecialchars($r['unit'] ?? 'unit') . '</td>
                <td class="text-right"><strong>' . (int)$r['quantity'] . '</strong></td>
                <td class="text-right">₱' . number_format($unitPrice, 2) . '</td>
                <td class="text-right">₱' . number_format($itemValue, 2) . '</td>
            </tr>';
        }

        $html .= '</tbody>
            <tfoot>
                <tr>
                    <td colspan="3">TOTALS</td>
                    <td class="text-right">' . $totalQuantity . ' units</td>
                    <td></td>
                    <td class="text-right">₱' . number_format($totalValue, 2) . '</td>
                </tr>
            </tfoot>
        </table>

        <div class="footer">
            <p>This is an automatically generated report. For inquiries, contact your branch manager.</p>
            <p style="margin-top: 10px; color: #999; font-size: 11px;">Inventory Management System © 2026</p>
        </div>
    </div>
</body>
</html>';

        // Output based on format
        if ($format === 'excel') {
            // Excel format - send as HTML (opens in Excel with formatting preserved)
            $filename = 'Inventory_Report_' . ($branchId ?: 'AllBranches') . '_' . date('Y-m-d_His') . '.html';
            header('Content-Type: application/vnd.ms-excel; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            echo $html;
        } else {
            // PDF format - try server-side PDF, fallback to printable HTML
            if (class_exists('Dompdf\Dompdf')) {
                try {
                    // @phpstan-ignore-next-line
                    // @phpstan-ignore-line
                    $dompdf = new \Dompdf\Dompdf();
                    $dompdf->loadHtml($html);
                    $dompdf->setPaper('A4', 'portrait');
                    $dompdf->render();
                    header('Content-Type: application/pdf');
                    header('Content-Disposition: attachment; filename="Inventory_Report_' . ($branchId ?: 'AllBranches') . '_' . date('Y-m-d_His') . '.pdf"');
                    echo $dompdf->output();
                    return;
                } catch (Exception $e) {
                    error_log('Dompdf render failed: ' . $e->getMessage());
                }
            }
            // Fallback to printable HTML
            header('Content-Type: text/html; charset=utf-8');
            echo $html;
        }
    } catch (Exception $e) {
        error_log('Failed to export inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to export inventory', 'details' => $e->getMessage()]);
    }
}

function getBranchInventory($branchId) {
    global $pdo;

    try {
        // authorizeRoles returns null for unauthenticated GET requests
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER']);
        
        // Get all inventory items for the branch
        $stmt = $pdo->prepare("
            SELECT
                bi.product_id,
                bi.quantity,
                bi.custom_price,
                p.name, p.generic_name, p.category, p.cost_price, p.base_price, p.unit, p.min_stock_level
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.branch_id = ?
            ORDER BY p.name
        ");
        $stmt->execute([$branchId]);
        $rows = $stmt->fetchAll();
        
        if (empty($rows)) {
            echo json_encode([]);
            return;
        }
        
        // Get all batches for the branch in a single query
        $productIds = array_column($rows, 'product_id');
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $batchStmt = $pdo->prepare("
            SELECT product_id, batch_number, expiry_date, quantity, status, supplier_id, supplier_name, restock_status, last_restock_date
            FROM drug_batches
            WHERE branch_id = ? AND product_id IN ($placeholders)
            ORDER BY product_id, expiry_date
        ");
        $batchStmt->execute(array_merge([$branchId], $productIds));
        $allBatches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group batches by product_id
        $batchesByProduct = [];
        foreach ($allBatches as $batch) {
            $productId = $batch['product_id'];
            if (!isset($batchesByProduct[$productId])) {
                $batchesByProduct[$productId] = [];
            }
            $batchesByProduct[$productId][] = [
                'batchNumber' => $batch['batch_number'],
                'expiryDate' => $batch['expiry_date'],
                'quantity' => (int)$batch['quantity'],
                'status' => $batch['status'],
                'supplierId' => $batch['supplier_id'] ?? null,
                'supplierName' => $batch['supplier_name'] ?? null,
                'restockStatus' => $batch['restock_status'] ?? null,
                'lastRestockDate' => $batch['last_restock_date'] ?? null
            ];
        }
        
        // Build inventory array
        $inventory = [];
        foreach ($rows as $row) {
            $productId = $row['product_id'];
            $inventory[] = [
                'productId' => $productId,
                'name' => $row['name'],
                'genericName' => $row['generic_name'],
                'category' => $row['category'],
                'quantity' => (int)$row['quantity'],
                'customPrice' => (float)$row['custom_price'],
                'costPrice' => (float)$row['cost_price'],
                'basePrice' => (float)$row['base_price'],
                'unit' => $row['unit'],
                'minStockLevel' => (int)$row['min_stock_level'],
                'batches' => $batchesByProduct[$productId] ?? []
            ];
        }
        
        echo json_encode($inventory);
    } catch (PDOException $e) {
        error_log('Failed to fetch branch inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database error: Unable to fetch inventory']);
    } catch (Exception $e) {
        error_log('Failed to fetch branch inventory: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function addStock() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $batchNumber = $input['batchNumber'] ?? '';
        $expiryDate = $input['expiryDate'] ?? '';
        $quantity = (int)($input['quantity'] ?? 0);
        $supplierId = $input['supplierId'] ?? null;
        $supplierName = $input['supplierName'] ?? null;
        $restockStatus = $input['restockStatus'] ?? 'RECEIVED';
        $lastRestockDate = date('Y-m-d H:i:s');

        $pdo->beginTransaction();

        // Validate core fields
        if (empty($branchId) || empty($productId) || $quantity <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'branchId, productId and quantity (>0) are required']);
            return;
        }

        // Upsert batch: if a batch with same branch/product/batch_number exists, update its quantity; otherwise insert
        $batchStmt = $pdo->prepare('SELECT id, quantity FROM drug_batches WHERE branch_id = ? AND product_id = ? AND batch_number = ? LIMIT 1');
        $batchStmt->execute([$branchId, $productId, $batchNumber]);
        $existingBatch = $batchStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingBatch) {
            $newQty = (int)$existingBatch['quantity'] + $quantity;
            if ($supplierName !== null) {
                $updateBatch = $pdo->prepare('UPDATE drug_batches SET quantity = ?, expiry_date = ?, status = ?, supplier_id = ?, supplier_name = ?, restock_status = ?, last_restock_date = ? WHERE id = ?');
                $updateBatch->execute([$newQty, $expiryDate, 'ACTIVE', $supplierId, $supplierName, $restockStatus, $lastRestockDate, $existingBatch['id']]);
            } else {
                $updateBatch = $pdo->prepare('UPDATE drug_batches SET quantity = ?, expiry_date = ?, status = ?, restock_status = ?, last_restock_date = ? WHERE id = ?');
                $updateBatch->execute([$newQty, $expiryDate, 'ACTIVE', $restockStatus, $lastRestockDate, $existingBatch['id']]);
            }
        } else {
            if ($supplierName !== null) {
                $ins = $pdo->prepare("INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, supplier_id, supplier_name, restock_status, last_restock_date) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)");
                $ins->execute([$branchId, $productId, $batchNumber, $expiryDate, $quantity, $supplierId, $supplierName, $restockStatus, $lastRestockDate]);
            } else {
                $ins = $pdo->prepare("INSERT INTO drug_batches (branch_id, product_id, batch_number, expiry_date, quantity, status, restock_status, last_restock_date) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)");
                $ins->execute([$branchId, $productId, $batchNumber, $expiryDate, $quantity, $restockStatus, $lastRestockDate]);
            }
        }

        // Update Total Quantity in branch_inventory (upsert)
        $stmt = $pdo->prepare("INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
        $stmt->execute([$branchId, $productId, $quantity]);

        $pdo->commit();
        echo json_encode(['message' => 'Stock added successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to add stock: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getTransfers() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'DISPENSER', 'PHARMACIST', 'STOREKEEPER']);
        $stmt = $pdo->query("SELECT * FROM stock_transfers ORDER BY date_sent DESC LIMIT 100");
        $rawTransfers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Transform database fields to match frontend interface
        $transfers = array_map(function($transfer) {
            $products = json_decode($transfer['products'], true);
            if ($products === null) {
                $products = [];
            }

            // Transform items to match TransferItem interface
            $items = array_map(function($product) {
                return [
                    'productId' => $product['productId'] ?? '',
                    'productName' => $product['productName'] ?? '',
                    'quantity' => (int)($product['quantity'] ?? 0),
                    'batchNumber' => $product['batchNumber'] ?? '',
                    'expiryDate' => $product['expiryDate'] ?? ''
                ];
            }, $products);

            return [
                'id' => $transfer['id'],
                'sourceBranchId' => $transfer['from_branch_id'],
                'targetBranchId' => $transfer['to_branch_id'],
                'dateSent' => $transfer['date_sent'],
                'dateReceived' => $transfer['date_received'],
                'items' => $items,
                'status' => $transfer['status'],
                'notes' => $transfer['notes'],
                'createdBy' => $transfer['created_by']
            ];
        }, $rawTransfers);

        echo json_encode($transfers);
    } catch (Exception $e) {
        error_log('Failed to fetch transfers: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch transfers']);
    }
}

function createTransfer() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        // All shipments are made from the main branch
        $stmt = $pdo->prepare('SELECT id FROM branches WHERE is_head_office = 1 LIMIT 1');
        $stmt->execute();
        $mainBranch = $stmt->fetch();
        $sourceBranchId = $mainBranch ? $mainBranch['id'] : 'HEAD_OFFICE';
        $targetBranchId = $input['targetBranchId'] ?? '';
        $items = $input['items'] ?? [];
        $notes = $input['notes'] ?? '';

        // Validate required fields
        if (empty($targetBranchId) || empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: targetBranchId and items are required']);
            return;
        }

        // Validate items array
        if (!is_array($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Items must be an array']);
            return;
        }

        foreach ($items as $item) {
            if (!isset($item['productId']) || !isset($item['quantity']) || $item['quantity'] <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid items data']);
                return;
            }
        }

        $itemsJson = json_encode($items);
        $createdBy = getCurrentUser()['id'] ?? null;

            // Generate transfer id (stock_transfers.id is a varchar primary key)
            $transferId = 'TRANSFER-' . str_replace('.', '', uniqid('', true));

            // Insert transfer (include id explicitly)
            $stmt = $pdo->prepare("
                INSERT INTO stock_transfers (id, from_branch_id, to_branch_id, products, status, notes, created_by, date_sent)
                VALUES (?, ?, ?, ?, 'IN_TRANSIT', ?, ?, NOW())
            ");
            $result = $stmt->execute([$transferId, $sourceBranchId, $targetBranchId, $itemsJson, $notes, $createdBy]);

        if (!$result) {
            $error = $stmt->errorInfo();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to insert transfer', 'db_error' => $error]);
            return;
        }

        // We generated the transfer id above; no auto-increment available

        // Return transfer data
        $transfer = [
            'id' => $transferId,
            'sourceBranchId' => $sourceBranchId,
            'targetBranchId' => $targetBranchId,
            'dateSent' => date('Y-m-d H:i:s'),
            'items' => $items,
            'status' => 'IN_TRANSIT',
            'notes' => $notes,
            'createdBy' => $createdBy
        ];

        echo json_encode($transfer);
    } catch (Exception $e) {
        error_log('Failed to create transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create transfer: ' . $e->getMessage()]);
    }
}

function adjustStock() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $adjustment = (int)($input['adjustment'] ?? 0);
        $reason = $input['reason'] ?? '';

        $pdo->beginTransaction();

        // Update inventory quantity
        $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity + ?) WHERE branch_id = ? AND product_id = ?');
        $stmt->execute([$adjustment, $branchId, $productId]);

        // Log the adjustment (assuming inventory_adjustments table exists)
        $user = getCurrentUser();
        $stmt = $pdo->prepare('INSERT INTO inventory_adjustments (branch_id, product_id, adjustment, reason, created_by) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$branchId, $productId, $adjustment, $reason, $user['id'] ?? null]);

        $pdo->commit();
        echo json_encode(['message' => 'Stock adjusted successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to adjust stock: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function verifyTransferByStoreKeeper($id) {
    global $pdo;

    try {
        authorizeRoles(['STOREKEEPER', 'INVENTORY_CONTROLLER', 'BRANCH_MANAGER', 'SUPER_ADMIN']);

        $user = getCurrentUser();

        // Get the transfer details
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $transfer = $stmt->fetch();

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            return;
        }

        if ($transfer['status'] !== 'IN_TRANSIT') {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer is not in transit']);
            return;
        }

        // Complete the transfer directly (simplified process)
        $pdo->beginTransaction();

        // Update transfer status
        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
        $stmt->execute(['COMPLETED', $id]);

        // Move stock from source to target branch
        $products = json_decode($transfer['products'], true);
        foreach ($products as $item) {
            // Deduct from source branch
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);

            // Add to target branch
            $stmt = $pdo->prepare("
                INSERT INTO branch_inventory (branch_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $stmt->execute([$transfer['to_branch_id'], $item['productId'], $item['quantity']]);

            // Move batches from source to target
            if (isset($item['batchNumber'])) {
                $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                $stmt->execute([$transfer['to_branch_id'], $transfer['from_branch_id'], $item['productId'], $item['batchNumber']]);
            }
        }

        $pdo->commit();

        // Return updated transfer data
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $updatedTransfer = $stmt->fetch(PDO::FETCH_ASSOC);

        // Transform to match frontend interface
        $products = json_decode($updatedTransfer['products'], true);
        if ($products === null) {
            $products = [];
        }

        $items = array_map(function($product) {
            return [
                'productId' => $product['productId'] ?? '',
                'productName' => $product['productName'] ?? '',
                'quantity' => (int)($product['quantity'] ?? 0),
                'batchNumber' => $product['batchNumber'] ?? '',
                'expiryDate' => $product['expiryDate'] ?? ''
            ];
        }, $products);

        $transformedTransfer = [
            'id' => $updatedTransfer['id'],
            'sourceBranchId' => $updatedTransfer['from_branch_id'],
            'targetBranchId' => $updatedTransfer['to_branch_id'],
            'dateSent' => $updatedTransfer['date_sent'],
            'dateReceived' => $updatedTransfer['date_received'],
            'items' => $items,
            'status' => $updatedTransfer['status'],
            'notes' => $updatedTransfer['notes'],
            'createdBy' => $updatedTransfer['created_by']
        ];

        echo json_encode($transformedTransfer);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to verify transfer by store keeper: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to complete transfer']);
    }
}

function verifyTransferByController($id) {
    global $pdo;

    try {
        authorizeRoles(['INVENTORY_CONTROLLER', 'BRANCH_MANAGER', 'SUPER_ADMIN']);

        $user = getCurrentUser();

        // Get the transfer details
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $transfer = $stmt->fetch();

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            return;
        }

        if ($transfer['status'] !== 'IN_TRANSIT') {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer is not in transit']);
            return;
        }

        // Complete the transfer directly (simplified process)
        $pdo->beginTransaction();

        // Update transfer status
        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
        $stmt->execute(['COMPLETED', $id]);

        // Move stock from source to target branch
        $products = json_decode($transfer['products'], true);
        foreach ($products as $item) {
            // Deduct from source branch
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);

            // Add to target branch
            $stmt = $pdo->prepare("
                INSERT INTO branch_inventory (branch_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $stmt->execute([$transfer['to_branch_id'], $item['productId'], $item['quantity']]);

            // Move batches from source to target
            if (isset($item['batchNumber'])) {
                $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                $stmt->execute([$transfer['to_branch_id'], $transfer['from_branch_id'], $item['productId'], $item['batchNumber']]);
            }
        }

        $pdo->commit();

        // Return updated transfer data
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $updatedTransfer = $stmt->fetch(PDO::FETCH_ASSOC);

        // Transform to match frontend interface
        $products = json_decode($updatedTransfer['products'], true);
        if ($products === null) {
            $products = [];
        }

        $items = array_map(function($product) {
            return [
                'productId' => $product['productId'] ?? '',
                'productName' => $product['productName'] ?? '',
                'quantity' => (int)($product['quantity'] ?? 0),
                'batchNumber' => $product['batchNumber'] ?? '',
                'expiryDate' => $product['expiryDate'] ?? ''
            ];
        }, $products);

        $transformedTransfer = [
            'id' => $updatedTransfer['id'],
            'sourceBranchId' => $updatedTransfer['from_branch_id'],
            'targetBranchId' => $updatedTransfer['to_branch_id'],
            'dateSent' => $updatedTransfer['date_sent'],
            'dateReceived' => $updatedTransfer['date_received'],
            'items' => $items,
            'status' => $updatedTransfer['status'],
            'notes' => $updatedTransfer['notes'],
            'createdBy' => $updatedTransfer['created_by']
        ];

        echo json_encode($transformedTransfer);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to verify transfer by controller: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to complete transfer']);
    }
}

function approveTransfer($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);

        $pdo->beginTransaction();

        // Get the transfer details
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $transfer = $stmt->fetch();

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            $pdo->rollBack();
            return;
        }

        if ($transfer['status'] !== 'IN_TRANSIT') {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer is not in transit']);
            $pdo->rollBack();
            return;
        }

        // Update transfer status
        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
        $stmt->execute(['COMPLETED', $id]);

        // Move stock from source to target branch
        $products = json_decode($transfer['products'], true);
        foreach ($products as $item) {
            // Deduct from source branch
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);

            // Add to target branch
            $stmt = $pdo->prepare("
                INSERT INTO branch_inventory (branch_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $stmt->execute([$transfer['to_branch_id'], $item['productId'], $item['quantity']]);

            // Move batches from source to target
            if (isset($item['batchNumber'])) {
                $stmt = $pdo->prepare('UPDATE drug_batches SET branch_id = ? WHERE branch_id = ? AND product_id = ? AND batch_number = ?');
                $stmt->execute([$transfer['to_branch_id'], $transfer['from_branch_id'], $item['productId'], $item['batchNumber']]);
            }
        }

        $pdo->commit();

        // Return updated transfer data
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ?');
        $stmt->execute([$id]);
        $updatedTransfer = $stmt->fetch(PDO::FETCH_ASSOC);

        // Transform to match frontend interface
        $products = json_decode($updatedTransfer['products'], true);
        if ($products === null) {
            $products = [];
        }

        $items = array_map(function($product) {
            return [
                'productId' => $product['productId'] ?? '',
                'productName' => $product['productName'] ?? '',
                'quantity' => (int)($product['quantity'] ?? 0),
                'batchNumber' => $product['batchNumber'] ?? '',
                'expiryDate' => $product['expiryDate'] ?? ''
            ];
        }, $products);

        $transformedTransfer = [
            'id' => $updatedTransfer['id'],
            'sourceBranchId' => $updatedTransfer['from_branch_id'],
            'targetBranchId' => $updatedTransfer['to_branch_id'],
            'dateSent' => $updatedTransfer['date_sent'],
            'dateReceived' => $updatedTransfer['date_received'],
            'items' => $items,
            'status' => $updatedTransfer['status'],
            'notes' => $updatedTransfer['notes'],
            'createdBy' => $updatedTransfer['created_by']
        ];

        echo json_encode($transformedTransfer);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to approve transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to approve transfer']);
    }
}

function updateInventoryItem($branchId, $productId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $pdo->beginTransaction();

        $updates = [];
        $values = [];

        if (isset($input['customPrice']) || isset($input['costPrice']) || isset($input['basePrice'])) {
            if (isset($input['customPrice'])) {
                $updates[] = 'custom_price = ?';
                $values[] = $input['customPrice'];
            }
            if (isset($input['costPrice'])) {
                // Update product cost price
                $costStmt = $pdo->prepare('UPDATE products SET cost_price = ? WHERE id = ?');
                $costStmt->execute([$input['costPrice'], $productId]);
            }
            if (isset($input['basePrice'])) {
                // Update product base price
                $sellStmt = $pdo->prepare('UPDATE products SET base_price = ? WHERE id = ?');
                $sellStmt->execute([$input['basePrice'], $productId]);
            }
        }

        if (isset($input['quantity'])) {
            $updates[] = 'quantity = ?';
            $values[] = $input['quantity'];
        } elseif (isset($input['adjustment'])) {
            $updates[] = 'quantity = GREATEST(0, quantity + ?)';
            $values[] = $input['adjustment'];
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            $pdo->rollBack();
            return;
        }

        // Build the upsert query for MySQL
        $insertFields = ['branch_id', 'product_id'];
        $insertValues = [$branchId, $productId];
        $updateParts = [];

        if (isset($input['quantity'])) {
            $insertFields[] = 'quantity';
            $insertValues[] = $input['quantity'];
            $updateParts[] = 'quantity = VALUES(quantity)';
        } elseif (isset($input['adjustment'])) {
            // For adjustment, we need to handle it differently since MySQL doesn't support expressions in ON DUPLICATE KEY
            // We'll do a separate UPDATE if adjustment is provided
            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity + ?) WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$input['adjustment'], $branchId, $productId]);
            unset($input['adjustment']); // Remove so it's not processed again
        }

        if (isset($input['customPrice'])) {
            $insertFields[] = 'custom_price';
            $insertValues[] = $input['customPrice'];
            $updateParts[] = 'custom_price = VALUES(custom_price)';
        }

        // Handle cost and sell price updates for products table
        if (isset($input['costPrice'])) {
            $costStmt = $pdo->prepare('UPDATE products SET cost_price = ? WHERE id = ?');
            $costStmt->execute([$input['costPrice'], $productId]);
        }

        if (isset($input['basePrice'])) {
            $sellStmt = $pdo->prepare('UPDATE products SET base_price = ? WHERE id = ?');
            $sellStmt->execute([$input['basePrice'], $productId]);
        }

        if (!empty($updateParts)) {
            $placeholders = str_repeat('?,', count($insertValues) - 1) . '?';
            $query = "
                INSERT INTO branch_inventory (" . implode(', ', $insertFields) . ")
                VALUES ($placeholders)
                ON DUPLICATE KEY UPDATE " . implode(', ', $updateParts) . "
            ";

            $stmt = $pdo->prepare($query);
            $stmt->execute($insertValues);
        }

        // Get the updated record
        $stmt = $pdo->prepare('SELECT * FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
        $stmt->execute([$branchId, $productId]);
        $result = $stmt->fetch();

        if (!$result) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update inventory item']);
            return;
        }

        $pdo->commit();
        echo json_encode($result);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to update inventory item: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function verifyTransfer() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $transferId = $input['transferId'] ?? '';
        $verificationCode = $input['verificationCode'] ?? '';

        // Placeholder implementation
        echo json_encode(['message' => 'Transfer verification endpoint - requires implementation']);
    } catch (Exception $e) {
        error_log('Failed to verify transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
