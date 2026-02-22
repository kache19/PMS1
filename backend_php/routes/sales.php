<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$subpath = $_GET['subpath'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            getSaleDetails($id);
        } elseif ($subpath === 'dashboard') {
            getSalesSummary();
        } elseif (isset($_GET['branchId']) || isset($_GET['startDate']) || isset($_GET['endDate'])) {
            getSalesHistory();
        } else {
            getSales();
        }
        break;
    case 'POST':
        if ($subpath === 'checkout') {
            processSale();
        } else {
            createSale();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getSales() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR']);
        $stmt = $pdo->query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 500');
        $sales = $stmt->fetchAll();

        $result = array_map(function($s) {
            return [
                'id' => $s['id'],
                'date' => $s['created_at'],
                'branchId' => $s['branch_id'],
                'totalAmount' => (float)$s['total_amount'],
                'profit' => (float)$s['profit'],
                'paymentMethod' => $s['payment_method'],
                'customerName' => $s['customer_name'],
                'status' => 'COMPLETED',
                'items' => [] // In a real app, fetch items separately or via JOIN
            ];
        }, $sales);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch sales: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getSalesHistory() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR']);
        $branchId = $_GET['branchId'] ?? null;

        $query = 'SELECT * FROM sales WHERE 1=1';
        $params = [];

        if ($branchId) {
            $query .= ' AND branch_id = ?';
            $params[] = $branchId;
        }

        $query .= ' ORDER BY created_at DESC LIMIT 500';

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $sales = $stmt->fetchAll();

        $result = array_map(function($s) {
            return [
                'id' => $s['id'],
                'date' => $s['created_at'],
                'branchId' => $s['branch_id'],
                'totalAmount' => (float)$s['total_amount'],
                'profit' => (float)$s['profit'],
                'paymentMethod' => $s['payment_method'],
                'customerName' => $s['customer_name'],
                'status' => 'COMPLETED'
            ];
        }, $sales);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch sales history: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createSale() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $branchId = $input['branchId'] ?? '';
        $items = $input['items'] ?? [];
        $totalAmount = $input['totalAmount'] ?? 0;
        $profit = $input['profit'] ?? 0;
        $paymentMethod = $input['paymentMethod'] ?? '';
        $customerName = $input['customerName'] ?? '';

        // If no ID provided, generate one in the format INV-<BRANCHPREFIX>-<YEAR>-<0001>
        if (empty($id)) {
            $year = date('Y');
            // derive a branch prefix from branchId (numeric -> BR{zero-padded 3}), fallback to BR000
            $branchPrefix = 'BR000';
            if (!empty($branchId) && is_numeric($branchId)) {
                $branchPrefix = sprintf('BR%03d', (int)$branchId);
            }
            $stmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED)) as maxSeq FROM sales WHERE id LIKE ?");
            $likePattern = "INV-" . $branchPrefix . "-" . $year . "-%";
            $stmt->execute([$likePattern]);
            $row = $stmt->fetch();
            $maxSeq = $row && isset($row['maxSeq']) ? (int)$row['maxSeq'] : 0;
            $nextSeq = $maxSeq + 1;
            $id = sprintf('INV-%s-%s-%04d', $branchPrefix, $year, $nextSeq);
        }
        $pdo->beginTransaction();

        // Attempt to insert; handle rare duplicate-ID race by retrying with a new generated ID
        $maxAttempts = 5;
        $inserted = false;
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            // Check if sale already exists
            $stmt = $pdo->prepare('SELECT id FROM sales WHERE id = ?');
            $stmt->execute([$id]);
            $existingSale = $stmt->fetch();

            if ($existingSale) {
                $pdo->rollBack();
                echo json_encode(['message' => 'Sale already exists', 'saleId' => $id]);
                return;
            }

            try {
                $stmt = $pdo->prepare('INSERT INTO sales (id, branch_id, total_amount, profit, payment_method, customer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([$id, $branchId, $totalAmount, $profit, $paymentMethod, $customerName]);
                $inserted = true;
                break;
            } catch (PDOException $e) {
                // Duplicate entry? regenerate id and retry
                if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate') !== false) {
                    // Duplicate entry — regenerate id for this branch/year and retry
                    $year = date('Y');
                    $branchPrefix = 'BR000';
                    if (!empty($branchId) && is_numeric($branchId)) {
                        $branchPrefix = sprintf('BR%03d', (int)$branchId);
                    }
                    $stmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED)) as maxSeq FROM sales WHERE id LIKE ?");
                    $likePattern = "INV-" . $branchPrefix . "-" . $year . "-%";
                    $stmt->execute([$likePattern]);
                    $row = $stmt->fetch();
                    $maxSeq = $row && isset($row['maxSeq']) ? (int)$row['maxSeq'] : 0;
                    $nextSeq = $maxSeq + 1 + $attempt; // bump using attempt as small offset
                    $id = sprintf('INV-%s-%s-%04d', $branchPrefix, $year, $nextSeq);
                    // continue loop
                } else {
                    throw $e;
                }
            }
        }

        if (!$inserted) {
            $pdo->rollBack();
            throw new Exception('Failed to insert sale after multiple attempts');
        }

        // 2. Process Items - Deduct from drug_batches table (FIFO)
        foreach ($items as $item) {
            $remainingToDeduct = $item['quantity'];

            // Get available batches for this product (FIFO - First In, First Out)
            $stmt = $pdo->prepare("SELECT * FROM drug_batches WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE' ORDER BY expiry_date ASC");
            $stmt->execute([$branchId, $item['id']]);
            $batches = $stmt->fetchAll();

            foreach ($batches as $batch) {
                if ($remainingToDeduct <= 0) break;

                if ($batch['quantity'] >= $remainingToDeduct) {
                    // Partial deduction from this batch
                    $newBatchQty = $batch['quantity'] - $remainingToDeduct;
                    $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = ? WHERE id = ?');
                    $stmt->execute([$newBatchQty, $batch['id']]);
                    $remainingToDeduct = 0;
                } else {
                    // Full deduction from this batch
                    $remainingToDeduct -= $batch['quantity'];
                    $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = 0 WHERE id = ?');
                    $stmt->execute([$batch['id']]);
                }
            }

            // Update total inventory quantity
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM drug_batches WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE'");
            $stmt->execute([$branchId, $item['id']]);
            $totalResult = $stmt->fetch();
            $newTotalQuantity = (int)$totalResult['total'];

            // Update or insert branch_inventory
            $stmt = $pdo->prepare('SELECT quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$branchId, $item['id']]);
            $inventoryCheck = $stmt->fetch();

            if ($inventoryCheck) {
                $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = ? WHERE branch_id = ? AND product_id = ?');
                $stmt->execute([$newTotalQuantity, $branchId, $item['id']]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO branch_inventory (branch_id, product_id, quantity) VALUES (?, ?, ?)');
                $stmt->execute([$branchId, $item['id'], $newTotalQuantity]);
            }

            // Record Sale Item
            $stmt = $pdo->prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, batch_number) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $id,
                $item['id'],
                $item['quantity'],
                $item['price'] ?? 0,
                $item['costPrice'] ?? 0,
                $item['selectedBatch'] ?? 'AUTO'
            ]);
        }

        $pdo->commit();
        echo json_encode(['message' => 'Sale recorded successfully', 'saleId' => $id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to process sale: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function processSale() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $id = $input['id'] ?? '';
        $branchId = $input['branchId'] ?? '';
        $items = $input['items'] ?? [];
        $totalAmount = $input['totalAmount'] ?? 0;
        $profit = $input['profit'] ?? 0;
        $paymentMethod = $input['paymentMethod'] ?? '';
        $customerName = $input['customerName'] ?? '';

        // If no ID provided, generate one in the format INV-<BRANCHPREFIX>-<YEAR>-<0001>
        if (empty($id)) {
            $year = date('Y');
            // derive a branch prefix from branchId (numeric -> BR{zero-padded 3}), fallback to BR000
            $branchPrefix = 'BR000';
            if (!empty($branchId) && is_numeric($branchId)) {
                $branchPrefix = sprintf('BR%03d', (int)$branchId);
            }
            $stmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED)) as maxSeq FROM sales WHERE id LIKE ?");
            $likePattern = "INV-" . $branchPrefix . "-" . $year . "-%";
            $stmt->execute([$likePattern]);
            $row = $stmt->fetch();
            $maxSeq = $row && isset($row['maxSeq']) ? (int)$row['maxSeq'] : 0;
            $nextSeq = $maxSeq + 1;
            $id = sprintf('INV-%s-%s-%04d', $branchPrefix, $year, $nextSeq);
        }
        $pdo->beginTransaction();

        // Attempt to insert; handle duplicate-ID race by retrying
        $maxAttempts = 5;
        $inserted = false;
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            // Check if sale already exists
            $stmt = $pdo->prepare('SELECT id FROM sales WHERE id = ?');
            $stmt->execute([$id]);
            $existingSale = $stmt->fetch();

            if ($existingSale) {
                $pdo->rollBack();
                echo json_encode(['message' => 'Sale already exists', 'saleId' => $id]);
                return;
            }

            try {
                $stmt = $pdo->prepare('INSERT INTO sales (id, branch_id, total_amount, profit, payment_method, customer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([$id, $branchId, $totalAmount, $profit, $paymentMethod, $customerName]);
                $inserted = true;
                break;
            } catch (PDOException $e) {
                if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate') !== false) {
                    // Duplicate entry — regenerate id for this branch/year and retry
                    $year = date('Y');
                    $branchPrefix = 'BR000';
                    if (!empty($branchId) && is_numeric($branchId)) {
                        $branchPrefix = sprintf('BR%03d', (int)$branchId);
                    }
                    $stmt = $pdo->prepare("SELECT MAX(CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED)) as maxSeq FROM sales WHERE id LIKE ?");
                    $likePattern = "INV-" . $branchPrefix . "-" . $year . "-%";
                    $stmt->execute([$likePattern]);
                    $row = $stmt->fetch();
                    $maxSeq = $row && isset($row['maxSeq']) ? (int)$row['maxSeq'] : 0;
                    $nextSeq = $maxSeq + 1 + $attempt;
                    $id = sprintf('INV-%s-%s-%04d', $branchPrefix, $year, $nextSeq);
                    // continue loop
                } else {
                    throw $e;
                }
            }
        }

        if (!$inserted) {
            $pdo->rollBack();
            throw new Exception('Failed to insert sale after multiple attempts');
        }

        // 2. Process Items - Deduct from drug_batches table (FIFO)
        foreach ($items as $item) {
            // Validate item data
            if (!$item['id'] || !$item['quantity'] || $item['quantity'] <= 0) {
                throw new Exception("Invalid item data: id={$item['id']}, quantity={$item['quantity']}");
            }

            $remainingToDeduct = $item['quantity'];

            // Get available batches for this product (FIFO - First In, First Out)
            $stmt = $pdo->prepare("SELECT * FROM drug_batches WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE' ORDER BY expiry_date ASC");
            $stmt->execute([$branchId, $item['id']]);
            $batches = $stmt->fetchAll();

            if (empty($batches)) {
                throw new Exception("No active inventory batches found for product {$item['id']} in branch $branchId");
            }

            foreach ($batches as $batch) {
                if ($remainingToDeduct <= 0) break;

                if ($batch['quantity'] >= $remainingToDeduct) {
                    // Partial deduction from this batch
                    $newBatchQty = $batch['quantity'] - $remainingToDeduct;
                    $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = ? WHERE id = ?');
                    $stmt->execute([$newBatchQty, $batch['id']]);
                    $remainingToDeduct = 0;
                } else {
                    // Full deduction from this batch
                    $remainingToDeduct -= $batch['quantity'];
                    $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = 0 WHERE id = ?');
                    $stmt->execute([$batch['id']]);
                }
            }

            // Update total inventory quantity
            $stmt = $pdo->prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM drug_batches WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE'");
            $stmt->execute([$branchId, $item['id']]);
            $totalResult = $stmt->fetch();
            $newTotalQuantity = (int)$totalResult['total'];

            $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = ? WHERE branch_id = ? AND product_id = ?');
            $stmt->execute([$newTotalQuantity, $branchId, $item['id']]);

            // Record Sale Item
            $stmt = $pdo->prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price, cost, batch_number) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $id,
                $item['id'],
                $item['quantity'],
                $item['price'] ?? 0,
                $item['costPrice'] ?? 0,
                $item['selectedBatch'] ?? 'AUTO'
            ]);
        }

        $pdo->commit();
        echo json_encode(['message' => 'Sale recorded successfully', 'saleId' => $id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to process sale: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getSaleDetails($saleId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR']);

        // Get sale header
        $stmt = $pdo->prepare('SELECT * FROM sales WHERE id = ?');
        $stmt->execute([$saleId]);
        $sale = $stmt->fetch();

        if (!$sale) {
            http_response_code(404);
            echo json_encode(['error' => 'Sale not found']);
            return;
        }

        // Get sale items
        $stmt = $pdo->prepare('
            SELECT si.*, p.name as product_name, p.generic_name
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        ');
        $stmt->execute([$saleId]);
        $items = $stmt->fetchAll();

        $detailedSale = [
            'id' => $sale['id'],
            'date' => $sale['created_at'],
            'branchId' => $sale['branch_id'],
            'totalAmount' => (float)$sale['total_amount'],
            'profit' => (float)$sale['profit'],
            'paymentMethod' => $sale['payment_method'],
            'customerName' => $sale['customer_name'],
            'status' => 'COMPLETED',
            'items' => array_map(function($item) {
                return [
                    'productId' => $item['product_id'],
                    'productName' => $item['product_name'],
                    'genericName' => $item['generic_name'],
                    'quantity' => (int)$item['quantity'],
                    'price' => (float)$item['price'],
                    'cost' => (float)$item['cost'],
                    'batchNumber' => $item['batch_number']
                ];
            }, $items)
        ];

        echo json_encode($detailedSale);
    } catch (Exception $e) {
        error_log('Failed to fetch sale details: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getSalesSummary() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'CASHIER', 'AUDITOR']);

        $branchId = $_GET['branchId'] ?? null;
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;

        $query = '
            SELECT
                COUNT(*) as total_sales,
                SUM(total_amount) as total_revenue,
                SUM(profit) as total_profit,
                AVG(total_amount) as average_sale
            FROM sales
            WHERE 1=1
        ';
        $params = [];

        if ($branchId) {
            $query .= ' AND branch_id = ?';
            $params[] = $branchId;
        }

        if ($startDate) {
            $query .= ' AND created_at >= ?';
            $params[] = $startDate;
        }

        if ($endDate) {
            $query .= ' AND created_at <= ?';
            $params[] = $endDate;
        }

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $summary = $stmt->fetch();

        $result = [
            'totalSales' => (int)$summary['total_sales'],
            'totalRevenue' => (float)($summary['total_revenue'] ?? 0),
            'totalProfit' => (float)($summary['total_profit'] ?? 0),
            'averageSale' => (float)($summary['average_sale'] ?? 0)
        ];

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch sales summary: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
