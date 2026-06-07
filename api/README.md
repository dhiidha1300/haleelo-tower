# Haleelo Tower API

Laravel 11 REST API backend for the Haleelo Tower platform.

## Quick Start

### Prerequisites
- PHP 8.3+
- PostgreSQL 16
- Redis 7
- Composer

### Installation

1. **Install dependencies**
```bash
composer install
```

2. **Setup environment**
```bash
cp .env.example .env
php artisan key:generate
```

3. **Configure database** (edit `.env`)
```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=haleelo_tower
DB_USERNAME=haleelo_user
DB_PASSWORD=your_secure_password
```

4. **Run migrations and seeders**
```bash
php artisan migrate --seed
```

5. **Create storage symlink**
```bash
php artisan storage:link
```

6. **Start development server**
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

## Phase 1 Features (User Management & Auth)

### Core Functionality

✅ **Authentication**
- Staff login with email + password
- 2FA via WhatsApp OTP (6-digit code)
- 2FA required on every login
- Failed login lockout (5 attempts → 15 min lockout)
- Laravel Sanctum SPA cookie tokens
- Session timeout (8 hours for staff)

✅ **User Management**
- Create staff users (Super Admin, Admin)
- Edit user details
- Deactivate/reactivate users
- Reset/change passwords
- Password policy enforcement
  - Minimum 8 characters
  - Must include uppercase, number, symbol
- User list with search, filter by role/status
- 25 records per page pagination

✅ **Role-Based Access Control**
- 4 roles: Super Admin, Admin, Operations, Finance
- Spatie Laravel Permission package
- Permission-based middleware on all routes
- Role assignment per user
- Dynamic permission arrays returned in /api/auth/me

✅ **System Settings (9 Categories)**
- General (building name, logo, contact, address, timezone, date format)
- Session Times (Morning, Afternoon, Evening start/end)
- Payment Terms (invoice due days)
- Email (Resend API configuration)
- WhatsApp (provider: Twilio or 360dialog)
- Electricity (rate per kWh)
- Payroll (working hours/days settings)
- Fiscal Year (start month)
- Catering Add-ons (DJ, Cameraman pricing)

✅ **Audit Trail**
- Immutable log of all state-changing actions
- Captured data: user, action type, model, old/new values, IP address, timestamp
- Filterable by: user, date range, action type, model type
- Searchable by model ID or reference code
- Exportable as PDF and Excel
- 50 records per page pagination
- Append-only (no edit/delete permissions)

## API Endpoints (Phase 1)

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Staff login | ✗ |
| POST | `/api/auth/2fa/verify` | Verify 2FA OTP | ✗ |
| GET | `/api/auth/me` | Get authenticated user | ✓ |
| POST | `/api/auth/logout` | Logout | ✓ |

### User Management

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/users` | List users | ✓ | Super Admin, Admin |
| POST | `/api/users` | Create user | ✓ | Super Admin, Admin |
| GET | `/api/users/{id}` | Get user | ✓ | Super Admin, Admin |
| PUT | `/api/users/{id}` | Update user | ✓ | Super Admin, Admin |
| DELETE | `/api/users/{id}` | Deactivate user | ✓ | Super Admin, Admin |
| POST | `/api/users/{id}/reactivate` | Reactivate user | ✓ | Super Admin, Admin |
| POST | `/api/users/{id}/unlock` | Unlock locked account | ✓ | Super Admin, Admin |
| POST | `/api/users/{id}/reset-password` | Reset user password | ✓ | Super Admin, Admin |
| POST | `/api/password/change` | Change own password | ✓ | All |

### System Settings

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/settings` | Get all settings | ✓ | Super Admin, Admin |
| GET | `/api/settings/{key}` | Get single setting | ✓ | Super Admin, Admin |
| PUT | `/api/settings` | Update multiple settings | ✓ | Super Admin, Admin |
| PUT | `/api/settings/{key}` | Update single setting | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/general` | Get general settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/session` | Get session settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/payment` | Get payment settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/email` | Get email settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/whatsapp` | Get WhatsApp settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/electricity` | Get electricity settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/payroll` | Get payroll settings | ✓ | Super Admin, Admin |
| GET | `/api/settings-category/fiscal` | Get fiscal settings | ✓ | Super Admin, Admin |

### Audit Logs

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/audit-logs` | List audit logs | ✓ | Super Admin, Admin |
| GET | `/api/audit-logs/{modelType}/{modelId}` | Get logs for model | ✓ | Super Admin, Admin |
| POST | `/api/audit-logs/export` | Export audit logs | ✓ | Super Admin, Admin |
| GET | `/api/audit-logs/statistics` | Audit statistics | ✓ | Super Admin, Admin |

## Request/Response Examples

### Login Request
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@halelotower.so",
    "password": "SecurePass123!"
  }'
```

**Response (2FA required):**
```json
{
  "requires_2fa": true,
  "user_id": 1,
  "message": "2FA code sent to your phone."
}
```

### Verify 2FA Request
```bash
curl -X POST http://localhost:8000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "otp": "123456"
  }'
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@halelotower.so",
    "role": "admin",
    "permissions": ["manage-users", "view-settings", ...]
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Authenticated User
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer {token}"
```

## Database Schema (Phase 1)

### Users Table
- id (bigint, PK)
- name, job_title, email, phone
- password, 2fa_secret, 2fa_confirmed_at
- status (active/inactive)
- profile_photo_url
- failed_login_attempts, locked_until
- timestamps, soft deletes

### Roles & Permissions (Spatie)
- roles, permissions tables
- model_has_roles, role_has_permissions
- model_has_permissions pivot tables

### Audit Logs Table
- id, user_id, user_name, user_role
- action (created/updated/deleted/approved/rejected/login/logout/exported)
- model_type, model_id
- old_values, new_values (JSON)
- ip_address, created_at
- Indexed by: user_id, created_at, action, model_type

### System Settings Table
- id, key (unique), value, description
- updated_by (foreign key to users)

## Testing

### Test Authentication Flow
1. Run migrations: `php artisan migrate:fresh --seed`
2. Login with test credentials (created by seeders)
3. Verify OTP generation and validation
4. Check token creation and validation
5. Test role-based access restrictions

### Test User Management
1. Create a new user via POST /api/users
2. Verify user creation logged in audit_logs
3. Update user details
4. Deactivate user (verify soft delete)
5. Reactivate user
6. Test password reset

### Test Audit Logs
1. Perform 5 state-changing actions
2. Query /api/audit-logs
3. Filter by user, action, date range
4. Verify old_values and new_values captured correctly
5. Test export endpoint

## Architecture Notes

- **Service Layer Pattern**: All business logic in `app/Services/`
- **Thin Controllers**: Controllers validate and delegate to services
- **No Direct DB Access**: Models have relationships; no raw queries
- **Sanctum Auth**: HTTP-only cookie tokens, CSRF-protected
- **Spatie Permissions**: Middleware on every protected route
- **Cache**: System settings cached with 1-hour TTL
- **Audit Service**: Entry point for all audit logging

## Configuration Files

Key Laravel configuration:
- `config/auth.php` - Sanctum guards and token lifetime
- `config/permission.php` - Spatie permission settings
- `config/cors.php` - CORS for 3 frontend subdomains
- `config/cache.php` - Redis cache driver
- `config/queue.php` - Redis queue driver

## Next Steps

- Implement WhatsApp OTP delivery (NotificationService)
- Implement email delivery (Resend API integration)
- Add PDF/Excel export for audit logs
- Phase 2: Booking system development
