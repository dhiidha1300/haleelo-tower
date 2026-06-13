# Phase 1 Complete Rebuild Plan
**Status:** Starting Fresh  
**Target:** Complete & Working Phase 1 Implementation  
**Duration:** 1 Week (Estimated)  
**Date:** June 8, 2026

---

## Phase 1 Scope (From Implementation Plan v3.0)

### 1. Authentication System
- [ ] Staff login with email + password
- [ ] Two-factor authentication (2FA) via WhatsApp OTP
- [ ] 2FA required on every login (no persistent bypass)
- [ ] Laravel Sanctum SPA cookie authentication
- [ ] Password policy enforcement (uppercase, number, symbol, 8+ chars)
- [ ] Failed login lockout (5 attempts → 15 min lockout)
- [ ] Password reset via Resend email
- [ ] Staff session timeout: 8 hours inactivity
- [ ] Tenant portal session timeout: 24 hours inactivity (Phase 5, but auth framework)

### 2. User Management & RBAC
- [ ] Staff user account CRUD (create, edit, deactivate)
- [ ] Role assignment: Super Admin, Admin, Operations, Finance
- [ ] Spatie Laravel Permission package for RBAC
- [ ] Invite user by email with temporary password link
- [ ] Role-based access control on all routes
- [ ] Permission checks on UI elements

### 3. Central Settings Module
- [ ] General Settings (building name, contact, address, timezone, date format)
- [ ] Electricity Rate Configuration (rate per kWh)
- [ ] Catering Packages (DJ and cameraman add-on pricing)
- [ ] Session Time Configuration (Morning/Afternoon/Evening)
- [ ] Payment Terms (invoice due days)
- [ ] WhatsApp API Configuration
- [ ] Email Settings (Resend API)
- [ ] Working Hours (hours per day, days per month)
- [ ] Fiscal Year Settings (fiscal year start month)

### 4. Audit Trail
- [ ] Log all state-changing actions (create, update, delete, approve, reject)
- [ ] Filter by: user, date range, action, model type
- [ ] Search by model ID or reference code
- [ ] Export to PDF and Excel
- [ ] Pagination (50 records per page)
- [ ] Immutable logs (no edit/delete)

### 5. Dashboard & Navigation
- [ ] Dashboard layout with sidebar navigation
- [ ] Collapsible sidebar
- [ ] KPI cards (users count, active leases, pending bookings, revenue)
- [ ] Brand styling (navy #1B2D4F, gold #C9A052, Poppins font)
- [ ] User profile menu (settings, audit logs, logout)
- [ ] Responsive design (mobile-first)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14 - Admin Dashboard)                    │
│  ├─ /auth/login          (email + password)                 │
│  ├─ /auth/2fa            (OTP verification)                 │
│  ├─ /dashboard           (main dashboard with sidebar)      │
│  ├─ /dashboard/users     (user management CRUD)             │
│  ├─ /dashboard/settings  (9 configuration sections)         │
│  ├─ /dashboard/audit     (audit trail)                      │
│  └─ AuthProvider         (auth state + context)             │
└─────────────────────────────────────────────────────────────┘
                            ↕ (HTTP + Sanctum cookies)
┌─────────────────────────────────────────────────────────────┐
│  Backend (Laravel 11 API)                                   │
│  ├─ POST   /api/auth/login       (email + password)         │
│  ├─ POST   /api/auth/2fa/verify  (user_id + otp)           │
│  ├─ GET    /api/auth/me          (current user)             │
│  ├─ POST   /api/auth/logout      (destroy session)          │
│  ├─ GET    /api/users            (list users)               │
│  ├─ POST   /api/users            (create user)              │
│  ├─ PUT    /api/users/{id}       (update user)              │
│  ├─ DELETE /api/users/{id}       (deactivate user)          │
│  ├─ GET    /api/settings         (get all settings)         │
│  ├─ PUT    /api/settings         (update settings)          │
│  ├─ GET    /api/audit-logs       (list audit logs)          │
│  ├─ POST   /api/audit-logs/export (export PDF/Excel)        │
│  └─ Database: PostgreSQL with Spatie permissions            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Frontend Authentication (Days 1-2)
- [ ] Create login page (/auth/login)
  - Email input
  - Password input
  - Login button
  - Error messages
  - Split layout (branding left, form right)

- [ ] Create 2FA page (/auth/2fa)
  - 6-digit OTP input
  - Verify button
  - Resend OTP option

- [ ] Create AuthProvider
  - State: user, loading, isAuthenticated
  - Methods: login(), verify2FA(), logout(), checkAuthentication()
  - Calls /api/auth/me on mount

