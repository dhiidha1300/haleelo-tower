'use client';

import { useEffect, useState, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { payrollAPI, accountingAPI } from '@/lib/api';

const money = (v: any) => '$' + parseFloat(v ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', finalized: 'bg-green-100 text-green-800', voided: 'bg-red-100 text-red-700',
};
const DED_TYPES = [
  { value: 'absence', label: 'Unpaid Absence' },
  { value: 'advance', label: 'Salary Advance' },
  { value: 'disciplinary', label: 'Disciplinary' },
  { value: 'other', label: 'Other' },
];

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showFinalize, setShowFinalize] = useState(false);
  const [payAccount, setPayAccount] = useState('');
  const [busy, setBusy] = useState(false);

  const [daysEdit, setDaysEdit] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [items, setItems] = useState<{ overtime: any[]; deductions: any[] }>({ overtime: [], deductions: [] });
  const [otForm, setOtForm]   = useState({ date: new Date().toISOString().split('T')[0], hours: '', rate_multiplier: '1.5', total_amount: '' });
  const [dedForm, setDedForm] = useState({ type: 'advance', amount: '', description: '' });

  const fetchRun = () => payrollAPI.showRun(parseInt(id)).then(r => { setRun(r.data); setDaysEdit({}); }).finally(() => setLoading(false));
  useEffect(() => { fetchRun(); accountingAPI.accounts().then(r => setAccounts(r.data.accounts)); }, [id]);

  const isDraft = run?.status === 'draft';

  const saveDays = async (pid: number) => {
    if (daysEdit[pid] === undefined) return;
    setBusy(true);
    try {
      await payrollAPI.updatePayslip(pid, { days_worked: parseInt(daysEdit[pid]) });
      fetchRun(); setMessage('✓ Updated'); setTimeout(() => setMessage(''), 2000);
    } catch (err: any) { setMessage('✗ ' + (err.response?.data?.message || 'Failed')); }
    finally { setBusy(false); }
  };

  const toggleExpand = async (pid: number) => {
    if (expanded === pid) { setExpanded(null); return; }
    setExpanded(pid);
    const r = await payrollAPI.payslipItems(pid);
    setItems(r.data);
  };

  const refreshItemsAndRun = async (pid: number) => {
    const r = await payrollAPI.payslipItems(pid); setItems(r.data); fetchRun();
  };

  const addOvertime = async (pid: number) => {
    if (!otForm.hours || !otForm.total_amount) return;
    await payrollAPI.addOvertime(pid, { date: otForm.date, hours: parseFloat(otForm.hours), rate_multiplier: parseFloat(otForm.rate_multiplier), total_amount: parseFloat(otForm.total_amount) });
    setOtForm({ date: new Date().toISOString().split('T')[0], hours: '', rate_multiplier: '1.5', total_amount: '' });
    refreshItemsAndRun(pid);
  };
  const addDeduction = async (pid: number) => {
    if (!dedForm.amount) return;
    await payrollAPI.addDeduction(pid, { type: dedForm.type, amount: parseFloat(dedForm.amount), description: dedForm.description });
    setDedForm({ type: 'advance', amount: '', description: '' });
    refreshItemsAndRun(pid);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await payrollAPI.finalize(parseInt(id), parseInt(payAccount));
      setShowFinalize(false); fetchRun();
      setMessage('✓ Payroll finalized — journal posted, payslips generated'); setTimeout(() => setMessage(''), 4000);
    } catch (err: any) { setMessage('✗ ' + (err.response?.data?.message || 'Failed to finalize')); }
    finally { setBusy(false); }
  };

  const handleVoid = async () => {
    if (!confirm('Void this finalized payroll run? A reversing journal entry will be posted.')) return;
    try { await payrollAPI.void(parseInt(id)); fetchRun(); } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handlePayslipPdf = async (pid: number) => {
    const res = await payrollAPI.payslipPdf(pid);
    window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!run) return <div className="text-center py-12 text-gray-500">Run not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push('/dashboard/hr/payroll')} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-1">← All Runs</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{run.run_code}</h1>
          <p className="text-gray-500 text-sm">{run.month}{run.department_filter ? ` · ${run.department_filter.replace('_', ' ')}` : ''}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_STYLES[run.status]}`}>{run.status}</span>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="grid grid-cols-3 gap-3">
        {[['Gross', run.total_gross], ['Deductions', run.total_deductions], ['Net Pay', run.total_net]].map(([l, v], i) => (
          <div key={i} className={`rounded-lg p-4 ${i === 2 ? 'bg-[#1B2D4F] text-white' : 'bg-white shadow-sm'}`}>
            <p className={`text-xs ${i === 2 ? 'text-white/70' : 'text-gray-500'}`}>{l}</p>
            <p className={`text-xl font-bold ${i === 2 ? '' : 'text-[#1B2D4F]'}`}>{money(v)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {isDraft && <button onClick={() => setShowFinalize(true)} className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-5 py-2 rounded-lg text-sm font-medium">✓ Finalize & Send</button>}
        {run.status === 'finalized' && <button onClick={handleVoid} className="border border-red-300 text-red-600 hover:bg-red-50 px-5 py-2 rounded-lg text-sm font-medium">Void Run</button>}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Days</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Base</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Overtime</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Deductions</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Net</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
          </tr></thead>
          <tbody className="divide-y">
            {run.payslips.map((p: any) => (
              <Fragment key={p.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#1B2D4F]">{p.employee}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.department?.replace('_', ' ')} · {p.employment_type?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isDraft ? (
                      <input type="number" min="0" max={p.working_days_in_month} value={daysEdit[p.id] ?? p.days_worked}
                        onChange={e => setDaysEdit(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onBlur={() => saveDays(p.id)}
                        className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                    ) : <span className="text-sm">{p.days_worked}</span>}
                    <span className="text-xs text-gray-400">/{p.working_days_in_month}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{money(p.base_pay)}</td>
                  <td className="px-4 py-3 text-right text-sm">{money(p.overtime_pay)}</td>
                  <td className="px-4 py-3 text-right text-sm">{money(p.total_deductions)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-[#1B2D4F]">{money(p.net_pay)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {isDraft && <button onClick={() => toggleExpand(p.id)} className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">{expanded === p.id ? 'Close' : 'Manage'}</button>}
                    {!isDraft && <button onClick={() => handlePayslipPdf(p.id)} className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">Payslip</button>}
                  </td>
                </tr>

                {isDraft && expanded === p.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overtime */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Overtime</p>
                          {items.overtime.length === 0 ? <p className="text-xs text-gray-400 mb-2">No overtime recorded</p> : (
                            <div className="space-y-1 mb-2">
                              {items.overtime.map((o: any) => (
                                <div key={o.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                                  <span>{o.date} · {o.hours}h × {o.rate_multiplier}</span>
                                  <span className="flex items-center gap-2"><strong>{money(o.total_amount)}</strong>
                                    <button onClick={async () => { await payrollAPI.removeOvertime(p.id, o.id); refreshItemsAndRun(p.id); }} className="text-red-400 hover:text-red-600">×</button></span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <input type="date" value={otForm.date} onChange={e => setOtForm({ ...otForm, date: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-28" />
                            <input type="number" placeholder="hrs" value={otForm.hours} onChange={e => setOtForm({ ...otForm, hours: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-14" />
                            <input type="number" placeholder="×" step="0.1" value={otForm.rate_multiplier} onChange={e => setOtForm({ ...otForm, rate_multiplier: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-12" />
                            <input type="number" placeholder="amount" value={otForm.total_amount} onChange={e => setOtForm({ ...otForm, total_amount: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-20" />
                            <button onClick={() => addOvertime(p.id)} className="bg-[#C9A052] text-white px-3 py-1 rounded text-xs font-medium">Add</button>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</p>
                          {items.deductions.length === 0 ? <p className="text-xs text-gray-400 mb-2">No deductions</p> : (
                            <div className="space-y-1 mb-2">
                              {items.deductions.map((d: any) => (
                                <div key={d.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                                  <span className="capitalize">{d.type}{d.description ? ` — ${d.description}` : ''}</span>
                                  <span className="flex items-center gap-2"><strong>{money(d.amount)}</strong>
                                    <button onClick={async () => { await payrollAPI.removeDeduction(p.id, d.id); refreshItemsAndRun(p.id); }} className="text-red-400 hover:text-red-600">×</button></span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <select value={dedForm.type} onChange={e => setDedForm({ ...dedForm, type: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs">
                              {DED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <input type="number" placeholder="amount" value={dedForm.amount} onChange={e => setDedForm({ ...dedForm, amount: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-20" />
                            <input type="text" placeholder="note" value={dedForm.description} onChange={e => setDedForm({ ...dedForm, description: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-xs w-24" />
                            <button onClick={() => addDeduction(p.id)} className="bg-[#C9A052] text-white px-3 py-1 rounded text-xs font-medium">Add</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showFinalize && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowFinalize(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">Finalize Payroll</h2>
            <p className="text-sm text-gray-500 mb-4">Total net <strong>{money(run.total_net)}</strong> will be paid out. This posts the salary journal, generates payslips, and locks the run.</p>
            <form onSubmit={handleFinalize} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pay salaries from *</label>
                <select required value={payAccount} onChange={e => setPayAccount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance})</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="flex-1 bg-[#1B2D4F] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">{busy ? 'Processing…' : 'Confirm & Finalize'}</button>
                <button type="button" onClick={() => setShowFinalize(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
