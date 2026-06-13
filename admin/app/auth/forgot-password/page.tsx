'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1B2D4F]">Haleelo</h1>
          <p className="text-gray-500 mt-1">Tower Admin Portal</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✉️</span>
              </div>
              <h2 className="text-xl font-bold text-[#1B2D4F]">Check your email</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                If <strong>{email}</strong> is registered, you will receive a password reset link shortly. The link expires in 60 minutes.
              </p>
              <Link href="/auth/login" className="inline-block mt-4 text-[#C9A052] hover:underline text-sm font-medium">
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Forgot Password</h2>
              <p className="text-gray-600 text-sm mb-6">
                Enter your staff email address and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@halelotower.so"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center mt-6">
                <Link href="/auth/login" className="text-sm text-[#C9A052] hover:underline">
                  ← Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
