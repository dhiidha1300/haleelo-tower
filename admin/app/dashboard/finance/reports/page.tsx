'use client';

import { useRouter } from 'next/navigation';

const REPORTS = [
  { group: 'Financial Statements', items: [
    { type: 'balance-sheet',    label: 'Balance Sheet',     desc: 'Assets, liabilities and equity at a date', icon: '⚖️' },
    { type: 'profit-loss',      label: 'Profit & Loss',     desc: 'Revenue vs expenses for a period',         icon: '📈' },
    { type: 'cash-flow',        label: 'Cash Flow',         desc: 'Cash in/out and account movement',         icon: '💧' },
  ]},
  { group: 'Receivables & Payables', items: [
    { type: 'aged-receivables', label: 'Aged Receivables',  desc: 'Outstanding customer invoices by age',     icon: '📥' },
    { type: 'aged-payables',    label: 'Aged Payables',     desc: 'Outstanding vendor bills by age',          icon: '📤' },
    { type: 'partner-ledger',   label: 'Partner Ledger',    desc: 'Per tenant or vendor statement',           icon: '🤝' },
    { type: 'general-ledger',   label: 'General Ledger',    desc: 'Per-account transactions with running balance', icon: '📒' },
  ]},
  { group: 'Operational', items: [
    { type: 'revenue',          label: 'Revenue Report',    desc: 'Income by source',                         icon: '💰' },
    { type: 'expense',          label: 'Expense Report',    desc: 'Spending by category',                     icon: '🧱' },
    { type: 'bookings',         label: 'Bookings Report',   desc: 'All bookings with status and value',       icon: '📅' },
    { type: 'payments',         label: 'Payment Report',    desc: 'Receipts and payments by account',         icon: '💵' },
    { type: 'invoice-analysis', label: 'Invoice Analysis',  desc: 'Invoices by type and status',              icon: '🧾' },
    { type: 'electricity',      label: 'Electricity Report',desc: 'Meter readings and charges',               icon: '⚡' },
    { type: 'occupancy',        label: 'Occupancy Report',  desc: 'Space utilisation per period',             icon: '🏢' },
    { type: 'payroll-summary',  label: 'Payroll Summary',   desc: 'Gross, deductions and net by department',  icon: '💸' },
  ]},
];

export default function ReportsHubPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Financial Reports</h1>
        <p className="text-gray-600">View and export financial statements and operational reports</p>
      </div>

      {REPORTS.map(group => (
        <div key={group.group}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{group.group}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map(r => (
              <button key={r.type} onClick={() => router.push(`/dashboard/finance/reports/${r.type}`)}
                className="text-left bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#C9A052] transition-all">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-[#1B2D4F]">{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
