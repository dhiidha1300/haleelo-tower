'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsAPI } from '@/lib/api';

interface Item { type: string; severity: string; title: string; subtitle: string | null; link: string; }

const TYPE_ICON: Record<string, string> = {
  booking: '📅', lease: '📄', leave: '🌴', invoice: '🧾', document: '📁',
};

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    notificationsAPI.list().then(r => { setItems(r.data.items ?? []); setCount(r.data.count ?? 0); }).catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 60000); // poll every 60s
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (link: string) => { setOpen(false); router.push(link); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="relative text-[#1B2D4F] hover:bg-gray-100 p-2 rounded-lg transition-colors" title="Notifications">
        <span className="text-xl">🔔</span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="font-semibold text-[#1B2D4F] text-sm">Notifications</span>
            {count > 0 && <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">🎉 All caught up — nothing needs your attention.</div>
            ) : items.map((it, i) => (
              <button key={i} onClick={() => go(it.link)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 border-b border-gray-50 last:border-0">
                <span className="text-lg flex-shrink-0">{TYPE_ICON[it.type] ?? '🔔'}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${it.severity === 'high' ? 'text-red-700' : 'text-[#1B2D4F]'}`}>{it.title}</p>
                  {it.subtitle && <p className="text-xs text-gray-400 truncate">{it.subtitle}</p>}
                </div>
              </button>
            ))}
          </div>
          {items.length > 0 && (
            <button onClick={() => go('/dashboard/inbox')}
              className="w-full text-center py-2.5 text-xs font-medium text-[#C9A052] hover:bg-gray-50 border-t">
              Open Approvals Inbox →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
