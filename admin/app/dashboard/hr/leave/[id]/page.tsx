'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leaveAPI } from '@/lib/api';

const fmtDate = (raw: string | null) => raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-700',
};
const DEPT_LABELS: Record<string, string> = {
  internal_staff: 'Internal Staff', maintenance: 'Maintenance', cafeteria: 'Cafeteria / Restaurant',
};

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [leave, setLeave] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchLeave = () => leaveAPI.show(parseInt(id)).then(r => setLeave(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchLeave(); }, [id]);

  const decide = async (status: 'approved' | 'rejected') => {
    if (!confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this leave request?`)) return;
    try {
      await leaveAPI.decision(parseInt(id), status);
      fetchLeave(); setMessage(`✓ Leave ${status}`); setTimeout(() => setMessage(''), 3000);
    } catch (err: any) { setMessage('✗ ' + (err.response?.data?.message || 'Failed')); }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!leave) return <div className="text-center py-12 text-gray-500">Leave request not found.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard/hr/leave')} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Leave Requests</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F] capitalize">{leave.leave_type} Leave</h1>
          <p className="text-gray-500 text-sm">{leave.days_count} day{leave.days_count !== 1 ? 's' : ''}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_STYLES[leave.status]}`}>{leave.status}</span>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {/* Approve / reject banner */}
      {leave.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-amber-800">This request is awaiting a decision.</p>
          <div className="flex gap-2">
            <button onClick={() => decide('approved')} className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">✓ Approve</button>
            <button onClick={() => decide('rejected')} className="border border-red-300 text-red-600 hover:bg-red-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors">✗ Reject</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Employee */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Employee</h2>
          <p className="font-semibold text-[#1B2D4F]">{leave.employee?.full_name}</p>
          <p className="text-sm text-gray-500">{leave.employee?.job_title}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">{DEPT_LABELS[leave.employee?.department] ?? leave.employee?.department} · {leave.employee?.employee_code}</p>
          {leave.employee?.id && (
            <button onClick={() => router.push(`/dashboard/hr/employees/${leave.employee.id}`)} className="mt-2 text-xs text-[#C9A052] hover:underline">View employee →</button>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leave Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{leave.leave_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Start</span><span className="font-medium">{fmtDate(leave.start_date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">End</span><span className="font-medium">{fmtDate(leave.end_date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Days</span><span className="font-medium">{leave.days_count}</span></div>
            {leave.approved_by && <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Decided by</span><span className="font-medium">{leave.approved_by}</span></div>}
          </div>
        </div>
      </div>

      {leave.reason && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reason</h2>
          <p className="text-sm text-gray-700">{leave.reason}</p>
        </div>
      )}

      <p className="text-xs text-gray-400">Requested {fmtDate(leave.created_at)}</p>
    </div>
  );
}
