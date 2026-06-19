'use client';

import { useEffect, useState } from 'react';
import { couponsAPI } from '@/lib/api';

interface Row {
  coupon_id: number; user_id: number; name: string; role: string;
  code: string; discount_percent: number; active: boolean; role_cap: number;
}

export default function CouponsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetch = () => couponsAPI.list().then(r => setRows(r.data.coupons)).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, []);

  const save = async (row: Row, patch: any) => {
    try {
      await couponsAPI.update(row.coupon_id, patch);
      setMessage(`✓ Updated ${row.name}'s coupon`);
      setTimeout(() => setMessage(''), 2500);
      fetch();
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Update failed'));
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Staff Coupons</h1>
        <p className="text-gray-600">Each staff member has a discount code for bookings. Caps: Admin 50% · Finance 30% · Operations 25%.</p>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div> : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discount %</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Active</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.coupon_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-[#1B2D4F]">{r.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{r.role?.replace('_', ' ')} · cap {r.role_cap}%</p>
                  </td>
                  <td className="px-5 py-3 font-mono text-sm text-gray-700">{r.code}</td>
                  <td className="px-5 py-3">
                    <input type="number" min={0} max={r.role_cap} step="0.5" defaultValue={r.discount_percent}
                      onBlur={e => { const v = parseFloat(e.target.value); if (v !== r.discount_percent) save(r, { discount_percent: v }); }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                    <span className="text-xs text-gray-400 ml-1">/ {r.role_cap}%</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => save(r, { active: !r.active })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => { if (confirm(`Regenerate ${r.name}'s code? The old code stops working.`)) save(r, { regenerate: true }); }}
                      className="text-xs text-[#C9A052] hover:underline font-medium">↻ Regenerate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
