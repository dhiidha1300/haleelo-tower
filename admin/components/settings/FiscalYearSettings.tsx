'use client';

import { useState } from 'react';
import { settingsAPI } from '@/lib/api';

interface FiscalYearSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function FiscalYearSettings({ settings, onUpdate }: FiscalYearSettingsProps) {
  const [formData, setFormData] = useState({
    fiscal_year_start_month: settings?.fiscal_year_start_month || '1',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsAPI.updateSingle('fiscal_year_start_month', formData.fiscal_year_start_month, 'First month of fiscal year (1-12)');
      setMessage('✓ Fiscal year setting updated');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('✗ Failed to update setting');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Fiscal Year Settings</h2>
        <p className="text-gray-600 text-sm">Define the start month of your fiscal year for financial reporting.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start Month</label>
        <select
          name="fiscal_year_start_month"
          value={formData.fiscal_year_start_month}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">Used to group financial report periods and define year boundaries</p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-semibold mb-2">Your Fiscal Year Periods:</p>
          <div className="text-sm text-blue-900">
            {formData.fiscal_year_start_month === '1' && (
              <p>Calendar year: January 1 — December 31</p>
            )}
            {formData.fiscal_year_start_month === '7' && (
              <p>July 1 — June 30</p>
            )}
            {formData.fiscal_year_start_month !== '1' && formData.fiscal_year_start_month !== '7' && (
              <p>
                {months.find(m => m.value === formData.fiscal_year_start_month)?.label} 1 —
                {months.find(m => m.value === String((parseInt(formData.fiscal_year_start_month) - 1) || 12))?.label} 31
              </p>
            )}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900">
            <strong>ℹ️ Used for:</strong> Balance sheet comparatives (current vs prior year), P&L period grouping, and financial report date ranges.
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
        {loading ? 'Saving...' : 'Save Fiscal Year'}
      </button>
    </form>
  );
}
