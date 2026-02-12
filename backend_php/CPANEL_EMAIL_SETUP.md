# cPanel Email Setup - Quick Guide

This guide shows you how to configure the Pharmacy System to send emails through your cPanel email account.

## Step 1: Get Your cPanel Email Credentials

1. **Log in to cPanel**
2. Go to **Email Accounts** section
3. Click on your email account (e.g., `noreply@yourdomain.com` or `admin@yourdomain.com`)
4. Look for:
   - **Mail Server**: Usually `mail.yourdomain.com`
   - **Username**: Your full email address
   - **Password**: Your email password (can view/reset here)
   - **Port**: Usually 465 (SSL) or 587 (TLS)

## Step 2: Update `.htaccess` or `config/mail.php`

### Option A: Via .htaccess (Recommended for cPanel)

Edit `.htaccess` and update these lines:

```apache
SetEnv MAIL_HOST mail.yourdomain.com
SetEnv MAIL_PORT 465
SetEnv MAIL_USERNAME noreply@yourdomain.com
SetEnv MAIL_PASSWORD your_email_password
SetEnv MAIL_ENCRYPTION ssl
SetEnv MAIL_FROM_ADDRESS noreply@yourdomain.com
SetEnv RESET_BASE_URL https://yourdomain.com/auth/reset-password?token=
```

### Option B: Direct Edit in config/mail.php

Edit `config/mail.php`:

```php
return [
    'smtp' => [
        'host' => 'mail.yourdomain.com',
        'port' => 465,
        'username' => 'noreply@yourdomain.com',
        'password' => 'your_email_password',
        'secure' => 'ssl',  // or 'tls' for port 587
        'from_address' => 'noreply@yourdomain.com',
        'from_name' => 'Pharmacy System',
    ],
    'reset_base_url' => 'https://yourdomain.com/auth/reset-password?token=',
];
```

## Step 3: Common cPanel Email Server Configurations

### Bluehost
```
Host: mail.yourdomain.com
Port: 465 (SSL)
Encryption: ssl
```

### Hostinger
```
Host: mail.yourdomain.com
Port: 465 (SSL)
Encryption: ssl
```

### SiteGround
```
Host: mail.yourdomain.com
Port: 465 (SSL)
Encryption: ssl
```

### NameCheap
```
Host: mail.yourdomain.com
Port: 465 (SSL) or 587 (TLS)
Encryption: ssl or tls
```

### Generic cPanel
```
Host: mail.yourdomain.com
Port: 465 (SSL) or 587 (TLS)
Encryption: ssl or tls
```

**Not sure? Contact your hosting provider's support — they'll give you the exact credentials.**

## Step 4: Run Database Migration

Create the `password_resets` table:

```bash
# Via command line
mysql -u root -p malenyap_pms_db < migrations/2026_create_password_resets_table.sql

# OR via phpMyAdmin:
# 1. Open phpMyAdmin
# 2. Select your database
# 3. Click "Import"
# 4. Upload migrations/2026_create_password_resets_table.sql
```

## Step 5: Install Composer Dependencies

The system uses PHPMailer for secure SMTP connection:

### If SSH available:
```bash
composer install
```

### If no SSH:
1. Run `composer install` on your local machine
2. Upload the entire `vendor/` folder to your cPanel server
3. The app will auto-load `vendor/autoload.php`

## Step 6: Verify Everything is Ready

```bash
php check_cpanel_ready.php
```

Should show:
```
✓ Passed: 25/25
🎉 SYSTEM READY FOR cPANEL DEPLOYMENT!
```

## Step 7: Test Email Sending

### Test via API

1. **Request a password reset:**
```bash
curl -X POST https://yourdomain.com/api/auth/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"user@yourdomain.com"}'
```

2. **Check your email** for the reset link

3. **Test reset link** by getting a token from database:
```bash
mysql -u user -p db -e "SELECT token FROM password_resets ORDER BY created_at DESC LIMIT 1;"
```

4. **Apply new password:**
```bash
curl -X POST https://yourdomain.com/api/auth/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_HERE","newPassword":"NewPass123"}'
```

### Test Admin Bulk Send

```bash
curl -X POST https://yourdomain.com/api/admin/bulk-send-reset-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{"staffIds":[]}'
```

## Troubleshooting

### Emails not sending

**Problem**: POSTing `/api/auth/forgot` returns success but no email arrives

**Solutions:**
1. Check cPanel error logs: `tail -f ~/public_html/error_log`
2. Verify SMTP credentials are correct (test via telnet if possible)
3. Check spam folder
4. Ensure your domain's SPF/DKIM records are set up

### SPF Record Setup (Recommended)

Add to your domain's DNS:
```
v=spf1 include:mail.yourdomain.com ~all
```

Or for your hosting provider:
```
v=spf1 include:sendgrid.net ~all          # if using SendGrid
v=spf1 include:mailgun.org ~all           # if using Mailgun
```

Ask your provider for the exact SPF record.

### DKIM Record (Optional but Recommended)

Ask cPanel to enable DKIM signing for your domain:
1. In cPanel, find **Email Authentication**
2. Select your domain
3. Enable DKIM signing
4. Copy DKIM public key
5. Add to your DNS records

### Connection Refused Error

**Problem**: "Connection refused" or "Network timeout"

**Solutions:**
1. Verify **Port** is correct (usually 465 or 587)
2. Check **Encryption** matches port:
   - Port 465 → Use SSL
   - Port 587 → Use TLS
3. Verify email account is **active** in cPanel
4. Contact hosting provider to ensure mail server is accessible

### Authentication Failed

**Problem**: "Authentication failed" or "Invalid credentials"

**Solutions:**
1. Verify email/password in cPanel Email Accounts
2. Check **Username** is full email address (not just username)
3. If changed password recently, update `.htaccess`/config
4. Try resetting password in cPanel

### PHPMailer Errors

**Problem**: "PHPMailer not found" or similar

**Solutions:**
1. Ensure `vendor/autoload.php` exists
2. Run `composer install`
3. Check file permissions: `chmod 755 vendor/`
4. Verify `index.php` can load autoload: `php -r "require 'vendor/autoload.php'; echo 'OK';"`

## Email Security Best Practices

1. **Use a separate email account** for system notifications (don't use main admin email)
2. **Set strong password** for email account
3. **Enable DKIM/SPF** for domain
4. **Regularly monitor logs** for suspicious email activity
5. **Rotate credentials** periodically
6. **Use HTTPS** for all API endpoints
7. **Rate limit** `/auth/forgot` endpoint to prevent abuse

## DNS Records Checklist

Make sure your domain is properly configured:

```
_ SPF Record (required)
  v=spf1 include:mail.yourdomain.com ~all

_ DKIM Record (recommended)
  From cPanel Email Authentication

_ DMARC Record (optional but good)
  v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com
```

## Support

If you encounter issues:

1. Check `/backend_php/error_log` for detailed errors
2. Review cPanel error logs
3. Contact your hosting provider's support with SMTP details
4. Test credentials with a simple mail() function first

---

**Ready to deploy?** Follow the steps above, then test thoroughly before announcing to users!
