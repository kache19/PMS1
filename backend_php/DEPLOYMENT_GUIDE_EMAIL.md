# Deployment Guide - Email to Production

## Overview
This guide walks you through deploying the Malenya Pharmacy email system to production using your cPanel hosting.

---

## Pre-Deployment Checklist

### Step 1: Verify cPanel Email Account
- [ ] Email account `no-reply@malenyapharmacy.com` exists in cPanel
- [ ] Email account is active (not suspended)
- [ ] Password confirmed (currently: `kachehub2025` - change in production!)
- [ ] Account can send/receive (test with webmail)

### Step 2: Verify Configuration Files
- [ ] `.env` file updated with cPanel SMTP settings
- [ ] `.env` file is in `.gitignore` (not tracked in Git)
- [ ] `config/mail.php` loads from `.env` correctly
- [ ] `utils/mailer.php` has production settings

### Step 3: Environment Setup
- [ ] Running PHP 7.4 or higher
- [ ] PHPMailer installed via Composer
- [ ] OpenSSL enabled (for TLS encryption)
- [ ] curl enabled (for HTTPS requests)

### Step 4: Security
- [ ] Change `no-reply` password (update in `.env`)
- [ ] Keep `.env` file with restricted permissions (644)
- [ ] Backup `.env` file separately (NOT in Git)
- [ ] Review error logging settings

---

## File Changes Summary

### Modified Files
```
backend_php/
├── .env                                    ← UPDATED (Production SMTP config)
├── config/mail.php                        ← UPDATED (Production settings)
├── utils/mailer.php                       ← UPDATED (Enhanced error handling)
├── test_email_web.php                     ← CREATED (Email testing interface)
├── verify_cpanel_email.php               ← CREATED (Configuration verifier)
├── CPANEL_EMAIL_PRODUCTION.md             ← CREATED (Documentation)
└── EMAIL_SETUP.md                         ← CREATED (Setup guide)
```

---

## Deployment Steps

### Step 1: Upload Files to Production
```bash
# Via SFTP/FTP or Git push
# Upload these modified files:
- .env (with production values)
- config/mail.php
- utils/mailer.php
- test_email_web.php
- verify_cpanel_email.php
```

### Step 2: Set Correct Permissions
```bash
# Via SSH (if available)
chmod 644 .env                          # Read-only for web server
chmod 755 config/ utils/                # Readable directories
chmod 644 verify_cpanel_email.php
chmod 644 test_email_web.php
```

### Step 3: Verify Configuration
```bash
# Via web browser:
https://malenyapharmacy.com/backend_php/verify_cpanel_email.php

# Should show:
✅ All configuration items green
✅ SMTP Server reachable
✅ Email format valid
```

### Step 4: Test Email Sending
```bash
# Via web browser:
https://malenyapharmacy.com/backend_php/test_email_web.php

# Steps:
1. Enter test email address (e.g., your personal email)
2. Click "Send Test Email"
3. Check inbox (allow 5-15 minutes for delivery)
4. If received, email system is working!
```

### Step 5: Configure Email Records (DNS)
In your hosting panel, add these records for email reliability:

**SPF Record:**
```
v=spf1 include:mail.malenyapharmacy.com ~all
```

**DKIM Record:**
- Generated in cPanel → Email Authentication
- Enable in cPanel

**DMARC Record:**
```
v=DMARC1; p=none; rua=mailto:admin@malenyapharmacy.com
```

*Wait 24-48 hours after adding DNS records for full propagation.*

### Step 6: Monitor Email Delivery
```bash
# Check error log (via FTP/SSH):
/backend_php/error_log

# Should contain:
[EMAIL_SUCCESS] Sent to: ...
[EMAIL_SUCCESS] Sent to: ...

# NOT:
[EMAIL_ERROR] ...
```

---

## Configuration Details

### .env File (Production Values)
```ini
# Current production setup:
MAIL_HOST=mail.malenyapharmacy.com
MAIL_PORT=587
MAIL_USERNAME=no-reply@malenyapharmacy.com
MAIL_PASSWORD=kachehub2025              # ⚠️ CHANGE THIS!
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@malenyapharmacy.com
MAIL_FROM_NAME=Malenya Pharmacy

# Password Reset Base URL:
RESET_BASE_URL=https://malenyapharmacy.com/auth/reset-password?token=
```

### Security Recommendations
```ini
# IMPORTANT: For production, change these:

1. Change email password:
   - cPanel → Email Accounts → Change Password
   - Update MAIL_PASSWORD in .env

2. Use separate email accounts:
   - noreply@malenyapharmacy.com    → System emails
   - support@malenyapharmacy.com    → Customer inquiries
   - admin@malenyapharmacy.com      → Alerts

3. Set up email forwarding:
   - noreply → admin (monitor delivery)
   - support → admin (handle customer emails)
```

