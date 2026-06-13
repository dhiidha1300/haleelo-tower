'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseOrdersAPI } from '@/lib/api';

interface PO {
  id: number; po_code: string; status: string; order_date: string;
  total_estimated_amount: string; vendor: { name: string } | null; items_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  received: 'bg-amber-100 text-amber-800', billed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-700',
};

const fmtDate = (raw: string | null) => raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  draft:    [{ label: 'Mark Sent', value: 'sent' }, { label: 'Cancel', value: 'cancelled' }],
  sent:     [{ label: 'Mark Received', value: 'received' }, { label: 'Cancel', value: 'cancelled' }],
  received: [],
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [pos, setPos]       = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const fetchPOs = () =>
    purchaseOrdersAPI.list({ status }).then(r => setPos(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchPOs(); }, [status]);

  const handleStatus = async (id: number, newStatus: string) => {
    try {
      await purchaseOrdersAPI.updateStatus(id, newStatus);
      fetchPOs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Purchase Orders</h1>
          <p className="text-gray-600">Orders sent to vendors before goods are delivered</p>
        </div>
        <button onClick={() => router.push('/dashboard/procurement/purchase-orders/create')}
          className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New PO</button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="received">Received</option>
          <option value="billed">Billed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : pos.length === 0 ? <div className="p-6 text-center text-gray-500">No purchase orders yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Estimated</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pos.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <button onClick={() => router.push(`/dashboard/procurement/purchase-orders/${po.id}`)}
                      className="font-mono text-xs font-semibold text-[#C9A052] hover:underline">{po.po_code}</button>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{po.vendor?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{fmtDate(po.order_date)}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-700">${parseFloat(po.total_estimated_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[po.status]}`}>{po.status}</span></td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => router.push(`/dashboard/procurement/purchase-orders/${po.id}`)}
                      className="text-sm font-medium text-[#1B2D4F] hover:text-[#0f1d33]">View</button>
                    {['sent','received'].includes(po.status) && (
                      <button onClick={() => router.push(`/dashboard/procurement/vendor-bills/create?po_id=${po.id}`)}
                        className="text-sm font-medium text-[#C9A052] hover:text-[#b89140]">Create Bill</button>
                    )}
                    {(NEXT_STATUS[po.status] ?? []).map(n => (
                      <button key={n.value} onClick={() => handleStatus(po.id, n.value)}
                        className={`text-sm font-medium ${n.value === 'cancelled' ? 'text-red-500 hover:text-red-700' : 'text-[#C9A052] hover:text-[#b89140]'}`}>
                        {n.label}
                      </button>
                    ))}
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
