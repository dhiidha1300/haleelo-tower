'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface User {
  id: number;
  name: string;
  email: string;
  job_title: string;
  phone: string;
  role: string;
  status: string;
  two_factor_enabled: boolean;
  is_locked: boolean;
  locked_until: string | null;
  failed_login_attempts: number;
}

export default function UsersPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  useEffect(() => { fetchUsers(); }, [search, role, status, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.list(page, search, role, status);
      setUsers(response.data.data ?? []);
      setTotal(response.data.total ?? 0);         // ← fixed: was meta?.total
    } catch (error: any) {
      console.error('Failed to fetch users:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await userAPI.delete(userId);
      fetchUsers();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      alert('Failed to deactivate user');
    }
  };

  const handleReactivate = async (userId: number) => {
    try {
      await userAPI.reactivate(userId);
      fetchUsers();
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      alert('Failed to reactivate user');
    }
  };

  const handleUnlock = async (userId: number) => {
    try {
      await userAPI.unlock(userId);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unlock user:', error);
      alert('Failed to unlock user');
    }
  };

  if (!hasPermission('manage-users') && !hasPermission('reset-user-password')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-600 font-medium">Access Denied</p>
          <p className="text-gray-500 text-sm mt-1">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">User Management</h1>
          <p className="text-gray-600">Manage staff accounts and permissions</p>
        </div>
        {hasPermission('create-user') && (
          <button
            onClick={() => router.push('/dashboard/users/create')}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            + Create User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
            />
          </div>
          <div>
            <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="operations">Operations</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <div>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {(search || role || status) && (
          <button onClick={() => { setSearch(''); setRole(''); setStatus(''); setPage(1); }}
            className="mt-3 text-xs text-[#C9A052] hover:underline font-medium">
            Reset filters
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No users found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#1B2D4F]">{u.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-[#1B2D4F]/10 text-[#1B2D4F] capitalize">
                      {u.role?.replace('_', ' ')}
                    </span>
                    {!u.two_factor_enabled && (
                      <span className="ml-1 text-xs text-amber-500" title="2FA disabled">⚠</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.status}
                      </span>
                      {u.is_locked && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                          🔒 Locked
                        </span>
                      )}
                      {!u.is_locked && u.failed_login_attempts > 0 && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700" title="Failed login attempts">
                          ⚠ {u.failed_login_attempts} attempt{u.failed_login_attempts !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {hasPermission('edit-user') && (
                      <button
                        onClick={() => router.push(`/dashboard/users/${u.id}/edit`)}
                        className="text-[#C9A052] hover:text-[#b89140] font-medium text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {hasPermission('unlock-user') && u.is_locked && (
                      <button
                        onClick={() => handleUnlock(u.id)}
                        className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                      >
                        Unlock
                      </button>
                    )}
                    {hasPermission('deactivate-user') && u.status === 'active' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Deactivate
                      </button>
                    )}
                    {hasPermission('deactivate-user') && u.status !== 'active' && (
                      <button
                        onClick={() => handleReactivate(u.id)}
                        className="text-green-600 hover:text-green-800 font-medium text-sm"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex justify-center items-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {Math.ceil(total / 25)} ({total} total)
          </span>
          <button
            disabled={page * 25 >= total}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
