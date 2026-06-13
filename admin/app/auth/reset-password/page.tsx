'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token    = params.get('token') || '';
  const email    = params.get('email') || '';
  const isInvite = params.get('invite') === '1';

  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token, email]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (form.password.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(form.password)) errs.push('At least one uppercase letter');
    if (!/[0-9]/.test(form.password)) errs.push('At least one number');
    if (!/[!@#$%^&*]/.test(form.password)) errs.push('At least one symbol (!@#$%^&*)');
    if (form.password !== form.password_confirmation) errs.push('Passwords do not match');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    setValidationErrors(errs);
    if (errs.length) return;

    setLoading(true);
    try {
      await authAPI.resetPassword(email, token, form.password, form.password_confirmation, isInvite);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-[#1B2D4F]">Password Reset!</h2>
        <p className="text-gray-600 text-sm">Your password has been updated. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">
        {isInvite ? 'Activate Your Account' : 'Set New Password'}
      </h2>
      {email && (
        <p className="text-gray-500 text-sm mb-6">
          {isInvite ? 'Welcome! Set a password to access ' : 'Resetting password for '}
          <strong>{email}</strong>
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          {error.includes('Invalid reset link') && (
            <span> <Link href="/auth/forgot-password" className="underline font-medium">Request a new link</Link>.</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setValidationErrors([]); }}
            placeholder="••••••••"
            required
            disabled={loading || !token}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            value={form.password_confirmation}
            onChange={e => { setForm(p => ({ ...p, password_confirmation: e.target.value })); setValidationErrors([]); }}
            placeholder="••••••••"
            required
            disabled={loading || !token}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
        </div>

        {/* Password policy checklist */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          {[
            { label: 'At least 8 characters', ok: form.password.length >= 8 },
            { label: 'One uppercase letter', ok: /[A-Z]/.test(form.password) },
            { label: 'One number', ok: /[0-9]/.test(form.password) },
            { label: 'One symbol (!@#$%^&*)', ok: /[!@#$%^&*]/.test(form.password) },
            { label: 'Passwords match', ok: form.password.length > 0 && form.password === form.password_confirmation },
          ].map(rule => (
            <p key={rule.label} className={`text-xs flex items-center gap-2 ${form.password ? (rule.ok ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
              <span>{rule.ok ? '✓' : '○'}</span>
              {rule.label}
            </p>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1B2D4F]">Haleelo</h1>
          <p className="text-gray-500 mt-1">Tower Admin Portal</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
          <Suspense fallback={<p className="text-gray-500 text-sm">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
        <p className="text-center mt-4">
          <Link href="/auth/login" className="text-sm text-[#C9A052] hover:underline">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
