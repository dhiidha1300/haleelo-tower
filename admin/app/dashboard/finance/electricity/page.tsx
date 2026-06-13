'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { electricityReadingsAPI, tenantsAPI, productsAPI } from '@/lib/api';

interface Reading {
  id: number; bill_code: string; tenant_name: string; space_name: string;
  reading_date: string; period: string; previous_reading: string; current_reading: string;
  kwh_consumed: string; rate_per_kwh: string; total_charge: string; status: string;
  invoice_code: string | null; invoice_id: number | null;
}

export default function ElectricityPage() {
  const router = useRouter();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [tenants, setTenants]   = useState<any[]>([]);
  const [spaces, setSpaces]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [tenantSpaces, setTenantSpaces] = useState<any[]>([]); // spaces leased by the selected tenant
  const [adjustPrev, setAdjustPrev]     = useState(false);     // unlock previous-reading editing
  const [addToReading, setAddToReading] = useState<any>(null); // reading being added to an invoice
  const [draftInvoices, setDraftInvoices] = useState<any[]>([]);
  const [form, setForm] = useState({ tenant_id: '', space_id: '', reading_date: new Date().toISOString().split('T')[0], previous_reading: '0', current_reading: '' });

  const fetchReadings = () =>
    electricityReadingsAPI.list().then(r => setReadings(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchReadings(); }, []);
  useEffect(() => {
    tenantsAPI.list({ status: 'active' }).then(r => setTenants(r.data.data ?? []));
    productsAPI.list({ type: 'office_space', status: 'active' }).then(r => setSpaces(r.data.data ?? []));
  }, []);

  // When a tenant is selected, look up the space(s) they lease and auto-fill.
  const handleTenantChange = async (tenantId: string) => {
    setForm(p => ({ ...p, tenant_id: tenantId, space_id: '', previous_reading: '0', current_reading: '' }));
    setTenantSpaces([]);
    setAdjustPrev(false);
    if (!tenantId) return;

    const res = await tenantsAPI.show(parseInt(tenantId));
    const leases = (res.data.active_leases ?? []).filter((l: any) => l.space_id);
    const leasedSpaces = leases.map((l: any) => ({ id: l.space_id, name: l.space, floor: { name: l.floor } }));
    setTenantSpaces(leasedSpaces);

    // Auto-select the space if the tenant leases exactly one
    if (leasedSpaces.length === 1) {
      handleSpaceChange(String(leasedSpaces[0].id), tenantId);
    }
  };

  // When a space is chosen, auto-fill the previous reading from the last recorded one.
  const handleSpaceChange = async (spaceId: string, tenantId?: string) => {
    const tid = tenantId ?? form.tenant_id;
    setForm(p => ({ ...p, space_id: spaceId }));
    setAdjustPrev(false);
    if (tid && spaceId) {
      const r = await electricityReadingsAPI.lastReading(parseInt(tid), parseInt(spaceId));
      setForm(p => ({ ...p, previous_reading: String(r.data.previous_reading ?? 0) }));
    }
  };

  // The dropdown shows the tenant's leased spaces once a tenant is picked; otherwise all office spaces.
  const spaceOptions = form.tenant_id ? tenantSpaces : spaces;

  const kwh    = Math.max(0, (parseFloat(form.current_reading) || 0) - (parseFloat(form.previous_reading) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await electricityReadingsAPI.record({
        tenant_id: parseInt(form.tenant_id),
        space_id: parseInt(form.space_id),
        reading_date: form.reading_date,
        previous_reading: parseFloat(form.previous_reading),
        current_reading: parseFloat(form.current_reading),
      });
      setShowForm(false);
      setForm({ tenant_id: '', space_id: '', reading_date: new Date().toISOString().split('T')[0], previous_reading: '0', current_reading: '' });
      setTenantSpaces([]);
      setAdjustPrev(false);
      fetchReadings();
      setMessage('✓ Reading recorded');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to record reading'));
    } finally { setSaving(false); }
  };

  const handleGenerateInvoice = async (id: number) => {
    if (!confirm('Generate a standalone electricity invoice for this reading?')) return;
    try {
      const res = await electricityReadingsAPI.generateInvoice(id);
      fetchReadings();
      if (res.data.invoice?.id && confirm(`${res.data.invoice.invoice_code} created. View it now?`)) {
        router.push(`/dashboard/finance/invoices/${res.data.invoice.id}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const openAddToInvoice = async (reading: any) => {
    try {
      const res = await electricityReadingsAPI.draftInvoices(reading.id);
      setDraftInvoices(res.data ?? []);
      setAddToReading(reading);
    } catch { alert('Failed to load draft invoices'); }
  };

  const handleAddToInvoice = async (invoiceId: number) => {
    if (!addToReading) return;
    try {
      await electricityReadingsAPI.addToInvoice(addToReading.id, invoiceId);
      setAddToReading(null); fetchReadings();
      setMessage('✓ Electricity added to invoice'); setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Electricity Billing</h1>
          <p className="text-gray-600">Meter readings and charge calculation</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New Reading</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">Record Meter Reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tenant *</label>
              <select required value={form.tenant_id} onChange={e => handleTenantChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Select tenant…</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Space * <span className="text-gray-400 normal-case">(from tenant's lease)</span></label>
              <select required value={form.space_id} onChange={e => handleSpaceChange(e.target.value)}
                disabled={!form.tenant_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052] disabled:bg-gray-100 disabled:text-gray-400">
                <option value="">{form.tenant_id ? 'Select space…' : 'Select a tenant first'}</option>
                {spaceOptions.map(s => <option key={s.id} value={s.id}>{s.name}{s.floor?.name ? ` — ${s.floor.name}` : ''}</option>)}
              </select>
              {form.tenant_id && tenantSpaces.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ This tenant has no active lease — showing nothing to bill.</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reading Date *</label>
              <input type="date" required value={form.reading_date} onChange={e => setForm(p => ({ ...p, reading_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-500">Previous Reading <span className="text-gray-400 normal-case">(auto-filled)</span></label>
                <button type="button" onClick={() => setAdjustPrev(v => !v)}
                  className="text-xs text-[#C9A052] hover:underline">
                  {adjustPrev ? 'Lock' : 'Adjust'}
                </button>
              </div>
              <input type="number" step="0.01" value={form.previous_reading}
                readOnly={!adjustPrev}
                onChange={e => setForm(p => ({ ...p, previous_reading: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052] ${adjustPrev ? 'border-amber-300 bg-amber-50' : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'}`} />
              {adjustPrev && <p className="text-xs text-amber-600 mt-1">⚠ Only override if correcting a meter error or recording the first reading.</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Current Reading (kWh) *</label>
              <input type="number" required step="0.01" min={form.previous_reading} value={form.current_reading} onChange={e => setForm(p => ({ ...p, current_reading: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div className="flex items-end">
              <div className="bg-gray-50 rounded-lg px-4 py-2 w-full">
                <p className="text-xs text-gray-500">Consumption: <strong className="text-[#1B2D4F]">{kwh.toFixed(2)} kWh</strong></p>
                <p className="text-xs text-gray-400">Charge calculated at the active rate on save</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Record Reading'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : readings.length === 0 ? <div className="p-6 text-center text-gray-500">No readings recorded yet</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant / Space</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">kWh</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Rate</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Charge</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {readings.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{r.bill_code}</td>
                    <td className="px-5 py-3 text-sm">
                      <p className="text-gray-700">{r.tenant_name}</p>
                      <p className="text-xs text-gray-400">{r.space_name}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.period}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">{parseFloat(r.kwh_consumed).toFixed(0)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">${parseFloat(r.rate_per_kwh).toFixed(4)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-700">${parseFloat(r.total_charge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.status === 'invoiced' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                      {r.status === 'invoiced' && r.invoice_id ? (
                        <button onClick={() => router.push(`/dashboard/finance/invoices/${r.invoice_id}`)} className="text-[#C9A052] hover:underline text-sm">{r.invoice_code}</button>
                      ) : (<>
                        <button onClick={() => openAddToInvoice(r)} className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">Add to Invoice</button>
                        <button onClick={() => handleGenerateInvoice(r.id)} className="text-[#1B2D4F] hover:text-[#0f1d33] text-sm font-medium">Standalone</button>
                      </>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add-to-invoice picker */}
      {addToReading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAddToReading(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Add to Existing Invoice</h2>
            <p className="text-sm text-gray-500 mb-4">{addToReading.bill_code} — ${parseFloat(addToReading.total_charge).toFixed(2)} will be added as a line item.</p>
            {draftInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">No draft invoices for this tenant. Use "Standalone" to create a separate electricity invoice.</p>
            ) : (
              <div className="divide-y">
                {draftInvoices.map(inv => (
                  <button key={inv.id} onClick={() => handleAddToInvoice(inv.id)}
                    className="w-full flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded text-left">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#1B2D4F]">{inv.invoice_code}</span>
                      <span className="ml-2 text-xs text-gray-400">{inv.type?.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-medium">${parseFloat(inv.total_amount).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAddToReading(null)} className="mt-4 w-full border border-gray-300 rounded-lg py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
