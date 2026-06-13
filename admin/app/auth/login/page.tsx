'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, go to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[LoginPage] Submitting login form', { email });
      const result = await login(email, password);
      console.log('[LoginPage] Login response:', result);

      if (result.requires_2fa) {
        const params = new URLSearchParams({ userId: String(result.user_id) });
        if (result.phone_hint) params.set('phone', result.phone_hint);
        if (result.whatsapp_configured === false) params.set('wc', '0');
        router.push(`/auth/2fa?${params.toString()}`);
      } else {
        console.log('[LoginPage] Session authenticated, redirecting to dashboard');
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMsg);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1B2D4F] to-[#0f1d33] flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A052] rounded-full opacity-5 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C9A052] rounded-full opacity-5 translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-[#C9A052] mb-4">Haleelo</h1>
            <p className="text-2xl text-gray-300">Tower Admin</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 mt-12 border border-white/20">
            <p className="text-lg mb-4 text-gray-100">Building Management Platform</p>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#C9A052] rounded-full"></div>
                <span>Conference Hall Booking System</span>
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

          <p className="mt-12 text-gray-400 text-sm">Mogadishu, Somalia</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#1B2D4F] mb-2">Haleelo</h1>
            <p className="text-gray-600">Tower Admin Portal</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Staff Login</h2>
            <p className="text-gray-600 mb-8">Enter your credentials to access the admin dashboard</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end mb-1">
                <Link href="/auth/forgot-password" className="text-xs text-[#C9A052] hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          <p className="text-center text-gray-600 text-sm mt-8">
            © 2026 Haleelo Tower. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
