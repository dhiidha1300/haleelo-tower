# Haleelo Tower - Admin Dashboard

Next.js 14 admin dashboard for internal staff (admin.halelotower.so).

## Features (Phase 1)

✅ **Authentication**
- Login page with email + password
- 2FA OTP verification screen
- Session management with 8-hour timeout

✅ **User Management**
- User list with search, filter, sort
- Create new user form
- Edit user details
- Deactivate/reactivate users
- Password reset
- Account unlock

✅ **System Settings**
- 9 settings categories accessible via sidebar
- Edit settings in dedicated pages
- Form validation on frontend
- Success/error notifications

✅ **Audit Trail**
- View all audit logs
- Filter by user, date, action, model type
- Export audit logs as PDF/Excel
- Pagination (50 records per page)

✅ **Role-Based UI**
- Menu items shown based on user role/permissions
- Protected routes with middleware
- usePermission() hook for component-level access control
- 403 Forbidden page for unauthorized access

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

Access at `http://localhost:3002`

### Build & Production

```bash
npm run build
npm run start
```

## Project Structure

```
admin/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── 2fa/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   ├── settings/
│   │   │   ├── layout.tsx
│   │   │   ├── general/
│   │   │   ├── session-times/
│   │   │   ├── payment-terms/
│   │   │   ├── email/
│   │   │   ├── whatsapp/
│   │   │   ├── electricity/
│   │   │   ├── payroll/
│   │   │   └── fiscal/
│   │   └── audit/
│   │       └── page.tsx
│   └── layout.tsx
├── lib/
│   ├── api.ts          # Axios instance with auth
│   ├── auth.ts         # Auth context & hooks
│   ├── permissions.ts  # Permission utilities
│   └── utils.ts        # Helper functions
├── hooks/
│   ├── useAuth.ts
│   ├── usePermission.ts
│   ├── useApi.ts
│   └── useLocalStorage.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── TopNav.tsx
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   ├── TwoFAForm.tsx
│   │   ├── UserForm.tsx
│   │   └── SettingsForm.tsx
│   └── features/
│       ├── UserManagement/
│       ├── SettingsPanel/
│       └── AuditLogs/
├── store/
│   ├── auth.ts         # Auth Zustand store
│   └── settings.ts     # Settings cache
├── styles/
│   ├── globals.css
│   └── variables.css
├── public/
│   └── images/
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Authentication Flow

1. **Login Page** (`/login`)
   - Email + password fields
   - Submit to `POST /api/auth/login`
   - If 2FA enabled → redirect to `/2fa`
   - If no 2FA → store token in HttpOnly cookie → redirect to `/dashboard`

2. **2FA Page** (`/2fa`)
   - User ID from login response
   - 6-digit OTP input
   - Submit to `POST /api/auth/2fa/verify`
   - Store token → redirect to `/dashboard`

3. **Dashboard**
   - Fetch `/api/auth/me` on app load
   - Store user + permissions in AuthContext
   - Render sidebar based on role
   - Middleware checks auth on protected routes

## Key Hooks & Utilities

### useAuth()
```typescript
const { user, loading, isAuthenticated } = useAuth();
```

### usePermission()
```typescript
const canManageUsers = usePermission('manage-users');

if (!canManageUsers) return <AccessDenied />;
```

### useApi()
```typescript
const { data, loading, error } = useApi('/api/users');
```

## API Integration

All API calls go through `lib/api.ts` which:
- Uses Axios with base URL from environment
- Includes Authorization header with Bearer token
- Handles CSRF for state-changing requests
- Automatically adds request/response interceptors
- Refreshes token if 401 received

## Styling

- **Tailwind CSS** with custom brand colors in `tailwind.config.js`
- **Primary Color**: `#1B2D4F` (navy)
- **Accent Color**: `#C9A052` (gold)
- **Font**: Poppins (next/font/google)
- Mobile-first responsive design

## Component Library

Pre-built components in `components/ui/`:
- Button (with variants)
- Input (text, email, password)
- Table (sortable, paginated)
- Modal (controlled)
- Card (with header/footer)
- Badge (colored status indicators)
- Form utilities
- Loading spinners
- Toast notifications

## Testing the Admin Dashboard

### Phase 1 Testing Checklist

- [ ] Login with valid credentials
- [ ] Verify 2FA OTP flow
- [ ] Check dashboard load with user permissions
- [ ] List users and use search/filter
- [ ] Create a new user (verify audit log entry)
- [ ] Edit user details
- [ ] Deactivate/reactivate user
- [ ] Test password reset flow
- [ ] Unlock locked account
- [ ] Access Settings → General
- [ ] Update a system setting
- [ ] View audit logs with filters
- [ ] Export audit logs as PDF/Excel
- [ ] Test role-based menu visibility
- [ ] Test permission-based route access
- [ ] Logout and verify session cleared

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.halelotower.so` |
| `NEXT_PUBLIC_APP_NAME` | App display name | `Haleelo Tower` |

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### PM2 (VPS Deployment)
```bash
pm2 start npm --name "admin-dashboard" -- start
```

## Next Steps

- [ ] Implement login page UI
- [ ] Implement 2FA form
- [ ] Implement user management pages
- [ ] Implement settings pages
- [ ] Implement audit log page
- [ ] Setup authentication context
- [ ] Implement permission checking
- [ ] Add form validation
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add toast notifications
- [ ] Phase 2: Booking management UI
