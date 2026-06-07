'use client';

import { useEffect, useState } from 'react';
import { auditAPI } from '@/lib/api';
import { usePermission } from '@/lib/auth';

interface AuditLog {
  id: number;
  user_name: string;
  user_role: string;
  action: string;
  model_type: string;
  model_id: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}

export default function AuditLogsPage() {
  const canViewAudit = usePermission('view-audit-logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [action, currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditAPI.list(undefined, action || undefined);
      setLogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewAudit) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <p className="text-red-800">You don't have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Audit Logs</h1>

      <div className="card mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setCurrentPage(1);
              }}
              className="input-base"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-accent rounded-full"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p>No audit logs found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">User</th>
                <th className="text-left py-3 px-4 font-semibold">Action</th>
                <th className="text-left py-3 px-4 font-semibold">Model</th>
                <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{log.user_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{log.user_role}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-white text-xs font-medium ${
                      log.action === 'created' ? 'bg-green-600' :
                      log.action === 'updated' ? 'bg-blue-600' :
                      log.action === 'deleted' ? 'bg-red-600' :
                      log.action === 'login' ? 'bg-accent' :
                      'bg-gray-600'
                    }`}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {log.model_type.split('\\').pop()}
                    <span className="text-gray-400 ml-1">#{log.model_id}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
