'use client';

import { useEffect, useState, Fragment } from 'react';
import { accountingAPI } from '@/lib/api';

interface RangeRow {
  code: string; name: string; type: string;
  opening_debit: string; opening_credit: string;
  period_debit: string; period_credit: string;
  closing_debit: string; closing_credit: string;
}
interface TBR { rows: RangeRow[]; totals: any; from: string | null; to: string; balanced: boolean; }

interface CompareRow {
  code: string; name: string; type: string;
  aDebit: number; aCredit: number; bDebit: number; bCredit: number;
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses',
};
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const fmt = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return !n ? '—' : `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().split('T')[0];
const monthRange = (offset: number) => {
  const d = new Date(); d.setMonth(d.getMonth() + offset);
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  return { from, to };
};

// Light gold tint used to mark the "Selected Period" columns as the active filter
const PERIOD_TINT_HEAD = 'bg-[#C9A052]/20';
const PERIOD_TINT_ROW = 'bg-[#C9A052]/5';
const PERIOD_TINT_TOTAL = 'bg-[#C9A052]/15';

export default function TrialBalancePage() {
  const [mode, setMode] = useState<'range' | 'compare'>('range');
  const [loading, setLoading] = useState(false);

  // Range mode
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo]     = useState(today());
  const [tb, setTb]     = useState<TBR | null>(null);

  // Compare mode (two periods)
  const [aFrom, setAFrom] = useState(monthRange(-1).from);
  const [aTo, setATo]     = useState(monthRange(-1).to);
  const [bFrom, setBFrom] = useState(monthRange(0).from);
  const [bTo, setBTo]     = useState(monthRange(0).to);
  const [cmpA, setCmpA]   = useState<TBR | null>(null);
  const [cmpB, setCmpB]   = useState<TBR | null>(null);

  const runRange = () => {
    setLoading(true);
    accountingAPI.trialBalanceRange(from, to).then(r => setTb(r.data)).finally(() => setLoading(false));
  };
  const runCompare = () => {
    setLoading(true);
    Promise.all([
      accountingAPI.trialBalanceRange(aFrom, aTo),
      accountingAPI.trialBalanceRange(bFrom, bTo),
    ]).then(([a, b]) => { setCmpA(a.data); setCmpB(b.data); }).finally(() => setLoading(false));
  };

  useEffect(() => { runRange(); }, []);

  const grouped = (rows: RangeRow[]) =>
    TYPE_ORDER.map(type => ({ type, rows: rows.filter(r => r.type === type) })).filter(g => g.rows.length > 0);

  // Merge compare rows by code → each period's ending Debit/Credit split
  const compareRows = (): CompareRow[] => {
    const map = new Map<string, CompareRow>();
    (cmpA?.rows ?? []).forEach(r => map.set(r.code, {
      code: r.code, name: r.name, type: r.type,
      aDebit: parseFloat(r.closing_debit || '0'), aCredit: parseFloat(r.closing_credit || '0'),
      bDebit: 0, bCredit: 0,
    }));
    (cmpB?.rows ?? []).forEach(r => {
      const e = map.get(r.code) ?? { code: r.code, name: r.name, type: r.type, aDebit: 0, aCredit: 0, bDebit: 0, bCredit: 0 };
      e.bDebit = parseFloat(r.closing_debit || '0'); e.bCredit = parseFloat(r.closing_credit || '0');
      map.set(r.code, e);
    });
    return Array.from(map.values());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Trial Balance</h1>
          <p className="text-gray-600">Initial and ending balances for the selected period, broken out by debit and credit</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['range', 'compare'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-white text-[#1B2D4F] shadow-sm' : 'text-gray-500 hover:text-[#1B2D4F]'}`}>
              {m === 'range' ? '📅 Date Range' : '⇄ Compare Periods'}
            </button>
          ))}
        </div>
      </div>

      {/* ── RANGE MODE ── */}
      {mode === 'range' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 flex items-end gap-3 flex-wrap">
            <div><label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <button onClick={runRange} className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-5 py-2 rounded-lg text-sm font-medium">Run</button>
          </div>

          {tb && (
            <div className={`rounded-xl p-4 flex items-center justify-between ${tb.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tb.balanced ? '✅' : '⚠️'}</span>
                <p className={`font-semibold ${tb.balanced ? 'text-green-800' : 'text-red-800'}`}>
                  {tb.balanced ? 'Ledger is balanced' : 'Ledger is OUT OF BALANCE'} · {tb.from ?? 'start'} → {tb.to}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                Ending Balance — Debit <span className="font-semibold text-[#1B2D4F]">{fmt(tb.totals.cd)}</span> · Credit <span className="font-semibold text-[#1B2D4F]">{fmt(tb.totals.cc)}</span>
              </div>
            </div>
          )}

          {loading ? <div className="text-center py-12 text-gray-500">Calculating…</div>
          : !tb || tb.rows.length === 0 ? <div className="text-center py-12 text-gray-500">No account activity in this range.</div>
          : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-[#1B2D4F] text-white">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase align-bottom">Account</th>
                    <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase border-l border-white/10">Initial Balance</th>
                    <th colSpan={2} className={`px-4 py-2 text-center text-xs font-semibold uppercase border-l border-white/10 ${PERIOD_TINT_HEAD}`}>
                      Selected Period
                      <div className="text-[10px] font-normal normal-case text-white/70">{tb.from ?? 'start'} → {tb.to}</div>
                    </th>
                    <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase border-l border-white/10">Ending Balance</th>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase border-l border-white/10 text-white/80">Debit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-white/80">Credit</th>
                    <th className={`px-4 py-2 text-right text-[11px] font-medium uppercase border-l border-white/10 text-white/90 ${PERIOD_TINT_HEAD}`}>Debit</th>
                    <th className={`px-4 py-2 text-right text-[11px] font-medium uppercase text-white/90 ${PERIOD_TINT_HEAD}`}>Credit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase border-l border-white/10 text-white/80">Debit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-white/80">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped(tb.rows).map(group => (
                    <Fragment key={group.type}>
                      <tr className="bg-gray-100"><td colSpan={7} className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase">{TYPE_LABELS[group.type]}</td></tr>
                      {group.rows.map(r => (
                        <tr key={r.code} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm text-gray-700"><span className="font-mono text-xs text-gray-400 mr-2">{r.code}</span>{r.name}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-gray-600 border-l border-gray-100">{fmt(r.opening_debit)}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(r.opening_credit)}</td>
                          <td className={`px-4 py-2.5 text-right text-sm text-gray-700 border-l border-gray-100 ${PERIOD_TINT_ROW}`}>{fmt(r.period_debit)}</td>
                          <td className={`px-4 py-2.5 text-right text-sm text-gray-700 ${PERIOD_TINT_ROW}`}>{fmt(r.period_credit)}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-[#1B2D4F] border-l border-gray-100">{fmt(r.closing_debit)}</td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-[#1B2D4F]">{fmt(r.closing_credit)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-[#1B2D4F] font-bold text-[#1B2D4F]">
                    <td className="px-4 py-3 text-sm text-right">TOTALS</td>
                    <td className="px-4 py-3 text-right text-sm border-l border-gray-200">{fmt(tb.totals.od)}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmt(tb.totals.oc)}</td>
                    <td className={`px-4 py-3 text-right text-sm border-l border-gray-200 ${PERIOD_TINT_TOTAL}`}>{fmt(tb.totals.pd)}</td>
                    <td className={`px-4 py-3 text-right text-sm ${PERIOD_TINT_TOTAL}`}>{fmt(tb.totals.pc)}</td>
                    <td className="px-4 py-3 text-right text-sm border-l border-gray-200">{fmt(tb.totals.cd)}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmt(tb.totals.cc)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── COMPARE MODE ── */}
      {mode === 'compare' && (
        <>
          <div className="bg-white rounded-lg shadow p-4 flex items-end gap-4 flex-wrap">
            <div className="flex items-end gap-2">
              <span className="text-xs font-semibold text-[#C9A052] mb-2">Period A</span>
              <div><label className="block text-xs text-gray-500 mb-1">From</label><input type="date" value={aFrom} onChange={e => setAFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">To</label><input type="date" value={aTo} onChange={e => setATo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xs font-semibold text-[#1B2D4F] mb-2">Period B</span>
              <div><label className="block text-xs text-gray-500 mb-1">From</label><input type="date" value={bFrom} onChange={e => setBFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">To</label><input type="date" value={bTo} onChange={e => setBTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
            <button onClick={runCompare} className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-5 py-2 rounded-lg text-sm font-medium">Compare</button>
          </div>

          {loading ? <div className="text-center py-12 text-gray-500">Calculating…</div>
          : !cmpA || !cmpB ? <div className="text-center py-12 text-gray-500">Pick two periods and press Compare.</div>
          : (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-[#1B2D4F] text-white">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold uppercase align-bottom">Account</th>
                    <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase border-l border-white/10">
                      Period A
                      <div className="text-[10px] font-normal normal-case text-white/60">{aFrom} → {aTo}</div>
                    </th>
                    <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase border-l border-white/10">
                      Period B
                      <div className="text-[10px] font-normal normal-case text-white/60">{bFrom} → {bTo}</div>
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-right text-xs font-semibold uppercase border-l border-white/10 align-bottom">Variance</th>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase border-l border-white/10 text-white/80">Debit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-white/80">Credit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase border-l border-white/10 text-white/80">Debit</th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-white/80">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPE_ORDER.map(type => {
                    const rows = compareRows().filter(r => r.type === type);
                    if (!rows.length) return null;
                    return (
                      <Fragment key={type}>
                        <tr className="bg-gray-100"><td colSpan={6} className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase">{TYPE_LABELS[type]}</td></tr>
                        {rows.map(r => {
                          const aNet = r.aDebit - r.aCredit;
                          const bNet = r.bDebit - r.bCredit;
                          const v = +(bNet - aNet).toFixed(2);
                          return (
                            <tr key={r.code} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm text-gray-700"><span className="font-mono text-xs text-gray-400 mr-2">{r.code}</span>{r.name}</td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-600 border-l border-gray-100">{fmt(r.aDebit)}</td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(r.aCredit)}</td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-600 border-l border-gray-100">{fmt(r.bDebit)}</td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(r.bCredit)}</td>
                              <td className={`px-4 py-2.5 text-right text-sm font-medium border-l border-gray-100 ${v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {v === 0 ? '—' : `${v > 0 ? '▲' : '▼'} ${fmt(v)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
