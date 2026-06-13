'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface MenuItem {
  label: string;
  icon: string;
  href: string;
  roles: string[];
  section?: string;
}

const MENU_ITEMS: MenuItem[] = [
  // ── Core ──────────────────────────────────
  { label: 'Dashboard',   icon: '📊', href: '/dashboard',           roles: ['super_admin', 'admin', 'operations', 'finance'] },
  { label: 'Inbox',       icon: '🔔', href: '/dashboard/inbox',     roles: ['super_admin', 'admin', 'operations', 'finance'] },

  // ── Phase 2: Booking System ───────────────
  { label: 'Products',    icon: '🏢', href: '/dashboard/products',  roles: ['super_admin', 'admin', 'operations', 'finance'],    section: 'Bookings' },
  { label: 'Bookings',    icon: '📅', href: '/dashboard/bookings',  roles: ['super_admin', 'admin', 'operations', 'finance'],    section: 'Bookings' },
  { label: 'Tenants',     icon: '🏬', href: '/dashboard/tenants',   roles: ['super_admin', 'admin', 'operations'],                section: 'Bookings' },
  { label: 'Leases',      icon: '📄', href: '/dashboard/leases',    roles: ['super_admin', 'admin', 'operations', 'finance'],    section: 'Bookings' },

  // ── Phase 3: Finance ──────────────────────
  { label: 'Invoices',          icon: '🧾', href: '/dashboard/finance/invoices',             roles: ['super_admin', 'admin', 'operations', 'finance'], section: 'Finance' },
  { label: 'Payments',          icon: '💵', href: '/dashboard/finance/payments',             roles: ['super_admin', 'admin', 'finance'], section: 'Finance' },
  { label: 'Expenses',          icon: '🧱', href: '/dashboard/finance/expenses',             roles: ['super_admin', 'finance'], section: 'Finance' },
  { label: 'Electricity',       icon: '⚡', href: '/dashboard/finance/electricity',          roles: ['super_admin', 'admin', 'finance'], section: 'Finance' },
  { label: 'Reports',           icon: '📊', href: '/dashboard/finance/reports',              roles: ['super_admin', 'admin', 'finance'], section: 'Finance' },

  // ── Phase 3: Procurement ──────────────────
  { label: 'Vendors',           icon: '🚚', href: '/dashboard/procurement/vendors',          roles: ['super_admin', 'admin', 'finance'], section: 'Procurement' },
  { label: 'Purchase Orders',   icon: '📦', href: '/dashboard/procurement/purchase-orders',  roles: ['super_admin', 'admin', 'finance'], section: 'Procurement' },
  { label: 'Vendor Bills',      icon: '📑', href: '/dashboard/procurement/vendor-bills',     roles: ['super_admin', 'finance'], section: 'Procurement' },

  // ── Phase 3: HR & Payroll ─────────────────
  { label: 'Employees',         icon: '👤', href: '/dashboard/hr/employees',                 roles: ['super_admin', 'finance'], section: 'HR & Payroll' },
  { label: 'Attendance',        icon: '🗓️', href: '/dashboard/hr/attendance',                roles: ['super_admin', 'admin', 'finance'], section: 'HR & Payroll' },
  { label: 'Leave Requests',    icon: '🌴', href: '/dashboard/hr/leave',                      roles: ['super_admin', 'admin', 'finance'], section: 'HR & Payroll' },
  { label: 'Payroll',           icon: '💸', href: '/dashboard/hr/payroll',                    roles: ['super_admin', 'finance'], section: 'HR & Payroll' },

  // ── Phase 3: Accounting ───────────────────
  { label: 'Chart of Accounts', icon: '📒', href: '/dashboard/accounting/chart-of-accounts', roles: ['super_admin', 'admin', 'finance'], section: 'Accounting' },
  { label: 'Accounts',          icon: '🏦', href: '/dashboard/accounting/accounts',          roles: ['super_admin', 'admin', 'finance'], section: 'Accounting' },
  { label: 'Journal',           icon: '📝', href: '/dashboard/accounting/journal',           roles: ['super_admin', 'admin', 'finance'], section: 'Accounting' },
  { label: 'Trial Balance',     icon: '⚖️', href: '/dashboard/accounting/trial-balance',     roles: ['super_admin', 'admin', 'finance'], section: 'Accounting' },

  // ── System ────────────────────────────────
  { label: 'Users',       icon: '👥', href: '/dashboard/users',     roles: ['super_admin', 'admin'],    section: 'System' },
  { label: 'Audit Logs',  icon: '📋', href: '/dashboard/audit',     roles: ['super_admin', 'admin'],    section: 'System' },
  { label: 'Settings',    icon: '⚙️', href: '/dashboard/settings',  roles: ['super_admin', 'admin'],    section: 'System' },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = MENU_ITEMS.filter(item =>
    !user || item.roles.includes(user.role)
  );

  // Group by section
  const sections: { label: string; items: MenuItem[] }[] = [];
  let currentSection: string | null = null;
  for (const item of visibleItems) {
    const sectionLabel = item.section ?? '';
    if (sectionLabel !== currentSection) {
      currentSection = sectionLabel;
      sections.push({ label: sectionLabel, items: [] });
    }
    sections[sections.length - 1].items.push(item);
  }

  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-3xl font-bold text-[#C9A052]">
            {collapsed ? 'H' : 'Haleelo'}
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label || 'main'}>
            {section.label && !collapsed && (
              <p className="px-4 pt-4 pb-1 text-xs font-semibold text-white/30 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {section.label && collapsed && <div className="my-2 border-t border-white/10" />}

            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#C9A052] text-white'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
