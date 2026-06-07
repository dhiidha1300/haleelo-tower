'use client';

import { useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';

export default function SessionSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getCategory('session');
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
      }));
      await settingsAPI.update(updates);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-primary mb-6">Session Times Configuration</h2>
      {success && <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">✓ {success}</div>}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Morning Start Time</label>
            <input type="time" value={settings.session_morning_start?.value} onChange={(e) => handleChange('session_morning_start', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Morning End Time</label>
            <input type="time" value={settings.session_morning_end?.value} onChange={(e) => handleChange('session_morning_end', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Afternoon Start Time</label>
            <input type="time" value={settings.session_afternoon_start?.value} onChange={(e) => handleChange('session_afternoon_start', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Afternoon End Time</label>
            <input type="time" value={settings.session_afternoon_end?.value} onChange={(e) => handleChange('session_afternoon_end', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evening Start Time</label>
            <input type="time" value={settings.session_evening_start?.value} onChange={(e) => handleChange('session_evening_start', e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evening End Time</label>
            <input type="time" value={settings.session_evening_end?.value} onChange={(e) => handleChange('session_evening_end', e.target.value)} className="input-base" />
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
