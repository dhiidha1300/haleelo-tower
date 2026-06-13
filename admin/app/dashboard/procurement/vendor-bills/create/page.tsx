'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { vendorBillsAPI, vendorsAPI, accountingAPI, purchaseOrdersAPI } from '@/lib/api';

interface COA { id: number; code: string; name: string; type: string; }
interface Line { description: string; quantity: string; unit_price: string; expense_account_id: string; }

export default function CreateVendorBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get('po_id');

  const [vendors, setVendors] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<COA[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [poInfo, setPoInfo] = useState<any>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [form, setForm] = useState({ vendor_id: '', bill_date: new Date().toISOString().split('T')[0], due_date: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: '1', unit_price: '', expense_account_id: '' }]);

  useEffect(() => {
    vendorsAPI.list({ active_only: 'true' }).then(r => setVendors(r.data.data ?? []));
    accountingAPI.chartOfAccounts().then(r => setExpenseAccounts(r.data.accounts.filter((a: COA) => a.type === 'expense')));
  }, []);

  // Pre-fill from a Purchase Order when arriving via "Create Bill from PO"
  useEffect(() => {
    if (!poId) return;
    purchaseOrdersAPI.show(parseInt(poId)).then(r => {
      const po = r.data;
      setPoInfo(po);
      setForm(p => ({ ...p, vendor_id: String(po.vendor_id) }));
      if (po.items?.length) {
        setLines(po.items.map((it: any) => ({
          description: it.description,
          quantity: String(it.quantity ?? 1),
          unit_price: String(it.estimated_unit_price ?? ''),
          expense_account_id: it.expense_account_id ? String(it.expense_account_id) : '',
        })));
      }
    });
  }, [poId]);

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const addLine = () => setLines([...lines, { description: '', quantity: '1', unit_price: '', expense_account_id: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, f: keyof Line, v: string) => setLines(lines.map((l, idx) => idx === i ? { ...l, [f]: v } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('vendor_id', form.vendor_id);
      fd.append('bill_date', form.bill_date);
      if (poId) fd.append('po_id', poId);
      if (form.due_date) fd.append('due_date', form.due_date);
      if (form.notes) fd.append('notes', form.notes);
      fd.append('items', JSON.stringify(lines.map(l => ({
        description: l.description,
        quantity: parseFloat(l.quantity) || 1,
        unit_price: parseFloat(l.unit_price) || 0,
        expense_account_id: l.expense_account_id ? parseInt(l.expense_account_id) : null,
      }))));
      if (receipt) fd.append('receipt', receipt);
      const res = await vendorBillsAPI.create(fd);
      router.push(`/dashboard/procurement/vendor-bills/${res.data.id}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create bill');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">New Vendor Bill</h1>
        <p className="text-gray-500 text-sm">Recording a bill posts a journal entry (Debit expense, Credit Accounts Payable).</p>
      </div>

      {poInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
          ℹ Creating a bill from <strong>{poInfo.po_code}</strong>. Items were pre-filled — adjust the actual billed amounts as needed. The PO will be marked <strong>billed</strong> on save.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
            <select required value={form.vendor_id} onChange={e => setForm(p => ({ ...p, vendor_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
            <input type="date" required value={form.bill_date} onChange={e => setForm(p => ({ ...p, bill_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-[#1B2D4F]">Items</h2>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input type="text" required placeholder="Description" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                className="col-span-4 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <select required value={line.expense_account_id} onChange={e => updateLine(i, 'expense_account_id', e.target.value)}
                className="col-span-4 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Expense account…</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                className="col-span-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <input type="number" min="0" step="0.01" required placeholder="Price" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 1} className="col-span-1 text-red-400 hover:text-red-600 disabled:opacity-30 text-lg">×</button>
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-xs text-[#C9A052] hover:underline font-medium">+ Add item</button>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Receipt (optional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setReceipt(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs" />
            </div>
            <span className="text-sm text-gray-500">Total: <strong className="text-[#1B2D4F]">${total.toFixed(2)}</strong></span>
          </div>
        </div>

        {message && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">{loading ? 'Creating…' : 'Record Bill'}</button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}
