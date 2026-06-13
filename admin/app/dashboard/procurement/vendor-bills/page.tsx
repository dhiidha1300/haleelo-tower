'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { vendorBillsAPI } from '@/lib/api';

interface Bill {
  id: number; bill_code: string; vendor_name: string; bill_date: string;
  due_date: string | null; total_amount: string; amount_paid: string; balance_due: string; status: string;
}
const STATUS_STYLES: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700', partial: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-400',
};

export default function VendorBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const fetchBills = () =>
    vendorBillsAPI.list({ status }).then(r => setBills(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchBills(); }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Vendor Bills</h1>
          <p className="text-gray-600">Bills received from suppliers — payables</p>
        </div>
        <button onClick={() => router.push('/dashboard/procurement/vendor-bills/create')}
          className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New Bill</button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : bills.length === 0 ? <div className="p-6 text-center text-gray-500">No vendor bills yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bill Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Balance</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bills.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/procurement/vendor-bills/${b.id}`)}>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{b.bill_code}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{b.vendor_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{b.bill_date}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-700">${parseFloat(b.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={`px-5 py-3 text-right text-sm font-semibold ${parseFloat(b.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>${parseFloat(b.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[b.status]}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
