'use client';

import { useEffect, useState } from 'react';
import { accountingAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Account {
  id: number;
  name: string;
  type: string;
  coa_code: string;
  active: boolean;
  balance: string;
}
interface Txn {
  id: number;
  type: string;
  amount: string;
  description: string;
  reference_code: string | null;
  transaction_date: string;
  journal_code: string | null;
}

export default function AccountsPage() {
  const { hasPermission } = usePermission();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal]       = useState('0');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [txns, setTxns]         = useState<Txn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ source_account_id: '', destination_account_id: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [transferMsg, setTransferMsg]   = useState('');
  const [transferring, setTransferring] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<{ reference: string; id: number } | null>(null);

  const downloadTransferReceipt = async (jid: number) => {
    const res = await accountingAPI.transferReceipt(jid);
    window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
  };

  const closeTransfer = () => { setShowTransfer(false); setTransferMsg(''); setLastTransfer(null); };

  const canTransfer = hasPermission('transfer-accounts');

  const fetchAccounts = () =>
    accountingAPI.accounts().then(r => {
      setAccounts(r.data.accounts);
      setTotal(r.data.total_balance);
    }).finally(() => setLoading(false));

  useEffect(() => { fetchAccounts(); }, []);

  const openTransactions = async (acc: Account) => {
    setSelected(acc);
    setTxnLoading(true);
    try {
      const r = await accountingAPI.accountTransactions(acc.id);
      setTxns(r.data.transactions.data ?? []);
    } finally {
      setTxnLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferring(true);
    setTransferMsg('');
    try {
      const res = await accountingAPI.transfer({
        ...transferForm,
        source_account_id:      parseInt(transferForm.source_account_id),
        destination_account_id: parseInt(transferForm.destination_account_id),
        amount:                 parseFloat(transferForm.amount),
      });
      setTransferMsg('✓ ' + res.data.message + ' (' + res.data.reference + ')');
      setLastTransfer({ reference: res.data.reference, id: res.data.journal_entry_id });
      setTransferForm({ source_account_id: '', destination_account_id: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchAccounts();
      if (selected) openTransactions(selected);
    } catch (err: any) {
      setTransferMsg('✗ ' + (err.response?.data?.message || 'Transfer failed'));
    } finally {
      setTransferring(false);
    }
  };

  const ICONS: Record<string, string> = { mobile_money: '📱', bank: '🏦', cash: '💵' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Operating Accounts</h1>
          <p className="text-gray-600">Live balances computed from transaction history</p>
        </div>
        {canTransfer && (
          <button onClick={() => setShowTransfer(true)}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            ⇄ Transfer
          </button>
        )}
      </div>

      {/* Total */}
      <div className="bg-[#1B2D4F] text-white rounded-xl p-5">
        <p className="text-xs text-white/60 uppercase tracking-wide">Total across all accounts</p>
        <p className="text-3xl font-bold mt-1">${parseFloat(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading accounts…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <button key={a.id} onClick={() => openTransactions(a)}
              className={`text-left bg-white rounded-xl shadow-sm border-2 p-5 transition-all hover:shadow-md ${
                selected?.id === a.id ? 'border-[#C9A052]' : 'border-transparent'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{ICONS[a.type] ?? '💰'}</span>
                <span className="font-mono text-xs text-gray-400">{a.coa_code}</span>
              </div>
              <p className="text-sm text-gray-500 leading-tight">{a.name}</p>
              <p className={`text-2xl font-bold mt-1 ${parseFloat(a.balance) < 0 ? 'text-red-600' : 'text-[#1B2D4F]'}`}>
                ${parseFloat(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Transaction ledger */}
      {selected && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-[#1B2D4F]">{selected.name} — Transactions</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Close</button>
          </div>
          {txnLoading ? (
            <div className="p-6 text-center text-gray-400">Loading…</div>
          ) : txns.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No transactions yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Ref</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-500">{t.transaction_date}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{t.description}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-400">{t.reference_code ?? t.journal_code}</td>
                    <td className={`px-5 py-3 text-right text-sm font-semibold ${t.type === 'debit' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'debit' ? '+' : '−'}${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeTransfer}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-4">Inter-Account Transfer</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From *</label>
                <select required value={transferForm.source_account_id}
                  onChange={e => setTransferForm(p => ({ ...p, source_account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select source…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To *</label>
                <select required value={transferForm.destination_account_id}
                  onChange={e => setTransferForm(p => ({ ...p, destination_account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select destination…</option>
                  {accounts.filter(a => String(a.id) !== transferForm.source_account_id).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (USD) *</label>
                  <input type="number" required min="0.01" step="0.01" value={transferForm.amount}
                    onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input type="date" required value={transferForm.date}
                    onChange={e => setTransferForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input type="text" value={transferForm.notes}
                  onChange={e => setTransferForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>

              {transferMsg && (
                <div className={`p-2.5 rounded-lg text-sm ${transferMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {transferMsg}
                </div>
              )}

              {lastTransfer ? (
                <div className="flex gap-2 pt-1">
                  {lastTransfer.id && (
                    <button type="button" onClick={() => downloadTransferReceipt(lastTransfer.id)}
                      className="flex-1 bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-medium py-2.5 rounded-lg text-sm">📄 Download Receipt</button>
                  )}
                  <button type="button" onClick={closeTransfer}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Done</button>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={transferring}
                    className="flex-1 bg-[#C9A052] hover:bg-[#b89140] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                    {transferring ? 'Processing…' : 'Confirm Transfer'}
                  </button>
                  <button type="button" onClick={closeTransfer}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
