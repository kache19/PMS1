# API Documentation - Email & Authentication Endpoints

This document describes the email, password reset, and administrator endpoints.

## Authentication Endpoints

### POST /api/auth/login

User login. Returns JWT token for authenticated requests.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "ST-001",
    "name": "Admin User",
    "role": "SUPER_ADMIN",
    "branchId": "BR001",
    "email": "admin@example.com",
    "phone": "+255700000000",
    "status": "ACTIVE",
    "username": "admin",
    "joinedDate": "2025-01-01T00:00:00"
  }
}
```

---

### POST /api/auth/forgot

Request a password reset link. Does not require authentication.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a reset link has been sent"
}
```

**Notes:**
- Email must be associated with an active staff account
- Response is identical whether email exists or not (security)
- Reset link expires in 1 hour
- No authentication required

---

### POST /api/auth/reset

Apply a new password using reset token from email.

**Request:**
```json
{
  "token": "a1b2c3d4e5f6... (from reset email)",
  "newPassword": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

**Errors:**
- `400` - Invalid or expired token
- `400` - Password too short (< 8 characters)

**Notes:**
- Token must be from valid reset email link
- Token expires 1 hour after creation
- Password minimum 8 characters
- Token is deleted after successful reset

---

### POST /api/auth/change-password

Change password for authenticated user. Requires authentication.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "NewPassword456"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `401` - Current password incorrect
- `400` - Password too short (< 8 characters)

---

### GET /api/auth/me

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "id": "ST-001",
    "name": "Admin User",
    "role": "SUPER_ADMIN",
    "branchId": "BR001",
    "email": "admin@example.com",
    "phone": "+255700000000",
    "status": "ACTIVE",
    "username": "admin",
    "joinedDate": "2025-01-01T00:00:00"
  }
}
```

---

### POST /api/auth/refresh

Refresh JWT token (extend session).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "token": "eyJhbGc..."
}
```

---

### POST /api/auth/logout

Logout user (client-side, just discard token).

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Admin Endpoints

All admin endpoints require `Authorization: Bearer {token}` header with a SUPER_ADMIN token.

### POST /api/admin/bulk-send-reset-links

Send password reset links to multiple users. Admin only.

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Request - Send to all active staff:**
```json
{
  "staffIds": []
}
```

**Request - Send to specific staff:**
```json
{
  "staffIds": ["ST-001", "ST-002", "ST-003"]
}
```

**Response:**
```json
{
  "message": "Bulk reset emails sent",
  "sent": 12,
  "failed": 0,
  "total": 12
}
```

**Notes:**
- Requires SUPER_ADMIN role
- Empty `staffIds` sends to all active staff with valid emails
- Tokens automatically cleaned before sending new ones
- Each user gets a unique reset token
- Mail send failures are logged but don't block the request
- Response shows success count even if some mails failed

---

## Email Configuration

### Setup

Configure SMTP in `config/mail.php`:

```php
return [
    'smtp' => [
        'host' => 'smtp.provider.com',
        'port' => 587,
        'username' => 'your_account',
        'password' => 'your_password',
        'secure' => 'tls', // 'tls', 'ssl', or ''
        'from_address' => 'noreply@yourdomain.com',
        'from_name' => 'Pharmacy System',
    ],
    'reset_base_url' => 'https://app.yourdomain.com/auth/reset-password?token=',
];
```

Or use environment variables in `.htaccess` or server config:

```apache
SetEnv MAIL_HOST smtp.provider.com
SetEnv MAIL_PORT 587
SetEnv MAIL_USERNAME account
SetEnv MAIL_PASSWORD password
SetEnv MAIL_ENCRYPTION tls
SetEnv MAIL_FROM_ADDRESS noreply@yourdomain.com
SetEnv MAIL_FROM_NAME "Pharmacy System"
SetEnv RESET_BASE_URL https://app.yourdomain.com/auth/reset-password?token=
```

### SMTP Providers

#### SendGrid
```php
'host' => 'smtp.sendgrid.net',
'port' => 587,
'username' => 'apikey',
'password' => 'SG.xxxxxxxxxxxxxxxxxxxxxx',
'secure' => 'tls',
```

#### Mailgun
```php
'host' => 'smtp.mailgun.org',
'port' => 587,
'username' => 'postmaster@yourdomain.com',
'password' => 'password_from_mailgun',
'secure' => 'tls',
```

#### Gmail (with app password)
```php
'host' => 'smtp.gmail.com',
'port' => 587,
'username' => 'your.email@gmail.com',
'password' => 'app_specific_password', // Not your regular password
'secure' => 'tls',
```

#### Mailtrap (for testing)
```php
'host' => 'smtp.mailtrap.io',
'port' => 587, // or 465, 2465
'username' => 'your_mailtrap_username',
'password' => 'your_mailtrap_password',
'secure' => 'tls',
```

#### AWS SES
```php
'host' => 'email-smtp.us-east-1.amazonaws.com', // Change region if needed
'port' => 587,
'username' => 'SMTP_USERNAME_from_AWS',
'password' => 'SMTP_PASSWORD_from_AWS',
'secure' => 'tls',
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid credentials) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 405 | Method not allowed |
| 500 | Server error |

---

## Error Responses

All errors return JSON:

```json
{
  "error": "Error message",
  "details": "Additional context (if available)"
}
```

Example:
```json
{
  "error": "Invalid or expired token"
}
```

---

## Security Best Practices

1. **Use HTTPS in production** - All endpoints should be accessed via HTTPS
2. **Tokens in headers** - Always pass tokens in `Authorization: Bearer {token}` header
3. **Password requirements** - Minimum 8 characters
4. **Reset links** - Time-limited (1 hour), one-time use
5. **Admin actions** - Require SUPER_ADMIN role
6. **Email verification** - Verify your domain's SPF, DKIM, DMARC records
7. **Rate limiting** - Consider implementing rate limiting on `/auth/forgot` endpoint
8. **Logging** - Monitor logs for suspicious activity

---

## Testing

Test all endpoints:

```bash
php test_email_feature.php [base_url] [admin_token] [test_email]
```

Example:
```bash
php test_email_feature.php "http://localhost:8000" "your_admin_jwt_token" "test@pharmacy.local"
```

---

## Troubleshooting

### Emails not being sent

1. Check `error_log` for SMTP errors
2. Verify SMTP credentials in `config/mail.php`
3. Verify SPF/DKIM/DMARC records on your domain
4. Check firewall/port access (usually port 587)
5. Test with transactional email provider (SendGrid, Mailgun)

### Reset tokens not working

1. Verify database `password_resets` table exists
2. Check token expiration (should be created in DB)
3. Ensure `RESET_BASE_URL` points to your frontend
4. Check frontend actually submits token to `/api/auth/reset`

### PHPMailer not loading

1. Run `composer install`
2. Verify `vendor/autoload.php` exists
3. Ensure `vendor/autoload.php` is required in `index.php`
4. Check file permissions on `vendor/` folder

---

## Changelog

### Version 1.1 (Feb 2026)

- Added secure password reset flow (`/api/auth/forgot`, `/api/auth/reset`)
- Added admin bulk-send reset links (`/api/admin/bulk-send-reset-links`)
- Integrated PHPMailer and mail configuration
- Added email test suite (`test_email_feature.php`)
- Added cPanel deployment guide

---

For full deployment instructions, see `DEPLOYMENT_CPANEL.md`.
