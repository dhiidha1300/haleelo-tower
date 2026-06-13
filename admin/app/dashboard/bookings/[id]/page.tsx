'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bookingsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface StatusLog {
  id: number;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  created_at: string;
  changed_by: { name: string } | null;
}

interface Booking {
  id: number;
  booking_code: string;
  type: string;
  status: string;
  payment_status: string;
  client_name: string;
  client_company: string | null;
  client_email: string;
  client_phone: string;
  client_national_id: string | null;
  session_type: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  base_price: string;
  catering_price: string;
  dj_price: string;
  cameraman_price: string;
  total_price: string;
  notes: string | null;
  rejection_reason: string | null;
  recurring: boolean;
  recurrence_rule: { frequency: string; days: string[]; end_date: string } | null;
  recurrence_group_id: number | null;
  product: { id: number; name: string; floor: { name: string } | null } | null;
  catering_package: { name: string } | null;
  dj_requested: boolean;
  cameraman_requested: boolean;
  status_logs: StatusLog[];
  created_by: { name: string } | null;
  created_at: string;
  event_financials?: {
    invoice_code: string | null;
    invoice_id: number | null;
    revenue: string;
    expense_total: string;
    net_profit: string;
    expenses: { expense_code: string; description: string; amount: string }[];
  };
}

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

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { hasPermission } = usePermission();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      const res = await bookingsAPI.show(parseInt(id));
      setBooking(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [id]);

  const handleCancelSeries = async (scope: 'single' | 'future' | 'all') => {
    if (!booking) return;
    const labels = {
      single: 'cancel only this occurrence',
      future: 'cancel this and all future occurrences',
      all:    'cancel the entire series (all occurrences)',
    };
    if (!confirm(`Are you sure you want to ${labels[scope]}?`)) return;
    try {
      const res = await bookingsAPI.cancelSeries(booking.id, scope);
      alert(res.data.message);
      fetchBooking();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel series');
    }
  };

  const handleAction = async (action: 'submit' | 'approve_admin' | 'approve_finance' | 'reject' | 'cancel') => {
    if (!booking) return;
    let status: string, rejectionReason: string | undefined;

    if (action === 'submit')          status = 'admin_pending';
    else if (action === 'approve_admin')   status = 'accountant_pending';
    else if (action === 'approve_finance') status = 'booking_approved';
    else if (action === 'cancel')     status = 'cancelled';
    else {
      const reason = prompt('Rejection reason (required):');
      if (!reason) return;
      status = 'rejected';
      rejectionReason = reason;
    }

    try {
      await bookingsAPI.updateStatus(booking.id, status, undefined, rejectionReason);
      fetchBooking();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!booking) return <div className="text-center py-12 text-gray-500">Booking not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{booking.booking_code}</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${STATUS_STYLES[booking.status]}`}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Space */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Space & Session</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">Space</p><p className="font-medium text-[#1B2D4F]">{booking.product?.name ?? '—'}</p></div>
              <div><p className="text-gray-400">Floor</p><p className="font-medium">{booking.product?.floor?.name ?? '—'}</p></div>
              <div><p className="text-gray-400">Date</p><p className="font-medium">{booking.booking_date?.split('T')[0]}</p></div>
              <div><p className="text-gray-400">Session</p><p className="font-medium capitalize">{booking.session_type}</p></div>
              <div><p className="text-gray-400">Start Time</p><p className="font-medium">{booking.start_time}</p></div>
              <div><p className="text-gray-400">End Time</p><p className="font-medium">{booking.end_time}</p></div>
            </div>
            {booking.recurring && booking.recurrence_rule && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">🔁 Recurring</span>
                <span className="text-xs text-gray-500 capitalize">
                  {booking.recurrence_rule.frequency} · until {booking.recurrence_rule.end_date}
                </span>
              </div>
            )}
          </div>

          {/* Client */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Client</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">Name</p><p className="font-medium">{booking.client_name}</p></div>
              {booking.client_company && <div><p className="text-gray-400">Company</p><p className="font-medium">{booking.client_company}</p></div>}
              <div><p className="text-gray-400">Email</p><p className="font-medium">{booking.client_email}</p></div>
              <div><p className="text-gray-400">Phone</p><p className="font-medium">{booking.client_phone}</p></div>
              {booking.client_national_id && <div><p className="text-gray-400">National ID</p><p className="font-medium">{booking.client_national_id}</p></div>}
            </div>
          </div>

          {/* Add-ons & Pricing */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pricing</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Base Price</span><span className="font-medium">${booking.base_price}</span></div>
              {booking.catering_package && <div className="flex justify-between"><span className="text-gray-500">Catering ({booking.catering_package.name})</span><span className="font-medium">${booking.catering_price}</span></div>}
              {booking.dj_requested && <div className="flex justify-between"><span className="text-gray-500">DJ</span><span className="font-medium">${booking.dj_price}</span></div>}
              {booking.cameraman_requested && <div className="flex justify-between"><span className="text-gray-500">Cameraman</span><span className="font-medium">${booking.cameraman_price}</span></div>}
              <div className="border-t pt-2 flex justify-between font-semibold text-[#1B2D4F]">
                <span>Total</span><span>${booking.total_price}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Payment Status</span>
                <span className={`capitalize font-medium ${booking.payment_status === 'paid' ? 'text-green-600' : booking.payment_status === 'partial' ? 'text-amber-600' : 'text-red-500'}`}>
                  {booking.payment_status}
                </span>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h2>
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          {booking.rejection_reason && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</h2>
              <p className="text-sm text-red-700">{booking.rejection_reason}</p>
            </div>
          )}

          {/* Per-event P&L */}
          {booking.event_financials && (parseFloat(booking.event_financials.revenue) > 0 || parseFloat(booking.event_financials.expense_total) > 0) && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Event Profit / Loss</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenue {booking.event_financials.invoice_code && <span className="text-xs text-[#C9A052]">({booking.event_financials.invoice_code})</span>}</span>
                  <span className="font-medium text-green-600">${parseFloat(booking.event_financials.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expenses</span>
                  <span className="font-medium text-red-600">−${parseFloat(booking.event_financials.expense_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {booking.event_financials.expenses.map((ex, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-400 pl-3">
                    <span>{ex.description} ({ex.expense_code})</span>
                    <span>−${parseFloat(ex.amount).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span className="text-[#1B2D4F]">Net {parseFloat(booking.event_financials.net_profit) >= 0 ? 'Profit' : 'Loss'}</span>
                  <span className={parseFloat(booking.event_financials.net_profit) >= 0 ? 'text-green-700' : 'text-red-700'}>
                    ${Math.abs(parseFloat(booking.event_financials.net_profit)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — actions + timeline */}
        <div className="space-y-5">
          {/* Actions */}
          {['draft','admin_pending','accountant_pending','booking_approved'].includes(booking.status) && (
            <div className="bg-white rounded-lg shadow p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Actions</h2>

              {hasPermission('create-booking') && booking.status === 'draft' && (
                <button onClick={() => handleAction('submit')}
                  className="w-full bg-[#1B2D4F] hover:bg-[#0f1d33] text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  → Submit for Admin Review
                </button>
              )}
              {hasPermission('approve-booking') && booking.status === 'admin_pending' && (
                <button onClick={() => handleAction('approve_admin')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  ✓ Approve — Send to Finance
                </button>
              )}
              {hasPermission('finance-approve-booking') && booking.status === 'accountant_pending' && (
                <button onClick={() => handleAction('approve_finance')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  ✓ Final Approval — Confirm Booking
                </button>
              )}
              {hasPermission('reject-booking') && ['admin_pending','accountant_pending'].includes(booking.status) && (
                <button onClick={() => handleAction('reject')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  ✗ Reject
                </button>
              )}
              {hasPermission('cancel-booking') && booking.status === 'booking_approved' && (
                <button onClick={() => handleAction('cancel')}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors">
                  Cancel Booking
                </button>
              )}

              {/* Recurring series cancellation */}
              {booking.recurring && hasPermission('cancel-booking') && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Recurring Series</p>
                  <button onClick={() => handleCancelSeries('future')}
                    className="w-full border border-amber-300 text-amber-700 hover:bg-amber-50 font-medium py-2 rounded-lg text-xs transition-colors">
                    Cancel This + Future Occurrences
                  </button>
                  <button onClick={() => handleCancelSeries('all')}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-medium py-2 rounded-lg text-xs transition-colors">
                    Cancel Entire Series
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Timeline */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status Timeline</h2>
            <div className="space-y-4">
              {booking.status_logs.map((log, i) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                      log.to_status === 'booking_approved' ? 'bg-green-500' :
                      log.to_status === 'rejected'         ? 'bg-red-500' :
                      log.to_status === 'cancelled'        ? 'bg-gray-400' :
                      'bg-[#C9A052]'
                    }`} />
                    {i < booking.status_logs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-[#1B2D4F] capitalize">
                      {STATUS_LABELS[log.to_status] ?? log.to_status}
                    </p>
                    <p className="text-xs text-gray-400">
                      {log.changed_by?.name ?? 'System'} · {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{log.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-lg shadow p-5 text-xs text-gray-400 space-y-1">
            <p>Created by {booking.created_by?.name ?? 'Public Form'}</p>
            <p>Created: {new Date(booking.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
