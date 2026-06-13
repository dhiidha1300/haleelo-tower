'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { authAPI } from '@/lib/api';

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { user, checkAuth, logout } = useAuth();

  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = (user as any)?.profile_photo_url as string | undefined;

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone ?? '' });
  }, [user]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile({ name: form.name, phone: form.phone });
      await checkAuth(); // refresh user in context
      showMsg('Profile updated successfully.');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to update profile.', true);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.new_password_confirmation) {
      return showMsg('Passwords do not match.', true);
    }
    setSaving(true);
    try {
      await authAPI.updateProfile(pwForm);
      showMsg('Password changed successfully.');
      setPwForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to change password.', true);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await authAPI.uploadAvatar(file);
      await checkAuth(); // refresh user in context
      showMsg('Profile photo updated.');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to upload photo.', true);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pwRules = [
    { label: 'At least 8 characters',  ok: pwForm.new_password.length >= 8 },
    { label: 'One uppercase letter',    ok: /[A-Z]/.test(pwForm.new_password) },
    { label: 'One number',              ok: /[0-9]/.test(pwForm.new_password) },
    { label: 'One symbol (!@#$%^&*)',  ok: /[!@#$%^&*]/.test(pwForm.new_password) },
    { label: 'Passwords match',         ok: pwForm.new_password.length > 0 && pwForm.new_password === pwForm.new_password_confirmation },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="bg-[#1B2D4F] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="relative w-11 h-11 rounded-full overflow-hidden group flex-shrink-0" title="Change photo">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={user?.name ?? ''} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <span className="w-11 h-11 rounded-full bg-[#C9A052] flex items-center justify-center text-white text-lg font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                {uploading ? '…' : '📷'}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            <div>
              <p className="text-white font-semibold text-sm">{user?.name}</p>
              <p className="text-white/60 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Read-only info */}
        <div className="px-6 py-4 bg-gray-50 border-b text-xs text-gray-500 space-y-1">
          <p><span className="font-medium text-gray-700">Email:</span> {user?.email}</p>
          <p><span className="font-medium text-gray-700">Job Title:</span> {user?.job_title ?? '—'}</p>
          <p className="text-gray-400 italic">Email, role, and job title are managed by your administrator.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['profile', 'password'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-[#C9A052] text-[#1B2D4F]' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'profile' ? 'My Details' : 'Change Password'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {(message || error) && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${message ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message || error}
            </div>
          )}

          {tab === 'profile' ? (
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  required disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+252612345678"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  disabled={saving} />
                <p className="text-xs text-gray-400 mt-1">Used for 2FA WhatsApp verification.</p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={savePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                <input type="password" value={pwForm.current_password}
                  onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  required disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                <input type="password" value={pwForm.new_password}
                  onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  required disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                <input type="password" value={pwForm.new_password_confirmation}
                  onChange={e => setPwForm(p => ({ ...p, new_password_confirmation: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  required disabled={saving} />
              </div>

              {/* Policy checklist */}
              {pwForm.new_password && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  {pwRules.map(r => (
                    <p key={r.label} className={`text-xs flex items-center gap-2 ${r.ok ? 'text-green-600' : 'text-red-500'}`}>
                      <span>{r.ok ? '✓' : '○'}</span>{r.label}
                    </p>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Change Password'}
              </button>
            </form>
          )}
        </div>

        {/* Logout */}
        <div className="px-6 py-4 border-t">
          <button
            onClick={async () => { await logout(); }}
            className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
