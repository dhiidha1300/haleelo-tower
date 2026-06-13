'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

interface WorkingHoursSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function WorkingHoursSettings({ settings, onUpdate }: WorkingHoursSettingsProps) {
  const [formData, setFormData] = useState({
    working_hours_per_day: settings?.working_hours_per_day || '8',
    working_days_per_month: settings?.working_days_per_month || '26',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings?.working_hours_per_day) {
      setFormData({
        working_hours_per_day: settings.working_hours_per_day,
        working_days_per_month: settings.working_days_per_month || '26',
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
      await settingsAPI.updateSingle('working_hours_per_day', formData.working_hours_per_day, 'Standard hours in a workday');
      await settingsAPI.updateSingle('working_days_per_month', formData.working_days_per_month, 'Average working days per month');
      setMessage('✓ Working hours updated');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('✗ Failed to update hours');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Working Hours (Payroll)</h2>
        <p className="text-gray-600 text-sm">Configure working hour settings used in payroll calculations and overtime tracking.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours Per Day</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="working_hours_per_day"
              value={formData.working_hours_per_day}
              onChange={handleChange}
              min="1"
              max="24"
              className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
            />
            <span className="text-gray-600">hours/day</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Standard workday duration. Used to calculate overtime (any hours above this)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Working Days Per Month</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="working_days_per_month"
              value={formData.working_days_per_month}
              onChange={handleChange}
              min="1"
              max="31"
              className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
            />
            <span className="text-gray-600">days/month</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Average working days per month. Used in daily-rate calculations</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Example:</strong> With 8 hours/day and 26 days/month, an employee working 10 hours in a day has 2 hours of overtime.
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
        {loading ? 'Saving...' : 'Save Working Hours'}
      </button>
    </form>
  );
}
