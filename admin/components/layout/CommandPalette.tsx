'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchAPI } from '@/lib/api';

interface Result { type: string; label: string; sublabel: string | null; link: string; }

const TYPE_BADGE: Record<string, string> = {
  Booking: 'bg-blue-100 text-blue-700', Invoice: 'bg-emerald-100 text-emerald-700',
  'Vendor Bill': 'bg-amber-100 text-amber-700', Tenant: 'bg-purple-100 text-purple-700',
  Vendor: 'bg-pink-100 text-pink-700', Employee: 'bg-indigo-100 text-indigo-700',
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [q, setQ]            = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive]   = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Global ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQ(''); setResults([]); setActive(0); }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(() => {
      searchAPI.query(q.trim())
        .then(r => { setResults(r.data.results ?? []); setActive(0); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [q]);

  const go = useCallback((link: string) => { setOpen(false); router.push(link); }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active].link); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search bookings, invoices, tenants, employees…"
            className="flex-1 py-4 text-[#1B2D4F] placeholder-gray-400 focus:outline-none text-sm"
          />
          <kbd className="text-[10px] text-gray-400 border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No matches for “{q}”.</div>
          )}
          {!loading && q.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-xs text-gray-400">Type at least 2 characters to search across the platform.</div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => go(r.link)} onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 ${i === active ? 'bg-gray-50' : ''}`}>
              <span className={`text-[10px] font-semibold rounded px-2 py-0.5 flex-shrink-0 ${TYPE_BADGE[r.type] ?? 'bg-gray-100 text-gray-600'}`}>{r.type}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1B2D4F] truncate">{r.label}</p>
                {r.sublabel && <p className="text-xs text-gray-400 truncate">{r.sublabel}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-[10px] text-gray-400">
          <span>↑↓ navigate</span><span>↵ open</span><span>⌘K toggle</span>
        </div>
      </div>
    </div>
  );
}
