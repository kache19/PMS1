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
        if (
            $action === 'transfers'
            || str_contains($path, '/inventory/transfers')
            || (isset($_GET['subpath']) && $_GET['subpath'] === 'transfers')
        ) {
            getTransfers();
            break;
        }
        // Support both path-based (/api/inventory/BR002) and query-based (/api/inventory?id=BR002) routing
        $branchId = $id ?: ($_GET['id'] ?? null);
        if ($branchId) {
            getBranchInventory($branchId);
        } else {
            getAllInventory();
        }
        break;
    case 'POST':
        if ($id && str_contains($path, '/verify-storekeeper')) {
            verifyTransferByStoreKeeper($id);
        } elseif ($id && str_contains($path, '/verify-controller')) {
            verifyTransferByController($id);
        } elseif ($id && str_contains($path, '/reject')) {
            rejectTransfer($id);
        } elseif ($id && str_contains($path, '/approve')) {
            approveTransfer($id);
        // Accept both singular 'transfer' and plural 'transfers' (frontend uses 'inventory/transfers')
        } elseif ($action === 'transfer' || $action === 'transfers' || $path === '/inventory/transfers' || (isset($_GET['subpath']) && $_GET['subpath'] === 'transfers')) {
            createTransfer();
        } elseif ($action === 'addStockBulk' || $action === 'addBulk') {
            addStockBulk();
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
        } elseif ($id && $id2) {
            updateInventoryItem($id, $id2);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Missing inventory identifiers']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function transformTransferRow(array $transfer): array {
    $products = json_decode($transfer['products'] ?? '[]', true);
    if (!is_array($products)) {
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

    $verifiedBy = [];
    if (!empty($transfer['storekeeper_verified']) || !empty($transfer['storekeeper_verified_by']) || !empty($transfer['storekeeper_verified_at'])) {
        $verifiedBy['storeKeeper'] = [
            'userId' => (string)($transfer['storekeeper_verified_by'] ?? ''),
            'userName' => $transfer['storekeeper_name'] ?? 'Store Keeper',
            'timestamp' => $transfer['storekeeper_verified_at'] ?? null
        ];
    }
    if (!empty($transfer['controller_verified']) || !empty($transfer['controller_verified_by']) || !empty($transfer['controller_verified_at'])) {
        $verifiedBy['inventoryController'] = [
            'userId' => (string)($transfer['controller_verified_by'] ?? ''),
            'userName' => $transfer['controller_name'] ?? 'Inventory Controller',
            'timestamp' => $transfer['controller_verified_at'] ?? null
        ];
    }

    return [
        'id' => $transfer['id'],
        'sourceBranchId' => $transfer['from_branch_id'],
        'targetBranchId' => $transfer['to_branch_id'],
        'dateSent' => $transfer['date_sent'] ?? $transfer['created_at'],
        'dateReceived' => $transfer['date_received'],
        'items' => $items,
        'status' => $transfer['status'],
        'notes' => $transfer['notes'],
        'createdBy' => $transfer['created_by'],
        'verifiedBy' => $verifiedBy
    ];
}

function getTransferByIdDetailed(string $id): ?array {
    global $pdo;
    $canJoinStorekeeper = tableHasColumn('stock_transfers', 'storekeeper_verified_by');
    $canJoinController = tableHasColumn('stock_transfers', 'controller_verified_by');
    $storekeeperJoin = $canJoinStorekeeper ? 'LEFT JOIN staff sk ON sk.id = t.storekeeper_verified_by' : '';
    $controllerJoin = $canJoinController ? 'LEFT JOIN staff ic ON ic.id = t.controller_verified_by' : '';
    $storekeeperName = $canJoinStorekeeper ? 'sk.name AS storekeeper_name' : 'NULL AS storekeeper_name';
    $controllerName = $canJoinController ? 'ic.name AS controller_name' : 'NULL AS controller_name';
    $stmt = $pdo->prepare("
        SELECT t.*,
               $storekeeperName,
               $controllerName
        FROM stock_transfers t
        $storekeeperJoin
        $controllerJoin
        WHERE t.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function tableHasColumn(string $tableName, string $columnName): bool {
    global $pdo;
    static $columnCache = [];

    $cacheKey = $tableName . '.' . $columnName;
    if (array_key_exists($cacheKey, $columnCache)) {
        return $columnCache[$cacheKey];
    }

    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS c
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ");
    $stmt->execute([$tableName, $columnName]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $columnCache[$cacheKey] = ((int)($result['c'] ?? 0) > 0);

    return $columnCache[$cacheKey];
}

function drugBatchSelectColumns(): string {
    $cols = ['batch_number', 'expiry_date', 'quantity', 'status'];
    $cols[] = tableHasColumn('drug_batches', 'supplier_id') ? 'supplier_id' : 'NULL AS supplier_id';
    $cols[] = tableHasColumn('drug_batches', 'supplier_name') ? 'supplier_name' : 'NULL AS supplier_name';
    $cols[] = tableHasColumn('drug_batches', 'restock_status') ? 'restock_status' : 'NULL AS restock_status';
    $cols[] = tableHasColumn('drug_batches', 'last_restock_date') ? 'last_restock_date' : 'NULL AS last_restock_date';
    return implode(', ', $cols);
}

function enumColumnAllowsValue(string $tableName, string $columnName, string $targetValue): bool {
    global $pdo;
    static $enumCache = [];

    $cacheKey = $tableName . '.' . $columnName . '.' . $targetValue;
    if (array_key_exists($cacheKey, $enumCache)) {
        return $enumCache[$cacheKey];
    }

    $stmt = $pdo->prepare("
        SELECT DATA_TYPE, COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$tableName, $columnName]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $enumCache[$cacheKey] = false;
        return false;
    }

    $dataType = strtolower((string)($row['DATA_TYPE'] ?? ''));
    $columnType = (string)($row['COLUMN_TYPE'] ?? '');
    if ($dataType !== 'enum') {
        $enumCache[$cacheKey] = true;
        return true;
    }

    $allowed = stripos($columnType, "'" . addslashes($targetValue) . "'") !== false;
    $enumCache[$cacheKey] = $allowed;
    return $allowed;
}

function ensureEnumColumnValue(string $tableName, string $columnName, string $targetValue): bool {
    global $pdo;

    if (enumColumnAllowsValue($tableName, $columnName, $targetValue)) {
        return true;
    }

    $stmt = $pdo->prepare("
        SELECT COLUMN_TYPE, COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$tableName, $columnName]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return false;

    $columnType = (string)($row['COLUMN_TYPE'] ?? '');
    if (stripos($columnType, 'enum(') !== 0) {
        return false;
    }

    preg_match_all("/'((?:[^'\\\\]|\\\\.)*)'/", $columnType, $matches);
    $values = array_map(static function($v) {
        return stripcslashes($v);
    }, $matches[1] ?? []);
    if (!in_array($targetValue, $values, true)) {
        $values[] = $targetValue;
    }
    if (empty($values)) return false;

    $quotedValues = array_map(static function($v) use ($pdo) {
        return $pdo->quote($v);
    }, $values);
    $default = $row['COLUMN_DEFAULT'];
    $defaultSql = '';
    if ($default !== null && in_array((string)$default, $values, true)) {
        $defaultSql = ' DEFAULT ' . $pdo->quote((string)$default);
    }

    $alterSql = "ALTER TABLE `$tableName` MODIFY `$columnName` ENUM(" . implode(', ', $quotedValues) . ")" . $defaultSql;
    $pdo->exec($alterSql);

    return enumColumnAllowsValue($tableName, $columnName, $targetValue);
}

function nextTransferSequenceId(): string {
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
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $next = ((int)($row['max_num'] ?? 0)) + 1;
    return 'TRANS-' . str_pad((string)$next, 4, '0', STR_PAD_LEFT);
}

function getNextInventoryInvoiceSequence(string $prefix): int {
    global $pdo;

    $startPos = strlen($prefix) + 1;
    $regex = '^' . preg_quote($prefix, '/') . '[0-9]{4}$';
    $stmt = $pdo->prepare("
        SELECT COALESCE(MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)), 0) AS max_num
        FROM invoices
        WHERE id REGEXP ?
    ");
    $stmt->execute([$startPos, $regex]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return ((int)($row['max_num'] ?? 0)) + 1;
}

function generateNextRestockInvoiceNumber(): string {
    $prefix = 'INV-RST-';
    $nextNumber = getNextInventoryInvoiceSequence($prefix);
    return $prefix . str_pad((string)$nextNumber, 4, '0', STR_PAD_LEFT);
}

function generateBatchNumber(int $offset = 0): string {
    global $pdo;
    static $baseSequence = null;

    if ($baseSequence === null) {
        $stmt = $pdo->query("
            SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number, 7, 5) AS UNSIGNED)), -1) AS max_num
            FROM drug_batches
            WHERE batch_number REGEXP '^BATCH-[0-9]{5}$'
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $baseSequence = ((int)($row['max_num'] ?? -1)) + 1;
    }

    $value = ($baseSequence + $offset) % 100000;
    return 'BATCH-' . str_pad((string)$value, 5, '0', STR_PAD_LEFT);
}

