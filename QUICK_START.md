# 🚀 Quick Start - Phase 1 Testing (5 Minutes Setup)

## Prerequisites Checklist

Before starting, verify you have installed:
- [ ] **PostgreSQL 16** - `psql --version`
- [ ] **Node.js 20+** - `node --version`
- [ ] **npm 10+** - `npm --version`
- [ ] **Composer** - `composer --version`
- [ ] **PHP 8.3+** - `php --version`
- [ ] **Redis 7** - `redis-cli ping` (returns PONG)

---

## 🗄️ Step 1: Database Setup (5 minutes)

**Open PowerShell:**

```powershell
# Connect to PostgreSQL
psql -U postgres

# Inside psql, paste all these:
CREATE DATABASE haleelo_tower;
CREATE USER haleelo_user WITH PASSWORD 'HaleeloPass123!';
ALTER ROLE haleelo_user SET client_encoding TO 'utf8';
ALTER ROLE haleelo_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE haleelo_user SET default_transaction_deferrable TO ON;
ALTER ROLE haleelo_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE haleelo_tower TO haleelo_user;

# Exit
\q
```

---

## ⚙️ Step 2: Backend Setup (5 minutes)

**Open Terminal 1:**

```powershell
cd haleelo-tower\api
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
```

**Start Laravel Server:**

```powershell
php artisan serve
# Runs at http://localhost:8000
# KEEP THIS RUNNING!
```

---

## 🎨 Step 3: Frontend Setup (3 minutes)

**Open Terminal 2 (New terminal/tab):**

```powershell
cd haleelo-tower\admin
npm install
npm run dev
# Runs at http://localhost:3000
# KEEP THIS RUNNING!
```

---

## 🧪 Step 4: Test in Browser (2 minutes)

**Open http://localhost:3000 in your browser:**

1. **Login Page** - You should see:
   - Haleelo Tower logo
   - Email input: `admin@halelotower.so`
   - Password input: `AdminPass123!`

2. **Enter credentials and click Login**
   - Should redirect to 2FA page

3. **2FA Verification**
   - For testing, enter: `000000`
   - Click Verify

4. **Dashboard**
   - You're logged in! 🎉
   - See sidebar with Users, Settings, Audit Logs
   - Dashboard shows quick actions

5. **Test Features:**
   - Click **Users** → Create/edit/deactivate users
   - Click **Settings** → Update building name or other settings
   - Click **Audit Logs** → See all your actions logged
   - Click profile avatar → Logout

---

## 🎯 What You Can Do Now

✅ Create users and assign roles  
✅ Update system settings  
✅ View complete audit trail  
✅ Test role-based access control  
✅ Change passwords  
✅ Manage user accounts  

---

## 📖 Need More Details?

See comprehensive guides:
- **Setup & Testing**: `LOCAL_TESTING_GUIDE.md` (400+ lines)
- **API Reference**: `api/README.md`
- **Architecture**: `PHASE_1_SETUP.md`
- **Completion Summary**: `PHASE_1_COMPLETE.md`

---

## ❌ Troubleshooting

### Database Connection Failed
```powershell
# Check if PostgreSQL is running
pg_isready -h 127.0.0.1 -p 5432
```

### Laravel says "Command not found"
```powershell
# Use full path to PHP
C:\path\to\php artisan migrate --seed
```

### npm install fails
```powershell
npm cache clean --force
npm install
```

### Port 3000/8000 already in use
```powershell
# Kill the process using the port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## ✅ Success = You See

1. **Login Page** loads at http://localhost:3000
2. **Login works** with email + password
3. **2FA page** appears after login
4. **Dashboard** shows after 2FA verification
5. **Users list** shows existing users
6. **Create user** button works
7. **Settings** can be edited and saved
8. **Audit logs** show your actions

---

## 📊 Demo Credentials

```
Email:    admin@halelotower.so
Password: AdminPass123!
Role:     Admin
```

---

## 🎉 You're Done!

Phase 1 is fully functional and ready to use. All features are working:

- ✅ Authentication (login, 2FA, logout)
- ✅ User Management (CRUD + deactivation)
- ✅ System Settings (24 configurable settings)
- ✅ Audit Trail (immutable log of all actions)
- ✅ RBAC (role-based access control)

Next step: Follow `LOCAL_TESTING_GUIDE.md` for comprehensive testing.

---

**Time to complete**: ~15 minutes  
**Status**: Ready to test Phase 1  
**Next**: Phase 2 - Booking System
