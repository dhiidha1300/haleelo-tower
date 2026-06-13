# Authentication Loop Issue - Comprehensive Analysis & Resolution Plan

## Symptom
Repeated GET requests to `/auth/login` with 200 status code, creating an apparent redirect/reload loop. Page fails to load after restart of both dev servers.

## Current Architecture Analysis

### Request Flow
1. User navigates to `localhost:3000/auth/login`
2. Root layout (`app/layout.tsx`) wraps app with `AuthProvider`
3. `AuthProvider` (in mount):
   - Sets `loading = true`, `user = null`
   - Calls `initializeApp()` → calls `initializeCsrf()` → calls `checkAuth()`
   - `checkAuth()` attempts `GET /api/auth/me`
   - On 401: sets `user = null`, `loading = false`
4. Login page renders with form
5. User submits: `POST /api/auth/login`

### All Locations Making Redirects
- `app/page.tsx` - Root page: redirects `/` → `/dashboard`
- `app/dashboard/layout.tsx` - Checks auth: if `!isAuthenticated` → redirects to `/auth/login`
- `app/auth/login/page.tsx` - REMOVED auto-redirect in latest version
- `AuthProvider.tsx` - No redirects, only state management

### Key Dependencies & State
```
AuthProvider.useEffect → initializeApp() → [empty dependency array]
  └─ initializeCsrf() → GET /sanctum/csrf-cookie (errors caught, continues)
  └─ checkAuth() → GET /api/auth/me → sets loading = false
     └─ Sets user = null on 401

LoginPage → No useEffect with problematic redirects
DashboardLayout → useEffect([loading, isAuthenticated, router]) → redirects on loading change
```

---

## Hypothesis Testing Plan

### HYPOTHESIS 1: AuthProvider is stuck/hanging
**Symptom Indicator:** Page shows loading spinner indefinitely, or AuthProvider never completes initialization.

**Root Cause Possibilities:**
- `initializeCsrf()` is hanging on GET `/sanctum/csrf-cookie`
- `checkAuth()` is hanging on GET `/api/auth/me`
- Network timeout or backend not responding
- Browser stuck waiting for response

**Debug Steps:**
1. Open browser DevTools → Network tab
2. Watch what requests are being made and their status
3. Check if requests are timing out or pending forever
4. Check Laravel server logs: `d:\haleelo-tower\api\server.log`
5. Try: `curl http://localhost:8000/sanctum/csrf-cookie -v` in new terminal

**Quick Fix:** Add timeouts to axios requests in `lib/api.ts`:
```typescript
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 5000, // Add this
  headers: { ... }
});
```

---

### HYPOTHESIS 2: DashboardLayout is redirecting back
**Symptom Indicator:** Page loads once, then immediately redirects away.

**Root Cause:** If somehow user becomes authenticated mid-load, or dashboard is being accessed somehow.

**Debug Steps:**
1. Check: is the repeated GET to `/auth/login` or could it be `/dashboard`?
2. Open DevTools → Network tab, look at full URL path
3. Check if there's a redirect (301/302) happening

**Note:** Dashboard layout won't trigger unless user navigates to `/dashboard/*`, but current symptoms show `/auth/login` requests.

---

### HYPOTHESIS 3: Browser/HMR Revalidation Loop
**Symptom Indicator:** Page appears to reload repeatedly on its own in the dev environment.

**Root Cause:**
- Next.js HMR (Hot Module Reload) triggering page refresh loop
- Browser cache issue causing infinite reloads
- Webpack/dev server configuration issue

**Debug Steps:**
1. Hard refresh with Ctrl+Shift+R
2. Close DevTools and reopen (sometimes DevTools triggers revalidation)
3. Check if problem persists in production build: `npm run build && npm start`
4. Check `.next` directory exists and is not corrupted
5. Check if there are any syntax errors in modified files

**Quick Fix:** Clear Next.js cache:
```bash
rm -r d:\haleelo-tower\admin\.next
npm run dev
```

---

### HYPOTHESIS 4: CORS/API Integration Issue
**Symptom Indicator:** Repeated requests happen, but no API calls succeed (all 401).

**Root Cause:**
- AuthProvider initializes, but all API calls fail
- Page keeps retrying or revalidating
- User appears unauthenticated indefinitely

**Debug Steps:**
1. Open DevTools → Network tab
2. Look for ALL requests, including: `/sanctum/csrf-cookie`, `/api/auth/me`
3. Check response headers for `Set-Cookie`
4. Verify Laravel CORS config has `localhost:3000` (currently running port)
5. Verify `supports_credentials: true` in CORS config

**Check:**
```bash
cat d:\haleelo-tower\api\config\cors.php | grep -A2 allowed_origins
```

---

