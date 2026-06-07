# Local Testing Guide - Haleelo Tower Phase 1

Complete instructions for testing the entire Phase 1 implementation on your local machine.

## 📋 Prerequisites

Before starting, ensure you have installed:
- **PostgreSQL 16** - Database
- **Node.js 20+** - JavaScript runtime
- **npm 10+** - Package manager
- **Git** - Version control
- **Composer** - PHP dependency manager
- **PHP 8.3+** - PHP runtime
- **Redis 7** - Cache/queue backend

### Installation Quick Links
- PostgreSQL: https://www.postgresql.org/download/windows/
- Node.js: https://nodejs.org/ (includes npm)
- Composer: https://getcomposer.org/download/
- Redis: Use Docker `docker run -d -p 6379:6379 redis:7` or Memurai for Windows

---

## 🔧 Step 1: Database Setup (15 minutes)

### Create PostgreSQL Database

Open PowerShell or Command Prompt and connect to PostgreSQL:

```powershell
# Connect to PostgreSQL (default user: postgres)
psql -U postgres

# Run these commands in psql:
CREATE DATABASE haleelo_tower;
CREATE USER haleelo_user WITH PASSWORD 'HaleeloPass123!';

ALTER ROLE haleelo_user SET client_encoding TO 'utf8';
ALTER ROLE haleelo_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE haleelo_user SET default_transaction_deferrable TO ON;
ALTER ROLE haleelo_user SET timezone TO 'UTC';

GRANT ALL PRIVILEGES ON DATABASE haleelo_tower TO haleelo_user;

# Verify
\du  # Should show haleelo_user
\l   # Should show haleelo_tower database

# Exit
\q
```

### Verify Connection

```powershell
# Test connection
psql -U haleelo_user -d haleelo_tower -h 127.0.0.1

# Should connect successfully
# Exit with: \q
```

---

## 🚀 Step 2: Backend Setup (30 minutes)

### Terminal 1: Laravel Backend

```powershell
# Navigate to API directory
cd haleelo-tower\api

# Install Composer dependencies
composer install

# Copy environment file
copy .env.example .env

# Generate app key
php artisan key:generate

# Verify .env configuration
# Should show:
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=haleelo_tower
# DB_USERNAME=haleelo_user
# DB_PASSWORD=HaleeloPass123!
```

### Run Database Migrations

```powershell
# In api directory, run migrations with seeders
php artisan migrate --seed

# Expected output:
# ✓ Migration: 2024_01_01_000001_create_users_table
# ✓ Migration: 2024_01_01_000002_create_audit_logs_table
# ✓ Migration: 2024_01_01_000003_create_system_settings_table
# ✓ Migration: 2024_01_01_000004_create_permission_tables
# Seeding: RoleSeeder
# Seeding: SystemSettingsSeeder
```

### Start Laravel Dev Server

```powershell
# In api directory
php artisan serve

# Expected output:
# Laravel development server started: http://127.0.0.1:8000
# 
# Keep this terminal running!
```

**Backend is now running at: http://localhost:8000**

---

## 🎨 Step 3: Frontend Setup (20 minutes)

### Terminal 2: Admin Dashboard

```powershell
# In NEW terminal/tab, navigate to admin directory
cd haleelo-tower\admin

# Install npm dependencies
npm install

# Start development server
npm run dev

# Expected output:
# > next dev
# ▲ Next.js 14.x.x
# - Local: http://localhost:3000
#
# Keep this terminal running!
```

**Admin Dashboard is now running at: http://localhost:3000**

---

## 🧪 Step 4: Test the System

### A. Test Backend APIs First (Using Postman or curl)

#### 1. Health Check
```bash
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-07T12:34:56.000000Z"
}
```

#### 2. Login (Create Test User First)

Open another Terminal 3 and create a test user:

```powershell
cd haleelo-tower\api

# Access Laravel tinker to create a user directly
php artisan tinker

# In tinker, run:
$user = App\Models\User::create([
  'name' => 'Admin Test',
  'email' => 'admin@halelotower.so',
  'password' => bcrypt('AdminPass123!'),
  'phone' => '+252616666666',
  'job_title' => 'Building Manager',
  'status' => 'active'
]);

$user->assignRole('admin');

# Exit tinker with: exit
```

