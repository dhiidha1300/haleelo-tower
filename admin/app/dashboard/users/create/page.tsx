'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
];

const JOB_TITLES = [
  'Building Manager',
  'Finance Officer',
  'Operations Manager',
  'Admin Staff',
  'Support Staff',
  'Other',
];

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    role: 'operations',
    two_factor_enabled: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userAPI.create(formData);
      router.push('/dashboard/users?success=User created and invite email sent');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Create User</h1>
        <p className="text-gray-600">Add a new staff member — an invite email will be sent automatically.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">

        {/* Invite notice */}
        <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xl">✉️</span>
          <div>
            <p className="text-sm font-medium text-blue-900">Invite email will be sent automatically</p>
            <p className="text-xs text-blue-700 mt-0.5">
              The user will receive an email with a <strong>"Set Your Password"</strong> link valid for 24 hours.
              No need to manually set a password.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                id="name" type="text" name="name"
                value={formData.name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input
                id="email" type="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder="staff@halelotower.so"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Invite email will be sent to this address</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                id="phone" type="tel" name="phone"
                value={formData.phone} onChange={handleChange}
                placeholder="+252612345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Required for WhatsApp 2FA</p>
            </div>

            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
              <select
                id="job_title" name="job_title"
                value={formData.job_title} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required disabled={loading}
              >
                <option value="">Select a job title</option>
                {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select
                id="role" name="role"
                value={formData.role} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required disabled={loading}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

          </div>

          {/* 2FA Toggle */}
          <div className="border-t pt-6">
            <h3 className="text-base font-semibold text-[#1B2D4F] mb-3">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {formData.two_factor_enabled ? '2FA Required on login' : '2FA Disabled'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formData.two_factor_enabled
                    ? 'User must verify via WhatsApp OTP on every login. Requires a phone number.'
                    : 'User logs in with email + password only. No OTP required.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, two_factor_enabled: !p.two_factor_enabled }))}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  formData.two_factor_enabled ? 'bg-[#C9A052]' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  formData.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit" disabled={loading}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating & Sending Invite...' : 'Create User & Send Invite'}
            </button>
            <button
              type="button" onClick={() => router.back()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
