# Haleelo Tower Platform

Multi-tenant commercial building management system replacing ODOO.

## Project Structure

```
haleelo-tower/
├── api/                          # Laravel 11 REST API (api.halelotower.so)
├── public/                        # Next.js 14 public website (halelotower.so)
├── portal/                        # Next.js 14 tenant portal (portal.halelotower.so)
├── admin/                         # Next.js 14 admin dashboard (admin.halelotower.so)
├── Planning/                      # Implementation plan & documentation
└── mockups/                       # UI mockup screens
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js App Router | 14.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Laravel | 11.x |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis | 7 |
| File Storage | AWS S3 | — |
| Email | Resend API | — |
| WhatsApp | Twilio/360dialog | — |

## Quick Start

### Prerequisites
- Node.js 20+
- PHP 8.3+
- PostgreSQL 16
- Redis 7
- Composer
- Git

### Installation

1. **Clone and setup**
```bash
cd haleelo-tower
```

2. **Initialize Laravel API**
```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
```

3. **Initialize Next.js apps**
```bash
# Public website
cd ../public
npm install
npm run dev  # http://localhost:3000

# Tenant portal
cd ../portal
npm install
npm run dev  # http://localhost:3001

# Admin dashboard
cd ../admin
npm install
npm run dev  # http://localhost:3002
```

## Implementation Phases

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 1 | User Management & Auth (2FA, RBAC, Settings, Audit) | 1 week | 🔄 In Progress |
| 2 | Booking System (Conference, Office, Educational) | 1.5 weeks | Pending |
| 3 | Finance & Accounting (Invoicing, Payroll, Reports) | 3 weeks | Pending |
| 4 | Public Website & Marketing | 1 week | Pending |
| 5 | Tenant Portal & Communications | 1 week | Pending |
| Final | Testing & Launch | 0.5 weeks | Pending |

## Environment Configuration

### Laravel (.env)
```
APP_NAME="Haleelo Tower"
APP_ENV=production
DB_CONNECTION=pgsql
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
```

### Next.js (.env.local)
```
NEXT_PUBLIC_API_URL=https://api.halelotower.so
NEXT_PUBLIC_APP_NAME="Haleelo Tower"
```

## Key Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Staff login |
| POST | `/api/auth/2fa/verify` | 2FA OTP verification |
| GET | `/api/auth/me` | Get authenticated user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/settings` | Get all system settings |
| PUT | `/api/settings` | Update settings |

## Database Schema (Phase 1)

- `users` - Staff accounts with 2FA
- `roles`, `permissions` - Spatie RBAC
- `system_settings` - Key-value configuration
- `audit_logs` - Immutable action log

## Documentation

- **Implementation Plan**: `Planning/IMPLEMENTATION_PLAN.md`
- **API Documentation**: `/api/docs` (auto-generated from routes)
- **UI Mockups**: `mockups/` directory

## Subdomains

| Subdomain | Purpose | App |
|-----------|---------|-----|
| halelotower.so | Public Website | Next.js (public) |
| portal.halelotower.so | Tenant Portal | Next.js (portal) |
| admin.halelotower.so | Admin Dashboard | Next.js (admin) |
| api.halelotower.so | REST API | Laravel |

## Brand Identity

- **Font**: Poppins (400, 500, 600, 700)
- **Primary Color**: Navy #1B2D4F
- **Accent Color**: Gold #C9A052
- **Design System**: Mobile-first with Tailwind CSS

## Current Status

🔄 **Phase 1: User Management & Authentication**

### Completed
- ✅ Project structure initialized
- ✅ Directory organization
- ✅ Documentation setup

### In Progress
- 🔄 Laravel API initialization
- 🔄 Database schema (users, roles, permissions, settings)
- 🔄 Sanctum authentication setup
- 🔄 Spatie permissions configuration
- 🔄 System settings module
- 🔄 Audit trail system

### Next
- 🔜 Admin dashboard (Next.js)
- 🔜 User management UI
- 🔜 Login & 2FA flow
- 🔜 Role-based access control testing

## Support & Feedback

For issues or questions, refer to the Implementation Plan or contact the development team.

---

**Last Updated**: June 2026
**Version**: 3.0