#### 3. Test Login Endpoint

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@halelotower.so",
    "password": "AdminPass123!"
  }'
```

**Expected Response:**
```json
{
  "requires_2fa": true,
  "user_id": 1,
  "message": "2FA code sent to your phone."
}
```

#### 4. Test 2FA Verification

Get the OTP from your Laravel console or use debug:

```powershell
# In terminal 1 (Laravel server), when 2FA is triggered, check logs
# The OTP should be visible in cache or logs
# For testing, use: 000000 (or check cache)
```

```bash
curl -X POST http://localhost:8000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "otp": "000000"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin Test",
    "email": "admin@halelotower.so",
    "role": "admin",
    "permissions": [...]
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### 5. Test Get Authenticated User

```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the token from the 2FA response.

---

### B. Test Frontend (http://localhost:3000)

#### 1. Login Page

1. Open http://localhost:3000 in browser
2. Browser automatically redirects to http://localhost:3000/auth/login
3. You should see the login page with:
   - Haleelo Tower logo
   - Email input field
   - Password input field
   - Demo credentials in blue box

#### 2. Attempt Login with Wrong Credentials

1. Enter: `wrong@email.com` / `WrongPass123!`
2. Click "Login"
3. **Expected**: Error message "Invalid credentials or account locked."

#### 3. Login with Correct Credentials

1. Enter email: `admin@halelotower.so`
2. Enter password: `AdminPass123!`
3. Click "Login"
4. **Expected**: Redirects to 2FA page with message "Enter the 6-digit code from WhatsApp"

#### 4. 2FA Verification

1. Note the user ID from URL (e.g., `?userId=1`)
2. In another browser tab, go to: http://localhost:8000 (Laravel server)
3. Check the Laravel console for the OTP (should be logged or cached)
4. Or use test OTP: `000000`
5. Enter OTP on the 2FA page
6. Click "Verify"
7. **Expected**: Redirects to dashboard (http://localhost:3000/dashboard)

#### 5. Dashboard

You should see:
- Haleelo Tower sidebar on left with navigation
- Dashboard header with "Welcome back, Admin Test!"
- Quick action buttons
- User information card
- Status indicators (showing "—" for Phase 2 data)

#### 6. Users Management

1. Click "👥 Users" in sidebar
2. **Expected**: Users page with list table
3. Click "➕ Create User" button
4. Fill in form:
   - Name: `John Operator`
   - Email: `operator@halelotower.so`
   - Phone: `+252616666667`
   - Job Title: `Operations Staff`
   - Role: `operations`
   - Password: `OperatorPass123!`
5. Click "Create User"
6. **Expected**: Redirected back to users list, new user appears

#### 7. Settings

1. Click "⚙️ Settings" in sidebar
2. Click "General" in left menu
3. You should see settings fields:
   - building_name: "Haleelo Tower"
   - contact_email: "info@halelotower.so"
   - contact_phone: "+252616666666"
   - address: "Mogadishu, Somalia"
   - etc.
4. Modify one setting (e.g., contact_email to test@example.com)
5. Click "Save Changes"
6. **Expected**: Success message "✓ Settings saved successfully!"

#### 8. Audit Logs

1. Click "📋 Audit Logs" in sidebar
2. **Expected**: Shows list of audit log entries
3. Each entry should show:
   - User name and role
   - Action (created, updated, login, etc.)
   - Model type and ID
   - Timestamp
4. Use "Action" dropdown to filter
5. **Expected**: Filters work, showing only selected action type

#### 9. Logout

1. Click user avatar (top right)
2. Click "Logout"
3. **Expected**: Redirects to login page, session cleared

---

## 🔍 Step 5: Detailed Feature Testing

### Authentication Flow

**Test Case 1: Failed Login Attempts Leading to Lockout**
- Create a new test user
- Attempt login 5 times with wrong password
- 6th attempt should show: "Invalid credentials or account locked."
- Wait 15 minutes or unlock via admin panel
- ✅ Should be able to login again after unlock

**Test Case 2: 2FA Session**
- Login correctly
- Go to 2FA page
- Wait more than 5 minutes
- Try to submit OTP
- ✅ Should show "Invalid or expired OTP"

**Test Case 3: Session Timeout**
- Login to dashboard
- Leave page idle for 8 hours (or mock with browser dev tools)
- Try to make any request
- ✅ Should redirect to login

### User Management

**Test Case 4: Create User with Invalid Password**
- Go to create user page
- Fill in user details
- Enter password: `Short1!` (only 7 chars)
- Click Create
- ✅ Should show error: "Must be at least 8 characters"

**Test Case 5: Create User with Missing Uppercase**
- Enter password: `lowerpass123!`
- ✅ Should show error: "Must contain uppercase letter"

**Test Case 6: Edit User**
- From users list, click Edit on any user
- Modify name or email
- Save
- ✅ Changes should appear in list immediately
- Audit log should show "updated" action

**Test Case 7: Deactivate and Reactivate User**
- From users list, click Deactivate on a user
- Confirm modal
- ✅ User status changes to "Inactive"
- ✅ Button changes to "Reactivate"
- Click Reactivate
- ✅ User status changes back to "Active"

### Settings

**Test Case 8: Update All Setting Categories**
- General → Change building name
- Session Times → Change morning start time
- Payment Terms → Change due days
- Electricity → Change rate per kWh
- All should save successfully
- ✅ Audit logs should show updates

**Test Case 9: Settings Caching**
- Update a setting
- In another browser tab, go to same settings page
- ✅ Should reflect the update immediately (cached)

### Audit Trail

**Test Case 10: Audit Log Capture**
- Perform an action (create user, update setting)
- Go to Audit Logs
- ✅ Should see the action listed with:
  - Correct user name
  - Correct action type
  - Correct model type
  - Old and new values (if applicable)
  - Current timestamp

**Test Case 11: Audit Log Filtering**
- Filter by "created" action
- ✅ Should only show created entries
- Filter by "updated" action
- ✅ Should only show updated entries

### RBAC (Role-Based Access Control)

**Test Case 12: Operations Role Restrictions**
- Create a user with "operations" role
- Login as that user (in incognito window)
- ✅ Should NOT see "Users" menu item
- ✅ Should NOT see "Settings" menu item
- ✅ Should NOT see "Audit Logs" menu item
- Try accessing `/users` directly
- ✅ Should get permission denied or empty state

**Test Case 13: Permission Arrays**
- Login as "admin" user
- Check browser console: `console.log(localStorage.getItem('user'))`
- ✅ Should show permissions array with specific permissions
- Different roles should have different permissions

---

## 📊 Step 6: Database Verification

### Check Created Data

Open Terminal and access database:

```powershell
psql -U haleelo_user -d haleelo_tower -h 127.0.0.1

