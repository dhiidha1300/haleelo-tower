'use client';

import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

interface PaymentTermsSettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function PaymentTermsSettings({ settings, onUpdate }: PaymentTermsSettingsProps) {
  const [formData, setFormData] = useState({
    invoice_due_days: settings?.invoice_due_days || '7',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings?.invoice_due_days) {
      setFormData({ invoice_due_days: settings.invoice_due_days });
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
      await settingsAPI.updateSingle('invoice_due_days', formData.invoice_due_days, 'Days from invoice issue to due date');
      setMessage('✓ Payment terms updated');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('✗ Failed to update terms');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-2">Payment Terms</h2>
        <p className="text-gray-600 text-sm">Configure the default number of days from invoice issue to due date.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Due Days</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="invoice_due_days"
            value={formData.invoice_due_days}
            onChange={handleChange}
            min="1"
            max="90"
            className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
          <span className="text-gray-600">days from issue date</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Used when auto-generating invoices to calculate due_date = issue_date + invoice_due_days</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Example:</strong> If you set 7 days and an invoice is issued on June 1st, the due date will be June 8th.
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
        {loading ? 'Saving...' : 'Save Payment Terms'}
      </button>
    </form>
  );
}
