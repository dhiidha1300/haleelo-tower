'use client';

import { useEffect, useState, Fragment } from 'react';
import { accountingAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Line {
  account_code: string;
  account_name: string;
  type: string;
  amount: string;
  description: string | null;
}
interface Entry {
  id: number;
  journal_code: string;
  entry_date: string;
  description: string;
  reference_code: string | null;
  source: string;
  posted_by: string | null;
  total: string;
  lines: Line[];
}
interface COA { id: number; code: string; name: string; type: string; }

interface FormLine { account_id: string; type: 'debit' | 'credit'; amount: string; }

export default function JournalPage() {
  const { hasPermission } = usePermission();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [coa, setCoa]         = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [source, setSource]   = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [message, setMessage]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [header, setHeader]     = useState({ entry_date: new Date().toISOString().split('T')[0], description: '' });
  const [lines, setLines]       = useState<FormLine[]>([
    { account_id: '', type: 'debit', amount: '' },
    { account_id: '', type: 'credit', amount: '' },
  ]);

  const canCreate = hasPermission('create-journal-entries');

  const fetchEntries = () => {
    setLoading(true);
    accountingAPI.journal({ source, page: String(page) })
      .then(r => { setEntries(r.data.data ?? []); setTotal(r.data.total ?? 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [source, page]);
  useEffect(() => { accountingAPI.chartOfAccounts().then(r => setCoa(r.data.accounts)); }, []);

  // Balance check for the form
  const debitTotal  = lines.filter(l => l.type === 'debit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const creditTotal = lines.filter(l => l.type === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const balanced    = debitTotal === creditTotal && debitTotal > 0;

  const addLine    = () => setLines([...lines, { account_id: '', type: 'debit', amount: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof FormLine, value: string) =>
    setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await accountingAPI.createJournal({
        entry_date:  header.entry_date,
        description: header.description,
        lines: lines.map(l => ({ account_id: parseInt(l.account_id), type: l.type, amount: parseFloat(l.amount) })),
      });
      setHeader({ entry_date: new Date().toISOString().split('T')[0], description: '' });
      setLines([{ account_id: '', type: 'debit', amount: '' }, { account_id: '', type: 'credit', amount: '' }]);
      setShowForm(false);
      fetchEntries();
      setMessage('✓ Journal entry posted');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to post entry'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Journal</h1>
          <p className="text-gray-600">All journal entries — auto-posted and manual</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            + Manual Entry
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Manual entry form */}
      {showForm && canCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">New Manual Journal Entry</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date *</label>
              <input type="date" required value={header.entry_date}
                onChange={e => setHeader(p => ({ ...p, entry_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description *</label>
              <input type="text" required value={header.description}
                onChange={e => setHeader(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Adjustment for prepaid insurance"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
              <span className="col-span-6">Account</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-3">Amount</span>
              <span className="col-span-1"></span>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select required value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}
                  className="col-span-6 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select account…</option>
                  {coa.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <select value={line.type} onChange={e => updateLine(i, 'type', e.target.value)}
                  className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
                <input type="number" required min="0.01" step="0.01" value={line.amount}
                  onChange={e => updateLine(i, 'amount', e.target.value)}
                  placeholder="0.00"
                  className="col-span-3 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="col-span-1 text-red-400 hover:text-red-600 disabled:opacity-30 text-lg">×</button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-xs text-[#C9A052] hover:underline font-medium">+ Add line</button>
          </div>

          {/* Balance indicator */}
          <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${balanced ? 'bg-green-50' : 'bg-amber-50'}`}>
            <span className={balanced ? 'text-green-700' : 'text-amber-700'}>
              Debits ${debitTotal.toFixed(2)} · Credits ${creditTotal.toFixed(2)}
            </span>
            <span className={`font-semibold ${balanced ? 'text-green-700' : 'text-amber-700'}`}>
              {balanced ? '✓ Balanced' : '⚠ Must balance'}
            </span>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving || !balanced}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Posting…' : 'Post Entry'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-3">
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="auto">Auto-posted</option>
        </select>
      </div>

      {/* Entries */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading journal…</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No journal entries yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <Fragment key={e.id}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{e.journal_code}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{e.entry_date}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {e.description}
                      {e.reference_code && <span className="ml-2 text-xs text-gray-400 font-mono">{e.reference_code}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${e.source === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {e.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                      ${parseFloat(e.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-5 py-3">
                        <table className="w-full text-sm">
                          <tbody>
                            {e.lines.map((l, idx) => (
                              <tr key={idx}>
                                <td className="py-1 font-mono text-xs text-gray-400 w-16">{l.account_code}</td>
                                <td className="py-1 text-gray-600">{l.account_name}</td>
                                <td className="py-1 text-right pr-8 text-gray-700">
                                  {l.type === 'debit' ? `$${parseFloat(l.amount).toFixed(2)}` : ''}
                                </td>
                                <td className="py-1 text-right text-gray-700">
                                  {l.type === 'credit' ? `$${parseFloat(l.amount).toFixed(2)}` : ''}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t text-xs text-gray-400">
                              <td colSpan={2} className="py-1">Posted by {e.posted_by ?? 'System'}</td>
                              <td className="py-1 text-right pr-8 font-semibold">Debit</td>
                              <td className="py-1 text-right font-semibold">Credit</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 25 && (
        <div className="flex justify-center items-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {Math.ceil(total / 25)}</span>
          <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
