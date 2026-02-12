<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/backend_php/index.php/api/finance', '', $path);
$path = str_replace('/api/finance', '', $path);
$path = str_replace('/finance', '', $path);

// Parse path parameters
$id = null;
$action = null;

if (preg_match('/\/([^\/]+)\/([^\/]+)/', $path, $matches)) {
    // /resource/id/action
    $resource = $matches[1];
    $id = $matches[2];
    $action = isset($matches[3]) ? $matches[3] : null;
} elseif (preg_match('/\/([^\/]+)/', $path, $matches)) {
    // /resource or /resource/id
    $resource = $matches[1];
    if ($resource === 'invoices' || $resource === 'expenses' || $resource === 'payments' || $resource === 'summary') {
        $action = $resource;
        $resource = null;
    }
}

switch ($method) {
    case 'GET':
        if ($action === 'invoices') {
            getInvoices();
        } elseif ($resource === 'invoices' && $id && $action === 'html') {
            generateInvoiceHTML($id);
        } elseif ($resource === 'invoices' && $id && $action === 'pdf') {
            generateInvoicePDF($id);
        } elseif ($action === 'expenses') {
            getExpenses();
        } elseif ($action === 'summary') {
            getFinancialSummary();
        } elseif ($resource === 'payments' && $id) {
            getPayments($id);
        }
        break;
    case 'POST':
        if ($action === 'invoices') {
            createInvoice();
        } elseif ($action === 'expenses') {
            createExpense();
        } elseif ($action === 'payments') {
            recordPayment();
        } elseif ($resource === 'invoices' && $id && $action === 'payments') {
            recordInvoicePayment($id);
        }
        break;
    case 'PATCH':
        if ($resource === 'expenses' && $id && $action === 'approve') {
            approveExpense($id);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getInvoices() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DISPENSER', 'PHARMACIST', 'STOREKEEPER', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $stmt = $pdo->query('
            SELECT i.*, b.name as branch_name, cb.name as customer_branch_name, e.name as customer_entity_name
            FROM invoices i
            LEFT JOIN branches b ON i.branch_id = b.id
            LEFT JOIN branches cb ON i.customer_name = cb.id
            LEFT JOIN entities e ON i.customer_name = e.id
            ORDER BY i.created_at DESC
        ');
        $invoices = $stmt->fetchAll();

        $result = array_map(function($i) use ($pdo) {
          $payments = [];
          try {
            $stmt = $pdo->prepare('SELECT id, amount, discount, discount_percent, method, receipt_number, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC');
            $stmt->execute([$i['id']]);
            $paymentsData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $payments = array_map(function($p) {
              return [
                'id' => $p['id'],
                'amount' => (float)$p['amount'],
                'discount' => (float)($p['discount'] ?? 0),
                'discountPercent' => (float)($p['discount_percent'] ?? 0),
                'method' => $p['method'],
                'receiptNumber' => $p['receipt_number'],
                'date' => $p['created_at'],
                'recordedBy' => ''
              ];
            }, $paymentsData);
          } catch (Exception $e) {
            // ignore
          }
          return [
            'id' => $i['id'],
            'branchId' => $i['branch_id'],
            'branchName' => $i['branch_name'] ?? null,
            'customerName' => $i['customer_branch_name'] ?? $i['customer_entity_name'] ?? $i['customer_name'],
            'customerPhone' => $i['customer_phone'] ?? '',
            'customerEmail' => $i['customer_email'] ?? '',
            'dateIssued' => $i['created_at'],
            'dueDate' => $i['due_date'],
            'totalAmount' => (float)$i['total_amount'],
            'paidAmount' => (float)$i['paid_amount'],
            'status' => $i['status'],
            'description' => $i['description'] ?? '',
            'source' => $i['source'],
            'archived' => (bool)$i['archived'],
            'items' => json_decode($i['items'], true) ?? [],
            'payments' => $payments
          ];
        }, $invoices);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch invoices: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function generateNextInvoiceNumber() {
    global $pdo;
    $year = date('Y');
    $prefix = "INV-$year-";

    // Find the highest number for this year
    $stmt = $pdo->prepare("SELECT id FROM invoices WHERE id LIKE ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$prefix . '%']);
    $lastInvoice = $stmt->fetch();

    if ($lastInvoice) {
        // Extract the number part and increment
        $lastNumber = (int)substr($lastInvoice['id'], strlen($prefix));
        $nextNumber = $lastNumber + 1;
    } else {
        $nextNumber = 1;
    }

    // Format with leading zeros to 4 digits
    return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
}

function createInvoice() {
    global $pdo;

    error_log('createInvoice called');

    try {
        $user = authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DISPENSER']);
        error_log('User authorized: ' . json_encode($user));

        $input = json_decode(file_get_contents('php://input'), true);
        error_log('Input received: ' . json_encode($input));

        if ($input === null) {
            error_log('JSON decode failed');
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON input']);
            return;
        }

        $id = $input['id'] ?? '';
        $branchId = $input['branchId'] ?? '';
        $customerName = $input['customerName'] ?? '';
        $customerPhone = $input['customerPhone'] ?? null;
        $totalAmount = (float)($input['totalAmount'] ?? 0);
        $dueDate = $input['dueDate'] ?? null;
        $description = $input['description'] ?? '';
        $source = $input['source'] ?? 'MANUAL';
        $items = $input['items'] ?? [];

        // Generate invoice ID if not provided
        if (empty($id)) {
            $id = generateNextInvoiceNumber();
            error_log('Generated invoice ID: ' . $id);
        }

        error_log("createInvoice params: id=$id, branchId=$branchId, customerName=$customerName, totalAmount=$totalAmount, dueDate=$dueDate, items=" . json_encode($items));

        // Validate required fields
        if (empty($branchId) || empty($customerName)) {
            error_log('Missing required fields');
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: branchId, customerName']);
            return;
        }

        // Validate items is array
        if (!is_array($items)) {
            error_log('Items is not an array: ' . gettype($items));
            http_response_code(400);
            echo json_encode(['error' => 'Items must be an array']);
            return;
        }

        // Validate due_date if provided
        if ($dueDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) {
            error_log('Invalid due_date format: ' . $dueDate);
            http_response_code(400);
            echo json_encode(['error' => 'Due date must be in YYYY-MM-DD format']);
            return;
        }

        // Check if branch exists
        $stmt = $pdo->prepare('SELECT id FROM branches WHERE id = ?');
        $stmt->execute([$branchId]);
        if (!$stmt->fetch()) {
            error_log("Branch $branchId does not exist");
            http_response_code(400);
            echo json_encode(['error' => 'Invalid branch ID']);
            return;
        }

        // Check if invoice ID already exists
        $stmt = $pdo->prepare('SELECT id FROM invoices WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->fetch()) {
            error_log("Invoice ID $id already exists");
            http_response_code(400);
            echo json_encode(['error' => 'Invoice ID already exists']);
            return;
        }

        $stmt = $pdo->prepare('INSERT INTO invoices (id, branch_id, customer_name, customer_phone, total_amount, paid_amount, status, due_date, description, source, items, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW())');
        $itemsJson = json_encode($items);
        if ($itemsJson === false) {
            error_log('json_encode failed for items: ' . json_encode($items));
            http_response_code(400);
            echo json_encode(['error' => 'Invalid items data']);
            return;
        }
        error_log("Items JSON length: " . strlen($itemsJson));

        $result = $stmt->execute([$id, $branchId, $customerName, $customerPhone, $totalAmount, 'UNPAID', $dueDate, $description, $source, $itemsJson]);

        if (!$result) {
            $errorInfo = $stmt->errorInfo();
            error_log('Invoice insertion failed: ' . json_encode($errorInfo));
            http_response_code(500);
            echo json_encode(['error' => 'Failed to insert invoice', 'db_error' => $errorInfo]);
            return;
        }

        error_log('Invoice inserted successfully');

        // Fetch the created invoice to return full data
        $stmt = $pdo->prepare('SELECT * FROM invoices WHERE id = ?');
        $stmt->execute([$id]);
        $createdInvoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$createdInvoice) {
            error_log('Failed to fetch created invoice');
            http_response_code(500);
            echo json_encode(['error' => 'Failed to retrieve created invoice']);
            return;
        }

        // Format the response similar to getInvoices
        $payments = [];
        try {
            $stmt = $pdo->prepare('SELECT id, amount, discount, discount_percent, method, receipt_number, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC');
            $stmt->execute([$id]);
            $paymentsData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $payments = array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'amount' => (float)$p['amount'],
                    'discount' => (float)($p['discount'] ?? 0),
                    'discountPercent' => (float)($p['discount_percent'] ?? 0),
                    'method' => $p['method'],
                    'receiptNumber' => $p['receipt_number'],
                    'date' => $p['created_at'],
                    'recordedBy' => ''
                ];
            }, $paymentsData);
        } catch (Exception $e) {
            // ignore
        }

        $response = [
            'id' => $createdInvoice['id'],
            'branchId' => $createdInvoice['branch_id'],
            'customerName' => $createdInvoice['customer_branch_name'] ?? $createdInvoice['customer_entity_name'] ?? $createdInvoice['customer_name'],
            'customerPhone' => $createdInvoice['customer_phone'],
            'dateIssued' => $createdInvoice['created_at'],
            'dueDate' => $createdInvoice['due_date'],
            'totalAmount' => (float)$createdInvoice['total_amount'],
            'paidAmount' => (float)$createdInvoice['paid_amount'],
            'status' => $createdInvoice['status'],
            'description' => $createdInvoice['description'],
            'source' => $createdInvoice['source'],
            'archived' => (bool)$createdInvoice['archived'],
            'items' => json_decode($createdInvoice['items'], true) ?? [],
            'payments' => $payments
        ];

        echo json_encode($response);
    } catch (Exception $e) {
        error_log('Failed to create invoice: ' . $e->getMessage());
        http_response_code(500);
        $response = json_encode(['error' => $e->getMessage()]);
        if ($response === false) {
            echo '{"error": "Unknown error"}';
        } else {
            echo $response;
        }
    }
}

