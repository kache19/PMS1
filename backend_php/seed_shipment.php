<?php
require_once __DIR__ . '/config/database.php';

global $pdo;

try {
    // Create a test shipment
    $transferId = 'TEST-TRANSFER-' . time();
    $items = [
        [
            'productId' => 'P-1766564034117-0-4abzr',
            'productName' => 'ABDOMINAL BELT XXL',
            'quantity' => 100,
            'batchNumber' => 'TEST-BATCH-001',
            'expiryDate' => '2025-12-31'
        ]
    ];

    $itemsJson = json_encode($items);

    $stmt = $pdo->prepare("
        INSERT INTO stock_transfers
        (id, from_branch_id, to_branch_id, products, status, notes, created_by, date_sent)
        VALUES (?, 'HEAD_OFFICE', 'BR002', ?, 'IN_TRANSIT', 'Test shipment for verification', 'ADMIN-001', NOW())
    ");

    $result = $stmt->execute([$transferId, $itemsJson]);

    if ($result) {
        echo "Test shipment created successfully!\n";
        echo "Transfer ID: $transferId\n";
        echo "Status: IN_TRANSIT\n";
        echo "Items: 100 units of ABDOMINAL BELT XXL\n";
        echo "\nYou can now login as a STOREKEEPER and verify this transfer.\n";
    } else {
        echo "Failed to create test shipment.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>