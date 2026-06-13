'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reportsAPI, accountingAPI, tenantsAPI, vendorsAPI } from '@/lib/api';

const money = (v: any) => '$' + parseFloat(v ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 });

const TITLES: Record<string, string> = {
  'balance-sheet': 'Balance Sheet', 'profit-loss': 'Profit & Loss', 'cash-flow': 'Cash Flow',
  'aged-receivables': 'Aged Receivables', 'aged-payables': 'Aged Payables', 'partner-ledger': 'Partner Ledger',
  'general-ledger': 'General Ledger', 'revenue': 'Revenue Report', 'expense': 'Expense Report',
  'bookings': 'Bookings Report', 'payments': 'Payment Report', 'invoice-analysis': 'Invoice Analysis',
  'electricity': 'Electricity Report', 'occupancy': 'Occupancy Report', 'payroll-summary': 'Payroll Summary',
};

// which filter controls each report needs
const FILTERS: Record<string, ('from_to' | 'as_of' | 'account' | 'partner')[]> = {
  'balance-sheet': ['as_of'], 'profit-loss': ['from_to'], 'cash-flow': ['from_to'],
  'general-ledger': ['account', 'from_to'], 'partner-ledger': ['partner'],
  'revenue': ['from_to'], 'expense': ['from_to'], 'bookings': ['from_to'],
  'payments': ['from_to'], 'invoice-analysis': ['from_to'], 'electricity': ['from_to'], 'occupancy': ['from_to'],
  'payroll-summary': [],
};

