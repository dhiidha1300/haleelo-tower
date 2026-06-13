'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { invoicesAPI, tenantsAPI, accountingAPI } from '@/lib/api';

interface COA { id: number; code: string; name: string; type: string; }
interface Tenant { id: number; company_name: string; email: string; phone: string; }
interface FormLine { description: string; quantity: string; unit_price: string; account_code_id: string; }

export default function CreateInvoicePage() {
  const router = useRouter();
  const [revenueAccounts, setRevenue] = useState<COA[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    type: 'manual', tenant_id: '', bill_to_name: '', bill_to_email: '', bill_to_phone: '',
    issue_date: new Date().toISOString().split('T')[0], due_date: '', lpo_number: '', notes: '',
  });
  const [lines, setLines] = useState<FormLine[]>([
    { description: '', quantity: '1', unit_price: '', account_code_id: '' },
  ]);

  useEffect(() => {
    accountingAPI.chartOfAccounts().then(r => setRevenue(r.data.accounts.filter((a: COA) => a.type === 'revenue')));
    tenantsAPI.list({ status: 'active' }).then(r => setTenants(r.data.data ?? []));
  }, []);

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const addLine    = () => setLines([...lines, { description: '', quantity: '1', unit_price: '', account_code_id: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof FormLine, value: string) =>
    setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleTenant = (id: string) => {
    const t = tenants.find(x => String(x.id) === id);
    setForm(p => ({ ...p, tenant_id: id, bill_to_name: t?.company_name ?? '', bill_to_email: t?.email ?? '', bill_to_phone: t?.phone ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await invoicesAPI.create({
        ...form,
        tenant_id: form.tenant_id ? parseInt(form.tenant_id) : null,
        due_date:  form.due_date || undefined,
        lines: lines.map(l => ({
          description:     l.description,
          quantity:        parseFloat(l.quantity) || 1,
          unit_price:      parseFloat(l.unit_price) || 0,
          account_code_id: l.account_code_id ? parseInt(l.account_code_id) : null,
        })),
      });
      router.push(`/dashboard/finance/invoices/${res.data.id}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="manual">Manual / Ad-hoc</option>
                <option value="office_rent">Office Rent</option>
                <option value="educational">Educational</option>
                <option value="conference_hall">Conference Hall</option>
                <option value="electricity">Electricity</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
              <input type="date" required value={form.issue_date}
                onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                placeholder="Auto from settings"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant (optional)</label>
              <select value={form.tenant_id} onChange={e => handleTenant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">— Bill a non-tenant —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill To Name *</label>
              <input type="text" required value={form.bill_to_name}
                onChange={e => setForm(p => ({ ...p, bill_to_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.bill_to_email}
                onChange={e => setForm(p => ({ ...p, bill_to_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LPO Number</label>
              <input type="text" value={form.lpo_number}
                onChange={e => setForm(p => ({ ...p, lpo_number: e.target.value }))}
                placeholder="For corporate/govt clients"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-[#1B2D4F]">Line Items</h2>
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
            <span className="col-span-4">Description</span>
            <span className="col-span-3">Revenue Account</span>
            <span className="col-span-1">Qty</span>
            <span className="col-span-2">Unit Price</span>
            <span className="col-span-1">Total</span>
            <span className="col-span-1"></span>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input type="text" required placeholder="Description" value={line.description}
                onChange={e => updateLine(i, 'description', e.target.value)}
                className="col-span-4 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <select value={line.account_code_id} onChange={e => updateLine(i, 'account_code_id', e.target.value)}
                className="col-span-3 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Account…</option>
                {revenueAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" value={line.quantity}
                onChange={e => updateLine(i, 'quantity', e.target.value)}
                className="col-span-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <input type="number" min="0" step="0.01" required placeholder="0.00" value={line.unit_price}
                onChange={e => updateLine(i, 'unit_price', e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <span className="col-span-1 text-sm text-gray-600 text-right">
                ${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}
              </span>
              <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 1}
                className="col-span-1 text-red-400 hover:text-red-600 disabled:opacity-30 text-lg">×</button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-xs text-[#C9A052] hover:underline font-medium">+ Add line</button>

          <div className="flex justify-end border-t pt-3">
            <div className="text-right">
              <span className="text-sm text-gray-500">Subtotal: </span>
              <span className="text-lg font-bold text-[#1B2D4F]">${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" />
        </div>

        {message && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Draft Invoice'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}
