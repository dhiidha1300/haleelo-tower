'use client';

import { useEffect, useState, Fragment } from 'react';
import { accountingAPI } from '@/lib/api';

interface Row { code: string; name: string; type: string; debit: string; credit: string; }
interface TB { rows: Row[]; total_debit: string; total_credit: string; balanced: boolean; as_of: string; }

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  revenue: 'Revenue', expense: 'Expenses',
};
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export default function TrialBalancePage() {
  const [tb, setTb]       = useState<TB | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf]   = useState(new Date().toISOString().split('T')[0]);

  const fetchTB = (date?: string) => {
    setLoading(true);
    accountingAPI.trialBalance(date)
      .then(r => setTb(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTB(asOf); }, []);

  const fmt = (v: string) => parseFloat(v) === 0 ? '' : `$${parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Group rows by type
  const grouped = TYPE_ORDER.map(type => ({
    type,
    rows: tb?.rows.filter(r => r.type === type) ?? [],
  })).filter(g => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Trial Balance</h1>
          <p className="text-gray-600">All accounts with debit/credit totals · validates the ledger</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">As of date</label>
            <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>
          <button onClick={() => fetchTB(asOf)}
            className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Run
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {tb && (
        <div className={`rounded-xl p-4 flex items-center justify-between ${tb.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tb.balanced ? '✅' : '⚠️'}</span>
            <div>
              <p className={`font-semibold ${tb.balanced ? 'text-green-800' : 'text-red-800'}`}>
                {tb.balanced ? 'Ledger is balanced' : 'Ledger is OUT OF BALANCE'}
              </p>
              <p className={`text-xs ${tb.balanced ? 'text-green-600' : 'text-red-600'}`}>
                Σ Debits {tb.balanced ? '=' : '≠'} Σ Credits · as of {tb.as_of}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-gray-500">Total Debit: <span className="font-semibold text-[#1B2D4F]">${parseFloat(tb.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
            <p className="text-gray-500">Total Credit: <span className="font-semibold text-[#1B2D4F]">${parseFloat(tb.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Calculating…</div>
      ) : !tb || tb.rows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No account activity to report yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1B2D4F] text-white">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Account</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase">Debit</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase">Credit</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <Fragment key={group.type}>
                  <tr className="bg-gray-100">
                    <td colSpan={4} className="px-5 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                      {TYPE_LABELS[group.type]}
                    </td>
                  </tr>
                  {group.rows.map(r => (
                    <tr key={r.code} className="border-b hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{r.code}</td>
                      <td className="px-5 py-2.5 text-sm text-gray-700">{r.name}</td>
                      <td className="px-5 py-2.5 text-right text-sm text-gray-700">{fmt(r.debit)}</td>
                      <td className="px-5 py-2.5 text-right text-sm text-gray-700">{fmt(r.credit)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr className="bg-gray-50 border-t-2 border-[#1B2D4F] font-bold">
                <td colSpan={2} className="px-5 py-3 text-sm text-[#1B2D4F] text-right">TOTAL</td>
                <td className="px-5 py-3 text-right text-sm text-[#1B2D4F]">${parseFloat(tb.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-5 py-3 text-right text-sm text-[#1B2D4F]">${parseFloat(tb.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
