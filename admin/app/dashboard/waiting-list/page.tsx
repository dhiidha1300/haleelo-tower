'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { waitingListAPI, productsAPI } from '@/lib/api';

interface Row {
  id: number; client_name: string; client_email: string | null; client_phone: string | null;
  space: string | null; floor: string | null; booking_date: string; session_type: string;
  status: string; position: number; notify_channel: string; notified: boolean;
  slot_opened_at: string | null; converted_booking_id: number | null; created_by: string | null;
}

const STATUS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800', cancelled: 'bg-gray-100 text-gray-500',
  converted: 'bg-green-100 text-green-700', expired: 'bg-red-100 text-red-600',
};
const CHANNEL_ICON: Record<string, string> = { email: '📧', whatsapp: '💬', both: '📧💬' };

export default function WaitingListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('waiting');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [limit, setLimit] = useState(3);
  const [form, setForm] = useState({
    product_id: '', session_type: 'morning', booking_date: '',
    client_name: '', client_email: '', client_phone: '', notify_channel: 'email', notes: '',
  });

  const fetchRows = () =>
    waitingListAPI.list(status ? { status } : {}).then(r => { setRows(r.data.waiting_list ?? []); setLimit(r.data.limit ?? 3); }).finally(() => setLoading(false));

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { productsAPI.list({ status: 'active' }).then(r => setSpaces(r.data.data ?? [])); }, []);

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await waitingListAPI.add(form);
      setShowForm(false);
      setForm({ product_id: '', session_type: 'morning', booking_date: '', client_name: '', client_email: '', client_phone: '', notify_channel: 'email', notes: '' });
      fetchRows(); flash('✓ Added to waiting list');
    } catch (err: any) { flash('✗ ' + (err.response?.data?.message || 'Failed to add')); }
  };

  const cancel = async (r: Row) => {
    if (!confirm(`Cancel ${r.client_name}'s waiting-list entry?`)) return;
    await waitingListAPI.cancel(r.id); fetchRows(); flash('✓ Entry cancelled');
  };
  const convert = async (r: Row) => {
    if (!confirm(`Convert ${r.client_name} into a booking for ${r.space}? (The slot must be free.)`)) return;
    try {
      const res = await waitingListAPI.convert(r.id);
      flash('✓ ' + res.data.message);
      if (res.data.booking_id) router.push(`/dashboard/bookings/${res.data.booking_id}`);
    } catch (err: any) { flash('✗ ' + (err.response?.data?.message || 'Convert failed')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Waiting List</h1>
          <p className="text-gray-600">Manage waitlisted customers · up to {limit} per slot</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ Add to Waiting List</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">Space *</label>
            <select required value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select…</option>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Session *</label>
            <select value={form.session_type} onChange={e => setForm(p => ({ ...p, session_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Date *</label>
            <input type="date" required value={form.booking_date} onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Notify via *</label>
            <select value={form.notify_channel} onChange={e => setForm(p => ({ ...p, notify_channel: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="both">Both</option></select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Client Name *</label>
            <input type="text" required value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input type="text" value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} placeholder="+2526…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All</option><option value="waiting">Waiting</option><option value="converted">Converted</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : rows.length === 0 ? <div className="p-6 text-center text-gray-500">No entries</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              {['#', 'Client', 'Space', 'Date', 'Session', 'Notify', 'Status', 'Actions'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${i === 7 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-[#C9A052]">{r.position}</td>
                  <td className="px-4 py-3"><div className="text-sm font-medium text-[#1B2D4F]">{r.client_name}</div><div className="text-xs text-gray-400">{r.client_phone || r.client_email || '—'}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.space}{r.floor ? ` · ${r.floor}` : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.booking_date}</td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-600">{r.session_type}</td>
                  <td className="px-4 py-3 text-sm">{CHANNEL_ICON[r.notify_channel] ?? r.notify_channel} {r.notified && <span className="text-[10px] text-green-600">✓ sent</span>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS[r.status]}`}>{r.status}</span>{r.slot_opened_at && r.status === 'waiting' && <span className="ml-1 text-[10px] text-blue-600">spot open</span>}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {r.status === 'waiting' && <>
                      <button onClick={() => convert(r)} className="text-green-600 hover:text-green-800 text-sm font-medium">Convert</button>
                      <button onClick={() => cancel(r)} className="text-red-500 hover:text-red-700 text-sm font-medium">Cancel</button>
                    </>}
                    {r.converted_booking_id && <button onClick={() => router.push(`/dashboard/bookings/${r.converted_booking_id}`)} className="text-[#1B2D4F] hover:underline text-sm font-medium">View booking</button>}
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
