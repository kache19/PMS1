<?php
/**
 * Test script to insert a sample customer into entities
 */
header('Content-Type: application/json');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/auth.php';

$debugLogFile = __DIR__ . '/routes/entities_debug.log';

function debugLog($message) {
    global $debugLogFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($debugLogFile, "[$timestamp] TEST: $message\n", FILE_APPEND);
}

try {
    // Check if entities table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'entities'");
    if ($stmt->rowCount() === 0) {
        echo json_encode(['error' => 'Entities table does not exist']);
        exit;
    }
    
    // Sample customer data
    $customerData = [
        'id' => 'CUST-' . time() . '-' . rand(1000, 9999),
        'name' => 'John Doe',
        'type' => 'CUSTOMER',
        'email' => 'john.doe@example.com',
        'phone' => '+255712345678',
        'address' => '123 Main Street',
        'city' => 'Dar es Salaam',
        'country' => 'Tanzania',
        'tin' => '123-456-789',
        'vatNumber' => 'VAT-001234',
        'contactPerson' => 'John Doe',
        'contactPhone' => '+255712345678',
        'paymentTerms' => 'NET30',
        'creditLimit' => 1000000,
        'discountPercentage' => 5.00,
        'taxExempt' => false,
        'notes' => 'Test customer created via API',
        'status' => 'ACTIVE'
    ];
    
    debugLog("Inserting customer: " . json_encode($customerData));
    
    $stmt = $pdo->prepare('
        INSERT INTO entities (
            id, name, type, email, phone, address, city, country,
            tin, vat_number, contact_person, contact_phone,
            payment_terms, credit_limit, current_balance, discount_percentage,
            tax_exempt, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ');
    
    $stmt->execute([
        $customerData['id'],
        $customerData['name'],
        $customerData['type'],
        $customerData['email'],
        $customerData['phone'],
        $customerData['address'],
        $customerData['city'],
        $customerData['country'],
        $customerData['tin'],
        $customerData['vatNumber'],
        $customerData['contactPerson'],
        $customerData['contactPhone'],
        $customerData['paymentTerms'],
        $customerData['creditLimit'],
        0.00,
        $customerData['discountPercentage'],
        $customerData['taxExempt'] ? 1 : 0,
        $customerData['notes'],
        $customerData['status']
    ]);
    
    // Verify insertion
    $stmt = $pdo->prepare('SELECT * FROM entities WHERE id = ?');
    $stmt->execute([$customerData['id']]);
    $inserted = $stmt->fetch();
    
    debugLog("Customer inserted successfully: " . $customerData['id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Customer inserted successfully',
        'customer' => [
            'id' => $inserted['id'],
            'name' => $inserted['name'],
            'type' => $inserted['type'],
            'email' => $inserted['email'],
            'phone' => $inserted['phone'],
            'city' => $inserted['city'],
            'status' => $inserted['status']
        ]
    ]);
    
} catch (Exception $e) {
    debugLog("Error inserting customer: " . $e->getMessage());
    echo json_encode([
        'error' => 'Failed to insert customer',
        'details' => $e->getMessage()
    ]);
}
