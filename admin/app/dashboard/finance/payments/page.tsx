'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { paymentsAPI } from '@/lib/api';

interface Payment {
  id: number;
  payment_code: string;
  type: string;
  invoice_code: string | null;
  vendor_bill_code: string | null;
  document_code: string | null;
  amount: string;
  payment_date: string;
  payment_method: string;
  account_name: string;
  reference: string | null;
  recorded_by: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  edahab: 'Edahab', zaad: 'ZAAD', bank_transfer: 'Bank Transfer', cheque: 'Cheque', cash: 'Cash',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [method, setMethod]     = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => { fetchPayments(); }, [method, search, page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentsAPI.list({ method, search, page: String(page) });
      setPayments(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const downloadVoucher = async (pid: number) => {
    const res = await paymentsAPI.voucher(pid);
    window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Payments</h1>
        <p className="text-gray-600">All recorded customer receipts and vendor payments</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex gap-3 flex-wrap">
        <input type="text" placeholder="Search by code or reference…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
        <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Methods</option>
          <option value="edahab">Edahab</option>
          <option value="zaad">ZAAD</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading payments…</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No payments recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Document</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Account</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map(p => {
                  const isReceipt = p.type === 'customer_receipt';
                  return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{p.payment_code}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReceipt ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                        {isReceipt ? 'Receipt In' : 'Vendor Out'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {p.document_code ? (
                        <span className="font-mono text-xs text-[#C9A052]">{p.document_code}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{p.payment_date}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{p.account_name}</td>
                    <td className={`px-5 py-3 text-right text-sm font-semibold ${isReceipt ? 'text-green-600' : 'text-orange-600'}`}>
                      {isReceipt ? '+' : '−'}${parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => downloadVoucher(p.id)} className="text-[#C9A052] hover:underline text-sm font-medium">PDF</button>
                    </td>
                  </tr>
                  );
                })}
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
