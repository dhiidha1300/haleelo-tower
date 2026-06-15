'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { dashboardAPI, bookingsAPI } from '@/lib/api';

interface OpsData {
  upcoming_bookings: number;
  active_leases: number; pending_leases: number; expiring_leases: number;
  expiring_leases_list: { id: number; lease_code: string; tenant_name: string; space_name: string; end_date: string; days_left: number }[];
  pending_lease_approvals: { id: number; lease_code: string; tenant_name: string; space_name: string; rent: string; billing_cycle: string }[];
  active_tenants: number; expiring_documents: number; waiting_list: number;
}

export function OperationsDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [d, setD] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.operations().then(r => setD(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Calendar pulls approved bookings only, per the visible date range.
  const fetchEvents = async (info: any, success: (e: any[]) => void, failure: (e: any) => void) => {
    try {
      const res = await bookingsAPI.calendar(info.startStr.slice(0, 10), info.endStr.slice(0, 10));
      const approved = (res.data ?? []).filter((e: any) => e.extendedProps?.status === 'booking_approved');
      success(approved);
    } catch (err) { failure(err); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Operations Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {user?.name?.split(' ')[0]} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Upcoming Bookings" value={loading ? '…' : d!.upcoming_bookings} icon="📆" color="border-green-400" sub="Approved · next 7 days" onClick={() => router.push('/dashboard/bookings/calendar')} />
        <Kpi label="Active Leases" value={loading ? '…' : d!.active_leases} icon="📄" color="border-[#1B2D4F]" sub={loading ? '' : `${d!.pending_leases} pending approval`} onClick={() => router.push('/dashboard/leases')} />
        <Kpi label="Active Tenants" value={loading ? '…' : d!.active_tenants} icon="🏬" color="border-[#C9A052]" sub={loading ? '' : `${d!.expiring_documents} doc(s) expiring`} onClick={() => router.push('/dashboard/tenants')} />
        <Kpi label="Waiting List" value={loading ? '…' : d!.waiting_list} icon="⏳" color="border-purple-400" sub="Clients awaiting a slot" onClick={() => router.push('/dashboard/bookings')} />
      </div>

      {/* ── Calendar centerpiece ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#1B2D4F]">Upcoming Events</h2>
            <p className="text-xs text-gray-400">Approved bookings — click an event to open it</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#10B981' }} /> Approved booking
          </div>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          events={fetchEvents}
          eventClick={(info) => router.push(`/dashboard/bookings/${info.event.id}`)}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          eventColor="#10B981"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* ── Leases ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={`Pending Lease Approvals${d?.pending_leases ? ` (${d.pending_leases})` : ''}`}>
          {loading ? <Skeleton /> : (d?.pending_lease_approvals.length ?? 0) === 0 ? <Empty msg="No leases awaiting approval" /> : (
            <div className="divide-y">
              {d?.pending_lease_approvals.map(l => (
                <button key={l.id} onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                  className="w-full text-left py-2.5 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{l.lease_code}</p>
                    <p className="text-sm truncate">{l.tenant_name}</p>
                    <p className="text-xs text-gray-400">{l.space_name} · ${l.rent}/{l.billing_cycle === 'monthly' ? 'mo' : 'sem'}</p>
                  </div>
                  <span className="text-[#C9A052] text-sm font-medium flex-shrink-0">Review →</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Leases Expiring Soon${d?.expiring_leases ? ` (${d.expiring_leases})` : ''}`}>
          {loading ? <Skeleton /> : (d?.expiring_leases_list.length ?? 0) === 0 ? <Empty msg="✅ No leases expiring in the next 10 days" /> : (
            <div className="divide-y">
              {d?.expiring_leases_list.map(l => (
                <button key={l.id} onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                  className="w-full text-left py-2.5 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1B2D4F]">{l.tenant_name}</p>
                    <p className="text-xs text-gray-400">{l.space_name} · expires {l.end_date}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ${l.days_left <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                    {l.days_left <= 0 ? 'Today' : `${l.days_left}d left`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────────── */
function Kpi({ label, value, icon, color, sub, onClick }: {
  label: string; value: string | number; icon: string; color: string; sub?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 text-[#1B2D4F]">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl ml-3 flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">{title}</h3>
      {children}
    </div>
  );
}
const Skeleton = () => <div className="h-32 bg-gray-50 rounded animate-pulse" />;
const Empty = ({ msg }: { msg: string }) => <div className="h-28 flex items-center justify-center text-gray-400 text-sm">{msg}</div>;
