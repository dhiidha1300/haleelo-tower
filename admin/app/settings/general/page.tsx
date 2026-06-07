'use client';

import { useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getCategory('general');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, setting]: [string, any]) => ({
        key,
        value: setting.value,
        description: setting.description,
      }));

      await settingsAPI.update(updates);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-primary mb-6">General Settings</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          ✓ {success}
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(settings).map(([key, setting]: [string, any]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
              {setting.description || key.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              value={setting.value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="input-base"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
