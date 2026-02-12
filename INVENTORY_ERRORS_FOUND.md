# Inventory.php - Database Posting & Fetching Errors

## Critical Issues Found

### 1. **Missing `getCurrentUser()` Function**
**Location:** [inventory.php](inventory.php#L349), [inventory.php](inventory.php#L393)
- **Problem:** The `getCurrentUser()` function is called but not defined anywhere in the code
- **Impact:** Will cause fatal error when executing `createTransfer()`, `adjustStock()`, and other functions
- **Affected Functions:**
  - `createTransfer()` - Line 349: `$createdBy = getCurrentUser()['id'] ?? null;`
  - `adjustStock()` - Line 393: `$user = getCurrentUser();`
  - `verifyTransferByStoreKeeper()` - Line 431
  - `verifyTransferByController()` - Line 502
- **Fix Required:** Either import from utils/auth.php or define the function

### 2. **Transaction Rollback Without Error Handling**
**Location:** [inventory.php](inventory.php#L389-L402)
- **Problem:** In `adjustStock()`, if the first `UPDATE` fails silently, the rollback still happens but error is not properly caught
- **Risk:** Data corruption if inventory_adjustments insert succeeds but branch_inventory update fails
- **Fix:** Add explicit error checking after each statement

### 3. **Missing NULL Checks in Transfer Products**
**Location:** [inventory.php](inventory.php#L447-L466)
- **Problem:** In `verifyTransferByStoreKeeper()`, when iterating products from JSON:
  ```php
  foreach ($products as $item) {
      // If $item['quantity'] is null or missing, it silently becomes 0
      $stmt->execute([$item['quantity'], $transfer['from_branch_id'], $item['productId']]);
  }
  ```
- **Impact:** Transfers with invalid data won't fail - they'll just move 0 quantity
- **Fix:** Validate $item['quantity'] is a positive integer before using

### 4. **Duplicate Code in Transfer Verification Functions**
**Location:** [inventory.php](inventory.php#L424-L745)
- **Problem:** `verifyTransferByStoreKeeper()`, `verifyTransferByController()`, and `approveTransfer()` contain nearly identical code
- **Risk:** Bugs fixed in one function won't be applied to others; inconsistent behavior
- **Recommendation:** Refactor into single function with role parameter

### 5. **Missing Input Validation in `addStock()`**
**Location:** [inventory.php](inventory.php#L225-L247)
- **Problem:** No validation for:
  - Empty `branchId`, `productId`, `batchNumber`, `expiryDate`
  - Negative `quantity`
  - Invalid date format for `expiryDate`
- **Impact:** Can insert invalid data into database
- **Example Issue:**
  ```php
  $quantity = (int)($input['quantity'] ?? 0); // Will be 0 if missing
  // No check if quantity was actually provided or if it's valid
  ```

### 6. **Unsafe SQL in `getBranchInventory()` Dynamic Query**
**Location:** [inventory.php](inventory.php#L155-L167)
- **Problem:** Using `implode()` to build SQL might have edge cases:
  ```php
  $placeholders = implode(',', array_fill(0, count($productIds), '?'));
  $batchStmt = $pdo->prepare("...WHERE...IN ($placeholders)");
  ```
- **Risk:** If `$productIds` is empty, query syntax breaks (empty IN clause)
- **Current Code Check:** No validation that `$productIds` is not empty

### 7. **Inefficient N+1 Query Problem in `getAllInventory()`**
**Location:** [inventory.php](inventory.php#L69-L102)
- **Problem:** For each product, a separate query fetches batches:
  ```php
  foreach ($rows as $row) {
      $batchStmt = $pdo->prepare("SELECT...FROM drug_batches WHERE...");
      $batchStmt->execute([$branchId, $productId]); // Separate query per product
  }
  ```
- **Performance Impact:** If 100 products exist, makes 101 queries (1 main + 100 batch queries)
- **Better Approach:** Use `getBranchInventory()` pattern with single batch query

### 8. **Missing Authorization Check**
**Location:** [inventory.php](inventory.php#L57)
- **Problem:** `getAllInventory()` function exists but is never called - no GET endpoint without branchId
- **Impact:** Inconsistent API design
- **Note:** Line 28-30 shows GET routing, but `getAllInventory()` might not be properly exposed

### 9. **Error Response Inconsistencies**
**Location:** Multiple functions
- **Problem:** Different error response formats:
  - Some return: `['error' => 'message']`
  - Some return: `['error' => 'message', 'db_error' => [...]]`
  - Some return: `['error' => 'Failed to...']`
- **Impact:** Frontend can't reliably parse errors
- **Recommendation:** Standardize all error responses

### 10. **Race Condition in Transfer Process**
**Location:** [inventory.php](inventory.php#L447-L466)
- **Problem:** Between fetching transfer and updating status, another request could modify the transfer
- **Risk:** Double-processing transfers
- **Fix:** Use SELECT FOR UPDATE or add a version/timestamp check

### 11. **Missing Batch Validation in Transfers**
**Location:** [inventory.php](inventory.php#L456-L462)
- **Problem:** When moving batches:
  ```php
  if (isset($item['batchNumber'])) {
      // Updates batch location but doesn't verify batch exists
      $stmt->execute([...]);
  }
  ```
- **Risk:** Updates silently fail if batch doesn't exist
- **Fix:** Check rows affected or verify batch exists first

### 12. **JSON Decode Error Not Handled**
**Location:** [inventory.php](inventory.php#L230), [inventory.php](inventory.php#L310)
- **Problem:** 
  ```php
  $input = json_decode(file_get_contents('php://input'), true);
  // No check for json_last_error()
  ```
- **Impact:** Invalid JSON silently becomes null, leading to unclear errors
- **Fix:** Add: `if (json_last_error() !== JSON_ERROR_NONE) { ... }`

---

## Summary of Issues by Severity

| Severity | Count | Impact |
|----------|-------|--------|
| **Critical** | 3 | Application will crash or data corruption |
| **High** | 4 | Data integrity or security issues |
| **Medium** | 3 | Performance or maintainability issues |
| **Low** | 2 | Code quality/consistency |

## Files to Review/Fix
1. [inventory.php](inventory.php) - Main file with issues
2. [utils/auth.php](backend_php/utils/auth.php) - Need to verify `getCurrentUser()` exists
3. Database schema - Verify table structures match code expectations
