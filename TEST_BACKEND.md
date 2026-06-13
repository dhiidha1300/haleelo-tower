# Backend Testing Guide

## Step 1: Reset Database and Run Seeders

```bash
cd d:\haleelo-tower\api

# Run migrations fresh
php artisan migrate:fresh

# Run all seeders (including UserSeeder)
php artisan db:seed --class=DatabaseSeeder
```

This will:
- ✅ Drop and recreate all tables
- ✅ Run all migrations
- ✅ Create roles and permissions
- ✅ Create 4 test users with different roles
- ✅ Create system settings

---

## Step 2: Start Laravel Development Server

```bash
cd d:\haleelo-tower\api
php artisan serve
```

Should show:
```
Laravel development server started: http://127.0.0.1:8000
```

---

## Step 3: Test Endpoints

### Test Credentials (after seeding)

```
Super Admin:  superadmin@halelotower.so / SuperAdmin123!
Admin:        admin@halelotower.so / AdminPass123!
Operations:   operations@halelotower.so / OperPass123!
Finance:      finance@halelotower.so / FinancePass123!
```

### Health Check (No Auth Required)
```bash
curl -s http://localhost:8000/api/health
```

Response:
```json
{"status":"ok","timestamp":"2026-06-09T04:45:58.331222Z"}
```

---

### 1. Login Test

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@halelotower.so",
    "password": "AdminPass123!"
  }'
```

Expected Response:
```json
{
  "requires_2fa": false,
  "user": {
    "id": 2,
    "name": "Admin User",
    "email": "admin@halelotower.so",
    "job_title": "Building Manager",
    "phone": "+252612345679",
    "status": "active",
    "profile_photo_url": null,
    "role": "admin",
    "permissions": [...]
  },
  "token": "1|..."
}
```

**✅ Save the token value for other tests**

---

### 2. Get Current User

Replace `{TOKEN}` with the token from login response:

```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "id": 2,
  "name": "Admin User",
  "email": "admin@halelotower.so",
  "role": "admin",
  "permissions": [...]
}
```

---

### 3. List Users

```bash
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Super Admin",
      "email": "superadmin@halelotower.so",
      "job_title": "System Administrator",
      "phone": "+252612345678",
      "status": "active",
      "roles": [...]
    },
    ...
  ],
  "meta": {
    "total": 4,
    "per_page": 25,
    "current_page": 1
  }
}
```

---

### 4. Create User

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Test User",
    "email": "newuser@halelotower.so",
    "phone": "+252612345690",
    "job_title": "Test Position",
    "role": "operations"
  }'
```

Expected Response (201):
```json
{
  "id": 5,
  "name": "New Test User",
  "email": "newuser@halelotower.so",
  "job_title": "Test Position",
  "phone": "+252612345690",
  "status": "active",
  "profile_photo_url": null,
  "role": "operations",
  "permissions": [...]
}
```

---

### 5. Get Settings

```bash
curl -X GET http://localhost:8000/api/settings \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
[
  {
    "id": 1,
    "key": "building_name",
    "value": "Haleelo Tower",
    "description": "Name of the building",
    "updated_by": null,
    "created_at": "...",
    "updated_at": "..."
  },
  ...
]
```

---

### 6. Update Settings

```bash
curl -X PUT http://localhost:8000/api/settings \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": [
      {
        "key": "building_name",
        "value": "Haleelo Tower - Updated",
        "description": "Name of the building"
      },
      {
        "key": "contact_email",
        "value": "contact@halelotower.so",
        "description": "Primary contact email"
      }
    ]
  }'
```

Expected Response:
```json
{
  "message": "Settings updated successfully.",
  "settings": [...]
}
```

---

### 7. Get Audit Logs

```bash
curl -X GET "http://localhost:8000/api/audit-logs?page=1" \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "user_name": "Super Admin",
      "user_role": "super_admin",
      "action": "created",
      "model_type": "App\\Models\\User",
      "model_id": 2,
      "old_values": null,
      "new_values": {...},
      "ip_address": "127.0.0.1",
      "created_at": "2026-06-09T04:45:58Z"
    },
    ...
  ],
  "meta": {
    "total": 10,
    "per_page": 50
  }
}
```

---

### 8. Logout

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "message": "Logged out successfully."
}
```

---

## Testing Checklist

Mark each as ✅ (working) or ❌ (broken):

### Authentication
- [ ] ✅/❌ Health check returns 200
- [ ] ✅/❌ Login with valid credentials returns token
- [ ] ✅/❌ Login with invalid credentials returns 401
- [ ] ✅/❌ Get auth me returns current user
- [ ] ✅/❌ Logout clears session

### Users Management
- [ ] ✅/❌ List users returns paginated list
- [ ] ✅/❌ Create user creates new user
- [ ] ✅/❌ Get user returns user details
- [ ] ✅/❌ Update user updates user data
- [ ] ✅/❌ Delete user (soft delete) deactivates user
- [ ] ✅/❌ Reactivate user restores user

### Settings
- [ ] ✅/❌ Get all settings returns settings
- [ ] ✅/❌ Update settings saves changes
- [ ] ✅/❌ Get settings by category returns category settings

### Audit Trail
- [ ] ✅/❌ Get audit logs returns logged actions
- [ ] ✅/❌ Filter audit logs by user works
- [ ] ✅/❌ Audit statistics returns statistics

### Authorization
- [ ] ✅/❌ Unauthenticated request returns 401
- [ ] ✅/❌ Unauthorized role returns 403
- [ ] ✅/❌ Super Admin can access all endpoints
- [ ] ✅/❌ Operations user cannot access user management

---

## Common Issues & Solutions

### Issue: Login returns "Invalid credentials or account locked"

**Solutions:**
1. Ensure you ran `php artisan db:seed --class=DatabaseSeeder`
2. Check the password is exactly as specified (case-sensitive)
3. Try with superadmin account instead
4. Check if user is locked: `php artisan tinker` → `User::find(2)->locked_until`

### Issue: "Unauthenticated" response even with token

**Solutions:**
1. Check token format: should be `Bearer {TOKEN}`
2. Ensure token was copied correctly (no extra spaces)
3. Check if token expired (test with fresh login)
4. Verify Authorization header is present

### Issue: "Unauthorized" or "Forbidden" response

**Solutions:**
1. Check user role has required permissions
2. Try with Super Admin account
3. Verify role middleware is configured correctly
4. Check user role: `php artisan tinker` → `User::find(2)->getRoleNames()`

---

## Next Steps After Backend Testing

Once all endpoints are working ✅:
1. Document any failures and fix them
2. Proceed to Frontend Implementation
3. Connect frontend to backend API
4. Test full end-to-end flow

---

## Important Notes

- 🔑 **Save tokens** for testing multiple endpoints
- 🔒 **Tokens expire** - request a new one if you get 401
- 📝 **Content-Type header** is required for POST/PUT requests
- 🚀 **Server must be running** on http://localhost:8000
- ✅ **Database must be fresh** - run `migrate:fresh` before testing
