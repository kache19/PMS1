# cPanel Deployment Guide

This guide walks you through deploying the Pharmacy Management System backend to cPanel.

## Prerequisites

- cPanel/WHM hosting account with SSH access (optional but recommended)
- MySQL database access via phpMyAdmin or command line
- SMTP credentials (SendGrid, Mailgun, or your server's built-in mail)
- Domain with SSL certificate (HTTPS recommended)

## Step 1: Backup Current Data

1. Login to cPanel
2. Go to **Backup Wizard** → backup your current database and files
3. Download backups to a local machine

## Step 2: Create Production Database

1. In cPanel, go to **MySQL Databases**
2. Create a new database (e.g., `malenyap_pms_prod`)
3. Create a database user and assign all privileges
4. Note the credentials (you'll need them in config)

## Step 3: Upload Application Code

### Option A: Via cPanel File Manager

1. In cPanel, go to **File Manager**
2. Navigate to `public_html` or your desired folder
3. Upload `backend_php/` folder (or create folder `api/` and upload contents)
4. Ensure `index.php` is accessible

### Option B: Via SSH

```bash
# Connect to your server
ssh user@yourdomain.com

# Navigate to public_html or api folder
cd ~/public_html

# Clone or copy your code (example uses direct copy)
# If using SFTP/rsync, sync the backend_php folder here
scp -r path/to/backend_php user@yourdomain.com:~/public_html/api
```

## Step 4: Configure Database

1. Go to cPanel **phpMyAdmin**
2. Select your production database
3. Click **Import**
4. Upload and run `backend_php/migrations/2026_create_password_resets_table.sql`
5. If fresh install, also import `schema_mysql.sql`

## Step 5: Update Configuration Files

### Edit `backend_php/config/database.php`

Update with production credentials:

```php
$host = getenv('DB_HOST') ?: 'localhost';
$dbname = 'malenyap_pms_prod';  // Update with your DB name
$user = 'prod_db_user';          // Update with your DB user
$password = 'secure_password';   // Update with your DB password
```

### Edit `backend_php/config/mail.php`

Set SMTP credentials. Example for SendGrid:

```php
return [
    'smtp' => [
        'host' => 'smtp.sendgrid.net',
        'port' => 587,
        'username' => 'apikey',
        'password' => 'SG.xxxxxxxxxxxxxxxxxxxx',
        'secure' => 'tls',
        'from_address' => 'noreply@yourdomain.com',
        'from_name' => 'Pharmacy System',
    ],
    'reset_base_url' => 'https://app.yourdomain.com/auth/reset-password?token=',
];
```

**OR** Use environment variables in `.htaccess`:

Create `.htaccess` in your app folder:

```apache
SetEnv DB_HOST localhost
SetEnv DB_NAME malenyap_pms_prod
SetEnv DB_USER prod_db_user
SetEnv DB_PASSWORD secure_password

SetEnv MAIL_HOST smtp.sendgrid.net
SetEnv MAIL_PORT 587
SetEnv MAIL_USERNAME apikey
SetEnv MAIL_PASSWORD SG.xxxxxxxxxxxxxxxxxxxx
SetEnv MAIL_ENCRYPTION tls
SetEnv MAIL_FROM_ADDRESS noreply@yourdomain.com
SetEnv MAIL_FROM_NAME "Pharmacy System"
SetEnv RESET_BASE_URL https://app.yourdomain.com/auth/reset-password?token=
```

## Step 6: Install Dependencies (PHPMailer)

### Option A: Via Composer (Recommended)

If SSH access available:

```bash
cd ~/public_html/api  # or wherever you placed backend_php
composer install
```

This creates `vendor/autoload.php` automatically.

### Option B: Manual Installation

If no SSH/composer:

1. On your local machine, run `composer install` in backend_php folder
2. Upload the entire `vendor/` directory to your server
3. The app's `index.php` automatically loads `vendor/autoload.php`

## Step 7: Set File Permissions

Via SSH:

```bash
cd ~/public_html/api
chmod 755 .
chmod -R 755 routes/
chmod -R 755 config/
chmod -R 755 utils/
chmod -R 755 migrations/
chmod 644 index.php config/*.php utils/*.php
```

## Step 8: Configure DNS & Email Deliverability

### SPF Record

Add to your domain's DNS:

```
v=spf1 include:sendgrid.net ~all
```

(Use your SMTP provider's domain, replace `sendgrid.net` if different)

### DKIM (Optional but Recommended)

Check your SMTP provider's docs for DKIM setup.

### DMARC (Optional)

Add to DNS:

```
v=DMARC1; p=quarantine; rua=mailto:abuse@yourdomain.com
```

## Step 9: Verify Deployment

### Test API Health

```bash
curl https://app.yourdomain.com/api/health
```

Expected response:

```json
{"status": "ok"}
```

### Test Password Reset Flow

1. **Request reset link:**

```bash
curl -X POST https://app.yourdomain.com/api/auth/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

2. **Check your email** for reset link
3. **Apply new password:**

```bash
curl -X POST https://app.yourdomain.com/api/auth/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"newsecurepass"}'
```

### Test Bulk Send (Admin Only)

```bash
curl -X POST https://app.yourdomain.com/api/admin/bulk-send-reset-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"staffIds":[]}'
```

(Empty `staffIds` sends to all active staff)

## Step 10: Security & Cleanup

1. Delete or protect `backend_php/fix_admin_password.php` (or move out of webroot)
2. Ensure `.htaccess` contains:

```apache
<FilesMatch "\.php$">
    Deny from all
</FilesMatch>
```

(except for `index.php` or whitelisted files)

3. Set up HTTPS redirection in `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

4. Review error logs regularly: check `public_html/error_log` or `backend_php/error_log`

## Step 11: Enable Logging & Monitoring

Configure email error alerts in cPanel:

- Go to **Error Pages** to monitor errors
- Set up **Backups** to run nightly
- Monitor **MySQL** database size

## Step 12: Frontend Configuration

Update your React frontend's API base URL:

```javascript
// In your frontend config or .env:
VITE_API_URL=https://app.yourdomain.com/api/
```

## Troubleshooting

### "Database Connection Failed"

- Check database name, user, password in config
- Verify database user has all privileges
- Ensure MySQL server is running in cPanel

### "Email not sending"

- Check `/backend_php/error_log` for mailer errors
- Verify SMTP credentials in `config/mail.php`
- Check SPF/DKIM records
- Test with simple `mail()` first, upgrade to SMTP later

### "PHPMailer not found"

- Ensure `vendor/autoload.php` exists in root
- Run `composer install`
- Or verify `vendor/` folder was uploaded

### "API 404 errors"

- Ensure `.htaccess` with rewrite rules is in place
- Check `index.php` router base path matches your deployment folder
- Review logs for path mismatches

### "SSL certificate errors"

- Use HTTPS endpoint
- Ensure certificate is valid in cPanel **AutoSSL**

## Security Best Practices

1. **Never commit passwords** to version control
2. **Use environment variables** for sensitive config (`.htaccess` or server config)
3. **Enable 2FA** on cPanel account
4. **Rotate SMTP passwords** regularly
5. **Review logs** for suspicious activity
6. **Update dependencies** with `composer update` regularly
7. **Use strong database passwords**
8. **Set up automated backups**

## Support

For detailed cPanel help:

- Visit [cPanel Documentation](https://docs.cpanel.net)
- Contact your hosting provider
- Check backend logs: `tail -f ~/public_html/backend_php/error_log`

---

**Deployment Date:** Record when you deploy for future reference.
**Contact:** Admin email for alerts and monitoring.
