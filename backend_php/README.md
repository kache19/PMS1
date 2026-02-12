# Pharmacy Management System - PHP Backend

This backend is a plain PHP + MySQL API served from `backend_php/index.php`.

## Quick Start

1. Install dependencies

```bash
composer install
```

2. Configure database credentials in `config/database.php` (or use env vars `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

3. Import schema (from project root):

```bash
mysql -u root -p malenyap_pharma < ../schema_mysql.sql
```

If your environment uses the newer dump, import `../2026_db.sql` instead.

4. Verify connection:

```bash
php test_connection.php
```

5. Run migrations when needed:

```bash
php run_migration.php
```

6. Serve API (development):

```bash
php -S localhost:8000 index.php
```

## API Base URL

- Direct PHP server: `http://localhost:8000/api/`
- XAMPP/Apache path setup (this repo default): `http://localhost/backend_php/index.php/api/`

## Key Endpoints

- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/inventory`
- `POST /api/inventory/transfers`
- `GET /api/finance/invoices`
- `GET /api/health`

## Email Features

Email and password reset use PHPMailer. Configure SMTP in `config/mail.php`.

Useful scripts:

- `php send_test_email.php`
- `php test_email_feature.php [base_url] [admin_token] [test_email]`

## Notes

- This backend uses route files under `routes/` and utility helpers in `utils/`.
- `routes/disposals.php` is currently a placeholder and should be completed before relying on disposal approvals in production.
