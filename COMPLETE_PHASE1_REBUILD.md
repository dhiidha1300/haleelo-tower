# Complete Phase 1 Rebuild
**Status:** Planning Complete Rebuild  
**Start Date:** June 8, 2026  
**Database:** Ready ✅  
**Backend (Laravel):** Rebuild Needed  
**Frontend (Next.js):** Rebuild Needed  

---

## What We're Doing

### Complete Clean Slate Rebuild
We're rebuilding Phase 1 from scratch following the implementation plan exactly. This includes:
- ✅ Database (Already exists)
- 🔄 Laravel API (Build all endpoints)
- 🔄 Next.js Frontend (Build all pages)

### Why This Approach
Previous attempts got tangled up with auth complications and routing issues. A clean rebuild will:
- Follow the plan exactly with no deviations
- Test each component as it's built
- Avoid complex patterns that cause issues
- Be faster and more reliable

---

## Phase 1: User Management & Settings (1 Week)

### Backend: Laravel API Endpoints to Build

#### 1. Authentication Endpoints
```
POST /api/auth/login
- Accept: email, password
- Return: { requires_2fa, user_id, user }
- Sets: Sanctum cookie
- Validate: email exists, password correct, not locked out

POST /api/auth/2fa/verify
- Accept: user_id, otp
- Return: { user, success }
- Sets: Sanctum cookie
- Validate: OTP is valid, not expired

GET /api/auth/me
- Return: { user: {...} } if authenticated
- Return: 401 if not authenticated
- Uses: Sanctum cookie

POST /api/auth/logout
- Destroy: Sanctum session
- Clear: HTTP-only cookie
```

#### 2. User Management Endpoints
```
GET /api/users
- Query: page, search, role, status
- Return: { data: [...], total, per_page, current_page }
- Protect: Admin + Super Admin only
- Filter: by role, status, search name/email

POST /api/users
- Accept: name, email, phone, role, job_title
- Return: { user, success }
- Send: Invite email with temp password via Resend
- Protect: Super Admin only

PUT /api/users/{id}
- Accept: name, email, phone, role, job_title
- Return: { user, success }
- Protect: Super Admin + change own password only
- Audit: Log the change

DELETE /api/users/{id}
- Set: deleted_at (soft delete)
- Return: { success }
- Protect: Super Admin only
- Audit: Log the deactivation

POST /api/users/{id}/reactivate
- Clear: deleted_at
- Return: { success }
- Protect: Super Admin only
```

#### 3. Settings Endpoints
```
GET /api/settings
- Return: { key: value, ... } for all settings
- Cache: 5 minute TTL

PUT /api/settings
- Accept: { settings: [{key, value}, ...] }
- Save: to system_settings table
- Clear: cache
- Return: { success }
- Protect: Super Admin only
- Audit: Log each setting change
```

#### 4. Audit Log Endpoints
```
GET /api/audit-logs
- Query: user_id, action, model_type, start_date, end_date, page
- Return: { data: [...], total, per_page }
- Filter: by user, action, model type, date range
- Search: by model_id
- Protect: Admin + Super Admin only

POST /api/audit-logs/export
- Accept: format (pdf|excel), filters
- Return: Binary file (PDF or Excel)
- Protect: Admin + Super Admin only
```

### Backend: Models & Setup

#### User Model
```php
- id, name, email, password
- phone, job_title, role, status
- created_at, updated_at, deleted_at
- Relationships: roles(), permissions(), audit_logs
- Methods: isAdmin(), isSuperAdmin(), hasRole(), hasPermission()
```

#### Audit Log Model
```php
- id, user_id, user_name, user_role
- action (created|updated|deleted|approved|rejected)
- model_type, model_id
- old_values (JSON), new_values (JSON)
- ip_address, created_at
- Immutable: No update/delete
```

#### System Settings Table
```php
- id, key (unique), value (text)
- description, updated_by
- Pre-populated with 9 settings sections
```

#### Spatie Setup
```php
Roles:
  - super_admin (all access)
  - admin (day-to-day operations)
  - operations (booking intake, tenant onboarding)
  - finance (financial operations)

Permissions:
  - manage-users
  - manage-settings
  - view-audit-logs
  - create-bookings
  - approve-bookings
  - etc.
```

### Backend: Middleware & Protection

```php
// All routes need:
- auth:sanctum (authenticated)
- role:admin|super_admin (role-based)
- permission:manage-users (permission-based)

// Validation:
- Password policy: 8+ chars, uppercase, number, symbol
- Email uniqueness
- Failed login lockout: 5 attempts = 15 min lockout
- Session timeout: 8 hours (staff)
```

