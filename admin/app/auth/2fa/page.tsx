'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function TwoFAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verify2FA } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = searchParams.get('userId');

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
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">2FA Verification</h1>
            <p className="text-gray-600 mt-2">Enter the 6-digit code from WhatsApp</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                6-Digit Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                className="input-base text-center text-2xl letter-spacing tracking-widest font-mono"
                placeholder="000000"
                required
              />
              <p className="text-gray-500 text-sm mt-2">
                {otp.length}/6 digits entered
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full btn-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <button
            onClick={() => router.push('/auth/login')}
            className="w-full mt-4 btn-secondary font-medium"
          >
            Back to Login
          </button>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p>
              <strong>Note:</strong> In this demo, check the API response or use code <code className="bg-white px-2 py-1 rounded">000000</code> for testing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
