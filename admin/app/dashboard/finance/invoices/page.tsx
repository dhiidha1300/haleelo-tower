'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { invoicesAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Invoice {
  id: number;
  invoice_code: string;
  type: string;
  bill_to: string;
  issue_date: string;
  due_date: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
  status: string;
}

const TABS = [
  { label: 'All',      value: '' },
  { label: 'Draft',    value: 'draft' },
  { label: 'Sent',     value: 'sent' },
  { label: 'Partial',  value: 'partial' },
  { label: 'Paid',     value: 'paid' },
  { label: 'Overdue',  value: 'overdue' },
];

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  partial:  'bg-amber-100 text-amber-800',
  paid:     'bg-green-100 text-green-800',
  overdue:  'bg-red-100 text-red-700',
  cancelled:'bg-gray-100 text-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  office_rent: 'Office Rent', educational: 'Educational',
  conference_hall: 'Conference', electricity: 'Electricity', manual: 'Manual',
};

export default function InvoicesPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => { fetchInvoices(); }, [tab, search, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoicesAPI.list({ status: tab, search, page: String(page) });
      setInvoices(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Invoices</h1>
          <p className="text-gray-600">Customer invoices and billing</p>
        </div>
        {hasPermission('manage-invoices') && (
          <button onClick={() => router.push('/dashboard/finance/invoices/create')}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            + New Invoice
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.value ? 'border-b-2 border-[#C9A052] text-[#C9A052]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <input type="text" placeholder="Search by code or customer…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No invoices found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Balance</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{inv.invoice_code}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{inv.bill_to}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{TYPE_LABELS[inv.type] ?? inv.type}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{inv.due_date}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-700">${parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`px-5 py-3 text-right text-sm font-semibold ${parseFloat(inv.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${parseFloat(inv.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 25 && (
        <div className="flex justify-center items-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {Math.ceil(total / 25)} ({total} total)</span>
          <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
