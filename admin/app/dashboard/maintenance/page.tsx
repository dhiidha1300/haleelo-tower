'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maintenanceAPI, productsAPI } from '@/lib/api';

interface Row {
  id: number; request_code: string; title: string; category: string; priority: string;
  status: string; job_type: string | null; location: string; tenant: string | null;
  assignee: string | null; estimated_cost: string | null; photos_count: number; created_at: string;
}

const STATUS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800', in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500',
};
const PRIORITY: Record<string, string> = { low: 'text-gray-400', normal: 'text-blue-500', high: 'text-red-500' };
const CAT_ICON: Record<string, string> = { ac: '❄️', electrical: '⚡', cleaning: '🧹', plumbing: '🚰', equipment: '🛠️', other: '🔧' };

export default function MaintenancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', category: 'other', priority: 'normal', description: '', space_id: '', location_text: '' });

  const fetchRows = () =>
    maintenanceAPI.list(status ? { status } : {}).then(r => setRows(r.data.requests ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { productsAPI.list({ status: 'active' }).then(r => setSpaces(r.data.data ?? [])); }, []);

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3500); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceAPI.create(form, photos);
      setShowForm(false);
      setForm({ title: '', category: 'other', priority: 'normal', description: '', space_id: '', location_text: '' });
      setPhotos([]); if (fileRef.current) fileRef.current.value = '';
      fetchRows(); flash('✓ Maintenance request logged');
    } catch (err: any) { flash('✗ ' + (err.response?.data?.message || 'Failed to log request')); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Maintenance</h1>
          <p className="text-gray-600">Log, assign, outsource and resolve maintenance needs</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New Request</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. AC not cooling in Hall A" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                {['ac','electrical','cleaning','plumbing','equipment','other'].map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Space</label>
              <select value={form.space_id} onChange={e => setForm(p => ({ ...p, space_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">— or use area below —</option>{spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Area (common areas)</label>
              <input type="text" value={form.location_text} onChange={e => setForm(p => ({ ...p, location_text: e.target.value }))} placeholder="e.g. Lobby, Rooftop" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Problem description (before)</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" /></div>
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Before photos</label>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files ?? []))} className="block text-sm text-gray-500" />
              {photos.length > 0 && <p className="text-xs text-gray-400 mt-1">{photos.length} photo(s) selected</p>}</div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Log Request'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Statuses</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : rows.length === 0 ? <div className="p-6 text-center text-gray-500">No maintenance requests</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              {['Code', 'Title', 'Location', 'Status', 'Assignee', 'Cost', ''].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/maintenance/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.request_code}</td>
                  <td className="px-4 py-3"><div className="text-sm font-medium text-[#1B2D4F]">{CAT_ICON[r.category]} {r.title} <span className={PRIORITY[r.priority]}>{r.priority === 'high' ? '●' : ''}</span></div><div className="text-xs text-gray-400">{r.photos_count} photo(s)</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.location}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS[r.status]}`}>{r.status.replace('_', ' ')}</span>{r.job_type && <span className="ml-1 text-[10px] text-gray-400">{r.job_type}</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.assignee ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{r.estimated_cost ? `$${parseFloat(r.estimated_cost).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-[#C9A052] text-sm">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
