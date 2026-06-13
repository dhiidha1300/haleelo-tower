'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users:     'Users',
  create:    'Create User',
  edit:      'Edit User',
  settings:  'Settings',
  audit:     'Audit Logs',
  profile:   'My Profile',
};

function labelFor(segment: string): string {
  // numeric segments → omit (they're IDs)
  if (/^\d+$/.test(segment)) return '';
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Build crumbs, skipping numeric ID segments
  const crumbs: { label: string; href: string }[] = [];
  let path = '';
  for (const seg of segments) {
    path += '/' + seg;
    const label = labelFor(seg);
    if (label) crumbs.push({ label, href: path });
  }

  if (crumbs.length <= 1) return null; // Don't show on /dashboard itself

  return (
    <nav className="flex items-center gap-1.5 mb-5 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-400 text-xs select-none">›</span>}
            {isLast ? (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1B2D4F] text-white">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