function insertRestockInvoice(
    string $invoiceId,
    string $branchId,
    string $customerName,
    float $totalAmount,
    ?string $description,
    string $itemsJson
): void {
    global $pdo;

    $columns = ['id', 'branch_id', 'customer_name', 'total_amount', 'paid_amount', 'status', 'due_date', 'description', 'source', 'items'];
    $placeholders = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
    $params = [$invoiceId, $branchId, $customerName, $totalAmount, 0, 'UNPAID', null, $description, 'RESTOCK', $itemsJson];

    if (tableHasColumn('invoices', 'customer_phone')) {
        $columns[] = 'customer_phone';
        $placeholders[] = '?';
        $params[] = '';
    }
    if (tableHasColumn('invoices', 'archived')) {
        $columns[] = 'archived';
        $placeholders[] = '?';
        $params[] = 0;
    }

    $columns[] = 'created_at';
    $placeholders[] = 'NOW()';

    $stmt = $pdo->prepare('
        INSERT INTO invoices (' . implode(', ', $columns) . ')
        VALUES (' . implode(', ', $placeholders) . ')
    ');
    $ok = $stmt->execute($params);

    if (!$ok) {
        $err = $stmt->errorInfo();
        throw new Exception('Failed to create restock invoice: ' . json_encode($err));
    }
}

function getAllInventory() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);

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
            $batchSelectColumns = drugBatchSelectColumns();
            $batchStmt = $pdo->prepare("
                SELECT $batchSelectColumns
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
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'STOREKEEPER', 'DISPENSER', 'PHARMACIST']);

        $normalizeBranchId = static function($value) {
            return strtoupper(trim((string)$value));
        };
        $branchIdsMatch = static function($a, $b) use ($normalizeBranchId) {
            $aRaw = $normalizeBranchId($a);
            $bRaw = $normalizeBranchId($b);
            if ($aRaw === '' || $bRaw === '') return false;
            if ($aRaw === $bRaw) return true;

            $aVariants = [$aRaw];
            $bVariants = [$bRaw];

            if (preg_match('/^BR0*(\d+)$/', $aRaw, $m)) $aVariants[] = (string)((int)$m[1]);
            if (preg_match('/^\d+$/', $aRaw)) $aVariants[] = 'BR' . str_pad((string)((int)$aRaw), 3, '0', STR_PAD_LEFT);
            if (preg_match('/^BR0*(\d+)$/', $bRaw, $m)) $bVariants[] = (string)((int)$m[1]);
            if (preg_match('/^\d+$/', $bRaw)) $bVariants[] = 'BR' . str_pad((string)((int)$bRaw), 3, '0', STR_PAD_LEFT);

            return count(array_intersect($aVariants, $bVariants)) > 0;
        };

        $role = strtoupper((string)($user['role'] ?? ''));
        $isScopedReadRole = in_array($role, ['DISPENSER', 'PHARMACIST'], true);
        if ($isScopedReadRole && !$branchIdsMatch($user['branch_id'] ?? '', $branchId)) {
            http_response_code(403);
            echo json_encode(['error' => 'You can only access inventory for your assigned branch']);
            return;
        }
        
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
        $batchSelectColumns = drugBatchSelectColumns();
        $batchStmt = $pdo->prepare("
            SELECT product_id, $batchSelectColumns
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
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $batchNumber = trim((string)($input['batchNumber'] ?? ''));
        if ($batchNumber === '') {
            $batchNumber = generateBatchNumber();
        }
        $expiryDate = $input['expiryDate'] ?? '';
        $quantity = (int)($input['quantity'] ?? 0);
        $supplierId = $input['supplierId'] ?? null;
        $supplierName = $input['supplierName'] ?? null;
        $restockStatus = $input['restockStatus'] ?? 'RECEIVED';
        $lastRestockDate = date('Y-m-d H:i:s');
        $costPriceRaw = $input['costPrice'] ?? null;
        $sellingPriceRaw = $input['sellingPrice'] ?? ($input['basePrice'] ?? null);
        $costPrice = ($costPriceRaw === '' || $costPriceRaw === null) ? null : (float)$costPriceRaw;
        $sellingPrice = ($sellingPriceRaw === '' || $sellingPriceRaw === null) ? null : (float)$sellingPriceRaw;
        $normalizedRole = strtoupper((string)($user['role'] ?? ''));
        if ($normalizedRole === 'BRANCH_MANAGER') {
            // Branch managers can restock, but cannot update buying/selling prices.
            $costPrice = null;
            $sellingPrice = null;
        }

        $pdo->beginTransaction();

        // Validate core fields
        if (empty($branchId) || empty($productId) || $quantity <= 0) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(400);
            echo json_encode(['error' => 'branchId, productId and quantity (>0) are required']);
            return;
        }
        if ($costPrice !== null && $costPrice < 0) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(400);
            echo json_encode(['error' => 'costPrice cannot be negative']);
            return;
        }
        if ($sellingPrice !== null && $sellingPrice < 0) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(400);
            echo json_encode(['error' => 'sellingPrice cannot be negative']);
            return;
        }

        $productStmt = $pdo->prepare('SELECT id, name, cost_price, base_price FROM products WHERE id = ? LIMIT 1');
        $productStmt->execute([$productId]);
        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
        if (!$product) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
            return;
        }

        if ($costPrice !== null || $sellingPrice !== null) {
            $priceSetParts = [];
            $priceSetParams = [];
            if ($costPrice !== null) {
                $priceSetParts[] = 'cost_price = ?';
                $priceSetParams[] = $costPrice;
            }
            if ($sellingPrice !== null) {
                $priceSetParts[] = 'base_price = ?';
                $priceSetParams[] = $sellingPrice;
            }
            $priceSetParams[] = $productId;
            $updateProductPrices = $pdo->prepare('UPDATE products SET ' . implode(', ', $priceSetParts) . ' WHERE id = ?');
            $updateProductPrices->execute($priceSetParams);
        }

        $resolvedCostPrice = $costPrice !== null ? $costPrice : (float)($product['cost_price'] ?? 0);
        $resolvedSellingPrice = $sellingPrice !== null ? $sellingPrice : (float)($product['base_price'] ?? 0);
        $productName = (string)($product['name'] ?? $productId);

        // Upsert batch: if a batch with same branch/product/batch_number exists, update its quantity; otherwise insert
        $batchStmt = $pdo->prepare('SELECT id, quantity FROM drug_batches WHERE branch_id = ? AND product_id = ? AND batch_number = ? LIMIT 1');
        $batchStmt->execute([$branchId, $productId, $batchNumber]);
        $existingBatch = $batchStmt->fetch(PDO::FETCH_ASSOC);

        $hasSupplierIdColumn = tableHasColumn('drug_batches', 'supplier_id');
        $hasSupplierNameColumn = tableHasColumn('drug_batches', 'supplier_name');
        $hasRestockStatusColumn = tableHasColumn('drug_batches', 'restock_status');
        $hasLastRestockDateColumn = tableHasColumn('drug_batches', 'last_restock_date');

        if ($existingBatch) {
            $newQty = (int)$existingBatch['quantity'] + $quantity;
            $setParts = ['quantity = ?', 'expiry_date = ?', 'status = ?'];
            $setParams = [$newQty, $expiryDate, 'ACTIVE'];

            if ($hasSupplierIdColumn && $supplierId !== null && $supplierId !== '') {
                $setParts[] = 'supplier_id = ?';
                $setParams[] = $supplierId;
            }
            if ($hasSupplierNameColumn && $supplierName !== null) {
                $setParts[] = 'supplier_name = ?';
                $setParams[] = $supplierName;
            }
            if ($hasRestockStatusColumn) {
                $setParts[] = 'restock_status = ?';
                $setParams[] = $restockStatus;
            }
            if ($hasLastRestockDateColumn) {
                $setParts[] = 'last_restock_date = ?';
                $setParams[] = $lastRestockDate;
            }

            $setParams[] = $existingBatch['id'];
            $updateBatch = $pdo->prepare('UPDATE drug_batches SET ' . implode(', ', $setParts) . ' WHERE id = ?');
            $updateBatch->execute($setParams);
        } else {
            $insertColumns = ['branch_id', 'product_id', 'batch_number', 'expiry_date', 'quantity', 'status'];
            $insertPlaceholders = ['?', '?', '?', '?', '?', "'ACTIVE'"];
            $insertParams = [$branchId, $productId, $batchNumber, $expiryDate, $quantity];

            if ($hasSupplierIdColumn && $supplierId !== null && $supplierId !== '') {
                $insertColumns[] = 'supplier_id';
                $insertPlaceholders[] = '?';
                $insertParams[] = $supplierId;
            }
            if ($hasSupplierNameColumn && $supplierName !== null) {
                $insertColumns[] = 'supplier_name';
                $insertPlaceholders[] = '?';
                $insertParams[] = $supplierName;
            }
            if ($hasRestockStatusColumn) {
                $insertColumns[] = 'restock_status';
                $insertPlaceholders[] = '?';
                $insertParams[] = $restockStatus;
            }
            if ($hasLastRestockDateColumn) {
                $insertColumns[] = 'last_restock_date';
                $insertPlaceholders[] = '?';
                $insertParams[] = $lastRestockDate;
            }

            $ins = $pdo->prepare(
                'INSERT INTO drug_batches (' . implode(', ', $insertColumns) . ') VALUES (' . implode(', ', $insertPlaceholders) . ')'
            );
            $ins->execute($insertParams);
        }

        // Update Total Quantity in branch_inventory (upsert)
        $stmt = $pdo->prepare("INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
        $stmt->execute([$branchId, $productId, $quantity]);

        $invoiceId = generateNextRestockInvoiceNumber();
        $invoiceItems = [[
            'id' => $productId,
            'name' => $productName,
            'quantity' => $quantity,
            'costPrice' => $resolvedCostPrice,
            'price' => $resolvedSellingPrice,
            'total' => $resolvedCostPrice * $quantity,
            'batchNumber' => $batchNumber,
            'expiryDate' => $expiryDate,
            'supplierName' => $supplierName
        ]];
        $invoiceItemsJson = json_encode($invoiceItems);
        if ($invoiceItemsJson === false) {
            throw new Exception('Failed to encode restock invoice items');
        }
        $invoiceCustomerName = $supplierName ?: 'Inventory Restock';
        $invoiceDescription = 'Restock Invoice - Product: ' . $productName . ' (Qty: ' . $quantity . ')' . ($batchNumber ? ' Batch: ' . $batchNumber : '');
        $invoiceTotal = $resolvedCostPrice * $quantity;
        insertRestockInvoice($invoiceId, $branchId, $invoiceCustomerName, $invoiceTotal, $invoiceDescription, $invoiceItemsJson);

        $pdo->commit();
        echo json_encode([
            'message' => 'Stock added successfully',
            'invoiceId' => $invoiceId,
            'invoiceTotal' => $invoiceTotal
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to add stock: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function addStockBulk() {
    global $pdo;

    try {
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER', 'STOREKEEPER']);
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $branchId = $input['branchId'] ?? '';
        $items = $input['items'] ?? [];
        $supplierId = $input['supplierId'] ?? null;
        $supplierName = $input['supplierName'] ?? null;
        $restockStatus = $input['restockStatus'] ?? 'RECEIVED';
        $lastRestockDate = date('Y-m-d H:i:s');

        if (empty($branchId) || !is_array($items) || count($items) === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'branchId and non-empty items array are required']);
            return;
        }

        $pdo->beginTransaction();

        $hasSupplierIdColumn = tableHasColumn('drug_batches', 'supplier_id');
        $hasSupplierNameColumn = tableHasColumn('drug_batches', 'supplier_name');
        $hasRestockStatusColumn = tableHasColumn('drug_batches', 'restock_status');
        $hasLastRestockDateColumn = tableHasColumn('drug_batches', 'last_restock_date');
        $normalizedRole = strtoupper((string)($user['role'] ?? ''));

        $invoiceItems = [];
        $invoiceTotal = 0.0;
        $processedCount = 0;

        foreach ($items as $index => $item) {
            $productId = $item['productId'] ?? '';
            $quantity = (int)($item['quantity'] ?? 0);
            $batchNumber = trim((string)($item['batchNumber'] ?? ''));
            if ($batchNumber === '') {
                $batchNumber = generateBatchNumber($index);
            }
            $expiryDate = $item['expiryDate'] ?? '';
            $costPriceRaw = $item['costPrice'] ?? null;
            $sellingPriceRaw = $item['sellingPrice'] ?? ($item['basePrice'] ?? null);
            $costPrice = ($costPriceRaw === '' || $costPriceRaw === null) ? null : (float)$costPriceRaw;
            $sellingPrice = ($sellingPriceRaw === '' || $sellingPriceRaw === null) ? null : (float)$sellingPriceRaw;
            if ($normalizedRole === 'BRANCH_MANAGER') {
                $costPrice = null;
                $sellingPrice = null;
            }

            if (empty($productId) || $quantity <= 0) {
                throw new Exception('Each item requires productId and quantity (>0)');
            }
            if ($costPrice !== null && $costPrice < 0) {
                throw new Exception('costPrice cannot be negative');
            }
            if ($sellingPrice !== null && $sellingPrice < 0) {
                throw new Exception('sellingPrice cannot be negative');
            }

            $productStmt = $pdo->prepare('SELECT id, name, cost_price, base_price FROM products WHERE id = ? LIMIT 1');
            $productStmt->execute([$productId]);
            $product = $productStmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) {
                throw new Exception('Product not found: ' . $productId);
            }

            if ($costPrice !== null || $sellingPrice !== null) {
                $priceSetParts = [];
                $priceSetParams = [];
                if ($costPrice !== null) {
                    $priceSetParts[] = 'cost_price = ?';
                    $priceSetParams[] = $costPrice;
                }
                if ($sellingPrice !== null) {
                    $priceSetParts[] = 'base_price = ?';
                    $priceSetParams[] = $sellingPrice;
                }
                $priceSetParams[] = $productId;
                $updateProductPrices = $pdo->prepare('UPDATE products SET ' . implode(', ', $priceSetParts) . ' WHERE id = ?');
                $updateProductPrices->execute($priceSetParams);
            }

            $resolvedCostPrice = $costPrice !== null ? $costPrice : (float)($product['cost_price'] ?? 0);
            $resolvedSellingPrice = $sellingPrice !== null ? $sellingPrice : (float)($product['base_price'] ?? 0);
            $productName = (string)($product['name'] ?? $productId);

            $batchStmt = $pdo->prepare('SELECT id, quantity FROM drug_batches WHERE branch_id = ? AND product_id = ? AND batch_number = ? LIMIT 1');
            $batchStmt->execute([$branchId, $productId, $batchNumber]);
            $existingBatch = $batchStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingBatch) {
                $newQty = (int)$existingBatch['quantity'] + $quantity;
                $setParts = ['quantity = ?', 'expiry_date = ?', 'status = ?'];
                $setParams = [$newQty, $expiryDate, 'ACTIVE'];

                if ($hasSupplierIdColumn && $supplierId !== null && $supplierId !== '') {
                    $setParts[] = 'supplier_id = ?';
                    $setParams[] = $supplierId;
                }
                if ($hasSupplierNameColumn && $supplierName !== null) {
                    $setParts[] = 'supplier_name = ?';
                    $setParams[] = $supplierName;
                }
                if ($hasRestockStatusColumn) {
                    $setParts[] = 'restock_status = ?';
                    $setParams[] = $restockStatus;
                }
                if ($hasLastRestockDateColumn) {
                    $setParts[] = 'last_restock_date = ?';
                    $setParams[] = $lastRestockDate;
                }

                $setParams[] = $existingBatch['id'];
                $updateBatch = $pdo->prepare('UPDATE drug_batches SET ' . implode(', ', $setParts) . ' WHERE id = ?');
                $updateBatch->execute($setParams);
            } else {
                $insertColumns = ['branch_id', 'product_id', 'batch_number', 'expiry_date', 'quantity', 'status'];
                $insertPlaceholders = ['?', '?', '?', '?', '?', "'ACTIVE'"];
                $insertParams = [$branchId, $productId, $batchNumber, $expiryDate, $quantity];

                if ($hasSupplierIdColumn && $supplierId !== null && $supplierId !== '') {
                    $insertColumns[] = 'supplier_id';
                    $insertPlaceholders[] = '?';
                    $insertParams[] = $supplierId;
                }
                if ($hasSupplierNameColumn && $supplierName !== null) {
                    $insertColumns[] = 'supplier_name';
                    $insertPlaceholders[] = '?';
                    $insertParams[] = $supplierName;
                }
                if ($hasRestockStatusColumn) {
                    $insertColumns[] = 'restock_status';
                    $insertPlaceholders[] = '?';
                    $insertParams[] = $restockStatus;
                }
                if ($hasLastRestockDateColumn) {
                    $insertColumns[] = 'last_restock_date';
                    $insertPlaceholders[] = '?';
                    $insertParams[] = $lastRestockDate;
                }

                $ins = $pdo->prepare(
                    'INSERT INTO drug_batches (' . implode(', ', $insertColumns) . ') VALUES (' . implode(', ', $insertPlaceholders) . ')'
                );
                $ins->execute($insertParams);
            }

            $invUpsert = $pdo->prepare("INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
            $invUpsert->execute([$branchId, $productId, $quantity]);

            $lineTotal = $resolvedCostPrice * $quantity;
            $invoiceTotal += $lineTotal;
            $invoiceItems[] = [
                'id' => $productId,
                'name' => $productName,
                'quantity' => $quantity,
                'costPrice' => $resolvedCostPrice,
                'price' => $resolvedSellingPrice,
                'total' => $lineTotal,
                'batchNumber' => $batchNumber,
                'expiryDate' => $expiryDate,
                'supplierName' => $supplierName
            ];
            $processedCount++;
        }

        if ($processedCount <= 0) {
            throw new Exception('No valid items were processed');
        }

        $invoiceId = generateNextRestockInvoiceNumber();
        $invoiceItemsJson = json_encode($invoiceItems);
        if ($invoiceItemsJson === false) {
            throw new Exception('Failed to encode restock invoice items');
        }
        $invoiceCustomerName = $supplierName ?: 'Inventory Restock';
        $invoiceDescription = 'Restock Invoice - ' . $processedCount . ' product(s)';
        insertRestockInvoice($invoiceId, $branchId, $invoiceCustomerName, $invoiceTotal, $invoiceDescription, $invoiceItemsJson);

        $pdo->commit();
        echo json_encode([
            'message' => 'Stock added successfully',
            'invoiceId' => $invoiceId,
            'invoiceTotal' => $invoiceTotal,
            'itemsCount' => $processedCount
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to add stock in bulk: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getTransfers() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'INVENTORY_CONTROLLER', 'DISPENSER', 'PHARMACIST', 'STOREKEEPER', 'AUDITOR']);
        $canJoinStorekeeper = tableHasColumn('stock_transfers', 'storekeeper_verified_by');
        $canJoinController = tableHasColumn('stock_transfers', 'controller_verified_by');
        $storekeeperJoin = $canJoinStorekeeper ? 'LEFT JOIN staff sk ON sk.id = t.storekeeper_verified_by' : '';
        $controllerJoin = $canJoinController ? 'LEFT JOIN staff ic ON ic.id = t.controller_verified_by' : '';
        $storekeeperName = $canJoinStorekeeper ? 'sk.name AS storekeeper_name' : 'NULL AS storekeeper_name';
        $controllerName = $canJoinController ? 'ic.name AS controller_name' : 'NULL AS controller_name';
        $stmt = $pdo->query("
            SELECT t.*,
                   $storekeeperName,
                   $controllerName
            FROM stock_transfers t
            $storekeeperJoin
            $controllerJoin
            ORDER BY COALESCE(t.date_sent, t.created_at) DESC
            LIMIT 500
        ");
        $rawTransfers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $transfers = array_map('transformTransferRow', $rawTransfers);

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

            // Generate transfer id as 4-digit incrementing sequence: 0001, 0002, ...
            $transferId = nextTransferSequenceId();

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
        // Step 1: physical receipt must be done by Storekeeper (or Super Admin override).
        authorizeRoles(['STOREKEEPER', 'SUPER_ADMIN']);

        $user = getCurrentUser();

        $transfer = getTransferByIdDetailed($id);

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            return;
        }

        $currentStatus = strtoupper((string)($transfer['status'] ?? ''));
        $storeKeeperVerified = !empty($transfer['storekeeper_verified'])
            || !empty($transfer['storekeeper_verified_by'])
            || !empty($transfer['storekeeper_verified_at']);
        // Idempotent behavior.
        if ($currentStatus === 'COMPLETED') {
            $existing = transformTransferRow($transfer);
            $existing['message'] = 'Transfer already fully verified';
            echo json_encode($existing);
            return;
        }
        if ($storeKeeperVerified) {
            $existing = transformTransferRow($transfer);
            $existing['message'] = 'Transfer already verified by storekeeper';
            echo json_encode($existing);
            return;
        }

        // Accept common pre-receipt states before storekeeper confirmation.
        if (!in_array($currentStatus, ['IN_TRANSIT', 'PENDING', 'APPROVED', 'RECEIVED_KEEPER'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer is not ready for storekeeper verification']);
            return;
        }

        // Complete the transfer directly (simplified process)
        $pdo->beginTransaction();

        // Step 1 verification. Persist as RECEIVED_KEEPER so status survives reloads
        // even on older schemas without explicit verification columns.
        $nextStatus = enumColumnAllowsValue('stock_transfers', 'status', 'RECEIVED_KEEPER')
            ? 'RECEIVED_KEEPER'
            : 'IN_TRANSIT';
        $setParts = ['status = ?'];
        $params = [$nextStatus];
        if (tableHasColumn('stock_transfers', 'storekeeper_verified')) {
            $setParts[] = 'storekeeper_verified = 1';
        }
        if (tableHasColumn('stock_transfers', 'storekeeper_verified_by')) {
            $setParts[] = 'storekeeper_verified_by = ?';
            $params[] = $user['id'] ?? null;
        }
        if (tableHasColumn('stock_transfers', 'storekeeper_verified_at')) {
            $setParts[] = 'storekeeper_verified_at = NOW()';
        }
        if (tableHasColumn('stock_transfers', 'date_received')) {
            $setParts[] = 'date_received = COALESCE(date_received, NOW())';
        }
        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE stock_transfers SET ' . implode(', ', $setParts) . ' WHERE id = ?');
        $stmt->execute($params);

        // Keep shipment workflow in sync so status is persisted and visible after reload.
        $shipmentStmt = $pdo->prepare('
            UPDATE shipments
            SET status = CASE
                WHEN status IN (\'PENDING\', \'APPROVED\') THEN \'IN_TRANSIT\'
                ELSE status
            END
            WHERE transfer_id = ?
        ');
        $shipmentStmt->execute([$id]);

        $pdo->commit();

        $updatedTransfer = getTransferByIdDetailed($id);
        echo json_encode($updatedTransfer ? transformTransferRow($updatedTransfer) : ['message' => 'Verified']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to verify transfer by store keeper: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to verify transfer']);
    }
}

function verifyTransferByController($id) {
    global $pdo;

    try {
        authorizeRoles(['INVENTORY_CONTROLLER', 'SUPER_ADMIN']);

        $user = getCurrentUser();

        $transfer = getTransferByIdDetailed($id);

        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            return;
        }

        $currentStatus = strtoupper((string)($transfer['status'] ?? ''));
        $storeKeeperVerified = !empty($transfer['storekeeper_verified'])
            || !empty($transfer['storekeeper_verified_by'])
            || !empty($transfer['storekeeper_verified_at']);

        // Idempotent behavior: if already completed by controller, return success.
        if ($currentStatus === 'COMPLETED') {
            $existing = transformTransferRow($transfer);
            $existing['message'] = 'Transfer already verified by controller';
            echo json_encode($existing);
            return;
        }

        if (!$storeKeeperVerified && $currentStatus !== 'RECEIVED_KEEPER') {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer must be verified by store keeper first']);
            return;
        }

        $pdo->beginTransaction();

        $setParts = ['status = ?'];
        $params = ['COMPLETED'];
        if (tableHasColumn('stock_transfers', 'controller_verified')) {
            $setParts[] = 'controller_verified = 1';
        }
        if (tableHasColumn('stock_transfers', 'controller_verified_by')) {
            $setParts[] = 'controller_verified_by = ?';
            $params[] = $user['id'] ?? null;
        }
        if (tableHasColumn('stock_transfers', 'controller_verified_at')) {
            $setParts[] = 'controller_verified_at = NOW()';
        }
        $params[] = $id;
        $stmt = $pdo->prepare('UPDATE stock_transfers SET ' . implode(', ', $setParts) . ' WHERE id = ?');
        $stmt->execute($params);

        // Controller verification finalizes receipt into destination inventory.
        $products = json_decode((string)($transfer['products'] ?? '[]'), true);
        if (!is_array($products)) {
            $products = [];
        }

        foreach ($products as $item) {
            $productId = (string)($item['productId'] ?? '');
            $qty = (int)($item['quantity'] ?? 0);
            if ($productId === '' || $qty <= 0) {
                continue;
            }

            $upsertInventory = $pdo->prepare("
                INSERT INTO branch_inventory (branch_id, product_id, quantity)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
            ");
            $upsertInventory->execute([$transfer['to_branch_id'], $productId, $qty]);

            // Keep batch records aligned with the receiving branch when batch details exist.
            $batchNumber = (string)($item['batchNumber'] ?? '');
            if ($batchNumber !== '') {
                $moveBatch = $pdo->prepare('
                    UPDATE drug_batches
                    SET branch_id = ?
                    WHERE branch_id = ? AND product_id = ? AND batch_number = ?
                ');
                $moveBatch->execute([$transfer['to_branch_id'], $transfer['from_branch_id'], $productId, $batchNumber]);
            }
        }

        // Mark linked shipment as delivered so Manage Shipments reflects final step persistently.
        $shipmentStmt = $pdo->prepare('
            UPDATE shipments
            SET status = ?,
                approved_at = COALESCE(approved_at, NOW())
            WHERE transfer_id = ?
        ');
        $shipmentStmt->execute(['DELIVERED', $id]);

        $pdo->commit();

        $updatedTransfer = getTransferByIdDetailed($id);
        echo json_encode($updatedTransfer ? transformTransferRow($updatedTransfer) : ['message' => 'Verified']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to verify transfer by controller: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to verify transfer']);
    }
}

function rejectTransfer($id) {
    global $pdo;

    try {
        authorizeRoles(['STOREKEEPER', 'INVENTORY_CONTROLLER', 'SUPER_ADMIN']);
        $user = getCurrentUser();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $step = strtoupper((string)($input['step'] ?? ''));
        $reason = trim((string)($input['reason'] ?? ''));

        $transfer = getTransferByIdDetailed($id);
        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['error' => 'Transfer not found']);
            return;
        }

        $currentStatus = strtoupper((string)($transfer['status'] ?? ''));
        if ($currentStatus === 'COMPLETED') {
            http_response_code(400);
            echo json_encode(['error' => 'Completed transfer cannot be rejected']);
            return;
        }
        if ($currentStatus === 'REJECTED') {
            $existing = transformTransferRow($transfer);
            $existing['message'] = 'Transfer already rejected';
            echo json_encode($existing);
            return;
        }

        if (!ensureEnumColumnValue('stock_transfers', 'status', 'REJECTED')) {
            http_response_code(400);
            echo json_encode(['error' => 'Transfer status does not support REJECTED']);
            return;
        }

        $role = strtoupper((string)($user['role'] ?? ''));
        $isKeeperRole = in_array($role, ['STOREKEEPER', 'SUPER_ADMIN'], true);
        $isControllerRole = in_array($role, ['INVENTORY_CONTROLLER', 'SUPER_ADMIN'], true);
        if ($step === 'KEEPER' && !$isKeeperRole) {
            http_response_code(403);
            echo json_encode(['error' => 'Not authorized to reject at storekeeper level']);
            return;
        }
        if ($step === 'CONTROLLER' && !$isControllerRole) {
            http_response_code(403);
            echo json_encode(['error' => 'Not authorized to reject at controller level']);
            return;
        }

        $pdo->beginTransaction();

        $noteParts = [];
        if ($step !== '') $noteParts[] = $step;
        $noteParts[] = 'rejected';
        $noteParts[] = 'by ' . ($user['id'] ?? 'unknown');
        if ($reason !== '') $noteParts[] = 'reason: ' . $reason;
        $rejectionNote = '[' . implode(' | ', $noteParts) . ']';
        $updatedNotes = trim((string)($transfer['notes'] ?? ''));
        $updatedNotes = $updatedNotes === '' ? $rejectionNote : ($updatedNotes . ' ' . $rejectionNote);

        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, notes = ? WHERE id = ?');
        $stmt->execute(['REJECTED', $updatedNotes, $id]);

        $shipmentStmt = $pdo->prepare('UPDATE shipments SET status = ? WHERE transfer_id = ?');
        $shipmentStmt->execute(['REJECTED', $id]);

        $pdo->commit();

        $updatedTransfer = getTransferByIdDetailed($id);
        echo json_encode($updatedTransfer ? transformTransferRow($updatedTransfer) : ['message' => 'Rejected']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to reject transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to reject transfer']);
    }
}

function approveTransfer($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'INVENTORY_CONTROLLER']);

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
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);
        $normalizedRole = strtoupper((string)($user['role'] ?? ''));

        if (
            $normalizedRole === 'BRANCH_MANAGER' &&
            (isset($input['customPrice']) || isset($input['costPrice']) || isset($input['basePrice']))
        ) {
            http_response_code(403);
            echo json_encode(['error' => 'Branch managers cannot update buying or selling prices in inventory']);
            return;
        }

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
