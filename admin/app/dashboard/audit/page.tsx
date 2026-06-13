'use client';

import { useEffect, useState } from 'react';
import { auditAPI, userAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface AuditLog {
  id: number;
  user_name: string;
  user_role: string;
  action: string;
  model_type: string;
  model_id: number;
  old_values: any;
  new_values: any;
  ip_address: string;
  created_at: string;
}

interface UserOption { id: number; name: string; email: string; }

const ACTIONS = ['login', 'logout', 'failed_login', 'created', 'updated', 'deleted', 'approved', 'rejected', 'exported'];

const ACTION_COLORS: Record<string, string> = {
  login:        'bg-purple-100 text-purple-800',
  logout:       'bg-gray-100 text-gray-700',
  failed_login: 'bg-red-100 text-red-700',
  created:      'bg-green-100 text-green-800',
  updated:      'bg-blue-100 text-blue-800',
  deleted:      'bg-red-100 text-red-800',
  approved:     'bg-teal-100 text-teal-800',
  rejected:     'bg-orange-100 text-orange-800',
  exported:     'bg-yellow-100 text-yellow-800',
};

export default function AuditPage() {
  const { hasPermission } = usePermission();

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);

  // Filters
  const [action, setAction]         = useState('');
  const [modelType, setModelType]   = useState('');
  const [userId, setUserId]         = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');

  useEffect(() => {
    auditAPI.users().then(r => setUserOptions(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchLogs(); }, [action, modelType, userId, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditAPI.list(
        page,
        action || undefined,
        modelType || undefined,
        userId ? parseInt(userId) : undefined,
        startDate || undefined,
        endDate || undefined,
      );
      setLogs(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setAction(''); setModelType(''); setUserId('');
    setStartDate(''); setEndDate(''); setPage(1);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    try {
      const res = await auditAPI.export(format, {
        action: action || undefined,
        model_type: modelType || undefined,
        user_id: userId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(null);
    }
  };

  if (!hasPermission('view-audit-logs')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-600 font-medium">Access Denied</p>
          <p className="text-gray-500 text-sm mt-1">You don't have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  const perPage = 50;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Audit Logs</h1>
          <p className="text-gray-600">Track all system activities and changes</p>
        </div>
        {hasPermission('export-audit-logs') && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {exporting === 'excel' ? 'Exporting…' : '↓ Excel'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Exporting…' : '↓ PDF'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">All Actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resource</label>
            <select value={modelType} onChange={e => { setModelType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">All Resources</option>
              <option value="App\Models\User">User</option>
              <option value="Report">Report</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
            <select value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">All Users</option>
              {userOptions.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">{total} record{total !== 1 ? 's' : ''} found</p>
          <button onClick={resetFilters} className="text-xs text-[#C9A052] hover:underline font-medium">
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-900">User</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-900">Action</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-900">Resource</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-900">Date & Time</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1B2D4F]">{log.user_name || 'System'}</p>
                      <p className="text-xs text-gray-400">{log.user_role}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{log.model_type ? log.model_type.split('\\').pop() : '—'}</p>
                      <p className="text-xs text-gray-400">ID: {log.model_id}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3">
                      {(log.new_values && Object.keys(log.new_values).length > 0) ? (
                        <details>
                          <summary className="cursor-pointer text-[#C9A052] hover:underline text-xs font-medium">View changes</summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded border text-xs overflow-auto max-h-32 max-w-xs">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </details>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex justify-center items-center gap-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 text-sm">
            ← Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {Math.ceil(total / perPage)} ({total} total)
          </span>
          <button disabled={page * perPage >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 text-sm">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
