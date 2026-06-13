'use client';

import { useState, useEffect } from 'react';
import { electricityAPI } from '@/lib/api';

interface Rate {
  id: number;
  rate_per_kwh: string;
  effective_from: string;
  effective_to: string | null;
  creator: { id: number; name: string } | null;
  created_at: string;
}

interface ElectricitySettingsProps {
  settings: any;
  onUpdate: () => void;
}

export function ElectricitySettings({ settings, onUpdate }: ElectricitySettingsProps) {
  const [rates, setRates]         = useState<Rate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({
    rate_per_kwh: '',
    effective_from: new Date().toISOString().split('T')[0], // today
  });

  useEffect(() => { loadRates(); }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      const res = await electricityAPI.list();
      setRates(res.data);
    } catch {
      showMsg('✗ Failed to load rates');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rate_per_kwh || parseFloat(form.rate_per_kwh) <= 0) {
      return showMsg('✗ Rate must be greater than 0');
    }
    setSaving(true);
    try {
      await electricityAPI.create(form.rate_per_kwh, form.effective_from);
      showMsg('✓ New rate saved and history updated');
      setShowForm(false);
      setForm({ rate_per_kwh: '', effective_from: new Date().toISOString().split('T')[0] });
      await loadRates();
      onUpdate();
    } catch (err: any) {
      showMsg('✗ ' + (err.response?.data?.message || 'Failed to save rate'));
    } finally {
      setSaving(false);
    }
  };

  const currentRate = rates.find(r => r.effective_to === null);
  const history     = rates.filter(r => r.effective_to !== null);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#1B2D4F] border-t-[#C9A052] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#1B2D4F] mb-1">Electricity Rate Configuration</h2>
        <p className="text-gray-600 text-sm">
          Rates are stored with effective dates. All historical rates are preserved and used when
          calculating past electricity bills — changing the rate never alters historical charges.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium border ${
          message.startsWith('✓')
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Current Rate Card */}
      <div className="rounded-xl border-2 border-[#C9A052] p-6 bg-[#C9A052]/5">
        <p className="text-xs font-semibold text-[#C9A052] uppercase tracking-wide mb-1">Current Rate</p>
        {currentRate ? (
          <>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-[#1B2D4F]">
                ${parseFloat(currentRate.rate_per_kwh).toFixed(4)}
              </span>
              <span className="text-gray-500 mb-1">per kWh</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              In effect since <span className="font-medium">{formatDate(currentRate.effective_from)}</span>
              {currentRate.creator && (
                <> · set by <span className="font-medium">{currentRate.creator.name}</span></>
              )}
            </p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">No rate set yet. Add one below.</p>
        )}
      </div>

      {/* Add New Rate */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#C9A052] hover:text-[#C9A052] transition-colors text-sm font-medium"
        >
          + Set New Rate
        </button>
      ) : (
        <div className="border-2 border-dashed border-[#C9A052] rounded-lg p-5 bg-[#C9A052]/5">
          <h3 className="font-semibold text-[#1B2D4F] mb-4">New Electricity Rate</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate per kWh (USD) *
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-sm font-medium">$</span>
                  <input
                    type="number"
                    value={form.rate_per_kwh}
                    onChange={e => setForm(p => ({ ...p, rate_per_kwh: e.target.value }))}
                    step="0.0001"
                    min="0.0001"
                    placeholder="0.2500"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                  />
                  <span className="text-gray-500 text-sm">/kWh</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Effective From *
                </label>
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={e => setForm(p => ({ ...p, effective_from: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Saving this rate will automatically close the current rate by setting its end date to
              the day before <strong>{form.effective_from || 'the effective date'}</strong>.
              Historical bills are not affected.
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Rate'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ rate_per_kwh: '', effective_from: new Date().toISOString().split('T')[0] }); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rate History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#1B2D4F] mb-3">Rate History</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rate ($/kWh)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Effective From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Effective To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Set By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(rate => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">
                      ${parseFloat(rate.rate_per_kwh).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(rate.effective_from)}</td>
                    <td className="px-4 py-3 text-gray-600">{rate.effective_to ? formatDate(rate.effective_to) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{rate.creator?.name || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Historical rates are read-only. They are used to calculate past electricity bills accurately.
          </p>
        </div>
      )}
    </div>
  );
}
