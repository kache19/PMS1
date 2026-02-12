# Authentication 403 Forbidden Fix

## Issue
Users were experiencing `403 Forbidden` errors when trying to fetch entities (customers/suppliers) with the error:
```
GET entities?status=ACTIVE failed: 403 Forbidden
```

## Root Causes Identified

### 1. **JWT Token Validation Issues**
- The JWT decoding was not properly handling invalid signatures
- The `JWT::decode()` method returns `false` when signature validation fails, but this wasn't being properly caught
- The error messages were unclear, making debugging difficult

### 2. **Poor Error Logging**
- The authentication layer had minimal logging, making it impossible to diagnose token issues
- JWT validation errors weren't being logged with details about what failed

## Fixes Applied

### 1. **Improved JWT Decoding** (`utils/jwt.php`)
- Added comprehensive error logging to track signature validation failures
- Better handling of token structure validation
- Clearer error messages in logs

### 2. **Enhanced Authentication** (`utils/auth.php`)
- Added logging at each authentication step
- Properly distinguished between different error types:
  - **401**: Token not provided or not in correct format
  - **403**: Token invalid, expired, or signature mismatch
- Added expiration time logging for expired tokens

### 3. **Better Entity Endpoint Logging** (`routes/entities.php`)
- Added logging for authentication success/failure in `getEntities()`, `getCustomers()`, and `getSuppliers()`
- Logs include authenticated user ID and query details

## How to Debug Authentication Issues

### 1. Check PHP Error Logs
The main application logs to PHP's error log. Check:
- **XAMPP**: `C:\xampp\apache\logs\error.log`
- **Linux**: `/var/log/apache2/error.log` or `/var/log/nginx/error.log`

Look for logs with prefix `[Entities]` or `JWT` to trace authentication issues.

### 2. Monitor JWT Secret
The JWT secret is critical for token validation. Make sure:
- If using `JWT_SECRET` environment variable, it's consistent across the application
- If not set, it defaults to `'your-secret-key'` (shown as "your-secret" in logs)
- The same secret is used for both encoding and decoding

### 3. Check Token Expiration
Log messages will show token expiration time and current time if a token is expired:
```
Token expired. Expiry time: 1707550000, Current time: 1707550100
```

### 4. Common Scenarios

**Scenario A: No Token in Request**
```
Log: An entry point without the [Entities] prefix for authentication
Response: 401 Unauthorized - "Access token required"
Fix: Ensure frontend is sending Authorization header with token
```

**Scenario B: Invalid Token Signature**
```
Log: JWT decode: signature mismatch. Expected: ABC..., Got: XYZ...
Response: 403 Forbidden - "Invalid token"
Fix: Verify JWT_SECRET is consistent; regenerate token if needed
```

**Scenario C: Expired Token**
```
Log: Token expired. Expiry time: 1707550000, Current time: 1707550100
Response: 403 Forbidden - "Token expired"
Fix: User should log out and log in again to get fresh token
```

## Frontend Configuration

The frontend (`frontend/services/api.ts`) handles token storage:
- Tokens are stored in `localStorage` after successful login
- The `fetchJSON` function adds the token to all requests:
  ```javascript
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  ```

## Testing the Fix

### Test 1: Login and Fetch Entities
```bash
# Login
curl -X POST http://localhost/backend_php/index.php/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Use the returned token to fetch entities
curl -X GET "http://localhost/backend_php/index.php/api/entities?status=ACTIVE" \
  -H "Authorization: Bearer <TOKEN>"
```

### Test 2: Check Logs
Monitor the error logs while making requests:
```bash
# On Windows XAMPP:
Get-Content "C:\xampp\apache\logs\error.log" -Tail 50

# On Linux:
tail -f /var/log/apache2/error.log
```

### Test 3: Verify Token Storage
Check that the token is being stored in localStorage:
1. Open browser DevTools (F12)
2. Go to Application > Storage > Local Storage
3. Look for `authToken` entry
4. Verify it contains a JWT (format: `header.payload.signature`)

## Recommendations

### For Production
1. Set a strong `JWT_SECRET` environment variable instead of using the default
2. Implement token refresh mechanism (currently tokens expire after 8 hours)
3. Add rate limiting to login endpoint to prevent brute force
4. Monitor error logs regularly for authentication anomalies

### For Development
1. Keep error logging enabled for easier debugging
2. Use consistent JWT_SECRET across all environments
3. Clear localStorage if token corruption is suspected
4. Test with expired tokens to verify proper error handling

## Related Files Modified
- `utils/auth.php` - Authentication logic with improved logging
- `utils/jwt.php` - JWT encoding/decoding with signature validation logging
- `routes/entities.php` - Entity endpoints with authentication logging
