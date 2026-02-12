<?php
/**
 * Customer Shipment API
 * Creates shipment and invoice for external customers (not branch transfers)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Required fields
    $customerName = $input['customerName'] ?? 'Malenya Sayuni Medics';
    $branchId = $input['branchId'] ?? 1;
    $products = $input['products'] ?? [
        ['id' => 1, 'name' => 'Paracetamol 500mg', 'quantity' => 100, 'price' => 5000],
        ['id' => 2, 'name' => 'Amoxicillin 250mg', 'quantity' => 50, 'price' => 8000],
        ['id' => 3, 'name' => 'ORS Sachets', 'quantity' => 200, 'price' => 2000],
        ['id' => 4, 'name' => 'Ciprofloxacin 500mg', 'quantity' => 30, 'price' => 12000],
        ['id' => 5, 'name' => 'Metformin 500mg', 'quantity' => 60, 'price' => 6500],
    ];
    $notes = $input['notes'] ?? "Shipment to $customerName - Medical supplies order";

    error_log("Creating customer shipment for: $customerName");

    // Step 1: Check if customer exists
    $stmt = $pdo->prepare("SELECT id, name FROM entities WHERE name LIKE ? AND type IN ('CUSTOMER', 'BOTH')");
    $stmt->execute(["%$customerName%"]);
    $customer = $stmt->fetch();

    if (!$customer) {
        // Create the customer
        $customerId = 'ENT-' . time() . '-' . rand(100, 999);
        
        $stmt = $pdo->prepare('
            INSERT INTO entities (
                id, name, type, email, phone, address, city, country,
                tin, vat_number, contact_person, contact_phone,
                payment_terms, credit_limit, current_balance, discount_percentage,
                tax_exempt, notes, status, parent_entity_id,
                branch_id, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        
        $stmt->execute([
            $customerId,
            $customerName,
            'CUSTOMER',
            'info@' . strtolower(str_replace(' ', '', $customerName)) . '.co.tz',
            '+255 700 000 000',
            'Address',
            'Region',
            'Tanzania',
            null, null,
            'Contact Person', '+255 700 000 000',
            'NET30', 5000000, 0.00, 0,
            0, null, 'ACTIVE',
            null, $branchId, 1
        ]);
        
        $customerId = $pdo->lastInsertId();
        error_log("Customer created: $customerId");
    } else {
        $customerId = $customer['id'];
    }

    // Step 2: Check inventory availability
    $availableProducts = [];
    $unavailableProducts = [];

    foreach ($products as $product) {
        $productId = $product['id'] ?? $product['productId'];
        $quantity = $product['quantity'] ?? $product['requestedQty'];
        $price = $product['price'] ?? 0;
        $name = $product['name'] ?? $product['productName'];
        
        if (!$productId || $quantity <= 0) continue;

        $stmt = $pdo->prepare('
            SELECT bi.quantity, p.name 
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.branch_id = ? AND bi.product_id = ?
        ');
        $stmt->execute([$branchId, $productId]);
        $inventory = $stmt->fetch();

        if ($inventory && $inventory['quantity'] >= $quantity) {
            $availableProducts[] = [
                'id' => $productId,
                'name' => $name,
                'quantity' => $quantity,
                'price' => $price
            ];
        } else {
            $availableQty = $inventory ? $inventory['quantity'] : 0;
            $unavailableProducts[] = [
                'productId' => $productId,
                'name' => $name,
                'requested' => $quantity,
                'available' => $availableQty
            ];
        }
    }

    if (empty($availableProducts)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No products available for shipment',
            'unavailableProducts' => $unavailableProducts
        ]);
        exit;
    }

    // Step 3: Calculate totals
    $totalValue = array_reduce($availableProducts, function($sum, $p) {
        return $sum + ($p['quantity'] * $p['price']);
    }, 0);

    // Step 4: Create shipment
    $shipmentId = 'SHIP-CUST-' . str_replace('.', '', uniqid('', true));
    
    $stmt = $pdo->prepare('
        INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    $stmt->execute([
        $shipmentId, 
        'DIRECT-CUSTOMER-' . time(),
        $branchId, 
        $customerId,
        'DELIVERED',
        null,
        $totalValue,
        $notes,
        1
    ]);
    
    error_log("Shipment created: $shipmentId");

    // Step 5: Create shipment items
    foreach ($availableProducts as $product) {
        $stmt = $pdo->prepare('
            INSERT INTO shipment_items (shipment_id, product_id, product_name, quantity, price, total)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        
        $total = $product['quantity'] * $product['price'];
        $stmt->execute([
            $shipmentId,
            $product['id'],
            $product['name'],
            $product['quantity'],
            $product['price'],
            $total
        ]);
    }

    // Step 6: Create invoice
    $invoiceId = 'INV-' . date('Y') . '-' . str_replace('.', '', uniqid('', true));
    
    $invoiceItems = array_map(function($p) {
        return [
            'productId' => $p['id'],
            'name' => $p['name'],
            'quantity' => $p['quantity'],
            'price' => $p['price'],
            'total' => $p['quantity'] * $p['price']
        ];
    }, $availableProducts);

    $dueDate = date('Y-m-d', strtotime('+30 days'));
    $description = "Shipment Invoice - $shipmentId - Customer: $customerName";

    $stmt = $pdo->prepare('
        INSERT INTO invoices (id, branch_id, customer_name, customer_id, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    $stmt->execute([
        $invoiceId,
        $branchId,
        $customerName,
        $customerId,
        $totalValue,
        0,
        'UNPAID',
        $dueDate,
        $description,
        'SHIPMENT',
        json_encode($invoiceItems),
        0
    ]);
    
    error_log("Invoice created: $invoiceId");

    // Step 7: Deduct inventory (FIFO from drug_batches)
    foreach ($availableProducts as $product) {
        $remainingToDeduct = $product['quantity'];
        
        $stmt = $pdo->prepare("
            SELECT * FROM drug_batches 
            WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE' 
            ORDER BY expiry_date ASC
        ");
        $stmt->execute([$branchId, $product['id']]);
        $batches = $stmt->fetchAll();
        
        foreach ($batches as $batch) {
            if ($remainingToDeduct <= 0) break;
            
            if ($batch['quantity'] >= $remainingToDeduct) {
                $newBatchQty = $batch['quantity'] - $remainingToDeduct;
                $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = ? WHERE id = ?');
                $stmt->execute([$newBatchQty, $batch['id']]);
                $remainingToDeduct = 0;
            } else {
                $remainingToDeduct -= $batch['quantity'];
                $stmt = $pdo->prepare('UPDATE drug_batches SET quantity = 0 WHERE id = ?');
                $stmt->execute([$batch['id']]);
            }
        }
        
        // Update branch_inventory
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM drug_batches WHERE branch_id = ? AND product_id = ? AND status = 'ACTIVE'");
        $stmt->execute([$branchId, $product['id']]);
        $totalResult = $stmt->fetch();
        $newTotalQuantity = (int)$totalResult['total'];
        
        $stmt = $pdo->prepare('UPDATE branch_inventory SET quantity = ? WHERE branch_id = ? AND product_id = ?');
        $stmt->execute([$newTotalQuantity, $branchId, $product['id']]);
    }

    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Shipment created successfully with invoice',
        'shipment' => [
            'id' => $shipmentId,
            'customerName' => $customerName,
            'customerId' => $customerId,
            'status' => 'DELIVERED',
            'totalValue' => $totalValue,
            'itemsCount' => count($availableProducts),
            'notes' => $notes
        ],
        'invoice' => [
            'id' => $invoiceId,
            'totalAmount' => $totalValue,
            'status' => 'UNPAID',
            'dueDate' => $dueDate,
            'items' => $invoiceItems
        ],
        'unavailableProducts' => $unavailableProducts
    ]);

} catch (Exception $e) {
    error_log('Customer shipment error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create shipment',
        'details' => $e->getMessage()
    ]);
}
