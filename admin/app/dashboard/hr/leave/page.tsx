'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveAPI, employeesAPI } from '@/lib/api';

interface Leave {
  id: number; employee: string; leave_type: string; start_date: string; end_date: string;
  days_count: number; status: string; reason: string | null; approved_by: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-700',
};

export default function LeavePage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });

  const fetchLeaves = () =>
    leaveAPI.list({ status }).then(r => setLeaves(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchLeaves(); }, [status]);
  useEffect(() => { employeesAPI.list({ status: 'active' }).then(r => setEmployees(r.data.data ?? [])); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await leaveAPI.create({ ...form, employee_id: parseInt(form.employee_id) });
      setShowForm(false); setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      fetchLeaves(); setMessage('✓ Leave request submitted'); setTimeout(() => setMessage(''), 3000);
    } catch (err: any) { setMessage('✗ ' + (err.response?.data?.message || 'Failed')); }
  };

  const decide = async (id: number, st: 'approved' | 'rejected') => {
    await leaveAPI.decision(id, st); fetchLeaves();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-[#1B2D4F]">Leave Requests</h1><p className="text-gray-600">Annual, sick and unpaid leave</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ New Request</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">New Leave Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-gray-500 mb-1">Employee *</label>
              <select required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="">Select…</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Type *</label>
              <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option></select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Start Date *</label>
              <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">End Date *</label>
              <input type="date" required value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Reason</label>
              <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium">Submit</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : leaves.length === 0 ? <div className="p-6 text-center text-gray-500">No leave requests</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Days</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {leaves.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-[#1B2D4F]">{l.employee}</td>
                  <td className="px-5 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{l.leave_type}</span></td>
                  <td className="px-5 py-3 text-sm text-gray-500">{l.start_date} → {l.end_date}</td>
                  <td className="px-5 py-3 text-center text-sm">{l.days_count}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[l.status]}`}>{l.status}</span></td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => router.push(`/dashboard/hr/leave/${l.id}`)} className="text-[#1B2D4F] hover:text-[#0f1d33] text-sm font-medium">View</button>
                    {l.status === 'pending' && (<>
                      <button onClick={() => decide(l.id, 'approved')} className="text-green-600 hover:text-green-800 text-sm font-medium">Approve</button>
                      <button onClick={() => decide(l.id, 'rejected')} className="text-red-600 hover:text-red-800 text-sm font-medium">Reject</button>
                    </>)}
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