---

## Features Now Enabled

✅ **User Registration & Password Reset**
- Users can reset passwords via email
- Verification links sent automatically

✅ **Admin Notifications**
- Order notifications
- Low stock alerts
- System errors

✅ **Email Logging**
- All emails logged to error_log
- Success/failure tracking
- Debugging information

✅ **Multiple Email Accounts Support**
- Ready to add more email accounts easily
- Update .env to switch accounts

---

## Deployment Testing Checklist

### Functional Tests
- [ ] User can receive password reset emails
- [ ] Password reset link works
- [ ] Admin receives system notifications
- [ ] Emails have correct sender name
- [ ] Email formatting is correct (HTML)

### Performance Tests
- [ ] Emails send within acceptable time (< 10sec)
- [ ] No timeouts or connection errors
- [ ] Bulk emails don't crash system
- [ ] Error logging doesn't slow down app

### Security Tests
- [ ] Sensitive data not in logs
- [ ] Password not exposed in error messages
- [ ] Email validation working
- [ ] Rate limiting not bypassed

---

## Rollback Plan (If Something Goes Wrong)

### Quick Rollback
```bash
1. SSH into production server
2. Restore previous .env file
3. Restore previous config/mail.php
4. Restart web server (or wait for reconnect)

# Or via FTP:
1. Delete modified files
2. Upload backup .env
3. Refresh email test page
```

### Fallback Email Services
If cPanel emails fail, automatically switch to:

**Option 1: Backup Gmail Account**
```ini
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your.backup@gmail.com
MAIL_PASSWORD=app_password
MAIL_ENCRYPTION=tls
```

**Option 2: Mailtrap (Testing)**
```ini
MAIL_HOST=live.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=mailtrap_username
MAIL_PASSWORD=mailtrap_password
MAIL_ENCRYPTION=tls
```

---

## Production Monitoring

### Daily Checks
- [ ] Check error_log for email failures
- [ ] Verify database password_resets table
- [ ] Monitor email delivery times
- [ ] Check for spam complaints

### Weekly Checks
- [ ] Review email bounce rates
- [ ] Check backup systems
- [ ] Update documentation
- [ ] Test password reset flow

### Monthly Checks
- [ ] Review email security settings
- [ ] Audit email account permissions
- [ ] Update DNS records (if needed)
- [ ] Archive logs

---

## Troubleshooting

### Issue: "Authentication failed"
**Solution:**
1. Verify email password in cPanel webmail
2. Confirm `.env` has correct password
3. Check for special characters in password
4. Reset password, update .env

### Issue: "Connection timeout"
**Solution:**
1. Contact hosting provider about port 587 access
2. Try port 465 instead (update .env)
3. Check firewall isn't blocking outbound SMTP
4. Verify DNS/mail server is responding

### Issue: "Email not received"
**Solution:**
1. Check spam/junk folder
2. Verify sender email format
3. Check error_log for errors
4. Test with simple text email first
5. Verify SPF/DKIM/DMARC records

### Issue: "Server is blocking emails"
**Solution:**
1. Contact hosting provider
2. Check for rate limiting
3. Verify authentication method
4. Check email account isn't suspended

---

## Support Resources

### cPanel Documentation
- Email Accounts: https://documentation.cpanel.net
- Email Authentication: https://documentation.cpanel.net/display/EAS
- Whitelabel Portal: https://documentation.cpanel.net

### PHPMailer Library
- GitHub: https://github.com/PHPMailer/PHPMailer
- Docs: https://github.com/PHPMailer/PHPMailer/wiki

### Email Deliverability
- MXToolbox: https://mxtoolbox.com (verify SPF/DKIM)
- Mail Tester: https://www.mail-tester.com
- IsNotSpam: https://www.isnotspam.com

---

## Deployment Sign-Off

**Deployed By:** ________________________  
**Date:** ________________________  
**Verified Working:** ✓ YES ☐ NO  
**Notes:** _________________________________  

---

## Quick Reference Commands

```bash
# Check email configuration via SSH
cat /home/username/public_html/backend_php/.env | grep MAIL_

# View recent email logs
tail -50 /home/username/public_html/backend_php/error_log | grep EMAIL

# Test SMTP connection
telnet mail.malenyapharmacy.com 587

# Verify dnsrecords
dig malenyapharmacy.com TXT
```

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `.env` | Configuration values | ✅ Production Ready |
| `config/mail.php` | Mail settings | ✅ Production Ready |
| `utils/mailer.php` | Core mailer function | ✅ Enhanced |
| `test_email_web.php` | Testing tool | ✅ Ready |
| `verify_cpanel_email.php` | Verification script | ✅ Ready |
| `CPANEL_EMAIL_PRODUCTION.md` | Full documentation | ✅ Complete |

---

Generated: February 9, 2026  
Status: ✅ Ready for Deployment