function recordPayment() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DISPENSER', 'PHARMACIST', 'STOREKEEPER', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $input = json_decode(file_get_contents('php://input'), true);

        $invoiceId = $input['invoiceId'] ?? '';
        $amount = $input['amount'] ?? 0;
        $discountPercent = $input['discountPercent'] ?? 0;
        $discountAmount = $input['discount'] ?? 0;
        $method = $input['method'] ?? '';
        $receiptNumber = $input['receiptNumber'] ?? '';

        $effectiveAmount = $amount - $discountAmount;

        $pdo->beginTransaction();

        // Add payment record
        $stmt = $pdo->prepare('INSERT INTO invoice_payments (invoice_id, amount, discount, discount_percent, method, receipt_number, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$invoiceId, $effectiveAmount, $discountAmount, $discountPercent, $method, $receiptNumber]);

        // Update invoice status
        $stmt = $pdo->prepare("
            UPDATE invoices
            SET paid_amount = paid_amount + ?,
                status = CASE
                    WHEN paid_amount + ? >= total_amount THEN 'PAID'
                    ELSE 'PARTIAL'
                END
            WHERE id = ?
        ");
        $stmt->execute([$effectiveAmount, $effectiveAmount, $invoiceId]);

        $pdo->commit();
        echo json_encode(['message' => 'Payment recorded successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Failed to record payment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function recordInvoicePayment($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $amount = $input['amount'] ?? 0;
        $method = $input['method'] ?? '';
        $receiptNumber = $input['receiptNumber'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO invoice_payments (invoice_id, amount, method, receipt_number, created_at) VALUES (?, ?, ?, ?, NOW())');
        $stmt->execute([$invoiceId, $amount, $method, $receiptNumber]);

        // Get the inserted payment
        $stmt = $pdo->prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1');
        $stmt->execute([$invoiceId]);
        $payment = $stmt->fetch();

        echo json_encode($payment);
    } catch (Exception $e) {
        error_log('Failed to record invoice payment: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getExpenses() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DISPENSER', 'PHARMACIST', 'STOREKEEPER', 'INVENTORY_CONTROLLER', 'AUDITOR']);
        $stmt = $pdo->query('SELECT * FROM expenses ORDER BY date DESC');
        $expenses = $stmt->fetchAll();

        $result = array_map(function($e) {
            return [
                'id' => $e['id'],
                'category' => $e['category'],
                'description' => $e['description'],
                'amount' => (float)$e['amount'],
                'date' => $e['date'],
                'status' => $e['status'],
                'branchId' => $e['branch_id'],
                'archived' => (bool)$e['archived']
            ];
        }, $expenses);

        echo json_encode($result);
    } catch (Exception $e) {
        error_log('Failed to fetch expenses: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createExpense() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $category = $input['category'] ?? '';
        $description = $input['description'] ?? '';
        $amount = $input['amount'] ?? 0;
        $date = $input['date'] ?? '';
        $branchId = $input['branchId'] ?? '';

        $stmt = $pdo->prepare('INSERT INTO expenses (category, description, amount, date, status, branch_id) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$category, $description, $amount, $date, 'Pending', $branchId]);

        // Get the inserted expense ID
        $expenseId = $pdo->lastInsertId();

        // Fetch the created expense
        $stmt = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
        $stmt->execute([$expenseId]);
        $createdExpense = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$createdExpense) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to retrieve created expense']);
            return;
        }

        // Format response similar to getExpenses
        $response = [
            'id' => (int)$createdExpense['id'],
            'category' => $createdExpense['category'],
            'description' => $createdExpense['description'],
            'amount' => (float)$createdExpense['amount'],
            'date' => $createdExpense['date'],
            'status' => $createdExpense['status'],
            'branchId' => $createdExpense['branch_id'],
            'archived' => (bool)$createdExpense['archived']
        ];

        echo json_encode($response);
    } catch (Exception $e) {
        error_log('Failed to create expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        // Build dynamic update query based on provided fields
        $updates = [];
        $values = [];

        if (isset($input['category'])) {
            $updates[] = 'category = ?';
            $values[] = $input['category'];
        }
        if (isset($input['description'])) {
            $updates[] = 'description = ?';
            $values[] = $input['description'];
        }
        if (isset($input['amount'])) {
            $updates[] = 'amount = ?';
            $values[] = $input['amount'];
        }
        if (isset($input['status'])) {
            $updates[] = 'status = ?';
            $values[] = $input['status'];
        }
        if (isset($input['date'])) {
            $updates[] = 'date = ?';
            $values[] = $input['date'];
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            return;
        }

        $values[] = $id;
        $query = 'UPDATE expenses SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $pdo->prepare($query);
        $stmt->execute($values);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            return;
        }

        // Return the updated expense
        $stmt = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
        $stmt->execute([$id]);
        $updatedExpense = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$updatedExpense) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to retrieve updated expense']);
            return;
        }

        // Format response similar to getExpenses
        $response = [
            'id' => (int)$updatedExpense['id'],
            'category' => $updatedExpense['category'],
            'description' => $updatedExpense['description'],
            'amount' => (float)$updatedExpense['amount'],
            'date' => $updatedExpense['date'],
            'status' => $updatedExpense['status'],
            'branchId' => $updatedExpense['branch_id'],
            'archived' => (bool)$updatedExpense['archived']
        ];

        echo json_encode($response);
    } catch (Exception $e) {
        error_log('Failed to update expense: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function approveExpense($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER']);
        $input = json_decode(file_get_contents('php://input'), true);

        $status = $input['status'] ?? '';

        $stmt = $pdo->prepare('UPDATE expenses SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        echo json_encode(['message' => 'Expense status updated successfully']);
    } catch (Exception $e) {
        error_log('Failed to update expense status: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getPayments($invoiceId) {
  global $pdo;

  try {
    authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
    $stmt = $pdo->prepare('SELECT id, amount, discount, discount_percent, method, receipt_number, created_at FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC');
    $stmt->execute([$invoiceId]);
    $payments = $stmt->fetchAll();

    $result = array_map(function($p) {
      return [
        'id' => $p['id'],
        'amount' => (float)$p['amount'],
        'discount' => (float)($p['discount'] ?? 0),
        'discountPercent' => (float)($p['discount_percent'] ?? 0),
        'method' => $p['method'],
        'receiptNumber' => $p['receipt_number'],
        'date' => $p['created_at']
      ];
    }, $payments);

    echo json_encode($result);
  } catch (Exception $e) {
    error_log('Failed to fetch payments: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
}

function getFinancialSummary() {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $branchId = $_GET['branchId'] ?? null;
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;

        $params = [];
        $whereClause = '';

        if ($startDate) {
            $whereClause .= ' AND created_at >= ?';
            $params[] = $startDate;
        }

        if ($endDate) {
            $whereClause .= ' AND created_at <= ?';
            $params[] = $endDate;
        }

        if ($branchId) {
            $whereClause .= ' AND branch_id = ?';
            $params[] = $branchId;
        }

        // Get sales data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total_sales, COALESCE(SUM(profit), 0) as total_profit FROM sales WHERE 1=1 $whereClause");
        $stmt->execute($params);
        $sales = $stmt->fetch();

        // Get expenses data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE status = 'Approved' " . str_replace('created_at', 'date', $whereClause));
        $stmt->execute($params);
        $expenses = $stmt->fetch();

        // Get invoices data
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total_invoiced, COALESCE(SUM(paid_amount), 0) as total_received FROM invoices WHERE 1=1 $whereClause");
        $stmt->execute($params);
        $invoices = $stmt->fetch();

        $summary = [
            'totalSales' => (float)$sales['total_sales'],
            'totalProfit' => (float)$sales['total_profit'],
            'totalExpenses' => (float)$expenses['total_expenses'],
            'totalInvoiced' => (float)$invoices['total_invoiced'],
            'totalReceived' => (float)$invoices['total_received'],
            'netIncome' => (float)$sales['total_profit'] - (float)$expenses['total_expenses']
        ];

        echo json_encode($summary);
    } catch (Exception $e) {
        error_log('Failed to fetch financial summary: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function generateInvoiceHTML($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $template = new InvoiceTemplate($pdo);
        $html = $template->generateInvoice($invoiceId);

        header('Content-Type: text/html');
        echo $html;
    } catch (Exception $e) {
        error_log('Failed to generate invoice HTML: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function generateInvoicePDF($invoiceId) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);

        $template = new InvoiceTemplate($pdo);
        $html = $template->generatePDF($invoiceId);

        // For now, return HTML that can be converted to PDF
        // In production, you'd use a library like TCPDF or Dompdf
        header('Content-Type: text/html');
        header('Content-Disposition: attachment; filename="invoice_' . $invoiceId . '.html"');
        echo $html;
    } catch (Exception $e) {
        error_log('Failed to generate invoice PDF: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>