export default function ReportViewerPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const filters = FILTERS[type] ?? [];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [coa, setCoa] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [to, setTo]     = useState(new Date().toISOString().split('T')[0]);
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [partnerType, setPartnerType] = useState('tenant');
  const [partnerId, setPartnerId] = useState('');

  const queryParams = (): Record<string, string> => {
    const p: Record<string, string> = {};
    if (filters.includes('from_to')) { p.from = from; p.to = to; }
    if (filters.includes('as_of')) p.as_of = asOf;
    if (filters.includes('account') && accountId) p.account_id = accountId;
    if (filters.includes('partner')) { p.partner_type = partnerType; if (partnerId) p.partner_id = partnerId; }
    return p;
  };

  const fetchReport = async () => {
    // guard reports that need a selection
    if (filters.includes('account') && !accountId) return;
    if (filters.includes('partner') && !partnerId) return;
    setLoading(true);
    try {
      const res = await reportsAPI.data(type, queryParams());
      setData(res.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (filters.includes('account')) accountingAPI.chartOfAccounts().then(r => setCoa(r.data.accounts));
    if (filters.includes('partner')) loadPartners('tenant');
    if (!filters.includes('account') && !filters.includes('partner')) fetchReport();
  }, [type]);

  const loadPartners = (pt: string) => {
    const api = pt === 'tenant' ? tenantsAPI.list({}) : vendorsAPI.list({});
    api.then(r => setPartners(r.data.data ?? []));
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    try {
      const res = await reportsAPI.export(type, format, queryParams());
      const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      if (format === 'pdf') { window.open(url, '_blank'); }
      else {
        const a = document.createElement('a');
        a.href = url; a.download = `${type}-${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
      }
    } finally { setExporting(''); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.push('/dashboard/finance/reports')} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-1">← All Reports</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{TITLES[type] ?? type}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')} disabled={!data || !!exporting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{exporting === 'pdf' ? '…' : '📄 PDF'}</button>
          <button onClick={() => handleExport('excel')} disabled={!data || !!exporting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">{exporting === 'excel' ? '…' : '📊 Excel'}</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex items-end gap-3 flex-wrap">
        {filters.includes('from_to') && (<>
          <div><label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
        </>)}
        {filters.includes('as_of') && (
          <div><label className="block text-xs text-gray-500 mb-1">As of</label>
            <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
        )}
        {filters.includes('account') && (
          <div><label className="block text-xs text-gray-500 mb-1">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select account…</option>
              {coa.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select></div>
        )}
        {filters.includes('partner') && (<>
          <div><label className="block text-xs text-gray-500 mb-1">Partner Type</label>
            <select value={partnerType} onChange={e => { setPartnerType(e.target.value); setPartnerId(''); loadPartners(e.target.value); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="tenant">Tenant</option><option value="vendor">Vendor</option>
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">{partnerType === 'tenant' ? 'Tenant' : 'Vendor'}</label>
            <select value={partnerId} onChange={e => setPartnerId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select…</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.company_name ?? p.name}</option>)}
            </select></div>
        </>)}
        <button onClick={fetchReport} className="bg-[#1B2D4F] hover:bg-[#0f1d33] text-white px-5 py-2 rounded-lg text-sm font-medium">Run Report</button>
      </div>

      {/* Report body */}
      {loading ? <div className="text-center py-12 text-gray-500">Generating…</div>
        : !data ? <div className="text-center py-12 text-gray-400">Select filters and run the report.</div>
        : <ReportBody type={type} data={data} />}
    </div>
  );
}

function ReportBody({ type, data }: { type: string; data: any }) {
  // ── Balance Sheet ──
  if (type === 'balance-sheet') {
    const section = (title: string, rows: any[], total: string) => (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-5 py-2 text-xs font-semibold uppercase text-gray-500">{title}</div>
        <table className="w-full">
          <tbody className="divide-y">
            {rows.map((r: any) => (
              <tr key={r.code || r.name}><td className="px-5 py-2 text-xs font-mono text-gray-400 w-16">{r.code}</td>
                <td className="px-5 py-2 text-sm text-gray-700">{r.name}</td>
                <td className="px-5 py-2 text-right text-sm">{money(r.balance)}</td></tr>
            ))}
            <tr className="bg-gray-50 font-bold"><td colSpan={2} className="px-5 py-2 text-right text-sm text-[#1B2D4F]">Total {title}</td>
              <td className="px-5 py-2 text-right text-sm text-[#1B2D4F]">{money(total)}</td></tr>
          </tbody>
        </table>
      </div>
    );
    return (
      <div className="space-y-4 max-w-3xl">
        <div className={`rounded-lg p-3 text-sm ${data.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {data.balanced ? '✅ Balance Sheet is balanced' : '⚠️ Out of balance'} · as of {data.as_of}
        </div>
        {section('Assets', data.assets, data.total_assets)}
        {section('Liabilities', data.liabilities, data.total_liabilities)}
        {section('Equity', [...data.equity, { code: '', name: 'Current Period Earnings', balance: data.net_income }], data.total_equity)}
      </div>
    );
  }

  // ── P&L / Revenue / Expense ──
  if (['profit-loss', 'revenue', 'expense'].includes(type)) {
    const rev = data.revenue ?? data.sources ?? [];
    const exp = data.expenses ?? data.categories ?? [];
    return (
      <div className="space-y-4 max-w-3xl">
        {rev.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-50 px-5 py-2 text-xs font-semibold uppercase text-green-700">Revenue</div>
            <table className="w-full"><tbody className="divide-y">
              {rev.map((r: any) => <tr key={r.code}><td className="px-5 py-2 text-xs font-mono text-gray-400 w-16">{r.code}</td><td className="px-5 py-2 text-sm text-gray-700">{r.name}</td><td className="px-5 py-2 text-right text-sm">{money(r.amount)}</td></tr>)}
              <tr className="bg-gray-50 font-bold"><td colSpan={2} className="px-5 py-2 text-right text-sm">Total Revenue</td><td className="px-5 py-2 text-right text-sm text-green-700">{money(data.total_revenue ?? data.total)}</td></tr>
            </tbody></table>
          </div>
        )}
        {exp.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-red-50 px-5 py-2 text-xs font-semibold uppercase text-red-700">Expenses</div>
            <table className="w-full"><tbody className="divide-y">
              {exp.map((r: any) => <tr key={r.code}><td className="px-5 py-2 text-xs font-mono text-gray-400 w-16">{r.code}</td><td className="px-5 py-2 text-sm text-gray-700">{r.name}</td><td className="px-5 py-2 text-right text-sm">{money(r.amount)}</td></tr>)}
              <tr className="bg-gray-50 font-bold"><td colSpan={2} className="px-5 py-2 text-right text-sm">Total Expenses</td><td className="px-5 py-2 text-right text-sm text-red-700">{money(data.total_expenses ?? data.total)}</td></tr>
            </tbody></table>
          </div>
        )}
        {type === 'profit-loss' && (
          <div className="bg-[#1B2D4F] text-white rounded-lg p-5 flex justify-between items-center">
            <span className="font-semibold">Net {parseFloat(data.net_profit) >= 0 ? 'Profit' : 'Loss'}</span>
            <span className="text-2xl font-bold">{money(Math.abs(parseFloat(data.net_profit)))}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Cash Flow ──
  if (type === 'cash-flow') {
    const row = (label: string, val: string, strong = false) => (
      <div className={`flex justify-between px-5 py-3 ${strong ? 'font-bold text-[#1B2D4F] bg-gray-50' : ''}`}>
        <span className={strong ? '' : 'text-gray-600'}>{label}</span><span>{money(val)}</span>
      </div>
    );
    return (
      <div className="bg-white rounded-lg shadow divide-y max-w-xl">
        {row('Opening Balance', data.opening_balance)}
        {row('Cash In', data.cash_in)}
        {row('Cash Out', data.cash_out)}
        {row('Net Cash Flow', data.net_cash_flow, true)}
        {row('Closing Balance', data.closing_balance, true)}
      </div>
    );
  }

  // ── Aged AR/AP ──
  if (['aged-receivables', 'aged-payables'].includes(type)) {
    const b = data.buckets;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[['Current', b.current], ['31–60 days', b['31_60']], ['61–90 days', b['61_90']], ['90+ days', b['90_plus']], ['Total', data.total]].map(([label, val], i) => (
            <div key={i} className={`rounded-lg p-3 ${i === 4 ? 'bg-[#1B2D4F] text-white' : i >= 2 ? 'bg-red-50' : 'bg-white shadow-sm'}`}>
              <p className={`text-xs ${i === 4 ? 'text-white/70' : 'text-gray-500'}`}>{label}</p>
              <p className={`text-lg font-bold ${i === 4 ? '' : 'text-[#1B2D4F]'}`}>{money(val as string)}</p>
            </div>
          ))}
        </div>
        <GenericTable
          headers={type === 'aged-receivables' ? ['Invoice', 'Customer', 'Due Date', 'Overdue', 'Balance'] : ['Bill', 'Vendor', 'Due Date', 'Overdue', 'Balance']}
          rows={data.rows.map((r: any) => [r.invoice_code ?? r.bill_code, r.customer ?? r.vendor, r.due_date, `${r.days_overdue}d`, money(r.balance)])} />
      </div>
    );
  }

  // ── Generic tabular fallback ──
  const TABLES: Record<string, { headers: string[]; map: (r: any) => any[] }> = {
    'general-ledger': { headers: ['Date', 'JE', 'Description', 'Debit', 'Credit', 'Balance'], map: r => [r.date, r.journal_code, r.description, money(r.debit), money(r.credit), money(r.balance)] },
    'partner-ledger': { headers: ['Document', 'Date', 'Total', 'Paid', 'Balance', 'Status'], map: r => [r.document, r.date, money(r.total), money(r.paid), money(r.balance), r.status] },
    'bookings': { headers: ['Code', 'Client', 'Space', 'Date', 'Session', 'Status', 'Total'], map: r => [r.booking_code, r.client, r.product, r.date, r.session, r.status, money(r.total)] },
    'payments': { headers: ['Code', 'Type', 'Document', 'Date', 'Method', 'Account', 'Amount'], map: r => [r.payment_code, r.type, r.document, r.date, r.method, r.account, money(r.amount)] },
    'electricity': { headers: ['Bill', 'Tenant', 'Space', 'Period', 'Prev R', 'Curr R', 'kWh', 'Rate', 'Charge', 'Status'], map: r => [r.bill_code, r.tenant, r.space, r.period, r.previous, r.current, r.kwh, r.rate, money(r.charge), r.status] },
    'occupancy': { headers: ['Space', 'Floor', 'Type', 'Booked', 'Available', 'Rate %'], map: r => [r.space, r.floor, r.type, r.booked, r.available, `${r.rate}%`] },
  };

  if (type === 'payroll-summary') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[['Gross', data.total_gross], ['Deductions', data.total_deductions], ['Net', data.total_net]].map(([l, v], i) => (
            <div key={i} className={`rounded-lg p-4 ${i === 2 ? 'bg-[#1B2D4F] text-white' : 'bg-white shadow-sm'}`}>
              <p className={`text-xs ${i === 2 ? 'text-white/70' : 'text-gray-500'}`}>{l}</p>
              <p className={`text-xl font-bold ${i === 2 ? '' : 'text-[#1B2D4F]'}`}>{money(v)}</p>
            </div>
          ))}
        </div>
        <GenericTable headers={['Department', 'Employees', 'Gross', 'Deductions', 'Net']}
          rows={data.departments.map((r: any) => [r.department.replace('_', ' '), r.employees, money(r.gross), money(r.deductions), money(r.net)])} />
      </div>
    );
  }

  if (type === 'invoice-analysis') {
    return (
      <div className="space-y-4">
        <GenericTable headers={['By Type', 'Count', 'Total']} rows={data.by_type.map((r: any) => [r.type, r.count, money(r.total)])} />
        <GenericTable headers={['By Status', 'Count', 'Total']} rows={data.by_status.map((r: any) => [r.status, r.count, money(r.total)])} />
      </div>
    );
  }

  const cfg = TABLES[type];
  if (cfg) {
    const rows = (data.rows ?? []).map(cfg.map);
    return <GenericTable headers={cfg.headers} rows={rows} />;
  }

  return <pre className="bg-white rounded-lg shadow p-4 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

function GenericTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead className="bg-gray-50 border-b"><tr>
          {headers.map((h, i) => <th key={i} className={`px-5 py-3 text-xs font-semibold text-gray-600 uppercase ${i === headers.length - 1 ? 'text-right' : 'text-left'}`}>{h}</th>)}
        </tr></thead>
        <tbody className="divide-y">
          {rows.length === 0 ? <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-gray-400">No data for this report.</td></tr>
          : rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className={`px-5 py-2.5 text-sm text-gray-700 ${j === row.length - 1 ? 'text-right' : ''}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
