'use client';

import { useState, useEffect, useRef } from 'react';
import { settingsAPI } from '@/lib/api';
import api from '@/lib/api';

interface GeneralSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  const [formData, setFormData] = useState({
    building_name: settings?.building_name || '',
    contact_email: settings?.contact_email || '',
    contact_phone: settings?.contact_phone || '',
    address: settings?.address || '',
    timezone: settings?.timezone || 'Africa/Mogadishu',
    date_format: settings?.date_format || 'DD/MM/YYYY',
    session_timeout_hours: settings?.session_timeout_hours || '8',
  });
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [message, setMessage]       = useState('');
  const [logoPreview, setLogoPreview] = useState<string>(settings?.logo_url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoPreview(settings?.logo_url || '');
  }, [settings?.logo_url]);

  useEffect(() => {
    if (settings?.building_name !== undefined) {
      setFormData({
        building_name: settings.building_name || '',
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        address: settings.address || '',
        timezone: settings.timezone || 'Africa/Mogadishu',
        date_format: settings.date_format || 'DD/MM/YYYY',
        session_timeout_hours: settings.session_timeout_hours || '8',
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await api.post('/api/settings/logo/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoPreview(res.data.logo_url);
      setMessage('✓ Logo uploaded successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const settingsArray = Object.entries(formData).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      await settingsAPI.update(settingsArray);
      setMessage('✓ Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('✗ Failed to save settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-6">General Settings</h2>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Building Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-2xl text-gray-300">🏢</span>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`inline-block cursor-pointer px-4 py-2 border border-[#C9A052] text-[#C9A052] rounded-lg text-sm font-medium hover:bg-[#C9A052] hover:text-white transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploading ? 'Uploading…' : 'Upload Logo'}
            </label>
            <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG or WebP · Max 2 MB</p>
            {logoPreview && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs" title={logoPreview}>
                {logoPreview}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
        <input
          type="text"
          name="building_name"
          value={formData.building_name}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
        <input
          type="email"
          name="contact_email"
          value={formData.contact_email}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
        <input
          type="tel"
          name="contact_phone"
          value={formData.contact_phone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
        <select
          name="timezone"
          value={formData.timezone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        >
          <option>Africa/Mogadishu</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Fixed to EAT UTC+3</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
        <select
          name="date_format"
          value={formData.date_format}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        >
          <option>DD/MM/YYYY</option>
        </select>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-base font-semibold text-[#1B2D4F] mb-4">Security</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout (hours)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="session_timeout_hours"
              value={formData.session_timeout_hours}
              onChange={handleChange}
              min="1"
              max="720"
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
            />
            <span className="text-gray-500 text-sm">hours</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Staff sessions expire after this many hours of inactivity. Default: 8 hours. Applied to all new logins — existing sessions are not affected until next login.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
