'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { maintenanceAPI, employeesAPI, vendorsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const STATUS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800', in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500',
};

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin', 'operations'].includes(user?.role ?? '');

  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const [assignId, setAssignId] = useState('');
  const [outForm, setOutForm] = useState({ vendor_id: '', cost: '', bill_date: new Date().toISOString().split('T')[0], due_date: '' });
  const [resolveNotes, setResolveNotes] = useState('');
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const afterRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const fetchM = () => maintenanceAPI.show(parseInt(id)).then(r => setM(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchM(); }, [id]);
  useEffect(() => {
    if (canManage) {
      employeesAPI.list({ status: 'active' }).then(r => setEmployees(r.data.data ?? []));
      vendorsAPI.list({ active_only: 'true' }).then(r => setVendors(r.data.data ?? []));
    }
  }, [canManage]);

  const flash = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

  const assign = async () => { if (!assignId) return; setBusy(true); try { await maintenanceAPI.assign(parseInt(id), parseInt(assignId)); fetchM(); flash('✓ Assigned to staff'); } catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed')); } finally { setBusy(false); } };
  const outsource = async () => {
    if (!outForm.vendor_id || !outForm.cost) return flash('✗ Pick a vendor and enter the cost');
    setBusy(true);
    try { await maintenanceAPI.outsource(parseInt(id), { ...outForm, cost: parseFloat(outForm.cost), vendor_id: parseInt(outForm.vendor_id) }); fetchM(); flash('✓ Outsourced — vendor bill created'); }
    catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed')); } finally { setBusy(false); }
  };
  const resolve = async () => {
    setBusy(true);
    try { await maintenanceAPI.resolve(parseInt(id), resolveNotes, afterPhotos); setAfterPhotos([]); if (afterRef.current) afterRef.current.value = ''; fetchM(); flash('✓ Marked resolved'); }
    catch (e: any) { flash('✗ ' + (e.response?.data?.message || 'Failed')); } finally { setBusy(false); }
  };
  const cancel = async () => { if (!confirm('Cancel this maintenance request?')) return; await maintenanceAPI.cancel(parseInt(id)); fetchM(); flash('✓ Cancelled'); };
  const pdf = async () => { const r = await maintenanceAPI.report(parseInt(id)); window.open(window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' })), '_blank'); };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!m) return <div className="text-center py-12 text-gray-500">Not found.</div>;

  const Gallery = ({ photos, label }: { photos: any[]; label: string }) => (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {photos?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p: any) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
            </a>
          ))}
        </div>
      ) : <p className="text-sm text-gray-400 italic">No photos</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{m.title}</h1>
          <p className="text-gray-500 text-sm font-mono">{m.request_code}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={pdf} className="border border-[#1B2D4F] text-[#1B2D4F] hover:bg-[#1B2D4F] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">📄 Report</button>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS[m.status]}`}>{m.status.replace('_', ' ')}</span>
        </div>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-lg shadow p-5 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-400 text-xs uppercase">Category</p><p className="font-medium capitalize">{m.category}</p></div>
            <div><p className="text-gray-400 text-xs uppercase">Priority</p><p className="font-medium capitalize">{m.priority}</p></div>
            <div><p className="text-gray-400 text-xs uppercase">Location</p><p className="font-medium">{m.location ?? '—'}</p></div>
            <div><p className="text-gray-400 text-xs uppercase">Tenant</p><p className="font-medium">{m.tenant_name ?? '—'}</p></div>
            <div><p className="text-gray-400 text-xs uppercase">Logged by</p><p className="font-medium">{m.created_by?.name ?? '—'}</p></div>
            <div><p className="text-gray-400 text-xs uppercase">Assignee</p><p className="font-medium">{m.assignee ?? 'Unassigned'}</p></div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 space-y-4">
            <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Problem (Before)</p><p className="text-sm text-gray-700">{m.description || '—'}</p></div>
            <Gallery photos={m.before_photos} label="Before photos" />
          </div>

          {(m.status === 'resolved' || m.resolution_notes || (m.after_photos?.length)) && (
            <div className="bg-white rounded-lg shadow p-5 space-y-4">
              <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Resolution (After)</p><p className="text-sm text-gray-700">{m.resolution_notes || '—'}</p></div>
              <Gallery photos={m.after_photos} label="After photos" />
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-5">
          {m.job_type === 'outsourced' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-amber-800">Outsourced</p>
              <p className="text-amber-700 mt-1">{m.vendor?.name} · ${parseFloat(m.estimated_cost ?? '0').toLocaleString()}</p>
              {m.vendor_bill_code && <button onClick={() => router.push(`/dashboard/procurement/vendor-bills/${m.vendor_bill_id}`)} className="text-xs text-[#C9A052] hover:underline mt-1">Vendor Bill: {m.vendor_bill_code} →</button>}
            </div>
          )}

          {canManage && m.status !== 'resolved' && m.status !== 'cancelled' && (
            <>
              {/* Assign internal */}
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <p className="text-sm font-semibold text-[#1B2D4F]">Assign internal staff</p>
                <select value={assignId} onChange={e => setAssignId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select employee…</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>
                <button onClick={assign} disabled={busy || !assignId} className="w-full bg-[#1B2D4F] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">Assign</button>
              </div>

              {/* Outsource */}
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <p className="text-sm font-semibold text-[#1B2D4F]">Outsource to vendor</p>
                <select value={outForm.vendor_id} onChange={e => setOutForm(p => ({ ...p, vendor_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select vendor…</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                <input type="number" min="0" step="0.01" value={outForm.cost} onChange={e => setOutForm(p => ({ ...p, cost: e.target.value }))} placeholder="Cost ($)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                <input type="date" value={outForm.bill_date} onChange={e => setOutForm(p => ({ ...p, bill_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                <button onClick={outsource} disabled={busy} className="w-full bg-[#C9A052] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">Outsource &amp; create bill</button>
              </div>

              {/* Resolve */}
              <div className="bg-white rounded-lg shadow p-4 space-y-2">
                <p className="text-sm font-semibold text-[#1B2D4F]">Mark resolved</p>
                <textarea rows={2} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Resolution notes (after)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" />
                <input ref={afterRef} type="file" accept="image/*" multiple onChange={e => setAfterPhotos(Array.from(e.target.files ?? []))} className="block text-xs text-gray-500" />
                {afterPhotos.length > 0 && <p className="text-xs text-gray-400">{afterPhotos.length} after photo(s)</p>}
                <button onClick={resolve} disabled={busy} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">✓ Resolve</button>
                <button onClick={cancel} disabled={busy} className="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium">Cancel request</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