# Inside psql:

# Check users table
SELECT id, name, email, role, status FROM users;

# Check roles
SELECT * FROM roles;

# Check permissions
SELECT * FROM permissions LIMIT 5;

# Check audit logs
SELECT user_name, action, model_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;

# Check system settings
SELECT key, value FROM system_settings LIMIT 10;

# Exit
\q
```

**Expected Results:**
- ✅ Users table has your test users
- ✅ 4 roles exist (super_admin, admin, operations, finance)
- ✅ 40+ permissions exist
- ✅ Audit logs contain your actions
- ✅ 24 system settings exist with default values

---

## 🐛 Step 7: Troubleshooting

### Issue: "SQLSTATE[HY000]: General error: 1030 Got error 28"

**Solution**: Your disk is likely full. Free up disk space.

### Issue: "Connection refused" to database

**Check**:
```powershell
# Verify PostgreSQL is running
pg_isready -h 127.0.0.1 -p 5432

# Should return: accepting connections
```

**Solution**: Start PostgreSQL service:
```powershell
# On Windows with PostgreSQL installed:
# Services → PostgreSQL → Start
# Or via command line if installed as service
net start postgresql-x64-16
```

### Issue: "Database does not exist"

**Solution**: Re-run database creation:
```powershell
psql -U postgres -c "CREATE DATABASE haleelo_tower;"
psql -U postgres -c "CREATE USER haleelo_user WITH PASSWORD 'HaleeloPass123!';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE haleelo_tower TO haleelo_user;"
```

### Issue: "Composer not found"

**Solution**: Add Composer to PATH or run:
```powershell
php -d memory_limit=-1 C:\path\to\composer.phar install
```

### Issue: Frontend shows "API connection failed"

**Check**:
1. Is Laravel server running? (Terminal 1)
2. Is API URL correct? Check `admin/.env.local`
3. Are CORS headers configured?

### Issue: OTP not received in demo

**Workaround**: In development, OTP is cached. You can:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Use test OTP: `000000`
3. Check Redis cache: `redis-cli`

### Issue: npm install fails

**Solution**:
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

---

## ✅ Testing Checklist

Copy this checklist and mark off as you complete:

### Backend API
- [ ] Health check endpoint works
- [ ] Login endpoint returns 2FA required
- [ ] 2FA verification returns token
- [ ] /api/auth/me returns user with permissions
- [ ] Logout clears session
- [ ] GET /api/users returns paginated list
- [ ] POST /api/users creates user
- [ ] PUT /api/users/{id} updates user
- [ ] DELETE /api/users/{id} deactivates user
- [ ] GET /api/settings returns all settings
- [ ] PUT /api/settings updates settings
- [ ] GET /api/audit-logs returns filtered logs

### Frontend Auth
- [ ] Login page loads
- [ ] Error message on wrong credentials
- [ ] Redirects to 2FA on correct credentials
- [ ] 2FA page shows form
- [ ] Redirects to dashboard on valid OTP
- [ ] Logout clears session and redirects

### Frontend Dashboard
- [ ] Dashboard loads after login
- [ ] Sidebar shows navigation items
- [ ] User menu shows name and role
- [ ] Logout button works

### User Management
- [ ] Users list loads
- [ ] Search by name/email works
- [ ] Filter by role works
- [ ] Filter by status works
- [ ] Create user form validates password
- [ ] Create user creates user in database
- [ ] Edit user updates database
- [ ] Deactivate user soft-deletes
- [ ] Reactivate user restores user
- [ ] Audit log shows user actions

### Settings
- [ ] General settings load
- [ ] Session settings load
- [ ] Electricity settings load
- [ ] Payment settings load
- [ ] Updates save to database
- [ ] Updates reflect immediately (cache)
- [ ] Audit logs show setting updates

### Audit Logs
- [ ] Logs display with pagination
- [ ] Filter by action works
- [ ] Logs show correct details (user, action, model, timestamp)
- [ ] Log entries created for all actions

### RBAC
- [ ] Super Admin sees all menu items
- [ ] Admin sees appropriate menu items
- [ ] Operations cannot see User/Settings/Audit
- [ ] Finance sees appropriate items
- [ ] Permissions array matches user role

---

## 🎉 Success Criteria

Phase 1 is complete when:

✅ Backend API passes all endpoint tests
✅ Frontend login/2FA flow works end-to-end
✅ User management CRUD operations work
✅ Settings can be updated and persist
✅ Audit logs capture all actions
✅ RBAC properly restricts access
✅ Database has correct schema and data
✅ All 12 test cases pass

---

## 📞 Getting Help

If tests fail:

1. **Check the logs**:
   - Laravel: `api/storage/logs/laravel.log`
   - Browser console: F12 → Console tab
   - Network tab: F12 → Network tab

2. **Verify configuration**:
   - `api/.env` has correct database credentials
   - `admin/.env.local` has correct API URL
   - PostgreSQL database exists and is accessible

3. **Restart services**:
   - Restart Laravel: Ctrl+C, then `php artisan serve`
   - Restart Next.js: Ctrl+C, then `npm run dev`
   - Restart Redis: Stop and restart

4. **Check implementation plan**:
   - Read: `Planning/IMPLEMENTATION_PLAN.md`
   - Read: `api/README.md`
   - Read: `admin/README.md`

---

**Created**: June 7, 2026  
**For**: Haleelo Tower Phase 1 Local Testing  
**Status**: Complete and Ready to Test ✅
