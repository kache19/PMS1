# AUDITOR Role Implementation

## Overview
The AUDITOR role has been added to the pharmacy management system to provide final shipment verification and inventory readiness authorization.

## AUDITOR Permissions & Restrictions

### Can Access:
- **Dashboard**: View summary information
- **Inventory Module**: Read-only view of shipments and inventory
- **Shipment Verification**: Final approval to mark shipments as ready for sale
- **Reports**: View inventory and shipment reports
- **Customers & Suppliers**: View customer and supplier information

### Cannot Access:
- **Point of Sale (POS)**: No access to sales transactions
- **Restocking**: Read-only access only, cannot create or modify restocking requests
- **Finance Module**: No financial access
- **Staff Management**: Cannot manage staff
- **Settings**: Cannot modify system settings

## Database Changes

### New/Modified Tables:
1. **staff table**: 
   - Added 'AUDITOR' to role ENUM
   
2. **shipment_verifications table** (NEW):
   - Tracks all shipment verifications by auditors
   - Stores verification date, status, and notes
   - Links verified_by auditor to shipment

3. **shipments table**:
   - Added `verified_at`: Timestamp when shipment was verified
   - Added `verified_by`: ID of auditor who verified
   - Added `ready_for_sale`: Boolean flag indicating shipment inventory is ready for sale

## API Endpoints Updated

### Shipments Routes (`backend_php/routes/shipments.php`):
- **GET /shipments**: Now includes AUDITOR role authorization
- **GET /shipments/{id}**: Now includes AUDITOR role authorization
- **PUT /shipments/{id}**: 
  - AUDITOR can verify shipments using `readyForSale: true`
  - AUDITOR cannot change shipment status
  - Other roles (SUPER_ADMIN, BRANCH_MANAGER, INVENTORY_CONTROLLER) can change status

### Verification Logic:
When an AUDITOR updates a shipment with `readyForSale: true`:
- `ready_for_sale` column is set to 1
- `verified_by` is set to the auditor's ID
- `verified_at` is set to current timestamp

## Frontend Changes

### Type Definitions (`frontend/types.ts`, `types.ts`):
- Added `AUDITOR = 'AUDITOR'` to UserRole enum

### Layout Component (`frontend/components/Layout.tsx`):
- Added AUDITOR permissions: `['dashboard', 'inventory', 'reports', 'entities']`
- AUDITOR will see menu items for: Dashboard, Inventory, Reports, Customers & Suppliers

## Workflow for Auditors

1. **Auditor logs in** with AUDITOR role
2. **Navigates to Inventory module** (Shipments tab if available)
3. **Views pending shipments** needing verification
4. **Reviews shipment details**:
   - Products and quantities received
   - Batch numbers and expiry dates
   - From/To branch information
5. **Verifies shipment** by clicking "Verify & Mark Ready for Sale"
6. **Shipment marked as ready** for sale in receiving branch inventory
7. **Audit trail** recorded with auditor ID and verification timestamp

## Usage Example

### Creating an Auditor User:
```sql
INSERT INTO staff (id, name, role, branch_id, email, phone, status, username, password_hash)
VALUES ('AUD-001', 'John Auditor', 'AUDITOR', 'BR003', 'john.auditor@pms.co.tz', '+255700000000', 'ACTIVE', 'john_auditor', '$2y$10$[hashed_password]');
```

### Verifying a Shipment (API):
```bash
PUT /backend_php/routes/shipments.php?id=SHIP-123456

{
  "readyForSale": true
}
```

## Database Migration

Run the migration to set up the required schema changes:
```bash
mysql -u malenyap_pharma -p malenyap_pharma < backend_php/migrations/add_auditor_role.sql
```

## Notes

- Auditors can ONLY verify shipments, not approve or change their status
- The distinction between "approved" (for transfer) and "verified/ready for sale" (for inventory availability) is maintained
- Audit trail includes auditor ID and exact timestamp of verification
- Read-only access to restocking means auditors can view restocking status but cannot modify it
- Auditors are restricted from POS to prevent any sales transaction involvement
