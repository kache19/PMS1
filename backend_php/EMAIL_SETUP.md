# Email Configuration Setup Guide

## Current Status
Your PHP environment has extension version mismatches preventing SMTP over SSL/TLS. Follow one of the options below to send emails.

---

## Option 1: Local Mail Server (Simplest for Development)

**Status**: Ready to test immediately  
**How it works**: Uses PHP's built-in `mail()` function via local SMTP server

### Setup:
1. Your `.env` is already configured to use `localhost:25`
2. The `php.ini` has been updated with mail settings
3. You'll need a local mail server running:
   - **Windows**: InstallMailHog, Papercut, or configure SMTP service
   - **Quick Test**: Use Mailtrap (see Option 2)

### Test:
```
Visit: http://localhost/backend_php/test_email_web.php
```

---

## Option 2: Mailtrap.io (Best for Testing - Recommended)

**Status**: Free, no setup required, all emails captured for testing

### Setup:
1. Go to https://mailtrap.io
2. Sign up for free account (no credit card needed)
3. Create a new inbox
4. Get your SMTP credentials from "Integrations" → "NodeJS"
5. Update your `.env` file:

```ini
# Uncomment these lines:
MAIL_HOST=live.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=your_smtp_username
MAIL_PASSWORD=your_smtp_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=hello@example.com
MAIL_FROM_NAME=Malenya Pharmacy

# Comment out the localhost settings
```

6. Test:
```
Visit: http://localhost/backend_php/test_email_web.php?email=bigsaleceo72@gmail.com
```

All emails will be captured in your Mailtrap inbox instead of being sent to real addresses.

---

## Option 3: Gmail SMTP (Production)

**Status**: Works with Gmail accounts

### Setup:

#### Step 1: Enable 2-Factor Authentication
You must have 2FA enabled on your Google account.

#### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Google will generate a 16-character password
4. Copy the password

#### Step 3: Update `.env` file:
```ini
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your.email@gmail.com
MAIL_PASSWORD=your_16_char_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your.email@gmail.com
MAIL_FROM_NAME=Malenya Pharmacy
```

#### Step 4: Test:
```
Visit: http://localhost/backend_php/test_email_web.php?email=bigsaleceo72@gmail.com
```

---

## Option 4: SendGrid API (Scale & Production)

**Status**: Recommended for production

### Setup:
1. Create SendGrid account at https://sendgrid.com
2. Create an API key
3. Install SendGrid package:
   ```bash
   cd /xampp/htdocs/backend_php
   composer require sendgrid/sendgrid-php
   ```
4. Create new mailer function or use SendGrid's PHP library

---

## Testing Your Configuration

### Web Interface (Easiest):
```
http://localhost/backend_php/test_email_web.php
```
- Enter recipient email
- Click "Send Test Email"
- Check result

### Command Line (If CLI works):
```bash
c:\xampp\php\php.exe c:\xampp\htdocs\backend_php\test_send_email_user.php
```

### Check Email Delivery:
- **Mailtrap**: Emails appear in Mailtrap inbox within 2 seconds
- **Gmail**: Emails appear in recipient's inbox within 5-15 seconds
- **Local**: Check your mail server's mailbox

---

## Troubleshooting

### Issue: "Could not instantiate mail function"
- **Fix 1**: Use Mailtrap (Option 2) - no server setup needed
- **Fix 2**: Install local mail server like MailHog
- **Fix 3**: Use Gmail (Option 3)

### Issue: "Authentication failed"
- Check `.env` file for typos
- Verify credentials are correct
- For Gmail: Ensure app password is 16 characters
- For Mailtrap: Copy from correct integration

### Issue: "Connection timeout"
- Verify MAIL_HOST is correct
- Verify MAIL_PORT is open
- Check firewall settings
- Try port 587 instead of 465

---

## Environment Variables Explanation

```ini
MAIL_HOST         # SMTP server address
MAIL_PORT         # SMTP port (25, 587, 465)
MAIL_USERNAME     # Login username
MAIL_PASSWORD     # Login password
MAIL_ENCRYPTION   # Encryption: tls, ssl, or empty
MAIL_FROM_ADDRESS # From email address (must be valid with service)
MAIL_FROM_NAME    # Display name
```

---

## Files Modified
- ✓ `/backend_php/.env` - Updated with 3 configuration options
- ✓ `/xampp/php/php.ini` - Added mail function settings
- ✓ `/backend_php/utils/mailer.php` - Improved autoloader path detection
- ✓ `/backend_php/test_email_web.php` - Web interface for testing

---

## Next Steps

1. **Choose your option** (Mailtrap recommended)
2. **Update `.env`** with credentials
3. **Test**: Visit http://localhost/backend_php/test_email_web.php
4. **Verify**: Check inbox (Mailtrap, Gmail, etc.)
5. **Verify**: Check error_log for any issues

Good luck! 🚀
