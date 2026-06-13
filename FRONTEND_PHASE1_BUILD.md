# Frontend Phase 1 Implementation Plan

**Status:** Backend ✅ Complete. Frontend 🔄 Starting  
**Backend API:** http://localhost:8000 ✅ All endpoints working  
**Frontend Port:** http://localhost:3001 (since 3000 may be in use)  
**Date:** June 9, 2026

---

## Frontend Architecture

```
Next.js 14 (Admin Dashboard)
├─ Authentication
│  ├─ /auth/login
│  └─ /auth/2fa
├─ Dashboard (Protected)
│  ├─ /dashboard (home)
│  ├─ /dashboard/users
│  ├─ /dashboard/settings
│  └─ /dashboard/audit
└─ Components
   ├─ Layout (Sidebar, Header)
   ├─ Auth (Login, 2FA forms)
   ├─ UI (Button, Input, Table, etc)
   └─ Dashboard (KPI cards, etc)
```

---

## Step 1: Clean Frontend Setup

Delete problematic auth files and start fresh:

```bash
cd d:\haleelo-tower\admin

# Delete old auth attempts
rm -Recurse -Force app/auth
rm -Recurse -Force components/providers
rm -Recurse -Force lib/auth.ts lib/api.ts

# Keep what's working
# - app/layout.tsx (root layout)
# - app/dashboard/layout.tsx
# - components/layout/
# - components/settings/ (already has good structure)

# Start dev server on port 3001
npm run dev -- -p 3001
```

---

## Step 2: Create Core Auth System

### A. API Client (`lib/api.ts`)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  verify2FA: (userId: number, otp: string) =>
    api.post('/api/auth/2fa/verify', { user_id: userId, otp }),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

export const userAPI = {
  list: (page = 1, search = '', role = '', status = '') =>
    api.get('/api/users', { params: { page, search, role, status } }),
  create: (data: any) => api.post('/api/users', data),
  show: (id: number) => api.get(`/api/users/${id}`),
  update: (id: number, data: any) => api.put(`/api/users/${id}`, data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
  reactivate: (id: number) => api.post(`/api/users/${id}/reactivate`),
};

export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  update: (settings: any[]) => api.put('/api/settings', { settings }),
  updateSingle: (key: string, value: string) =>
    api.put(`/api/settings/${key}`, { value }),
  getCategory: (category: string) =>
    api.get(`/api/settings-category/${category}`),
};

export const auditAPI = {
  list: (page = 1, filters = {}) =>
    api.get('/api/audit-logs', { params: { page, ...filters } }),
};

