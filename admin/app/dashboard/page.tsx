'use client';

import { useAuth } from '@/lib/auth';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-4xl font-bold text-primary mb-8">Welcome back, {user?.name}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-3xl font-bold text-blue-600">—</div>
          <p className="text-gray-600 text-sm mt-2">Total Users</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-3xl font-bold text-green-600">—</div>
          <p className="text-gray-600 text-sm mt-2">Active Leases</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="text-3xl font-bold text-yellow-600">—</div>
          <p className="text-gray-600 text-sm mt-2">Pending Bookings</p>
        </div>
        <div className="card bg-gradient-to-br from-accent/20 to-accent/10">
          <div className="text-3xl font-bold text-accent">—</div>
          <p className="text-gray-600 text-sm mt-2">Total Revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
              ➕ Create User
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
              📊 View Reports
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
              ⚙️ System Settings
            </button>
            <button className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors">
              📋 Audit Logs
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-primary mb-4">Your Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-gray-600">Role</p>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
            <div>
              <p className="text-gray-600">Permissions</p>
              <p className="font-medium text-xs">{user?.permissions.length} permissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">📌 Phase 1 Status</h3>
        <p className="text-blue-800 text-sm">
          ✅ Authentication system is live. You can manage users, view settings, and browse audit logs using the sidebar menu.
        </p>
      </div>
    </div>
  );
}
