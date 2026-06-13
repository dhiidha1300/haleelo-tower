'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Booking {
  id: number;
  booking_code: string;
  type: string;
  status: string;
  payment_status: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  session_type: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: string;
  product: { id: number; name: string; floor: { name: string } | null } | null;
  created_by: { name: string } | null;
}

const TABS = [
  { label: 'All',            value: '' },
  { label: 'Admin Pending',  value: 'admin_pending' },
  { label: 'Finance Review', value: 'accountant_pending' },
  { label: 'Approved',       value: 'booking_approved' },
  { label: 'Rejected',       value: 'rejected' },
  { label: 'Cancelled',      value: 'cancelled' },
];

const STATUS_STYLES: Record<string, string> = {
  draft:               'bg-gray-100 text-gray-600',
  admin_pending:       'bg-amber-100 text-amber-800',
  accountant_pending:  'bg-orange-100 text-orange-800',
  booking_approved:    'bg-green-100 text-green-800',
  rejected:            'bg-red-100 text-red-800',
  waitlisted:          'bg-purple-100 text-purple-800',
  cancelled:           'bg-gray-100 text-gray-500',
  rescheduled:         'bg-indigo-100 text-indigo-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft:               'Draft',
  admin_pending:       'Admin Pending',
  accountant_pending:  'Finance Review',
  booking_approved:    'Approved',
  rejected:            'Rejected',
  waitlisted:          'Waitlisted',
  cancelled:           'Cancelled',
  rescheduled:         'Rescheduled',
};

export default function BookingsPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  useEffect(() => { fetchBookings(); }, [tab, search, page]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingsAPI.list({ status: tab, search, page });
      setBookings(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async (id: number) => {
    try {
      await bookingsAPI.updateStatus(id, 'admin_pending');
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit');
    }
  };

  const handleApprove = async (id: number, currentStatus: string) => {
    const next = currentStatus === 'admin_pending' ? 'accountant_pending' : 'booking_approved';
    const label = currentStatus === 'admin_pending' ? 'send to Finance for final approval' : 'give final approval';
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    try {
      await bookingsAPI.updateStatus(id, next);
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
      await bookingsAPI.updateStatus(id, 'rejected', undefined, reason);
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.updateStatus(id, 'cancelled');
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Bookings</h1>
          <p className="text-gray-600">Manage all conference hall and lease bookings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/bookings/calendar')}
            className="border border-[#1B2D4F] text-[#1B2D4F] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1B2D4F] hover:text-white transition-colors text-sm">
            📅 Calendar
          </button>
          {hasPermission('create-booking') && (
            <button onClick={() => router.push('/dashboard/bookings/create')}
              className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
              + New Booking
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.value
                ? 'border-b-2 border-[#C9A052] text-[#C9A052]'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input type="text" placeholder="Search by code, client name or email…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Space</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-[#1B2D4F] font-semibold">{b.booking_code}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1B2D4F] text-sm">{b.client_name}</p>
                      <p className="text-xs text-gray-400">{b.client_email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-700">{b.product?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{b.product?.floor?.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-700">{b.booking_date?.split('T')[0]}</p>
                      <p className="text-xs text-gray-400 capitalize">{b.session_type}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700">
                      ${parseFloat(b.total_price).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[b.status]}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                          className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">View</button>

                        {hasPermission('create-booking') && b.status === 'draft' && (
                          <button onClick={() => handleSubmitForReview(b.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium">Submit</button>
                        )}
                        {hasPermission('approve-booking') && b.status === 'admin_pending' && (
                          <button onClick={() => handleApprove(b.id, b.status)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium">Approve</button>
                        )}
                        {hasPermission('finance-approve-booking') && b.status === 'accountant_pending' && (
                          <button onClick={() => handleApprove(b.id, b.status)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium">Confirm</button>
                        )}
                        {hasPermission('reject-booking') && ['admin_pending','accountant_pending'].includes(b.status) && (
                          <button onClick={() => handleReject(b.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium">Reject</button>
                        )}
                        {hasPermission('cancel-booking') && b.status === 'booking_approved' && (
                          <button onClick={() => handleCancel(b.id)}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 25 && (
        <div className="flex justify-center items-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {Math.ceil(total / 25)} ({total} total)</span>
          <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
