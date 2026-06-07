'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const categories = [
  { href: '/settings/general', label: 'General' },
  { href: '/settings/session', label: 'Session Times' },
  { href: '/settings/payment', label: 'Payment Terms' },
  { href: '/settings/email', label: 'Email' },
  { href: '/settings/whatsapp', label: 'WhatsApp' },
  { href: '/settings/electricity', label: 'Electricity' },
  { href: '/settings/payroll', label: 'Payroll' },
  { href: '/settings/fiscal', label: 'Fiscal Year' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-48">
          <nav className="space-y-2">
            {categories.map(cat => (
              <Link
                key={cat.href}
                href={cat.href}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  pathname === cat.href
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
