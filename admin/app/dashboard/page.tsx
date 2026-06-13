'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/lib/permissions';
import { dashboardAPI, bookingsAPI, leasesAPI } from '@/lib/api';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

interface Stats {
  total_staff: number;
  active_tenants: number;
  active_leases: number;
  pending_leases: number;
  expiring_leases: number;
  bookings_admin_pending: number;
  bookings_finance_pending: number;
  bookings_upcoming: number;
  waiting_list: number;
  overdue_invoices_count: number;
  overdue_invoices_total: string;
  revenue_this_month: string;
  revenue_ytd: string;
  outstanding_ar: string;
  recent_bookings: BookingRow[];
  pending_admin_approvals: BookingRow[];
  pending_finance_approvals: BookingRow[];
  pending_lease_approvals: PendingLease[];
  expiring_leases_list: ExpiringLease[];
}

interface PendingLease {
  id: number; lease_code: string; tenant_name: string;
  space_name: string; rent: string; billing_cycle: string;
}

interface BookingRow {
  id: number; booking_code: string; client_name: string;
  product_name: string; booking_date: string; session_type: string;
  status: string; total_price: string;
}

interface ExpiringLease {
  id: number; lease_code: string; tenant_name: string;
  space_name: string; end_date: string; days_left: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft:              'bg-gray-100 text-gray-600',
  admin_pending:      'bg-amber-100 text-amber-800',
  accountant_pending: 'bg-orange-100 text-orange-800',
  booking_approved:   'bg-green-100 text-green-800',
  rejected:           'bg-red-100 text-red-700',
  cancelled:          'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', admin_pending: 'Admin Pending',
  accountant_pending: 'Finance Review', booking_approved: 'Approved',
  rejected: 'Rejected', cancelled: 'Cancelled',
};

type TabKey = 'overview' | 'finance' | 'operations';