- [ ] Create API client
  - Axios instance with withCredentials: true
  - No token management (rely on cookies)
  - Handle 401 responses

### Step 2: Frontend Dashboard (Days 2-3)
- [ ] Create dashboard layout (/dashboard/layout.tsx)
  - Sidebar with navigation
  - Header with user menu
  - Protected route (redirect to login if not authenticated)

- [ ] Create sidebar component
  - Links: Dashboard, Users, Settings, Audit Logs
  - Collapsible/expandable
  - Active route highlighting
  - User info at bottom

- [ ] Create header component
  - Logo/title
  - Hamburger menu (collapse sidebar)
  - User menu (settings, logout)
  - Profile avatar

- [ ] Create dashboard home page (/dashboard/page.tsx)
  - KPI cards (users, leases, bookings, revenue)
  - Quick action buttons
  - Status information

### Step 3: Frontend User Management (Days 3-4)
- [ ] Create users list page (/dashboard/users)
  - Table with columns: name, email, role, status, actions
  - Search by name/email
  - Filter by role and status
  - Pagination (25 per page)
  - Create/Edit/Delete buttons

- [ ] Create create user form (/dashboard/users/create)
  - Fields: name, email, role, phone, job title
  - Role dropdown (Super Admin, Admin, Operations, Finance)
  - Submit button
  - Success/error messages

- [ ] Create edit user form (/dashboard/users/{id}/edit)
  - Populate existing data
  - Allow role change
  - Allow deactivation
  - Submit button

### Step 4: Frontend Settings (Days 4-5)
- [ ] Create settings page (/dashboard/settings)
  - Left sidebar with 9 categories
  - Content area for each category
  - Save functionality with success/error messages

- [ ] Implement all 9 settings sections
  1. General Settings
  2. Electricity Rate Configuration
  3. Catering Packages
  4. Session Time Configuration
  5. Payment Terms
  6. WhatsApp API
  7. Email Settings (Resend)
  8. Working Hours (Payroll)
  9. Fiscal Year Settings

### Step 5: Frontend Audit Trail (Days 5-6)
- [ ] Create audit logs page (/dashboard/audit)
  - Table with columns: date, user, action, model type, model ID
  - Filters: user dropdown, date range, action type, model type
  - Search box
  - Pagination
  - Export buttons (PDF, Excel)

### Step 6: Frontend Styling & Branding (Throughout)
- [ ] Apply brand colors
  - Navy: #1B2D4F
  - Gold: #C9A052
  - Backgrounds: #F9FAFB, white
  - Text: #1F2937, #6B7280

- [ ] Apply Poppins font
  - Weights: 400, 500, 600, 700

- [ ] Responsive design
  - Mobile: full width
  - Tablet: adjusted layouts
  - Desktop: full layouts

---

## Backend API Endpoints Required

### Authentication
```
POST /api/auth/login
  Input:  { email, password }
  Output: { requires_2fa: bool, user_id?: int, user?: {...} }
  Cookie: Sets Sanctum cookie

POST /api/auth/2fa/verify
  Input:  { user_id, otp }
  Output: { user: {...}, success: bool }
  Cookie: Sets Sanctum cookie

GET /api/auth/me
  Output: { user: {...} }
  Cookie: Uses Sanctum cookie
  Status: 401 if not authenticated

POST /api/auth/logout
  Status: 200
  Cookie: Destroys Sanctum cookie
```

### Users
```
GET /api/users?page=1&search=&role=&status=
  Output: { data: [...], total: int, per_page: int, current_page: int }

POST /api/users
  Input:  { name, email, phone, role, job_title }
  Output: { user: {...}, success: bool }

PUT /api/users/{id}
  Input:  { name, email, phone, role, job_title }
  Output: { user: {...}, success: bool }

DELETE /api/users/{id}
  Output: { success: bool }

POST /api/users/{id}/reactivate
  Output: { success: bool }
```

### Settings
```
GET /api/settings
  Output: { general_name: value, ... }

PUT /api/settings
  Input:  { settings: [{key, value}, ...] }
  Output: { success: bool }
```

### Audit Logs
```
GET /api/audit-logs?user_id=&action=&model_type=&start_date=&end_date=&page=1
  Output: { data: [...], total: int }

POST /api/audit-logs/export
  Input:  { format: 'pdf'|'excel', user_id?, action?, ... }
  Output: Binary file (PDF or Excel)
```

---

## Success Criteria

✅ Phase 1 is complete when:

1. **Authentication Works End-to-End**
   - [ ] Can log in with email/password
   - [ ] Can enter 2FA OTP from WhatsApp
   - [ ] Can access dashboard when authenticated
   - [ ] Redirects to login when not authenticated
   - [ ] Can log out

