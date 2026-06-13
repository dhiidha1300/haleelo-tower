'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { leasesAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Lease {
  id: number;
  lease_code: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  monthly_rent: string | null;
  semester_amount: string | null;
  security_deposit_amount: string;
  tenant: { id: number; company_name: string; email: string } | null;
  space: { id: number; name: string; floor: { name: string } | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-800',
  active:           'bg-green-100 text-green-800',
  rejected:         'bg-red-100 text-red-700',
  expired:          'bg-gray-100 text-gray-600',
  terminated:       'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending Approval',
  active:           'Active',
  rejected:         'Rejected',
  expired:          'Expired',
  terminated:       'Terminated',
};

export default function LeasesPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]  = useState('');
  const [search, setSearch]  = useState('');
  const [page, setPage]      = useState(1);
  const [total, setTotal]    = useState(0);

  useEffect(() => { fetchLeases(); }, [status, search, page]);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      const res = await leasesAPI.list({ status, search, page: String(page) });
      setLeases(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const daysLeft = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this lease? The tenant will be activated.')) return;
    try {
      await leasesAPI.approve(id);
      fetchLeases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve lease');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
      await leasesAPI.reject(id, reason);
      fetchLeases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject lease');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Leases</h1>
          <p className="text-gray-600">Manage all office and educational space leases</p>
        </div>
        {hasPermission('create-booking') && (
          <button onClick={() => router.push('/dashboard/leases/create')}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            + New Lease
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4 flex-wrap">
        <input type="text" placeholder="Search by lease code or company…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
        {(search || status) && (
          <button onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
            className="text-xs text-[#C9A052] hover:underline font-medium self-center">Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading leases…</div>
        ) : leases.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No leases found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Space</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rent</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leases.map(l => {
                  const days    = l.status === 'active' ? daysLeft(l.end_date) : null;
                  const expiring = days !== null && days <= 10 && days >= 0;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-[#1B2D4F]">{l.lease_code}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-sm text-[#1B2D4F]">{l.tenant?.company_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{l.tenant?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{l.space?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{l.space?.floor?.name}</p>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <p className="text-gray-700">
                          {new Date(l.start_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                          {' → '}
                          {new Date(l.end_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                        </p>
                        {expiring && (
                          <p className="text-xs text-amber-600 font-medium">⚠ Expires in {days} day{days !== 1 ? 's' : ''}</p>
                        )}
                        {days !== null && days < 0 && l.status === 'active' && (
                          <p className="text-xs text-red-600 font-medium">⚠ Past end date</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700">
                        {l.billing_cycle === 'monthly'
                          ? `$${l.monthly_rent}/mo`
                          : `$${l.semester_amount}/sem`}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[l.status]}`}>
                          {STATUS_LABELS[l.status] ?? l.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-3">
                        {hasPermission('manage-leases') && l.status === 'pending_approval' && (
                          <>
                            <button onClick={() => handleApprove(l.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium">Approve</button>
                            <button onClick={() => handleReject(l.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium">Reject</button>
                          </>
                        )}
                        <button onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                          className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">View</button>
                      </td>
                    </tr>
                  );
                })}
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
