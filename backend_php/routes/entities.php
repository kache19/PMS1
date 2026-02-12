<?php
// Debug log file for entities route
$debugLogFile = __DIR__ . '/entities_debug.log';

function debugLog($message) {
    global $debugLogFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($debugLogFile, "[$timestamp] $message\n", FILE_APPEND);
}

debugLog("Entities route called: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/auth.php';

global $pdo;

// Check if entities table exists
try {
    debugLog("Checking if entities table exists...");
    $stmt = $pdo->query("SHOW TABLES LIKE 'entities'");
    if ($stmt->rowCount() === 0) {
        debugLog("Entities table does not exist!");
        http_response_code(500);
        echo json_encode(['error' => 'Entities table does not exist. Please run the migration SQL.']);
        exit;
    }
    debugLog("Entities table exists, proceeding...");
} catch (Exception $e) {
    debugLog("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$subpath = $_GET['subpath'] ?? null;

debugLog("Method: $method, ID: $id, Subpath: $subpath");

switch ($method) {
    case 'GET':
        if ($id) {
            getEntityById($id);
        } elseif ($subpath === 'customers') {
            getCustomers();
        } elseif ($subpath === 'suppliers') {
            getSuppliers();
        } elseif ($subpath) {
            // Handle other subpaths like search
            searchEntities();
        } elseif (isset($_GET['search']) || isset($_GET['type'])) {
            searchEntities();
        } else {
            getEntities();
        }
        break;
    case 'POST':
        if ($subpath === 'search') {
            searchEntities();
        } else {
            createEntity();
        }
        break;
    case 'PUT':
        if ($id) {
            updateEntity($id);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Entity ID required for update']);
        }
        break;
    case 'DELETE':
        if ($id) {
            deleteEntity($id);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Entity ID required for delete']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getEntities() {
    global $pdo;
    
    debugLog("getEntities called");
    error_log("[Entities] GET request - attempting authentication");

    try {
        $user = authenticateToken();
        error_log("[Entities] User authenticated: " . $user['id']);
        debugLog("User authenticated: " . $user['id']);
        
        $type = $_GET['type'] ?? null;
        $status = $_GET['status'] ?? 'ACTIVE';
        $branchId = $_GET['branchId'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        if ($limit < 1 || $limit > 1000) $limit = 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        if ($offset < 0) $offset = 0;

        $query = 'SELECT * FROM entities WHERE 1=1';
        $params = [];

        if ($type) {
            $query .= ' AND type = ?';
            $params[] = $type;
        }

        if ($status) {
            $query .= ' AND status = ?';
            $params[] = $status;
        }

        if ($branchId) {
            $query .= ' AND (branch_id = ? OR branch_id IS NULL)';
            $params[] = $branchId;
        }

        $query .= ' ORDER BY name ASC LIMIT ' . $limit . ' OFFSET ' . $offset;

        error_log("[Entities] Executing query: " . str_replace(['?', "'"], ["'%s'", "''"], $query));
        error_log("[Entities] Params: " . implode(", ", $params));

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $entities = $stmt->fetchAll();
        
        error_log("[Entities] Found " . count($entities) . " entities");
        debugLog("Found " . count($entities) . " entities");

        echo json_encode(array_map('formatEntity', $entities));
    } catch (Exception $e) {
        error_log('[Entities] Failed to fetch entities: ' . $e->getMessage());
        error_log('[Entities] Stack trace: ' . $e->getTraceAsString());
        debugLog('Failed to fetch entities: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getCustomers() {
    global $pdo;

    error_log("[Entities] getCustomers called");
    try {
        $user = authenticateToken();
        error_log("[Entities] User authenticated for getCustomers: " . $user['id']);
        
        $search = $_GET['search'] ?? '';
        $branchId = $_GET['branchId'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        if ($limit < 1 || $limit > 500) $limit = 50;

        $query = 'SELECT * FROM entities WHERE type IN ("CUSTOMER", "BOTH") AND status = "ACTIVE"';
        $params = [];

        if ($search) {
            $query .= ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($branchId) {
            $query .= ' AND (branch_id = ? OR branch_id IS NULL)';
            $params[] = $branchId;
        }

        $query .= ' ORDER BY name ASC LIMIT ' . $limit . ';';

        error_log("[Entities] getCustomers query: " . $query);
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $customers = $stmt->fetchAll();
        error_log("[Entities] Found " . count($customers) . " customers");

        echo json_encode(array_map('formatEntity', $customers));
    } catch (Exception $e) {
        error_log('[Entities] Failed to fetch customers: ' . $e->getMessage());
        error_log('[Entities] Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getSuppliers() {
    global $pdo;

    error_log("[Entities] getSuppliers called");
    try {
        $user = authenticateToken();
        error_log("[Entities] User authenticated for getSuppliers: " . $user['id']);
        
        $search = $_GET['search'] ?? '';
        $branchId = $_GET['branchId'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        if ($limit < 1 || $limit > 500) $limit = 50;

        $query = 'SELECT * FROM entities WHERE type IN ("SUPPLIER", "BOTH") AND status = "ACTIVE"';
        $params = [];

        if ($search) {
            $query .= ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($branchId) {
            $query .= ' AND (branch_id = ? OR branch_id IS NULL)';
            $params[] = $branchId;
        }

        $query .= ' ORDER BY name ASC LIMIT ' . $limit . ';';

        error_log("[Entities] getSuppliers query: " . $query);
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $suppliers = $stmt->fetchAll();
        error_log("[Entities] Found " . count($suppliers) . " suppliers");

        echo json_encode(array_map('formatEntity', $suppliers));
    } catch (Exception $e) {
        error_log('[Entities] Failed to fetch suppliers: ' . $e->getMessage());
        error_log('[Entities] Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getEntityById($id) {
    global $pdo;

    try {
        $user = authenticateToken();

        $stmt = $pdo->prepare('SELECT * FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        $entity = $stmt->fetch();

        if (!$entity) {
            http_response_code(404);
            echo json_encode(['error' => 'Entity not found']);
            return;
        }

        echo json_encode(formatEntity($entity));
    } catch (Exception $e) {
        error_log('Failed to fetch entity: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function searchEntities() {
    global $pdo;

    try {
        $user = authenticateToken();
        
        $input = json_decode(file_get_contents('php://input'), true);
        $search = $input['search'] ?? $_GET['search'] ?? '';
        $type = $input['type'] ?? $_GET['type'] ?? null;
        $branchId = $input['branchId'] ?? $_GET['branchId'] ?? null;
        $limit = isset($input['limit']) ? (int)$input['limit'] : (isset($_GET['limit']) ? (int)$_GET['limit'] : 50);
        if ($limit < 1 || $limit > 500) $limit = 50;

        $query = 'SELECT * FROM entities WHERE status = "ACTIVE"';
        $params = [];

        if ($type) {
            if ($type === 'CUSTOMER') {
                $query .= ' AND type IN ("CUSTOMER", "BOTH")';
            } elseif ($type === 'SUPPLIER') {
                $query .= ' AND type IN ("SUPPLIER", "BOTH")';
            } else {
                $query .= ' AND type = ?';
                $params[] = $type;
            }
        }

        if ($search) {
            $query .= ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($branchId) {
            $query .= ' AND (branch_id = ? OR branch_id IS NULL)';
            $params[] = $branchId;
        }

        $query .= ' ORDER BY name ASC LIMIT ' . $limit . ';';

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $entities = $stmt->fetchAll();

        echo json_encode(array_map('formatEntity', $entities));
    } catch (Exception $e) {
        error_log('Failed to search entities: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function createEntity() {
    global $pdo;

    try {
        debugLog("createEntity: Starting authentication...");
        $user = authenticateToken();
        debugLog("createEntity: User authenticated: " . ($user['id'] ?? 'unknown'));
        
        debugLog("createEntity: Checking authorization...");
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        debugLog("createEntity: User authorized");
        
        $input = json_decode(file_get_contents('php://input'), true);
        debugLog("createEntity: Input received: " . json_encode($input));

        if (empty($input['name'])) {
            debugLog("createEntity: Name is empty");
            http_response_code(400);
            echo json_encode(['error' => 'Entity name is required']);
            return;
        }

        $type = $input['type'] ?? 'CUSTOMER';
        $id = $input['id'] ?? 'ENT-' . time() . '-' . rand(1000, 9999);

        $stmt = $pdo->prepare('SELECT id FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->fetch()) {
            $id = 'ENT-' . time() . '-' . rand(10000, 99999);
        }

        debugLog("createEntity: Inserting entity with ID: $id");
        
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
            $id,
            $input['name'],
            $type,
            $input['email'] ?? null,
            $input['phone'] ?? null,
            $input['address'] ?? null,
            $input['city'] ?? null,
            $input['country'] ?? 'Tanzania',
            $input['tin'] ?? null,
            $input['vatNumber'] ?? null,
            $input['contactPerson'] ?? null,
            $input['contactPhone'] ?? null,
            $input['paymentTerms'] ?? null,
            $input['creditLimit'] ?? 0,
            0.00, // current_balance default
            $input['discountPercentage'] ?? 0,
            isset($input['taxExempt']) ? ($input['taxExempt'] ? 1 : 0) : 0,
            $input['notes'] ?? null,
            $input['status'] ?? 'ACTIVE',
            $input['parentEntityId'] ?? null,
            $input['branchId'] ?? null,
            $user['id'] ?? null
        ]);

        $stmt = $pdo->prepare('SELECT * FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        $entity = $stmt->fetch();

        debugLog("createEntity: Entity created successfully: $id");
        
        http_response_code(201);
        echo json_encode([
            'message' => 'Entity created successfully',
            'entity' => formatEntity($entity)
        ]);
    } catch (Exception $e) {
        debugLog('Failed to create entity: ' . $e->getMessage());
        debugLog('Stack trace: ' . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function updateEntity($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT']);
        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $pdo->prepare('SELECT id FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Entity not found']);
            return;
        }

        $fields = [];
        $params = [];

        $allowedFields = [
            'name', 'type', 'email', 'phone', 'address', 'city', 'country',
            'tin', 'vat_number', 'contact_person', 'contact_phone',
            'payment_terms', 'credit_limit', 'discount_percentage',
            'tax_exempt', 'notes', 'status', 'parent_entity_id', 'branch_id'
        ];

        foreach ($allowedFields as $field) {
            $camelField = str_replace('_', '', lcfirst(ucwords($field, '_')));
            if (isset($input[$camelField])) {
                $fields[] = "$field = ?";
                $params[] = $input[$camelField];
            }
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            return;
        }

        $params[] = $id;
        $query = 'UPDATE entities SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);

        $stmt = $pdo->prepare('SELECT * FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        $entity = $stmt->fetch();

        echo json_encode([
            'message' => 'Entity updated successfully',
            'entity' => formatEntity($entity)
        ]);
    } catch (Exception $e) {
        error_log('Failed to update entity: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteEntity($id) {
    global $pdo;

    try {
        authorizeRoles(['SUPER_ADMIN']);

        $stmt = $pdo->prepare('SELECT id, name FROM entities WHERE id = ?');
        $stmt->execute([$id]);
        $entity = $stmt->fetch();

        if (!$entity) {
            http_response_code(404);
            echo json_encode(['error' => 'Entity not found']);
            return;
        }

        $stmt = $pdo->prepare('UPDATE entities SET status = "INACTIVE" WHERE id = ?');
        $stmt->execute([$id]);

        echo json_encode([
            'message' => 'Entity deactivated successfully',
            'id' => $id
        ]);
    } catch (Exception $e) {
        error_log('Failed to delete entity: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function formatEntity($entity) {
    return [
        'id' => $entity['id'],
        'name' => $entity['name'],
        'type' => $entity['type'],
        'email' => $entity['email'],
        'phone' => $entity['phone'],
        'address' => $entity['address'],
        'city' => $entity['city'],
        'country' => $entity['country'] ?? 'Tanzania',
        'tin' => $entity['tin'],
        'vatNumber' => $entity['vat_number'],
        'contactPerson' => $entity['contact_person'],
        'contactPhone' => $entity['contact_phone'],
        'paymentTerms' => $entity['payment_terms'],
        'creditLimit' => (float)($entity['credit_limit'] ?? 0),
        'currentBalance' => (float)($entity['current_balance'] ?? 0),
        'discountPercentage' => (float)($entity['discount_percentage'] ?? 0),
        'taxExempt' => (bool)($entity['tax_exempt'] ?? false),
        'notes' => $entity['notes'],
        'status' => $entity['status'],
        'parentEntityId' => $entity['parent_entity_id'],
        'branchId' => $entity['branch_id'],
        'createdAt' => $entity['created_at'],
        'updatedAt' => $entity['updated_at']
    ];
}
?>
