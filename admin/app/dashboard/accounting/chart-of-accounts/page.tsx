'use client';

import { useEffect, useState } from 'react';
import { accountingAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface COA {
  id: number;
  code: string;
  name: string;
  type: string;
  description: string | null;
  active: boolean;
  is_system: boolean;
  balance: string;
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  revenue: 'Revenue', expense: 'Expenses',
};
const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-700 bg-blue-50',
  liability: 'text-orange-700 bg-orange-50',
  equity: 'text-purple-700 bg-purple-50',
  revenue: 'text-green-700 bg-green-50',
  expense: 'text-red-700 bg-red-50',
};

export default function ChartOfAccountsPage() {
  const { hasPermission } = usePermission();
  const [accounts, setAccounts] = useState<COA[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage]   = useState('');
  const [form, setForm] = useState({ code: '', name: '', type: 'expense', description: '' });

  const canManage = hasPermission('manage-chart-of-accounts');
  const canEditCodes = hasPermission('edit-account-codes');

  const fetchAccounts = () =>
    accountingAPI.chartOfAccounts()
      .then(r => setAccounts(r.data.accounts))
      .finally(() => setLoading(false));

  useEffect(() => { fetchAccounts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      await accountingAPI.createAccount(form);
      setForm({ code: '', name: '', type: 'expense', description: '' });
      setShowForm(false);
      fetchAccounts();
      setMessage('✓ Sub-account created');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to create account'));
    }
  };

  const grouped = TYPE_ORDER.map(type => ({
    type,
    items: accounts.filter(a => a.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Chart of Accounts</h1>
          <p className="text-gray-600">The accounting structure for all financial transactions</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            + Add Sub-account
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">New Sub-account</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input type="text" required value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="e.g. 4081"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Marketing Expenses"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                {TYPE_ORDER.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading chart of accounts…</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(group => (
            <div key={group.type} className="bg-white rounded-lg shadow overflow-hidden">
              <div className={`px-5 py-2.5 font-semibold text-sm ${TYPE_COLORS[group.type]}`}>
                {TYPE_LABELS[group.type]}
              </div>
              <table className="w-full">
                <tbody className="divide-y">
                  {group.items.map(a => (
                    <tr key={a.id} className={`hover:bg-gray-50 ${!a.active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3 w-20">
                        <span className="font-mono text-sm font-semibold text-[#1B2D4F]">{a.code}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-700">{a.name}</span>
                        {a.is_system && <span className="ml-2 text-[10px] text-gray-400 uppercase">system</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-medium text-gray-700">${parseFloat(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {!canManage && (
        <p className="text-xs text-gray-400 text-center">You have read-only access to the chart of accounts.</p>
      )}
    </div>
  );
}
