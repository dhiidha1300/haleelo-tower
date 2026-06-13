'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsAPI } from '@/lib/api';

interface Item { type: string; severity: string; title: string; subtitle: string | null; link: string; }

const TYPE_META: Record<string, { icon: string; label: string }> = {
  booking:  { icon: '📅', label: 'Bookings' },
  lease:    { icon: '📄', label: 'Leases' },
  leave:    { icon: '🌴', label: 'Leave Requests' },
  invoice:  { icon: '🧾', label: 'Invoices' },
  document: { icon: '📁', label: 'Documents' },
};

const SEV_STYLE: Record<string, string> = {
  high: 'border-l-red-500 bg-red-50/40',
  medium: 'border-l-amber-400 bg-amber-50/30',
  low: 'border-l-gray-300',
};

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    notificationsAPI.list()
      .then(r => setItems(r.data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const types = Array.from(new Set(items.map(i => i.type)));
  const shown = filter ? items.filter(i => i.type === filter) : items;

  // group by type for the section view
  const grouped = shown.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.type] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Approvals Inbox</h1>
          <p className="text-gray-600">Everything that needs your attention, in one place</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#C9A052]">{items.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Open items</p>
        </div>
      </div>

      {types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === '' ? 'bg-[#1B2D4F] text-white' : 'bg-white border text-gray-600'}`}>
            All ({items.length})
          </button>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === t ? 'bg-[#1B2D4F] text-white' : 'bg-white border text-gray-600'}`}>
              {TYPE_META[t]?.icon} {TYPE_META[t]?.label ?? t} ({items.filter(i => i.type === t).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-lg font-semibold text-[#1B2D4F]">All caught up!</p>
          <p className="text-gray-500 text-sm">No bookings, leases, invoices or documents need your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, list]) => (
            <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
                <span className="text-lg">{TYPE_META[type]?.icon ?? '🔔'}</span>
                <span className="font-semibold text-[#1B2D4F] text-sm">{TYPE_META[type]?.label ?? type}</span>
                <span className="text-xs text-gray-400">({list.length})</span>
              </div>
              <div className="divide-y">
                {list.map((it, i) => (
                  <button key={i} onClick={() => router.push(it.link)}
                    className={`w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 border-l-4 ${SEV_STYLE[it.severity] ?? 'border-l-gray-300'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1B2D4F]">{it.title}</p>
                      {it.subtitle && <p className="text-xs text-gray-500">{it.subtitle}</p>}
                    </div>
                    <span className="text-[#C9A052] text-sm font-medium flex-shrink-0 ml-4">Review →</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
