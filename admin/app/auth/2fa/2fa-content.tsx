'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authAPI } from '@/lib/api';

export function TwoFAContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { verify2FA, isAuthenticated, loading: authLoading } = useAuth();

  const userId             = searchParams.get('userId');
  const phoneHint          = searchParams.get('phone') || '';
  const whatsappConfigured = searchParams.get('wc') !== '0';

  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown]  = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // If already authenticated, go to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, router]);

  // If no userId in URL, back to login
  useEffect(() => {
    if (!userId) router.replace('/auth/login');
    else inputRef.current?.focus();
  }, [userId, router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await verify2FA(parseInt(userId!), otp);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await authAPI.resendOtp(parseInt(userId!));
      setResendMsg(res.data.message || 'New code sent.');
      setCooldown(60);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setResendMsg('Please wait before requesting another code.');
        setCooldown(60);
      } else {
        setError(err.response?.data?.message || 'Failed to resend code.');
      }
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      const form = document.getElementById('otp-form') as HTMLFormElement;
      form?.requestSubmit();
    }
  }, [otp]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2D4F] to-[#0f1d33] p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#C9A052]">Haleelo</h1>
          <p className="text-white/60 mt-1 text-sm">Tower Admin</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#C9A052]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1B2D4F]">Verify Your Identity</h2>
            <p className="text-gray-500 text-sm mt-2">
              {phoneHint
                ? <>Code sent to <span className="font-semibold text-[#1B2D4F]">{phoneHint}</span> via WhatsApp</>
                : 'Enter the 6-digit code sent to your WhatsApp'
              }
            </p>
          </div>

          {/* WhatsApp not configured warning */}
          {!whatsappConfigured && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>WhatsApp not configured.</strong> The OTP was generated but not sent. Ask your Super Admin to configure WhatsApp in Settings, or check the server logs for the test code.
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {resendMsg && !error && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {resendMsg}
            </div>
          )}

          {/* OTP input */}
          <form id="otp-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2 text-center">
                6-Digit Verification Code
              </label>
              <input
                ref={inputRef}
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#C9A052] transition-colors disabled:bg-gray-50"
                placeholder="——————"
                autoComplete="one-time-code"
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-xs text-gray-400">{otp.length}/6 digits</span>
                <span className="text-xs text-gray-400">Expires in 5 minutes</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Didn't receive a code?</p>
            {cooldown > 0 ? (
              <p className="text-sm text-gray-400">
                Resend available in <span className="font-semibold text-[#1B2D4F]">{cooldown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-medium text-[#C9A052] hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code via WhatsApp'}
              </button>
            )}
          </div>

          {/* Back */}
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to login
          </button>

        </div>
      </div>
    </div>
  );
}
