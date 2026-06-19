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
  account_identifier?: string | null;
  notes?: string | null;
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
  const { hasPermission, isSuperAdmin, isAdmin } = usePermission();
  const canCreate = isSuperAdmin || isAdmin;
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

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', type: 'mobile_money', account_identifier: '', notes: '' });
  const [createMsg, setCreateMsg]   = useState('');
  const [creating, setCreating]     = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    try {
      const res = await accountingAPI.createOperatingAccount(createForm);
      setCreateMsg(`✓ Account created — Chart-of-Accounts code ${res.data.coa_code} assigned.`);
      setCreateForm({ name: '', type: 'mobile_money', account_identifier: '', notes: '' });
      fetchAccounts();
      setTimeout(() => { setShowCreate(false); setCreateMsg(''); }, 1800);
    } catch (err: any) {
      setCreateMsg('✗ ' + (err.response?.data?.message || 'Failed to create account'));
    } finally {
      setCreating(false);
    }
  };

  // Edit account
  const [editAcct, setEditAcct] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({ name: '', account_identifier: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (a: Account) => {
    setEditAcct(a);
    setEditForm({ name: a.name, account_identifier: a.account_identifier ?? '', notes: a.notes ?? '' });
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAcct) return;
    setSavingEdit(true);
    try {
      await accountingAPI.updateOperatingAccount(editAcct.id, editForm);
      setEditAcct(null); fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update account');
    } finally { setSavingEdit(false); }
  };

  // Activate / deactivate (with balance sweep)
  const toggleActive = async (a: Account) => {
    if (a.active) {
      // Try to deactivate; if it has a balance, the API asks for a destination.
      try {
        await accountingAPI.setAccountActive(a.id, false);
        fetchAccounts();
      } catch (err: any) {
        if (err.response?.status === 422 && err.response?.data?.requires_sweep) {
          const others = accounts.filter(x => x.active && x.id !== a.id);
          const list = others.map((x, i) => `${i + 1}. ${x.name}`).join('\n');
          const pick = prompt(`"${a.name}" holds a balance of $${err.response.data.balance}. Transfer it to which account before deactivating?\n\n${list}\n\nEnter the number:`);
          const idx = pick ? parseInt(pick) - 1 : -1;
          if (idx >= 0 && others[idx]) {
            try { await accountingAPI.setAccountActive(a.id, false, others[idx].id); fetchAccounts(); }
            catch (e: any) { alert(e.response?.data?.message || 'Deactivation failed'); }
          }
        } else {
          alert(err.response?.data?.message || 'Deactivation failed');
        }
      }
    } else {
      await accountingAPI.setAccountActive(a.id, true); fetchAccounts();
    }
  };

  // Reconciliation (B8)
  const [recAcct, setRecAcct] = useState<Account | null>(null);
  const [recResult, setRecResult] = useState<any>(null);
  const [recBusy, setRecBusy] = useState(false);
  const [recMsg, setRecMsg]   = useState('');

  const handleReconcileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recAcct) return;
    setRecBusy(true); setRecMsg(''); setRecResult(null);
    try {
      const res = await accountingAPI.reconcile(recAcct.id, file);
      setRecResult(res.data);
    } catch (err: any) {
      setRecMsg('✗ ' + (err.response?.data?.message || 'Could not read the statement'));
    } finally { setRecBusy(false); e.target.value = ''; }
  };

  const confirmReconcile = async () => {
    if (!recAcct || !recResult) return;
    const ids = recResult.matched.map((m: any) => m.transaction_id);
    if (!ids.length) { setRecMsg('No matched transactions to confirm.'); return; }
    setRecBusy(true);
    try {
      const res = await accountingAPI.reconcileConfirm(recAcct.id, ids);
      setRecMsg('✓ ' + res.data.message);
      setTimeout(() => { setRecAcct(null); setRecResult(null); setRecMsg(''); }, 1800);
    } catch (err: any) {
      setRecMsg('✗ ' + (err.response?.data?.message || 'Failed'));
    } finally { setRecBusy(false); }
  };

  const canReconcile = hasPermission('manage-accounts');
  const canTransfer = hasPermission('transfer-accounts');

  const fetchAccounts = () =>
    // Management view: include inactive accounts (admins can edit/reactivate them).
    accountingAPI.accounts(canCreate).then(r => {
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
        <div className="flex gap-3">
          {canCreate && (
            <button onClick={() => { setShowCreate(true); setCreateMsg(''); }}
              className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              + New Account
            </button>
          )}
          {canTransfer && (
            <button onClick={() => setShowTransfer(true)}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              ⇄ Transfer
            </button>
          )}
        </div>
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
            <div key={a.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all hover:shadow-md ${
                selected?.id === a.id ? 'border-[#C9A052]' : 'border-transparent'
              } ${!a.active ? 'opacity-60' : ''}`}>
              <button onClick={() => openTransactions(a)} className="text-left w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{ICONS[a.type] ?? '💰'}</span>
                  <div className="flex items-center gap-2">
                    {!a.active && <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-200 text-gray-500 px-2 py-0.5 rounded">Inactive</span>}
                    <span className="font-mono text-xs text-gray-400">{a.coa_code}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-tight">{a.name}{a.account_identifier ? ` · ${a.account_identifier}` : ''}</p>
                <p className={`text-2xl font-bold mt-1 ${parseFloat(a.balance) < 0 ? 'text-red-600' : 'text-[#1B2D4F]'}`}>
                  ${parseFloat(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </button>
              {canCreate && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(a)} className="text-xs text-[#1B2D4F] hover:underline font-medium">✎ Edit</button>
                  <button onClick={() => toggleActive(a)} className={`text-xs font-medium hover:underline ${a.active ? 'text-red-500' : 'text-green-600'}`}>
                    {a.active ? '⊘ Deactivate' : '✓ Activate'}
                  </button>
                  {canReconcile && (
                    <button onClick={() => { setRecAcct(a); setRecResult(null); setRecMsg(''); }} className="text-xs text-[#C9A052] hover:underline font-medium">⇄ Reconcile</button>
                  )}
                </div>
              )}
            </div>
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

      {/* Create account modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">New Operating Account</h2>
            <p className="text-sm text-gray-500 mb-4">A matching Chart-of-Accounts code is created automatically.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Name *</label>
                <input type="text" required value={createForm.name} placeholder="e.g. Salaam Bank – Main"
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type *</label>
                <select value={createForm.type} onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="mobile_money">📱 Mobile Money</option>
                  <option value="bank">🏦 Bank</option>
                  <option value="cash">💵 Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Number / Identifier</label>
                <input type="text" value={createForm.account_identifier} placeholder="Optional"
                  onChange={e => setCreateForm(p => ({ ...p, account_identifier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input type="text" value={createForm.notes} placeholder="Optional"
                  onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              {createMsg && <div className={`p-3 rounded-lg text-sm ${createMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{createMsg}</div>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={creating}
                  className="flex-1 bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit account modal */}
      {editAcct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditAcct(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Edit Account</h2>
            <p className="text-sm text-gray-500 mb-4">Chart-of-Accounts code <span className="font-mono">{editAcct.coa_code}</span> cannot be changed.</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Name *</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Number / Identifier</label>
                <input type="text" value={editForm.account_identifier}
                  onChange={e => setEditForm(p => ({ ...p, account_identifier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input type="text" value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingEdit}
                  className="flex-1 bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditAcct(null)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile modal */}
      {recAcct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRecAcct(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Reconcile · {recAcct.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Upload the account's ZAAD / Edahab / bank statement (CSV or Excel) to auto-match against recorded transactions.</p>

            {!recResult && (
              <label className={`flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#C9A052] text-sm text-gray-500 ${recBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                {recBusy ? 'Reading statement…' : '📄 Choose statement file (.csv / .xlsx)'}
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleReconcileUpload} />
              </label>
            )}

            {recResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 rounded-lg p-3"><p className="text-2xl font-bold text-green-700">{recResult.matched.length}</p><p className="text-xs text-green-600">Matched</p></div>
                  <div className="bg-amber-50 rounded-lg p-3"><p className="text-2xl font-bold text-amber-700">{recResult.unmatched_statement.length}</p><p className="text-xs text-amber-600">On statement only</p></div>
                  <div className="bg-red-50 rounded-lg p-3"><p className="text-2xl font-bold text-red-700">{recResult.unmatched_book.length}</p><p className="text-xs text-red-600">In books only</p></div>
                </div>
                <div className="text-xs text-gray-500 flex justify-between border-y py-2">
                  <span>Statement total: <strong className="text-[#1B2D4F]">${recResult.summary.statement_total.toLocaleString()}</strong></span>
                  <span>Book balance: <strong className="text-[#1B2D4F]">${parseFloat(recResult.summary.book_balance).toLocaleString()}</strong></span>
                </div>
                {recResult.unmatched_statement.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-1">On statement, not in books (create these manually):</p>
                    <div className="max-h-32 overflow-y-auto text-xs divide-y border rounded">
                      {recResult.unmatched_statement.map((s: any, i: number) => (
                        <div key={i} className="flex justify-between px-2 py-1"><span>{s.date} · {s.description || s.reference || '—'}</span><span className="font-medium">${s.amount.toLocaleString()}</span></div>
                      ))}
                    </div>
                  </div>
                )}
                {recMsg && <div className={`p-2 rounded text-sm ${recMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{recMsg}</div>}
                <div className="flex gap-2">
                  <button onClick={confirmReconcile} disabled={recBusy || !recResult.matched.length}
                    className="flex-1 bg-[#C9A052] hover:bg-[#b89140] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">
                    {recBusy ? 'Saving…' : `Confirm ${recResult.matched.length} matched`}
                  </button>
                  <button onClick={() => { setRecResult(null); setRecMsg(''); }} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Upload another</button>
                </div>
              </div>
            )}
            {recMsg && !recResult && <div className="mt-3 p-2 rounded text-sm bg-red-50 text-red-700">{recMsg}</div>}
            <button onClick={() => setRecAcct(null)} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
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
