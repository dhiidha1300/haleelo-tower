'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { purchaseOrdersAPI } from '@/lib/api';

const money = (v: any) => '$' + parseFloat(v ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
const fmtDate = (raw: string | null) => raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-800', billed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700',
};
// 'billed' is reached by creating a Vendor Bill from the PO — not a manual status toggle.
const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  draft:    [{ label: 'Mark Sent', value: 'sent' }, { label: 'Cancel', value: 'cancelled' }],
  sent:     [{ label: 'Mark Received', value: 'received' }, { label: 'Cancel', value: 'cancelled' }],
  received: [{ label: 'Cancel', value: 'cancelled' }],
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchPO = () => purchaseOrdersAPI.show(parseInt(id)).then(r => setPo(r.data)).finally(() => setLoading(false));

  useEffect(() => { fetchPO(); }, [id]);

  const handleStatus = async (newStatus: string) => {
    try {
      await purchaseOrdersAPI.updateStatus(parseInt(id), newStatus);
      fetchPO();
      setMessage('✓ Status updated');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to update status'));
    }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!po) return <div className="text-center py-12 text-gray-500">Purchase order not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{po.po_code}</h1>
          <p className="text-gray-500 text-sm">{po.vendor?.name}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_STYLES[po.status]}`}>{po.status}</span>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {/* Status actions */}
      {((NEXT_STATUS[po.status] ?? []).length > 0 || ['sent','received'].includes(po.status)) && (
        <div className="flex gap-3 flex-wrap">
          {/* Create a real vendor bill from this PO (the step that hits the ledger) */}
          {['sent','received'].includes(po.status) && (
            <button onClick={() => router.push(`/dashboard/procurement/vendor-bills/create?po_id=${po.id}`)}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              🧾 Create Bill from this PO
            </button>
          )}
          {(NEXT_STATUS[po.status] ?? []).map(n => (
            <button key={n.value} onClick={() => handleStatus(n.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                n.value === 'cancelled'
                  ? 'border border-red-300 text-red-600 hover:bg-red-50'
                  : 'bg-[#1B2D4F] text-white hover:bg-[#0f1d33]'
              }`}>
              {n.label}
            </button>
          ))}
        </div>
      )}

      {po.status === 'billed' && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700">
          ✓ A vendor bill has been recorded for this PO. See the linked bills below.
        </div>
      )}

      {/* Meta */}
      <div className="bg-white rounded-lg shadow p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-gray-400 text-xs uppercase">Vendor</p><p className="font-medium text-[#1B2D4F]">{po.vendor?.name}</p></div>
        <div><p className="text-gray-400 text-xs uppercase">Order Date</p><p className="font-medium">{fmtDate(po.order_date)}</p></div>
        <div><p className="text-gray-400 text-xs uppercase">Expected Delivery</p><p className="font-medium">{fmtDate(po.expected_delivery_date)}</p></div>
        <div><p className="text-gray-400 text-xs uppercase">Created By</p><p className="font-medium">{po.created_by?.name ?? '—'}</p></div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Expense Account</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Est. Unit</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {po.items?.map((it: any) => (
              <tr key={it.id}>
                <td className="px-5 py-3 text-sm text-gray-700">{it.description}</td>
                <td className="px-5 py-3 text-xs text-gray-400">{it.expense_account ? `${it.expense_account.code} — ${it.expense_account.name}` : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-gray-500">{parseFloat(it.quantity)}</td>
                <td className="px-5 py-3 text-right text-sm text-gray-500">{money(it.estimated_unit_price)}</td>
                <td className="px-5 py-3 text-right text-sm font-medium">{money(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#1B2D4F]/5">
              <td colSpan={4} className="px-5 py-2.5 text-right text-sm font-bold text-[#1B2D4F]">Estimated Total</td>
              <td className="px-5 py-2.5 text-right text-sm font-bold text-[#1B2D4F]">{money(po.total_estimated_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Linked bills */}
      {po.bills?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-[#1B2D4F] mb-3">Linked Vendor Bills</h2>
          <div className="divide-y">
            {po.bills.map((b: any) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                onClick={() => router.push(`/dashboard/procurement/vendor-bills/${b.id}`)}>
                <span className="font-mono text-xs text-[#C9A052]">{b.bill_code}</span>
                <span className="font-medium">{money(b.total_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {po.notes && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h2>
          <p className="text-sm text-gray-700">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
