# Inventory.php - Fixes for Critical Issues

## Issue 1: Missing Input Validation in `addStock()`

**Current Code (Line 225-247):**
```php
function addStock() {
    global $pdo;
    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $batchNumber = $input['batchNumber'] ?? '';
        $expiryDate = $input['expiryDate'] ?? '';
        $quantity = (int)($input['quantity'] ?? 0);
        // ... rest of function
```

**Problem:** No validation for empty values or invalid data types.

**Fix:**
```php
function addStock() {
    global $pdo;
    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']);
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }

        $branchId = $input['branchId'] ?? '';
        $productId = $input['productId'] ?? '';
        $batchNumber = $input['batchNumber'] ?? '';
        $expiryDate = $input['expiryDate'] ?? '';
        $quantity = isset($input['quantity']) ? (int)$input['quantity'] : 0;
        
        // Validation
        if (empty($branchId) || empty($productId) || empty($batchNumber) || empty($expiryDate)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: branchId, productId, batchNumber, expiryDate']);
            return;
        }
        
        if ($quantity <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Quantity must be greater than 0']);
            return;
        }
        
        // Validate date format
        if (!strtotime($expiryDate)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid expiryDate format']);
            return;
        }
        
        // ... rest of function
```

---

## Issue 2: Empty IN Clause in `getBranchInventory()`

**Current Code (Line 155-167):**
```php
$batchesByProduct = [];
foreach ($allBatches as $batch) {
    $productId = $batch['product_id'];
    if (!isset($batchesByProduct[$productId])) {
        $batchesByProduct[$productId] = [];
    }
    // ... mapping logic
}
```

**Problem:** If `$productIds` is empty, the SQL `IN ()` clause is invalid.

**Fix:**
```php
// Get all batches for the branch in a single query
$productIds = array_column($rows, 'product_id');

// Check if we have products before querying batches
$batchesByProduct = [];
if (!empty($productIds)) {
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $batchStmt = $pdo->prepare("
        SELECT product_id, batch_number, expiry_date, quantity, status, supplier_id, supplier_name
        FROM drug_batches
        WHERE branch_id = ? AND product_id IN ($placeholders)
        ORDER BY product_id, expiry_date
    ");
    $batchStmt->execute(array_merge([$branchId], $productIds));
    $allBatches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group batches by product_id
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
            'supplierName' => $batch['supplier_name'] ?? null
        ];
    }
}
```

---

## Issue 3: Missing Validation in Transfer Products

**Current Code (Line 447-462):**
```php
$products = json_decode($transfer['products'], true);
foreach ($products as $item) {
    // Deduct from source branch
    $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
    $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);
    // ...
}
```

**Problem:** No validation that $item has required fields or that values are valid.

**Fix:**
```php
$products = json_decode($transfer['products'], true);

if (!$products || !is_array($products)) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid products data in transfer']);
    $pdo->rollBack();
    return;
}

foreach ($products as $item) {
    // Validate item structure
    if (!isset($item['productId']) || !isset($item['quantity'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Invalid product item in transfer']);
        $pdo->rollBack();
        return;
    }
    
    $quantity = (int)$item['quantity'];
    if ($quantity <= 0) {
        http_response_code(500);
        echo json_encode(['error' => 'Invalid quantity in transfer item']);
        $pdo->rollBack();
        return;
    }

    // Deduct from source branch
    $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = GREATEST(0, quantity - ?) WHERE branch_id = ? AND product_id = ?');
    $result = $stmt->execute([$quantity, $transfer['from_branch_id'], $item['productId']]);
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update source branch inventory']);
        $pdo->rollBack();
        return;
    }
    
    // Add to target branch
    $stmt = $pdo->prepare("
        INSERT INTO branch_inventory (branch_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    ");
    $result = $stmt->execute([$transfer['to_branch_id'], $item['productId'], $quantity]);
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update target branch inventory']);
        $pdo->rollBack();
        return;
    }

    // Move batches from source to target
    if (isset($item['batchNumber'])) {
        $stmt = $pdo->prepare('
            UPDATE drug_batches 
            SET branch_id = ? 
            WHERE branch_id = ? AND product_id = ? AND batch_number = ?
        ');
        $result = $stmt->execute([
            $transfer['to_branch_id'], 
            $transfer['from_branch_id'], 
            $item['productId'], 
            $item['batchNumber']
        ]);
        
        if (!$result || $stmt->rowCount() === 0) {
            error_log('Warning: Batch not found during transfer: ' . $item['batchNumber']);
        }
    }
}
```

---

## Issue 4: Refactor Duplicate Transfer Functions

**Recommendation:** Consolidate `verifyTransferByStoreKeeper()`, `verifyTransferByController()`, and `approveTransfer()` into a single function:

```php
function completeTransfer($id, $requiredRoles = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_CONTROLLER']) {
    global $pdo;

    try {
        authorizeRoles($requiredRoles);
        $user = getCurrentUser();

        // Get the transfer details with lock to prevent race conditions
        $stmt = $pdo->prepare('SELECT * FROM stock_transfers WHERE id = ? FOR UPDATE');
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

        // Update transfer status
        $stmt = $pdo->prepare('UPDATE stock_transfers SET status = ?, date_received = NOW() WHERE id = ?');
        $stmt->execute(['COMPLETED', $id]);

        // Move stock from source to target branch
        $products = json_decode($transfer['products'], true);
        
        // [Include validation code from Issue 3 above]
        
        $pdo->commit();

        // Return updated transfer data
        echo json_encode(formatTransferResponse($updatedTransfer));
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to complete transfer: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to complete transfer']);
    }
}

// Helper function to format transfer response consistently
function formatTransferResponse($transfer) {
    $products = json_decode($transfer['products'], true) ?? [];
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
}
```

---

## Issue 5: Improve `getAllInventory()` - Fix N+1 Query

**Replace the loop with single query approach from `getBranchInventory()`:**

Use the same batch-fetching pattern as `getBranchInventory()` to fetch all batches in one query, grouped by branch.

---

## Priority Implementation Order

1. **CRITICAL:** Add input validation to `addStock()` 
2. **CRITICAL:** Fix empty IN clause in `getBranchInventory()`
3. **HIGH:** Add validation to transfer product items
4. **HIGH:** Add error checking for UPDATE/INSERT execution
5. **MEDIUM:** Refactor duplicate transfer functions
6. **MEDIUM:** Optimize getAllInventory() N+1 queries
