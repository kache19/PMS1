<?php
/**
 * Shipment Creation Script for Malenya Sayuni Medics
 * Creates customer if not exists, then creates shipment and invoice
 */

require_once __DIR__ . '/config/database.php';

$customerName = "Malenya Sayuni Medics";
$branchId = 1; // Default branch (Head Office)
$products = [
    ['id' => 1, 'name' => 'Paracetamol 500mg', 'quantity' => 100, 'price' => 5000], // TZS
    ['id' => 2, 'name' => 'Amoxicillin 250mg', 'quantity' => 50, 'price' => 8000],
    ['id' => 3, 'name' => 'ORS Sachets', 'quantity' => 200, 'price' => 2000],
    ['id' => 4, 'name' => 'Ciprofloxacin 500mg', 'quantity' => 30, 'price' => 12000],
    ['id' => 5, 'name' => 'Metformin 500mg', 'quantity' => 60, 'price' => 6500],
];
$notes = "Shipment to Malenya Sayuni Medics - Medical supplies order";

try {
    // Check database connection
    global $pdo;
    echo "Database connection successful.\n\n";

    // Step 1: Check if customer exists
    $stmt = $pdo->prepare("SELECT id, name FROM entities WHERE name LIKE ? AND type IN ('CUSTOMER', 'BOTH')");
    $stmt->execute(["%$customerName%"]);
    $customer = $stmt->fetch();

    if (!$customer) {
        // Create the customer
        echo "Customer '$customerName' not found. Creating...\n";
        
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
            'info@malenyasayunimedics.co.tz',
            '+255 700 000 000',
            'Malenya Village',
            'Coast Region',
            'Tanzania',
            null, null,
            'Contact Person', '+255 700 000 000',
            'NET30', 5000000, 0.00, 0,
            0, null, 'ACTIVE',
            null, $branchId, 1
        ]);
        
        $customerId = $pdo->lastInsertId();
        echo "✓ Customer created with ID: $customerId\n\n";
    } else {
        $customerId = $customer['id'];
        echo "✓ Customer found: $customerName (ID: $customerId)\n\n";
    }

    // Step 2: Check inventory availability
    echo "Checking inventory availability...\n";
    $availableProducts = [];
    $unavailableProducts = [];

    foreach ($products as $product) {
        $stmt = $pdo->prepare('
            SELECT bi.quantity, p.name 
            FROM branch_inventory bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.branch_id = ? AND bi.product_id = ?
        ');
        $stmt->execute([$branchId, $product['id']]);
        $inventory = $stmt->fetch();

        if ($inventory && $inventory['quantity'] >= $product['quantity']) {
            $availableProducts[] = $product;
            echo "  ✓ {$product['name']}: {$product['quantity']} units available\n";
        } else {
            $availableQty = $inventory ? $inventory['quantity'] : 0;
            $unavailableProducts[] = [
                'product' => $product,
                'available' => $availableQty
            ];
            echo "  ✗ {$product['name']}: Only $availableQty units available (need {$product['quantity']})\n";
        }
    }

    if (empty($availableProducts)) {
        echo "\n⚠ No products available for shipment. Exiting.\n";
        exit(1);
    }

    echo "\n";

    // Step 3: Create shipment
    echo "Creating shipment...\n";
    $shipmentId = 'SHIP-CUST-' . str_replace('.', '', uniqid('', true));
    
    $totalValue = array_reduce($availableProducts, function($sum, $p) {
        return $sum + ($p['quantity'] * $p['price']);
    }, 0);

    $stmt = $pdo->prepare('
        INSERT INTO shipments (id, transfer_id, from_branch_id, to_branch_id, status, verification_code, total_value, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    // For customer shipment, we use a special status and set to_branch_id to customer entity
    $stmt->execute([
        $shipmentId, 
        'DIRECT-CUSTOMER-' . time(),
        $branchId, 
        $customerId, // Using customer ID as destination
        'DELIVERED',
        null,
        $totalValue,
        $notes,
        1
    ]);
    
    echo "✓ Shipment created: $shipmentId\n";

    // Step 4: Create shipment items
    echo "Adding items to shipment...\n";
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
        
        echo "  ✓ {$product['name']}: {$product['quantity']} x {$product['price']} = $total\n";
    }

    // Step 5: Create invoice
    echo "\nCreating invoice...\n";
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

    $stmt = $pdo->prepare('
        INSERT INTO invoices (id, branch_id, customer_name, customer_id, total_amount, paid_amount, status, due_date, description, source, items, archived, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    $dueDate = date('Y-m-d', strtotime('+30 days'));
    $description = "Shipment Invoice - $shipmentId - Customer: $customerName";
    
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
    
    echo "✓ Invoice created: $invoiceId\n";
    echo "  - Total Amount: TZS " . number_format($totalValue, 2) . "\n";
    echo "  - Due Date: $dueDate\n";
    echo "  - Status: UNPAID\n";

    // Step 6: Deduct inventory
    echo "\nDeducting inventory...\n";
    foreach ($availableProducts as $product) {
        // Deduct from drug_batches (FIFO)
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
        
        echo "  ✓ {$product['name']}: Deducted {$product['quantity']} units\n";
    }

    // Commit transaction
    $pdo->commit();

    // Summary
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "SHIPMENT COMPLETED SUCCESSFULLY!\n";
    echo str_repeat("=", 50) . "\n\n";
    
    echo "Customer: $customerName\n";
    echo "Shipment ID: $shipmentId\n";
    echo "Invoice ID: $invoiceId\n";
    echo "Total Value: TZS " . number_format($totalValue, 2) . "\n";
    echo "Items Shipped: " . count($availableProducts) . "\n";
    echo "Status: DELIVERED\n";
    echo "Invoice Status: UNPAID (Due: $dueDate)\n\n";
    
    if (!empty($unavailableProducts)) {
        echo "⚠ Products not included (insufficient stock):\n";
        foreach ($unavailableProducts as $item) {
            echo "  - {$item['product']['name']}: need {$item['product']['quantity']}, have {$item['available']}\n";
        }
    }

    echo "\n";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
