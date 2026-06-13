'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

interface SessionTimeSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function SessionTimeSettings({ settings, onUpdate }: SessionTimeSettingsProps) {
  const [formData, setFormData] = useState({
    morning_start: settings?.session_morning_start || '08:00',
    morning_end: settings?.session_morning_end || '13:00',
    afternoon_start: settings?.session_afternoon_start || '15:00',
    afternoon_end: settings?.session_afternoon_end || '18:30',
    evening_start: settings?.session_evening_start || '19:00',
    evening_end: settings?.session_evening_end || '23:00',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings?.session_morning_start) {
      setFormData({
        morning_start: settings.session_morning_start,
        morning_end: settings.session_morning_end,
        afternoon_start: settings.session_afternoon_start,
        afternoon_end: settings.session_afternoon_end,
        evening_start: settings.session_evening_start,
        evening_end: settings.session_evening_end,
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsAPI.updateSingle('session_morning_start', formData.morning_start);
      await settingsAPI.updateSingle('session_morning_end', formData.morning_end);
      await settingsAPI.updateSingle('session_afternoon_start', formData.afternoon_start);
      await settingsAPI.updateSingle('session_afternoon_end', formData.afternoon_end);
      await settingsAPI.updateSingle('session_evening_start', formData.evening_start);
      await settingsAPI.updateSingle('session_evening_end', formData.evening_end);
      setMessage('✓ Session times updated');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('✗ Failed to update times');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Session Time Configuration</h2>
        <p className="text-gray-600 text-sm">Configure the three standard session windows for conference hall bookings.</p>
      </div>

      <div className="space-y-6">
        <div className="border-l-4 border-[#C9A052] pl-4">
          <h3 className="font-semibold text-gray-900 mb-3">Morning Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                name="morning_start"
                value={formData.morning_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                name="morning_end"
                value={formData.morning_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
          </div>
        </div>

        <div className="border-l-4 border-[#1B2D4F] pl-4">
          <h3 className="font-semibold text-gray-900 mb-3">Afternoon Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                name="afternoon_start"
                value={formData.afternoon_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                name="afternoon_end"
                value={formData.afternoon_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
          </div>
        </div>

        <div className="border-l-4 border-[#C9A052] pl-4">
          <h3 className="font-semibold text-gray-900 mb-3">Evening Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                name="evening_start"
                value={formData.evening_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                name="evening_end"
                value={formData.evening_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>ℹ️ Note:</strong> Changes take effect immediately for new bookings. Existing approved bookings are not affected.
        </p>
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
        {loading ? 'Saving...' : 'Save Session Times'}
      </button>
    </form>
  );
}
