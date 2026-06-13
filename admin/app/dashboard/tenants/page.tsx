'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Tenant {
  id: number;
  company_name: string;
  contact_person_name: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  portal_access: boolean;
  leases_count: number;
  documents_count: number;
}

const TYPE_LABELS: Record<string, string> = {
  office:            'Office',
  educational:       'Educational',
  conference_client: 'Conference Client',
};
const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-800',
  active:     'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-700',
};

export default function TenantsPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [type, setType]       = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  useEffect(() => { fetchTenants(); }, [search, type, status, page]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await tenantsAPI.list({ search, type, status, page: String(page) });
      setTenants(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Tenants</h1>
          <p className="text-gray-600">Manage building tenants and their onboarding</p>
        </div>
        {hasPermission('manage-tenants') && (
          <button onClick={() => router.push('/dashboard/tenants/create')}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            + Add Tenant
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Search by name, contact, or email…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
            <option value="">All Types</option>
            <option value="office">Office</option>
            <option value="educational">Educational</option>
            <option value="conference_client">Conference Client</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        {(search || type || status) && (
          <button onClick={() => { setSearch(''); setType(''); setStatus(''); setPage(1); }}
            className="mt-3 text-xs text-[#C9A052] hover:underline font-medium">Reset filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No tenants found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Leases</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#1B2D4F]">{t.company_name}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-700">{t.contact_person_name}</p>
                    <p className="text-xs text-gray-400">{t.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium px-2 py-0.5 bg-[#1B2D4F]/10 text-[#1B2D4F] rounded">
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[t.status]}`}>
                        {t.status}
                      </span>
                      {t.portal_access && (
                        <span className="text-xs text-blue-600" title="Portal access enabled">🌐</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{t.leases_count} lease{t.leases_count !== 1 ? 's' : ''}</td>
                  <td className="px-5 py-4 text-right space-x-3">
                    <button onClick={() => router.push(`/dashboard/tenants/${t.id}`)}
                      className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">View</button>
                    {hasPermission('create-booking') && (
                      <button onClick={() => router.push(`/dashboard/leases/create?tenant_id=${t.id}`)}
                        className="text-[#1B2D4F] hover:text-[#0f1d33] text-sm font-medium">+ Lease</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
