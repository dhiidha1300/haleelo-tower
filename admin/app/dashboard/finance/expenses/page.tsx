'use client';

import { useEffect, useState } from 'react';
import { expensesAPI, accountingAPI, bookingsAPI } from '@/lib/api';

interface BookingOpt { id: number; booking_code: string; client_name: string; }

interface Expense {
  id: number; expense_code: string; description: string; amount: string;
  expense_date: string; expense_account: string; payment_account: string;
  booking_code: string | null; receipt_file_url: string | null;
}
interface COA { id: number; code: string; name: string; type: string; }
interface Account { id: number; name: string; }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<COA[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<BookingOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], expense_account_id: '', payment_account_id: '', booking_id: '' });
  const [receipt, setReceipt] = useState<File | null>(null);

  const fetchExpenses = () =>
    expensesAPI.list({ search }).then(r => setExpenses(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchExpenses(); }, [search]);
  useEffect(() => {
    accountingAPI.chartOfAccounts().then(r => setExpenseAccounts(r.data.accounts.filter((a: COA) => a.type === 'expense')));
    accountingAPI.accounts().then(r => setAccounts(r.data.accounts));
    bookingsAPI.list({ status: 'booking_approved' }).then(r => setBookings(r.data.data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('description', form.description);
      fd.append('amount', form.amount);
      fd.append('expense_date', form.expense_date);
      fd.append('expense_account_id', form.expense_account_id);
      fd.append('payment_account_id', form.payment_account_id);
      if (form.booking_id) fd.append('booking_id', form.booking_id);
      if (receipt) fd.append('receipt', receipt);
      await expensesAPI.create(fd);
      setShowForm(false);
      setForm({ description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], expense_account_id: '', payment_account_id: '', booking_id: '' });
      setReceipt(null);
      fetchExpenses();
      setMessage('✓ Expense recorded and journal posted');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to record expense'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Expenses</h1>
          <p className="text-gray-600">Direct expenses — auto-posts a journal entry on save</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ Record Expense</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">Record Expense</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description *</label>
              <input type="text" required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (USD) *</label>
              <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date *</label>
              <input type="date" required value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expense Account *</label>
              <select required value={form.expense_account_id} onChange={e => setForm(p => ({ ...p, expense_account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Select expense account…</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Paid From *</label>
              <select required value={form.payment_account_id} onChange={e => setForm(p => ({ ...p, payment_account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Select account…</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Link to Booking (optional — for event P&L)</label>
              <select value={form.booking_id} onChange={e => setForm(p => ({ ...p, booking_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">— No booking —</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{b.booking_code} — {b.client_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Receipt (optional)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setReceipt(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Recording…' : 'Record Expense'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <input type="text" placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : expenses.length === 0 ? <div className="p-6 text-center text-gray-500">No expenses recorded yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Account</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{e.expense_code}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    {e.description}
                    {e.booking_code && <span className="ml-2 text-xs text-[#C9A052]">↳ {e.booking_code}</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{e.expense_account}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{e.expense_date}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-red-600">−${parseFloat(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3 text-center">
                    {e.receipt_file_url ? <a href={e.receipt_file_url} target="_blank" rel="noreferrer" className="text-[#C9A052] hover:underline text-xs">View</a> : <span className="text-gray-300 text-xs">—</span>}
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