export default api;
```

### B. Auth Context (`lib/auth.ts`)
```typescript
import { createContext, useContext } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  job_title: string;
  phone: string;
  status: string;
  role: string;
  permissions: string[];
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  verify2FA: (userId: number, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### C. Auth Provider (`components/providers/AuthProvider.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { AuthContext, User } from '@/lib/auth';
import { authAPI } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    if (!response.data.requires_2fa) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const verify2FA = async (userId: number, otp: string) => {
    const response = await authAPI.verify2FA(userId, otp);
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        verify2FA,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Step 3: Create Login Pages

### A. Login Page (`app/auth/login/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requires_2fa) {
        router.push(`/auth/2fa?userId=${result.user_id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1B2D4F] to-[#0f1d33] flex-col justify-center items-center p-12 text-white">
        <h1 className="text-6xl font-bold text-[#C9A052] mb-4">Haleelo</h1>
        <p className="text-2xl text-gray-300">Tower Admin</p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 mt-12 border border-white/20">
          <p className="text-lg mb-4">Building Management Platform</p>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A052] rounded-full"></div>
              <span>Conference Hall Booking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A052] rounded-full"></div>
              <span>Tenant Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A052] rounded-full"></div>
              <span>Financial Operations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A052] rounded-full"></div>
              <span>HR & Payroll</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#1B2D4F] mb-2">Haleelo</h1>
            <p className="text-gray-600">Tower Admin Portal</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Staff Login</h2>
            <p className="text-gray-600 mb-8">Enter your credentials to access the admin dashboard</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@halelotower.so"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600 text-sm text-center mb-4">Demo Credentials</p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                <p><span className="font-medium">Email:</span> admin@halelotower.so</p>
                <p><span className="font-medium">Password:</span> AdminPass123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### B. 2FA Page (`app/auth/2fa/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function TwoFAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verify2FA, isAuthenticated, loading: authLoading } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!userId) {
      router.push('/auth/login');
    }
  }, [userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!userId) throw new Error('User ID not found');
      await verify2FA(parseInt(userId), otp);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '2FA verification failed');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2D4F] to-[#0f1d33]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#1B2D4F] text-center mb-2">2FA Verification</h1>
          <p className="text-gray-600 text-center mb-8">Enter the 6-digit code from WhatsApp</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                placeholder="000000"
                required
              />
              <p className="text-gray-500 text-sm mt-2">{otp.length}/6 digits entered</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <button
            onClick={() => router.push('/auth/login')}
            className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
          >
            Back to Login
          </button>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p><strong>ℹ️ Testing:</strong> Your system admin can provide a test OTP.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Create Dashboard Pages

### A. Root Layout (Update `app/layout.tsx`)
```typescript
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import '../styles/globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'Haleelo Tower - Admin Dashboard',
  description: 'Building management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### B. Dashboard Layout (Update `app/dashboard/layout.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-[#1B2D4F] border-t-[#C9A052] rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#1B2D4F] text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <Sidebar collapsed={!sidebarOpen} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### C. Dashboard Home (`app/dashboard/page.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { userAPI } from '@/lib/api';

interface KPIs {
  totalUsers: number;
  activeLeases: number;
  pendingBookings: number;
  totalRevenue: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({
    totalUsers: 0,
    activeLeases: 0,
    pendingBookings: 0,
    totalRevenue: '$0.00',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const response = await userAPI.list(1);
      setKpis({
        totalUsers: response.data.meta?.total || 0,
        activeLeases: 0,
        pendingBookings: 0,
        totalRevenue: '$0.00',
      });
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#1B2D4F] mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Here's an overview of your platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: kpis.totalUsers, icon: '👥', border: '#1B2D4F' },
          { label: 'Active Leases', value: kpis.activeLeases, icon: '🏢', border: '#C9A052' },
          { label: 'Pending Bookings', value: kpis.pendingBookings, icon: '📅', border: '#1B2D4F' },
          { label: 'Total Revenue', value: kpis.totalRevenue, icon: '💰', border: '#C9A052' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6" style={{ borderLeft: `4px solid ${kpi.border}` }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm mb-2">{kpi.label}</p>
                {loading ? (
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-[#1B2D4F]">{kpi.value}</p>
                )}
              </div>
              <span className="text-3xl">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 5: Create User Management Pages

Create these files following similar patterns:
- `app/dashboard/users/page.tsx` — List users with table
- `app/dashboard/users/create/page.tsx` — Create user form
- `app/dashboard/users/[id]/edit/page.tsx` — Edit user form

---

## Step 6: Create Settings Pages

Use existing `app/dashboard/settings/page.tsx` and components in `components/settings/`

---

## Step 7: Create Audit Log Page

- `app/dashboard/audit/page.tsx` — Audit logs with filters

---

## Step 8: Create Layout Components

Update `components/layout/`:
- `Sidebar.tsx` — Navigation menu
- `Header.tsx` — Top navigation

---

## Build Checklist

- [ ] Delete old files
- [ ] Create `lib/api.ts` — API client
- [ ] Create `lib/auth.ts` — Auth types
- [ ] Create `components/providers/AuthProvider.tsx`
- [ ] Create `/auth/login/page.tsx`
- [ ] Create `/auth/2fa/page.tsx`
- [ ] Update `app/layout.tsx`
- [ ] Update `app/dashboard/layout.tsx`
- [ ] Create `app/dashboard/page.tsx`
- [ ] Create user management pages
- [ ] Create audit log page
- [ ] Update layout components

---

## Testing After Frontend Build

1. Start Laravel: `php artisan serve`
2. Start Next.js: `npm run dev -- -p 3001`
3. Test login flow:
   - Navigate to http://localhost:3001/auth/login
   - Enter admin@halelotower.so / AdminPass123!
   - Should redirect to dashboard
4. Test user management
5. Test settings
6. Test audit logs

---

## Ready to Start?

I recommend starting with the clean core files (API client, Auth context, AuthProvider) first, then building login/2FA pages, then dashboard structure, then the management pages.

All backend APIs are confirmed working, so frontend just needs to call them correctly.

Should I start building these files now?