### HYPOTHESIS 5: Duplicate/Conflicting Routes
**Symptom Indicator:** Multiple route definitions causing conflicts.

**Root Cause:**
- Old `/settings` routes conflicting with `/dashboard/settings`
- Catch-all or pattern matching causing unexpected redirects

**Current Issues Found:**
- `app/settings/` directory exists with old settings pages (NOT protected)
- `app/settings/layout.tsx` exists
- `app/settings/page.tsx` exists and redirects to `/settings/general`

**These should be deleted** since we use `/dashboard/settings` instead.

---

## Resolution Approach Levels

### LEVEL 1: Non-Destructive Fixes (Try These First)
1. **Clear caches:**
   ```bash
   rm -r d:\haleelo-tower\admin\.next
   rm -r d:\haleelo-tower\admin\node_modules\.cache
   npm run dev
   ```

2. **Add debugging to AuthProvider:**
   ```typescript
   const initializeApp = async () => {
     console.log('[Auth] Initializing...');
     try {
       console.log('[Auth] Getting CSRF token...');
       await initializeCsrf();
       console.log('[Auth] CSRF token obtained');
     } catch (error) {
       console.error('[Auth] CSRF init failed:', error);
     }
     console.log('[Auth] Checking authentication...');
     await checkAuth();
     console.log('[Auth] Check complete');
   };
   ```

3. **Add timeout to axios:**
   Edit `lib/api.ts` - add `timeout: 5000` to axios.create()

4. **Delete old settings routes** (they're not used):
   ```bash
   rm -r d:\haleelo-tower\admin\app\settings
   ```

### LEVEL 2: Architecture Changes (If Level 1 Fails)
1. **Remove auto-redirect from login page entirely**
   - Let AuthProvider handle all redirects
   - Login page just shows form, no redirect logic
   - Dashboard layout does the protection

2. **Simplify AuthProvider**
   - Remove CSRF initialization (might not be needed with Sanctum)
   - Just call checkAuth() directly
   - Add error logging

3. **Use Protected Route Wrapper** instead of layout-level checks
   - Create `ProtectedRoute` component
   - Wrap dashboard with it
   - More explicit and easier to debug

### LEVEL 3: Complete Rewrite (If Levels 1-2 Fail)
- Rebuild authentication from scratch using Next.js 14 best practices
- Use `next-auth` library or similar proven auth solution
- Or: Move authentication check to middleware.ts for clarity

---

## Immediate Action Items

### STEP 1: Collect Diagnostics (Do This Now)
1. Open browser DevTools
2. Go to Network tab (clear previous requests)
3. Refresh page at `localhost:3000/auth/login`
4. **Screenshot/paste:**
   - All requests shown in Network tab (paste table)
   - Full URL paths
   - Status codes
   - Response headers for each

5. Open Console tab
6. Look for errors or warnings
7. Paste any console output

### STEP 2: Check Server Logs
```bash
# Terminal 1: Check Laravel logs
tail -50 d:\haleelo-tower\api\server.log

# Terminal 2: Check Next.js logs
tail -50 d:\haleelo-tower\admin\dev.log
```

### STEP 3: Run Basic Connectivity Test
```bash
# Test CSRF endpoint
curl -X GET http://localhost:8000/sanctum/csrf-cookie -v -w "\n"

# Test auth endpoint (without auth, should return 401)
curl -X GET http://localhost:8000/api/auth/me -w "\n"
```

### STEP 4: Clean and Retry
```bash
cd d:\haleelo-tower\admin

# Kill and restart
rm -r .next
npm run dev
```

---

## Root Cause Most Likely

Based on code analysis, **most likely root cause:**

**The `/sanctum/csrf-cookie` endpoint is timing out or not responding properly**, causing `initializeCsrf()` to hang or take too long. Since we have a `finally` block, it should eventually complete, but if the request hangs for 10+ seconds, the page might reload/retry in the dev environment.

**Most likely fix:**
1. Add timeout to axios (5 second max)
2. Add error logging to see what's actually happening
3. Test `/sanctum/csrf-cookie` directly with curl

---

## Alternative Architecture (If Current Approach Unsalvageable)

Instead of AuthProvider initializing on every load:

```typescript
// Option A: Skip CSRF initialization (might not be needed)
// Option B: Use middleware for auth checks (Next.js 14 pattern)
// Option C: Use next-auth library (proven, battle-tested)
```

Will implement if Levels 1-2 don't resolve.

---

## Next Steps

1. **User provides network tab screenshot** → can identify exact failure point
2. **Apply Level 1 fixes**
3. **If fails: Apply Level 2 fixes with new diagnostics**
4. **If still fails: Implement Level 3 - complete rewrite with middleware or next-auth**

