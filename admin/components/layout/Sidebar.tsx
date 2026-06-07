'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/users', label: 'Users', icon: '👥', permission: 'manage-users' },
  { href: '/settings', label: 'Settings', icon: '⚙️', permission: 'manage-settings' },
  { href: '/audit', label: 'Audit Logs', icon: '📋', permission: 'view-audit-logs' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = menuItems.filter(item => {
    if (!item.permission) return true;
    return user?.permissions.includes(item.permission);
  });

  return (
    <div className="w-64 bg-primary text-white h-screen fixed left-0 top-0 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Haleelo</h1>
        <p className="text-accent text-sm">Tower Admin</p>
      </div>

      <nav className="space-y-2">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-3 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-accent text-primary font-medium'
                : 'hover:bg-primary-dark'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 pt-8 border-t border-primary-dark">
        <p className="text-xs text-gray-400 mb-2">Logged in as:</p>
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs text-accent capitalize">{user?.role}</p>
      </div>
    </div>
  );
}