2. **Dashboard Works**
   - [ ] Sidebar navigation loads
   - [ ] All pages accessible via sidebar
   - [ ] KPI cards display correctly
   - [ ] Header user menu works

3. **User Management Works**
   - [ ] Can view list of users
   - [ ] Can create new user (triggers invite email)
   - [ ] Can edit user (change role, name, etc.)
   - [ ] Can deactivate user
   - [ ] Can reactivate user

4. **Settings Work**
   - [ ] All 9 settings sections load
   - [ ] Can save changes
   - [ ] Changes persist on page reload
   - [ ] Validation works (e.g., due days > 0)

5. **Audit Trail Works**
   - [ ] All state changes logged
   - [ ] Can filter and search logs
   - [ ] Can export to PDF and Excel
   - [ ] Logs are immutable

6. **Styling is Correct**
   - [ ] Brand colors applied everywhere
   - [ ] Poppins font used throughout
   - [ ] Responsive on mobile/tablet/desktop
   - [ ] No layout issues

7. **RBAC Works**
   - [ ] Different roles see different permissions
   - [ ] Unauthorized users get 403 errors
   - [ ] UI elements hidden based on permissions

---

## Testing Checklist

### Login/Auth
- [ ] Login with correct credentials → dashboard
- [ ] Login with wrong credentials → error message
- [ ] Login with no 2FA → skip 2FA step
- [ ] Login with 2FA → ask for OTP
- [ ] Invalid OTP → error, stay on 2FA page
- [ ] Valid OTP → dashboard
- [ ] Logout → redirects to login
- [ ] Close browser → session expires after 8 hours

### Users
- [ ] Super Admin can see all users
- [ ] Admin can see all users
- [ ] Operations/Finance cannot see user management
- [ ] Can create user with email → invite sent
- [ ] Can edit user → changes saved
- [ ] Can deactivate user → login fails
- [ ] Can reactivate user → login works again

### Settings
- [ ] Can change general settings
- [ ] Can change electricity rate
- [ ] Can change session times
- [ ] Changes persist across browser sessions
- [ ] Settings validation works (e.g., rate > 0)

### Audit Trail
- [ ] Every user create/edit/delete logged
- [ ] Every settings change logged
- [ ] Can filter by user and date
- [ ] Can export to PDF
- [ ] Can export to Excel
- [ ] Logs are read-only (no edit/delete)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Auth gets complicated again | Start simple, add complexity step by step. Don't overcomplicate. |
| Routes return 404 | Ensure dev server rebuilds after each change. Check .env.local. |
| Styling issues | Build styles incrementally, test after each component. |
| RBAC not working | Test permissions immediately after implementation, don't defer. |
| Backend not ready | Focus on frontend first, use mock responses if needed. |

---

## Current State Assessment

**What's Working:**
- ✅ Next.js project structure
- ✅ Tailwind CSS configured
- ✅ Poppins font available
- ✅ Root layout with AuthProvider wrapper
- ✅ Login page at /auth/login (now returning 200)
- ✅ .env.local configured with correct API URL

**What Needs to Be Built:**
- ❌ Clean Auth implementation (start fresh)
- ❌ User management pages
- ❌ Audit trail pages
- ❌ Proper error handling
- ❌ RBAC enforcement

**What's Uncertain:**
- ❓ Backend endpoints ready/implemented
- ❓ Spatie permissions configured
- ❓ WhatsApp OTP integration
- ❓ Email sending (Resend API)

---

## Next Actions

1. **Clarify Backend Status**
   - Which endpoints are ready?
   - Is Spatie configured?
   - Is WhatsApp OTP working?

2. **Start Fresh Auth Implementation**
   - Simplest possible auth flow
   - No complicated patterns
   - Test at each step

3. **Build Dashboard Structure**
   - Layout with sidebar
   - Navigation between pages
   - No complex routing

4. **Implement User Management**
   - Simple CRUD pages
   - List/Create/Edit/Delete
   - Basic validation

5. **Add Settings Module**
   - 9 sections in sidebar
   - Save/load functionality
   - Basic validation

6. **Implement Audit Trail**
   - Log viewer
   - Filters and search
   - Export functionality

---

## References

- Implementation Plan: IMPLEMENTATION_PLAN.md
- Architecture: See diagram above
- Brand Colors: Navy #1B2D4F, Gold #C9A052
- Font: Poppins (400, 500, 600, 700)
- API Base URL: http://localhost:8000 (dev), https://api.halelotower.so (prod)
