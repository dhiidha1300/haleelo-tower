# Backend API Testing Plan

## Prerequisites

Make sure:
1. Laravel API is running: `php artisan serve`
2. Database is migrated: `php artisan migrate:fresh --seed`
3. Postman or curl available for testing

---

## Test Order

### 1. Health Check
```bash
curl -X GET http://localhost:8000/api/health
```

Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-08T10:30:00Z"
}
```

---

### 2. Authentication Tests

#### 2.1 Login with Valid Credentials
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@halelotower.so",
    "password": "AdminPass123!"
  }'
```

Expected Response (if 2FA disabled):
```json
{
  "requires_2fa": false,
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@halelotower.so",
    "role": "super_admin",
    "permissions": [...]
  },
  "token": "..." 
}
```

Expected Response (if 2FA enabled):
```json
{
  "requires_2fa": true,
  "user_id": 1,
  "message": "2FA code sent to your phone."
}
```

**Status:** ✅ or ❌ - Note any issues

---

#### 2.2 Login with Invalid Credentials
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@halelotower.so",
    "password": "WrongPassword123!"
  }'
```

Expected Response:
```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials or account locked."
}
```

Status Code: 401

**Status:** ✅ or ❌

---

#### 2.3 Verify 2FA (if enabled)
```bash
# First get OTP from WhatsApp or check cache
# Then verify with:
curl -X POST http://localhost:8000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "otp": "123456"
  }'
```

Expected Response:
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@halelotower.so",
    "role": "super_admin",
    "permissions": [...]
  },
  "token": "..."
}
```

**Status:** ✅ or ❌

---

#### 2.4 Get Current User
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@halelotower.so",
  "role": "super_admin",
  "permissions": [...]
}
```

**Status:** ✅ or ❌

---

#### 2.5 Logout
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

**Status:** ✅ or ❌

---

### 3. User Management Tests

#### 3.1 List Users
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
      "name": "Admin User",
      "email": "admin@halelotower.so",
      "role": "super_admin",
      "status": "active"
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 25,
    "current_page": 1
  }
}
```

**Status:** ✅ or ❌

---

#### 3.2 Create User
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@halelotower.so",
    "phone": "0612345678",
    "job_title": "Receptionist",
    "role": "operations"
  }'
```

Expected Response (201):
```json
{
  "id": 2,
  "name": "Test User",
  "email": "test@halelotower.so",
  "phone": "0612345678",
  "job_title": "Receptionist",
  "role": "operations",
  "permissions": [...]
}
```

**Status:** ✅ or ❌

---

#### 3.3 Get User
```bash
curl -X GET http://localhost:8000/api/users/2 \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "id": 2,
  "name": "Test User",
  "email": "test@halelotower.so",
  "role": "operations",
  "permissions": [...]
}
```

**Status:** ✅ or ❌

---

#### 3.4 Update User
```bash
curl -X PUT http://localhost:8000/api/users/2 \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated User",
    "job_title": "Senior Receptionist",
    "role": "admin"
  }'
```

Expected Response (200):
```json
{
  "id": 2,
  "name": "Updated User",
  "email": "test@halelotower.so",
  "job_title": "Senior Receptionist",
  "role": "admin",
  "permissions": [...]
}
```

**Status:** ✅ or ❌

---

#### 3.5 Deactivate User
```bash
curl -X DELETE http://localhost:8000/api/users/2 \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "message": "User deactivated successfully."
}
```

**Status:** ✅ or ❌

---

#### 3.6 Reactivate User
```bash
curl -X POST http://localhost:8000/api/users/2/reactivate \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "id": 2,
  "name": "Updated User",
  "email": "test@halelotower.so",
  "status": "active"
}
```

**Status:** ✅ or ❌

---

### 4. Settings Tests

#### 4.1 Get All Settings
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
    "description": "..."
  },
  ...
]
```

**Status:** ✅ or ❌

---

#### 4.2 Update Settings
```bash
curl -X PUT http://localhost:8000/api/settings \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": [
      {
        "key": "building_name",
        "value": "Haleelo Tower Updated",
        "description": "Building name"
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

**Status:** ✅ or ❌

---

#### 4.3 Get Settings by Category
```bash
curl -X GET http://localhost:8000/api/settings-category/general \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "building_name": { "id": 1, "value": "Haleelo Tower" },
  "contact_email": { "id": 2, "value": "..." },
  ...
}
```

**Status:** ✅ or ❌

---

### 5. Audit Log Tests

#### 5.1 Get Audit Logs
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
      "user_name": "Admin User",
      "action": "created",
      "model_type": "App\\Models\\User",
      "model_id": 2,
      "created_at": "2026-06-08T10:30:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "per_page": 50
  }
}
```

**Status:** ✅ or ❌

---

#### 5.2 Filter Audit Logs
```bash
curl -X GET "http://localhost:8000/api/audit-logs?action=created&user_id=1" \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response: Filtered logs

**Status:** ✅ or ❌

---

#### 5.3 Audit Statistics
```bash
curl -X GET http://localhost:8000/api/audit-logs/statistics \
  -H "Authorization: Bearer {TOKEN}"
```

Expected Response:
```json
{
  "total": 10,
  "by_action": {
    "created": { "count": 3 },
    "updated": { "count": 5 },
    "deleted": { "count": 2 }
  },
  "top_users": [...]
}
```

**Status:** ✅ or ❌

---

### 6. Authorization Tests

#### 6.1 Test Unauthorized Access
```bash
# Try to access user management without token
curl -X GET http://localhost:8000/api/users
```

Expected Response (401):
```json
{
  "message": "Unauthenticated."
}
```

**Status:** ✅ or ❌

---

#### 6.2 Test Forbidden Access
```bash
# Log in as operations user, try to access user management
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer {OPERATIONS_TOKEN}"
```

Expected Response (403):
```json
{
  "message": "Forbidden"
}
```

**Status:** ✅ or ❌

---

## Summary

### Working Endpoints
List all endpoints that work ✅

### Broken Endpoints
List all endpoints that fail ❌

### Issues Found
- [ ] Issue 1
- [ ] Issue 2
- [ ] Issue 3

### Next Steps
1. Fix all broken endpoints
2. Ensure all tests pass
3. Proceed to frontend implementation
