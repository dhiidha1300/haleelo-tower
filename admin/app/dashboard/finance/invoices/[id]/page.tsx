'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invoicesAPI, accountingAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
};

const fmtDate = (raw: string | null) => raw ? new Date(raw).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const money = (v: any) => '$' + parseFloat(v ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = usePermission();

  const [invoice, setInvoice] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy]       = useState(false);

  const [showPay, setShowPay] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'edahab', account_id: '', reference_number: '' });

  const fetchInvoice = () =>
    invoicesAPI.show(parseInt(id)).then(r => { setInvoice(r.data); }).finally(() => setLoading(false));

  useEffect(() => {
    fetchInvoice();
    accountingAPI.accounts().then(r => setAccounts(r.data.accounts));
  }, [id]);

  const handleSend = async () => {
    if (!confirm('Send this invoice? This posts the accounts-receivable journal entry and cannot be undone.')) return;
    setBusy(true);
    try {
      await invoicesAPI.send(parseInt(id));
      fetchInvoice();
      setMessage('✓ Invoice sent and journal posted');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to send'));
    } finally { setBusy(false); }
  };

  const handlePdf = async () => {
    const res = await invoicesAPI.pdf(parseInt(id));
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await invoicesAPI.recordPayment(parseInt(id), {
        ...payForm,
        amount: parseFloat(payForm.amount),
        account_id: parseInt(payForm.account_id),
      });
      setShowPay(false);
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'edahab', account_id: '', reference_number: '' });
      fetchInvoice();
      setMessage('✓ Payment recorded');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to record payment'));
    } finally { setBusy(false); }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!invoice) return <div className="text-center py-12 text-gray-500">Invoice not found.</div>;

  const balanceDue = parseFloat(invoice.balance_due ?? '0');

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{invoice.invoice_code}</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_STYLES[invoice.status]}`}>{invoice.status}</span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>
      )}

      {/* Action bar */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handlePdf} className="border border-[#1B2D4F] text-[#1B2D4F] hover:bg-[#1B2D4F] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          📄 View PDF
        </button>
        {hasPermission('send-invoice') && invoice.status === 'draft' && (
          <button onClick={handleSend} disabled={busy}
            className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            ✉ Send Invoice
          </button>
        )}
        {hasPermission('manage-payments') && ['sent','partial','overdue'].includes(invoice.status) && balanceDue > 0 && (
          <button onClick={() => setShowPay(true)}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            💵 Record Payment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Bill to + dates */}
          <div className="bg-white rounded-lg shadow p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase">Bill To</p>
              <p className="font-semibold text-[#1B2D4F]">{invoice.bill_to}</p>
              {invoice.bill_to_email && <p className="text-gray-500">{invoice.bill_to_email}</p>}
              {invoice.lpo_number && <p className="text-xs text-gray-500 mt-1">LPO: {invoice.lpo_number}</p>}
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Issue: <span className="text-gray-700">{fmtDate(invoice.issue_date)}</span></p>
              <p className="text-gray-400 text-xs">Due: <span className="text-gray-700">{fmtDate(invoice.due_date)}</span></p>
              {invoice.billing_period_start && (
                <p className="text-gray-400 text-xs">Period: <span className="text-gray-700">{fmtDate(invoice.billing_period_start)} – {fmtDate(invoice.billing_period_end)}</span></p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.line_items?.map((li: any) => (
                  <tr key={li.id}>
                    <td className="px-5 py-3 text-sm text-gray-700">{li.description}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">{parseFloat(li.quantity)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">{money(li.unit_price)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-700">{money(li.line_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">Subtotal</td>
                  <td className="px-5 py-2 text-right text-sm font-medium">{money(invoice.subtotal)}</td>
                </tr>
                <tr className="bg-[#1B2D4F]/5">
                  <td colSpan={3} className="px-5 py-2.5 text-right text-sm font-bold text-[#1B2D4F]">Total</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-[#1B2D4F]">{money(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payments */}
          {invoice.payments?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-[#1B2D4F] mb-3">Payments</h2>
              <div className="divide-y">
                {invoice.payments.map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-xs text-gray-500">{p.payment_code}</span>
                      <span className="ml-2 text-gray-600 capitalize">{p.payment_method?.replace('_',' ')}</span>
                      <span className="ml-2 text-xs text-gray-400">{fmtDate(p.payment_date)}</span>
                    </div>
                    <span className="font-semibold text-green-600">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — balance summary */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-medium">{money(invoice.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-medium text-green-600">{money(invoice.amount_paid)}</span></div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-700 font-semibold">Balance Due</span>
                <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{money(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {invoice.journal_entry_id && (
            <div className="bg-white rounded-lg shadow p-5 text-xs text-gray-400">
              <p>AR journal posted ✓</p>
              <p>Type: {invoice.type?.replace('_',' ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPay(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Record Payment</h2>
            <p className="text-sm text-gray-500 mb-4">Balance due: <strong>{money(invoice.balance_due)}</strong></p>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount *</label>
                  <input type="number" required min="0.01" step="0.01" max={invoice.balance_due} value={payForm.amount}
                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input type="date" required value={payForm.payment_date}
                    onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Method *</label>
                <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="edahab">Edahab</option>
                  <option value="zaad">ZAAD</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Received into account *</label>
                <select required value={payForm.account_id} onChange={e => setPayForm(p => ({ ...p, account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reference No.</label>
                <input type="text" value={payForm.reference_number}
                  onChange={e => setPayForm(p => ({ ...p, reference_number: e.target.value }))}
                  placeholder="Mobile money / bank ref"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={busy}
                  className="flex-1 bg-[#C9A052] hover:bg-[#b89140] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {busy ? 'Recording…' : 'Record Payment'}
                </button>
                <button type="button" onClick={() => setShowPay(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
