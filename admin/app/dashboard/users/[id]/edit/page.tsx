'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { userAPI, authAPI } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  job_title: string;
  phone: string;
  role: string;
  status: string;
  two_factor_enabled: boolean;
}

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

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    role: '',
    two_factor_enabled: true,
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getById(userId);
      const userData = response.data;
      setUser(userData);
      setFormData({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        job_title: userData.job_title,
        role: userData.role,
        two_factor_enabled: userData.two_factor_enabled ?? true,
        password: '',
        password_confirmation: '',
      });
    } catch (err: any) {
      setError('Failed to load user details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password && formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title,
        role: formData.role,
        two_factor_enabled: formData.two_factor_enabled,
      };

      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      await userAPI.update(userId, payload);
      router.push('/dashboard/users?success=User updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleSendResetLink = async () => {
    setSendingReset(true);
    setError('');
    setSuccessMsg('');
    try {
      await authAPI.sendResetLink(userId);
      setSuccessMsg(`Password reset link sent to ${user?.email}.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setSendingReset(false);
    }
  };

  const handleResendInvite = async () => {
    setSendingInvite(true);
    setError('');
    setSuccessMsg('');
    try {
      await authAPI.resendInvite(userId);
      setSuccessMsg(`Invite email sent to ${user?.email}. Link valid for 24 hours.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Edit User</h1>
        <p className="text-gray-600">Update staff member details</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMsg}</p>
          </div>
        )}

        {/* Account Actions */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Resend Invite</p>
              <p className="text-xs text-gray-500 mt-0.5">New "Set Password" link, valid 24h</p>
            </div>
            <button
              type="button"
              onClick={handleResendInvite}
              disabled={sendingInvite}
              className="text-sm px-3 py-1.5 border border-[#C9A052] text-[#C9A052] rounded-lg hover:bg-[#C9A052] hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {sendingInvite ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Password Reset</p>
              <p className="text-xs text-gray-500 mt-0.5">Reset link to {user?.email}, valid 60min</p>
            </div>
            <button
              type="button"
              onClick={handleSendResetLink}
              disabled={sendingReset}
              className="text-sm px-3 py-1.5 border border-[#1B2D4F] text-[#1B2D4F] rounded-lg hover:bg-[#1B2D4F] hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {sendingReset ? 'Sending...' : 'Send Reset'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required
                disabled={saving}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required
                disabled={saving}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                disabled={saving}
              />
            </div>

            {/* Job Title */}
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <select
                id="job_title"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required
                disabled={saving}
              >
                <option value="">Select a job title</option>
                {JOB_TITLES.map(title => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                required
                disabled={saving}
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <input
                type="text"
                value={user?.status || ''}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                disabled
              />
              <p className="text-gray-500 text-xs mt-1">Status managed from users list</p>
            </div>

          </div>

          {/* 2FA Toggle — outside grid so col-span never causes layout issues */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-[#1B2D4F] mb-4">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {formData.two_factor_enabled ? '2FA Required on login' : '2FA Disabled'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formData.two_factor_enabled
                    ? 'User must verify via WhatsApp OTP on every login.'
                    : 'User logs in with email + password only. No OTP required.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  formData.two_factor_enabled ? 'bg-[#C9A052]' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  formData.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {!formData.two_factor_enabled && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠ Disabling 2FA reduces account security. Only recommended for Super Admin and Admin roles.
              </p>
            )}
          </div>

          {/* Password Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-[#1B2D4F] mb-4">Change Password</h3>
            <p className="text-gray-600 text-sm mb-4">Leave blank to keep current password</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  disabled={saving}
                />
                <p className="text-gray-500 text-xs mt-1">Min 8 characters, mixed case, numbers, symbols</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="password_confirmation"
                  type="password"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-8 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
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