---

## Frontend: Next.js Pages to Build

### 1. Authentication Pages

#### /auth/login
```
Layout:
  - Left: Navy gradient background with Haleelo branding
  - Right: Login form on gray background

Components:
  - Email input field
  - Password input field
  - "Sign In" button
  - Error message display
  - Demo credentials section
  - "Forgot Password?" link

Behavior:
  - If already authenticated: redirect to /dashboard
  - On submit: POST /api/auth/login
  - If 2FA required: redirect to /auth/2fa?userId=X
  - If no 2FA: redirect to /dashboard
  - Loading state during submission
  - Clear password on error
```

#### /auth/2fa
```
Layout:
  - Centered card with navy header

Components:
  - 6-digit OTP input field
  - "Verify" button
  - "Back to Login" button
  - Error message display
  - OTP counter (X/6 digits)

Behavior:
  - Get userId from URL query params
  - If no userId: redirect to /auth/login
  - If already authenticated: redirect to /dashboard
  - On submit: POST /api/auth/2fa/verify
  - If valid: redirect to /dashboard
  - If invalid: show error, clear input
  - Loading state during submission
```

#### /auth/password-reset (Optional Phase 1)
```
Simple form to reset forgotten password via email
```

### 2. Dashboard Pages

#### /dashboard/layout (Protected)
```
Layout:
  - Sidebar (collapsible)
  - Header (with hamburger menu)
  - Main content area
  - Footer (optional)

Sidebar:
  - Logo/branding at top
  - Navigation menu:
    * Dashboard
    * Users (if authorized)
    * Settings (if authorized)
    * Audit Logs (if authorized)
  - User info at bottom (name, role)
  - Collapse button

Header:
  - Hamburger menu icon
  - Dashboard title
  - User menu (avatar, name)
    * Settings
    * Logout

Protection:
  - Check /api/auth/me on load
  - If not authenticated: show loading, then redirect to /login
  - If authenticated: render dashboard
```

#### /dashboard (Home)
```
Display:
  - Welcome message (Hello, {User Name}!)
  - KPI cards:
    * Total Users (count from API)
    * Active Leases (0 for now)
    * Pending Bookings (0 for now)
    * Total Revenue (0 for now)
  - Quick actions:
    * Create User
    * View Settings
    * View Audit Logs
    * View Reports (future)
  - Your Information card:
    * Name, Email, Role, Permissions

Styling:
  - KPI cards: white background, shadows, colored left border
  - Navy and gold colors throughout
  - Poppins font
  - Responsive grid layout
```

#### /dashboard/users (Admin Only)
```
Display:
  - Table with columns:
    * Name
    * Email
    * Role
    * Status (Active/Inactive)
    * Actions (Edit, Delete)
  - Search box (by name/email)
  - Filters: Role dropdown, Status dropdown
  - Pagination (25 per page)
  - "Create New User" button

Behavior:
  - GET /api/users?page=1&search=&role=&status=
  - Click row: edit user
  - Delete button: deactivate user (soft delete)
  - Create button: go to /dashboard/users/create
  - Audit logging: all changes logged

Protection:
  - Super Admin only
  - Return 403 if not authorized
```

#### /dashboard/users/create
```
Form Fields:
  - Name (text, required)
  - Email (email, required, unique)
  - Phone (tel, optional)
  - Job Title (text, optional)
  - Role (dropdown: Super Admin, Admin, Operations, Finance)
  - Password (auto-generated, shown before send)

Behavior:
  - POST /api/users
  - Server sends invite email via Resend with temp password
  - Show success message with temp password
  - Redirect to /dashboard/users after 2 seconds
  - Error handling and validation

Protection:
  - Super Admin only
```

#### /dashboard/users/{id}/edit
```
Form Fields:
  - Same as create (except password)
  - Pre-populated with current data
  - Role can be changed
  - Email is read-only (can't change)

Behavior:
  - GET /api/users/{id} to load data
  - PUT /api/users/{id} to save
  - Show success/error message
  - Option to reset password (separate button)

Protection:
  - Super Admin only
  - Or own user (can edit self except role)
```