export default function Dashboard() {
  const { user } = useAuth();
  const router   = useRouter();
  const { hasPermission } = usePermission();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  const showFinance    = hasPermission('view-financial-reports');
  const showOperations = hasPermission('view-bookings') || hasPermission('manage-leases');

  const tabs: { key: TabKey; label: string; icon: string; show: boolean }[] = [
    { key: 'overview',   label: 'Overview',   icon: '📊', show: true },
    { key: 'finance',    label: 'Finance',    icon: '💰', show: showFinance },
    { key: 'operations', label: 'Operations', icon: '🗂️', show: showOperations },
  ];

  useEffect(() => {
    dashboardAPI.stats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: number, currentStatus: string) => {
    const next = currentStatus === 'admin_pending' ? 'accountant_pending' : 'booking_approved';
    await bookingsAPI.updateStatus(id, next);
    dashboardAPI.stats().then(r => setStats(r.data));
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    await bookingsAPI.updateStatus(id, 'rejected', undefined, reason);
    dashboardAPI.stats().then(r => setStats(r.data));
  };

  const handleLeaseApprove = async (id: number) => {
    if (!confirm('Approve this lease? The tenant will be activated.')) return;
    await leasesAPI.approve(id);
    dashboardAPI.stats().then(r => setStats(r.data));
  };

  const handleLeaseReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    await leasesAPI.reject(id, reason);
    dashboardAPI.stats().then(r => setStats(r.data));
  };

  return (
    <div className="space-y-6">

      {/* Welcome + Tab bar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1 text-sm capitalize">
            {user?.role?.replace('_', ' ')} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl self-start">
          {tabs.filter(t => t.show).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-[#1B2D4F] shadow-sm' : 'text-gray-500 hover:text-[#1B2D4F]'
              }`}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════ OVERVIEW TAB ════════════════ */}
      {tab === 'overview' && (
      <div className="space-y-6">
      {/* ── Top KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hasPermission('manage-users') && (
          <KpiCard label="Total Staff" value={loading ? '…' : stats?.total_staff ?? 0}
            icon="👥" color="border-[#1B2D4F]" description="Active staff accounts"
            onClick={() => router.push('/dashboard/users')} />
        )}
        <KpiCard label="Active Tenants" value={loading ? '…' : stats?.active_tenants ?? 0}
          icon="🏬" color="border-[#C9A052]" description="Office & educational tenants"
          onClick={() => router.push('/dashboard/tenants')} />
        <KpiCard label="Active Leases" value={loading ? '…' : stats?.active_leases ?? 0}
          icon="📄" color="border-[#1B2D4F]" description="Current lease agreements"
          onClick={() => router.push('/dashboard/leases')} />
        <KpiCard
          label="Pending Bookings"
          value={loading ? '…' : ((stats?.bookings_admin_pending ?? 0) + (stats?.bookings_finance_pending ?? 0))}
          icon="📅" color="border-amber-400"
          description={`${stats?.bookings_admin_pending ?? 0} admin · ${stats?.bookings_finance_pending ?? 0} finance`}
          onClick={() => router.push('/dashboard/bookings')} />
      </div>

      {/* ── Secondary KPI row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Upcoming (7 days)" value={loading ? '…' : stats?.bookings_upcoming ?? 0}
          icon="📆" color="border-green-400" description="Approved bookings this week"
          onClick={() => router.push('/dashboard/bookings/calendar')} />
        <KpiCard label="Waiting List" value={loading ? '…' : stats?.waiting_list ?? 0}
          icon="⏳" color="border-purple-400" description="Clients awaiting a slot"
          onClick={() => router.push('/dashboard/bookings')} />
        <KpiCard
          label="Expiring Leases"
          value={loading ? '…' : stats?.expiring_leases ?? 0}
          icon={stats?.expiring_leases ? '⚠️' : '✅'}
          color={stats?.expiring_leases ? 'border-red-400' : 'border-green-400'}
          description="Expiring within 10 days"
          onClick={() => router.push('/dashboard/leases')} />
        <KpiCard
          label="Overdue Invoices"
          value={loading ? '…' : stats?.overdue_invoices_count ?? 0}
          icon={stats?.overdue_invoices_count ? '⚠️' : '🧾'}
          color={stats?.overdue_invoices_count ? 'border-red-400' : 'border-green-400'}
          description={`$${parseFloat(stats?.overdue_invoices_total ?? '0').toLocaleString()} outstanding`}
          onClick={() => router.push('/dashboard/finance/invoices?status=overdue')} />
      </div>

      {/* Needs-attention shortcut */}
      <div className="bg-gradient-to-r from-[#1B2D4F] to-[#2a4170] rounded-xl p-5 flex items-center justify-between text-white">
        <div>
          <p className="font-semibold">Items needing attention</p>
          <p className="text-white/70 text-sm mt-0.5">
            {(stats?.bookings_admin_pending ?? 0) + (stats?.bookings_finance_pending ?? 0)} bookings ·
            {' '}{stats?.pending_leases ?? 0} leases · {stats?.overdue_invoices_count ?? 0} overdue invoices
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/inbox')}
          className="bg-[#C9A052] hover:bg-[#b89140] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0">
          Open Inbox →
        </button>
      </div>
      </div>
      )}

      {/* ════════════════ OPERATIONS TAB ════════════════ */}
      {tab === 'operations' && (
      <div className="space-y-6">
      {/* ── Approval queues (role-gated) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Admin approval queue */}
        {hasPermission('approve-booking') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-[#1B2D4F]">Admin Approval Queue</h2>
                <p className="text-xs text-gray-400">Bookings awaiting your review</p>
              </div>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                (stats?.bookings_admin_pending ?? 0) > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-500'
              }`}>{stats?.bookings_admin_pending ?? 0}</span>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
            ) : !stats?.pending_admin_approvals?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No pending approvals</p>
            ) : (
              <div className="divide-y">
                {stats.pending_admin_approvals.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{b.booking_code}</p>
                      <p className="text-sm font-medium truncate">{b.client_name}</p>
                      <p className="text-xs text-gray-400">{b.product_name} · {b.booking_date} · <span className="capitalize">{b.session_type}</span></p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(b.id, 'admin_pending')}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleReject(b.id)}
                        className="text-xs border border-red-300 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {(stats?.bookings_admin_pending ?? 0) > 5 && (
                  <button onClick={() => router.push('/dashboard/bookings?status=admin_pending')}
                    className="w-full text-center text-xs text-[#C9A052] hover:underline pt-2">
                    View all {stats?.bookings_admin_pending} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Finance approval queue */}
        {hasPermission('finance-approve-booking') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-[#1B2D4F]">Finance Approval Queue</h2>
                <p className="text-xs text-gray-400">Bookings awaiting final confirmation</p>
              </div>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                (stats?.bookings_finance_pending ?? 0) > 0
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-500'
              }`}>{stats?.bookings_finance_pending ?? 0}</span>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
            ) : !stats?.pending_finance_approvals?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No bookings awaiting Finance approval</p>
            ) : (
              <div className="divide-y">
                {stats.pending_finance_approvals.map(b => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{b.booking_code}</p>
                      <p className="text-sm font-medium truncate">{b.client_name}</p>
                      <p className="text-xs text-gray-400">{b.product_name} · {b.booking_date} · <span className="capitalize">{b.session_type}</span></p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleApprove(b.id, 'accountant_pending')}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => handleReject(b.id)}
                        className="text-xs border border-red-300 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {(stats?.bookings_finance_pending ?? 0) > 5 && (
                  <button onClick={() => router.push('/dashboard/bookings?status=accountant_pending')}
                    className="w-full text-center text-xs text-[#C9A052] hover:underline pt-2">
                    View all {stats?.bookings_finance_pending} →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pending lease approvals */}
        {hasPermission('manage-leases') && (stats?.pending_lease_approvals?.length ?? 0) > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-[#1B2D4F]">Lease Approval Queue</h2>
                <p className="text-xs text-gray-400">Lease requests awaiting your approval</p>
              </div>
              <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                {stats?.pending_leases ?? 0}
              </span>
            </div>
            <div className="divide-y">
              {stats?.pending_lease_approvals?.map(l => (
                <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{l.lease_code}</p>
                    <p className="text-sm font-medium truncate">{l.tenant_name}</p>
                    <p className="text-xs text-gray-400">
                      {l.space_name} · ${l.rent}/{l.billing_cycle === 'monthly' ? 'mo' : 'sem'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleLeaseApprove(l.id)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                      Approve
                    </button>
                    <button onClick={() => handleLeaseReject(l.id)}
                      className="text-xs border border-red-300 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring leases alert */}
        {(stats?.expiring_leases ?? 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <h2 className="font-semibold text-amber-800">Leases Expiring Soon</h2>
            </div>
            <div className="divide-y divide-amber-100">
              {stats?.expiring_leases_list?.map(l => (
                <div key={l.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-900">{l.tenant_name}</p>
                    <p className="text-xs text-amber-700">{l.space_name} · expires {l.end_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold ${l.days_left <= 3 ? 'text-red-600' : 'text-amber-700'}`}>
                      {l.days_left <= 0 ? 'Today' : `${l.days_left}d left`}
                    </span>
                    <button onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                      className="text-xs text-[#C9A052] hover:underline">View →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bookings */}
        {hasPermission('view-bookings') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1B2D4F]">Recent Bookings</h2>
              <button onClick={() => router.push('/dashboard/bookings')}
                className="text-xs text-[#C9A052] hover:underline font-medium">View all →</button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
            ) : !stats?.recent_bookings?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No bookings yet</p>
            ) : (
              <div className="divide-y">
                {stats.recent_bookings.map(b => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                    onClick={() => router.push(`/dashboard/bookings/${b.id}`)}>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{b.booking_code}</p>
                      <p className="text-sm font-medium truncate">{b.client_name}</p>
                      <p className="text-xs text-gray-400">{b.product_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_COLORS[b.status] ?? 'bg-gray-100'}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">${parseFloat(b.total_price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      )}

      {/* ════════════════ FINANCE TAB ════════════════ */}
      {tab === 'finance' && (
      <div className="space-y-6">
      {/* ── Financial overview (live from Phase 3b) ─────────────────────────── */}
      <div>
        <SectionHeader title="Financial Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <KpiCard label="Revenue This Month"
            value={loading ? '…' : `$${parseFloat(stats?.revenue_this_month ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon="💰" color="border-[#C9A052]" description="Payments received this month" />
          <KpiCard label="Revenue YTD"
            value={loading ? '…' : `$${parseFloat(stats?.revenue_ytd ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon="📈" color="border-[#1B2D4F]" description="Year to date" />
          <KpiCard label="Outstanding AR"
            value={loading ? '…' : `$${parseFloat(stats?.outstanding_ar ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            icon="🧾" color="border-orange-400" description="Unpaid invoice balances"
            onClick={() => router.push('/dashboard/finance/invoices?status=sent')} />
        </div>
      </div>

      {/* ── Live charts + account balances (Phase 3d) ───────────────────────── */}
      {hasPermission('view-financial-reports') && <DashboardCharts />}
      </div>
      )}

    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function KpiCard({ label, value, icon, color, description, phase, onClick }: {
  label: string; value: string | number; icon: string; color: string;
  description?: string; phase?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${phase ? 'text-gray-300' : 'text-[#1B2D4F]'}`}>{value}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          {phase && <PhaseBadge phase={phase} className="mt-2" />}
        </div>
        <span className="text-2xl ml-3 flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, phase }: { title: string; phase?: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-base font-semibold text-[#1B2D4F]">{title}</h2>
      {phase && <PhaseBadge phase={phase} />}
    </div>
  );
}

function PhaseBadge({ phase, className = '' }: { phase?: string; className?: string }) {
  if (!phase) return null;
  const color = phase === 'Phase 2' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600';
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color} ${className}`}>{phase}</span>;
}

function ChartPlaceholder({ title, description, phase, icon }: { title: string; description: string; phase: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1B2D4F]">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <PhaseBadge phase={phase} />
      </div>
      <div className="h-36 bg-gray-50 rounded-lg flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200">
        <span className="text-3xl opacity-30">{icon}</span>
        <p className="text-xs text-gray-400 font-medium">Chart available in {phase}</p>
      </div>
    </div>
  );
}
