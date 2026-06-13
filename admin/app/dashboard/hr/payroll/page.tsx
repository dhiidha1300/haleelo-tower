'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { payrollAPI } from '@/lib/api';

interface Run {
  id: number; run_code: string; month: string; department: string | null;
  total_gross: string; total_net: string; status: string; payslips_count: number; finalized_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', finalized: 'bg-green-100 text-green-800', voided: 'bg-red-100 text-red-700',
};
const DEPTS = [
  { value: '', label: 'All Departments' },
  { value: 'internal_staff', label: 'Internal Staff' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cafeteria', label: 'Cafeteria / Restaurant' },
];

export default function PayrollPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), department: '' });

  const fetchRuns = () => payrollAPI.runs().then(r => setRuns(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchRuns(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setMessage('');
    try {
      const res = await payrollAPI.createRun({ month: form.month, department: form.department || undefined });
      router.push(`/dashboard/hr/payroll/${res.data.id}`);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to create run'));
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-[#1B2D4F]">Payroll</h1><p className="text-gray-600">Monthly payroll runs and payslips</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New Payroll Run</button>
      </div>

      {message && <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700">{message}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">New Payroll Run</h2>
          <p className="text-xs text-gray-500">This loads all active employees (with attendance pulled from the selected month) into a draft run you can review before finalizing.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">Month *</label>
              <input type="month" required value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Department (optional)</label>
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                {DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{creating ? 'Creating…' : 'Create Run'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : runs.length === 0 ? <div className="p-6 text-center text-gray-500">No payroll runs yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Run</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Employees</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Net</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y">
              {runs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/hr/payroll/${r.id}`)}>
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{r.run_code}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{r.month}{r.department ? ` · ${r.department.replace('_', ' ')}` : ''}</td>
                  <td className="px-5 py-3 text-center text-sm">{r.payslips_count}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium">${parseFloat(r.total_net).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