#### /dashboard/settings
```
Layout:
  - Left sidebar with 9 categories
  - Right content area

Categories (clickable):
  1. ⚙️ General Settings
  2. ⚡ Electricity Rates
  3. 🍽️ Catering Packages
  4. 🕐 Session Times
  5. 💳 Payment Terms
  6. 💬 WhatsApp API
  7. 📧 Email Settings
  8. ⏰ Working Hours
  9. 📅 Fiscal Year

Behavior:
  - GET /api/settings on load
  - Click category: change content area
  - Form inputs for each setting
  - Save button: PUT /api/settings
  - Success/error messages
  - Validation (e.g., rate > 0, hours > 0)

Protection:
  - Super Admin only
  - Admin has read-only access (future)
```

#### /dashboard/audit
```
Display:
  - Table with columns:
    * Date/Time
    * User (who made the change)
    * Action (created, updated, deleted, etc.)
    * Model Type (User, Setting, etc.)
    * Model ID
    * Details (old vs new values)

Filters:
  - User dropdown (list of users)
  - Date range picker (from/to)
  - Action type multi-select
  - Model type multi-select
  - Search box (model ID)

Pagination:
  - 50 records per page

Export:
  - "Export as PDF" button
  - "Export as Excel" button
  - POST /api/audit-logs/export

Protection:
  - Admin + Super Admin only
  - Read-only (no edit/delete)
```

### 3. Styling & Components

#### Brand Colors & Fonts
```
Colors:
  - Navy: #1B2D4F (primary)
  - Gold: #C9A052 (accent)
  - Gray: #F9FAFB (background)
  - White: #FFFFFF (cards, surfaces)
  - Text: #1F2937 (dark), #6B7280 (light)

Font:
  - Family: Poppins
  - Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

Sizing:
  - Sidebar: 256px (w-64) wide when open, 80px (w-20) when collapsed
  - Main content: full width minus sidebar
  - Cards: 1/4 width on desktop, 1/2 on tablet, full on mobile
  - Margins/Padding: Tailwind defaults (4px increments)
```

#### Reusable Components
```
- Button (primary, secondary, danger)
- Input (text, email, password, number, tel)
- Select/Dropdown
- Table (with sorting, pagination)
- Card (for KPIs and info boxes)
- Modal (for confirmations)
- Toast/Alert (for success/error messages)
- Sidebar (collapsible navigation)
- Header (with user menu)
- Avatar (user profile pic)
- Badge (for status, role)
- Spinner (loading indicator)
```

---

## Database Structure (Already Ready)

### Tables Needed
```
✅ users
  - id, name, email, password_hash
  - phone, job_title, role, status
  - created_at, updated_at, deleted_at

✅ audit_logs
  - id, user_id, user_name, user_role
  - action, model_type, model_id
  - old_values (JSON), new_values (JSON)
  - ip_address, created_at

✅ system_settings
  - id, key (unique), value
  - description, updated_by

✅ roles (Spatie)
  - id, name, guard_name

✅ permissions (Spatie)
  - id, name, guard_name

✅ role_has_permissions (Spatie pivot)
✅ model_has_roles (Spatie pivot)
✅ model_has_permissions (Spatie pivot)

❓ personal_access_tokens (Sanctum)
  - Already exists via migration
```

---

## Implementation Order

### Week 1: Phase 1 Complete Build

**Day 1: Backend Setup**
- [ ] Verify database migrations ran
- [ ] Verify Spatie roles/permissions seeded
- [ ] Create auth controllers
- [ ] Create user controllers
- [ ] Create settings controllers
- [ ] Test all endpoints with Postman/curl

**Day 2: Frontend Auth**
- [ ] Build login page
- [ ] Build 2FA page
- [ ] Build AuthProvider & auth context
- [ ] Test login flow end-to-end

**Day 3: Frontend Dashboard & Navigation**
- [ ] Build dashboard layout
- [ ] Build sidebar component
- [ ] Build header component
- [ ] Build dashboard home page
- [ ] Test navigation

**Day 4: Frontend User Management**
- [ ] Build users list page
- [ ] Build create user page
- [ ] Build edit user page
- [ ] Test CRUD operations

**Day 5: Frontend Settings**
- [ ] Build settings page with 9 categories
- [ ] Implement each settings section
- [ ] Test save/load functionality

**Day 6: Frontend Audit Trail**
- [ ] Build audit logs page
- [ ] Implement filters and search
- [ ] Implement export functionality

**Day 7: Testing & Polish**
- [ ] End-to-end testing
- [ ] Styling polish
- [ ] Error handling
- [ ] Responsive design verification
- [ ] Security audit

---

## Success Metrics

✅ Phase 1 is complete and ready when:

1. **Authentication**
   - [ ] Login works with email/password
   - [ ] 2FA works with OTP from WhatsApp
   - [ ] Session persists across page refreshes
   - [ ] Session expires after 8 hours
   - [ ] Lockout works after 5 failed attempts

2. **User Management**
   - [ ] Can list all users
   - [ ] Can create new user (email sent)
   - [ ] Can edit user details
   - [ ] Can deactivate/reactivate user
   - [ ] Role changes take effect immediately

3. **Settings**
   - [ ] All 9 sections accessible
   - [ ] Changes save and persist
   - [ ] Validation works (e.g., rates > 0)
   - [ ] Changes are audited

4. **Audit Trail**
   - [ ] Every change is logged
   - [ ] Can filter and search
   - [ ] Can export to PDF/Excel
   - [ ] Logs are immutable

5. **RBAC**
   - [ ] Super Admin sees everything
   - [ ] Admin sees day-to-day features
   - [ ] Operations sees limited features
   - [ ] Finance sees financial features
   - [ ] Unauthorized users get 403 errors

6. **Styling**
   - [ ] Brand colors applied everywhere
   - [ ] Poppins font used throughout
   - [ ] Responsive on all devices
   - [ ] No layout issues
   - [ ] Professional appearance

---

## Critical Success Factors

1. **Simplicity First** — Build simple, then add features
2. **Test Each Step** — Don't defer testing
3. **Follow the Plan** — Stick to the specification exactly
4. **Clear Error Handling** — Users see meaningful error messages
5. **Audit Everything** — Log all important actions

---

## Risk Mitigation

| Risk | How to Avoid |
|------|-------------|
| Auth gets complicated | Start with simplest possible implementation, no fancy patterns |
| Routes return 404 | Verify dev server rebuilds, check .env.local, test each route |
| Database issues | Start with verified schema, test seeds, backup before changes |
| RBAC not working | Test permissions immediately after implementation, don't defer |
| Performance issues | Cache settings, paginate lists, optimize queries early |
| Styling issues | Build styles incrementally, test after each component |

---

## Next Steps

1. **Verify Database**
   - Check if migrations ran
   - Check if seeders were run
   - Verify Spatie tables exist

2. **Start Backend**
   - Build auth endpoints
   - Build user endpoints
   - Build settings endpoints
   - Build audit endpoints

3. **Start Frontend**
   - Build auth pages
   - Build dashboard structure
   - Build management pages
   - Add styling

4. **Integrate & Test**
   - Connect frontend to backend
   - End-to-end testing
   - Fix any issues
   - Polish styling

---

## Files to Create/Modify

### Backend (Laravel)
```
Routes:
  - routes/api.php (auth, users, settings, audit endpoints)

Controllers:
  - app/Http/Controllers/Api/AuthController.php
  - app/Http/Controllers/Api/UserController.php
  - app/Http/Controllers/Api/SettingsController.php
  - app/Http/Controllers/Api/AuditLogController.php

Services:
  - app/Services/AuthService.php
  - app/Services/UserService.php

Models:
  - app/Models/User.php (update with relationships)
  - app/Models/AuditLog.php
  - app/Models/SystemSetting.php

Middleware:
  - app/Http/Middleware/CheckRole.php
  - app/Http/Middleware/CheckPermission.php
```

### Frontend (Next.js)
```
Pages:
  - app/auth/login/page.tsx
  - app/auth/2fa/page.tsx
  - app/dashboard/layout.tsx
  - app/dashboard/page.tsx
  - app/dashboard/users/page.tsx
  - app/dashboard/users/create/page.tsx
  - app/dashboard/users/[id]/edit/page.tsx
  - app/dashboard/settings/page.tsx
  - app/dashboard/audit/page.tsx

Components:
  - components/auth/LoginForm.tsx
  - components/auth/TwoFAForm.tsx
  - components/layout/Sidebar.tsx
  - components/layout/Header.tsx
  - components/dashboard/KPICard.tsx
  - components/ui/Button.tsx
  - components/ui/Input.tsx
  - components/ui/Table.tsx
  - components/ui/Modal.tsx
  - components/ui/Toast.tsx

Hooks:
  - hooks/useAuth.ts
  - hooks/usePermission.ts

Context:
  - lib/auth.ts (AuthContext)
  - lib/api.ts (API client)
```

---

## Ready to Begin?

Once you confirm:
1. Database is verified ready
2. Backend needs rebuild (confirmed)
3. Frontend needs rebuild (confirmed)

I'll start with Step 1: **Verify & Document Database Schema**
