'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { dashboardAPI } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface FinanceData {
  revenue_this_month: string; revenue_ytd: string;
  expense_this_month: string; expense_ytd: string; net_this_month: string;
  expense_by_category: { category: string; amount: number }[];
  outstanding_ar: string; overdue_count: number; overdue_total: string;
  overdue_invoices: { id: number; invoice_code: string; bill_to: string; balance: string; due_date: string; days_overdue: number }[];
  ap_outstanding: string; ap_count: number;
  unpaid_vendor_bills: { id: number; bill_code: string; vendor: string; balance: string; due_date: string }[];
  account_balances: { name: string; type: string; balance: string }[];
  total_cash: string;
  revenue_trend: { month: string; revenue: number }[];
  revenue_by_source: { source: string; amount: number }[];
}

const PIE_COLORS = ['#1B2D4F', '#C9A052', '#4F86C9', '#52A37B', '#A3527B', '#D98C5F'];
const ACCT_ICONS: Record<string, string> = { mobile_money: '📱', bank: '🏦', cash: '💵' };
const money = (v: string | number) => `$${parseFloat(String(v ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export function FinanceDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [d, setD] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.finance().then(r => setD(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const net = parseFloat(d?.net_this_month ?? '0');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Finance Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {user?.name?.split(' ')[0]} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Headline KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Revenue · This Month" value={loading ? '…' : money(d!.revenue_this_month)} icon="💰" color="border-[#C9A052]" sub={`YTD ${loading ? '' : money(d!.revenue_ytd)}`} />
        <Kpi label="Expenses · This Month" value={loading ? '…' : money(d!.expense_this_month)} icon="🧱" color="border-orange-400" sub={`YTD ${loading ? '' : money(d!.expense_ytd)}`} />
        <Kpi label="Net · This Month" value={loading ? '…' : money(d!.net_this_month)} icon={net >= 0 ? '📈' : '📉'} color={net >= 0 ? 'border-green-500' : 'border-red-500'} valueClass={net >= 0 ? 'text-green-600' : 'text-red-600'} sub="Revenue − expenses" />
        <Kpi label="Cash on Hand" value={loading ? '…' : money(d!.total_cash)} icon="🏦" color="border-[#1B2D4F]" sub="All accounts" />
      </div>

      {/* ── Receivables / Payables ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label="Outstanding AR" value={loading ? '…' : money(d!.outstanding_ar)} icon="🧾" color="border-blue-400" sub="Unpaid invoice balances" onClick={() => router.push('/dashboard/finance/invoices?status=sent')} />
        <Kpi label="Overdue Invoices" value={loading ? '…' : `${d!.overdue_count}`} icon={d?.overdue_count ? '⚠️' : '✅'} color={d?.overdue_count ? 'border-red-400' : 'border-green-400'} sub={loading ? '' : `${money(d!.overdue_total)} to collect`} onClick={() => router.push('/dashboard/finance/invoices?status=overdue')} />
        <Kpi label="Payables (AP)" value={loading ? '…' : money(d!.ap_outstanding)} icon="📑" color="border-amber-400" sub={loading ? '' : `${d!.ap_count} unpaid vendor bill(s)`} onClick={() => router.push('/dashboard/procurement/vendor-bills')} />
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Revenue Trend — Last 12 Months">
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d?.revenue_trend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => money(v)} />
                <Bar dataKey="revenue" fill="#C9A052" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Revenue by Source · YTD">
          {loading ? <Skeleton /> : (d?.revenue_by_source.length ?? 0) === 0 ? <Empty msg="No revenue recorded yet" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={d?.revenue_by_source} dataKey="amount" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {d?.revenue_by_source.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Account balances ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-[#1B2D4F] mb-3">Account Balances</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 h-24 animate-pulse" />)
            : d?.account_balances.map(a => (
              <div key={a.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <span className="text-lg">{ACCT_ICONS[a.type] ?? '💰'}</span>
                <p className="text-xs text-gray-500 leading-tight mt-1">{a.name}</p>
                <p className={`text-lg font-bold mt-1 ${parseFloat(a.balance) < 0 ? 'text-red-600' : 'text-[#1B2D4F]'}`}>{money(a.balance)}</p>
              </div>
            ))}
        </div>
      </div>

      {/* ── Expense breakdown ─────────────────────────────────────────────── */}
      <Card title="Expenses by Category · YTD">
        {loading ? <Skeleton h={180} /> : (d?.expense_by_category.length ?? 0) === 0 ? <Empty msg="No expenses recorded yet" /> : (
          <ResponsiveContainer width="100%" height={Math.max(160, (d?.expense_by_category.length ?? 1) * 42)}>
            <BarChart layout="vertical" data={d?.expense_by_category} margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={(v: any) => money(v)} />
              <Bar dataKey="amount" fill="#1B2D4F" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Action lists ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={`Overdue Invoices${d?.overdue_count ? ` (${d.overdue_count})` : ''}`}>
          {loading ? <Skeleton h={120} /> : (d?.overdue_invoices.length ?? 0) === 0 ? <Empty msg="🎉 No overdue invoices" /> : (
            <div className="divide-y">
              {d?.overdue_invoices.map(inv => (
                <button key={inv.id} onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}
                  className="w-full text-left py-2.5 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{inv.invoice_code}</p>
                    <p className="text-sm truncate">{inv.bill_to}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-red-600">{money(inv.balance)}</p>
                    <p className="text-xs text-gray-400">{inv.days_overdue}d overdue</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Unpaid Vendor Bills${d?.ap_count ? ` (${d.ap_count})` : ''}`}>
          {loading ? <Skeleton h={120} /> : (d?.unpaid_vendor_bills.length ?? 0) === 0 ? <Empty msg="🎉 No unpaid vendor bills" /> : (
            <div className="divide-y">
              {d?.unpaid_vendor_bills.map(b => (
                <button key={b.id} onClick={() => router.push(`/dashboard/procurement/vendor-bills/${b.id}`)}
                  className="w-full text-left py-2.5 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-[#1B2D4F]">{b.bill_code}</p>
                    <p className="text-sm truncate">{b.vendor}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-amber-600">{money(b.balance)}</p>
                    {b.due_date && <p className="text-xs text-gray-400">due {b.due_date}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────────── */
function Kpi({ label, value, icon, color, sub, valueClass, onClick }: {
  label: string; value: string; icon: string; color: string; sub?: string; valueClass?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${valueClass ?? 'text-[#1B2D4F]'}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl ml-3 flex-shrink-0">{icon}</span>
      </div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">{title}</h3>
      {children}
    </div>
  );
}
const Skeleton = ({ h = 240 }: { h?: number }) => <div className="bg-gray-50 rounded animate-pulse" style={{ height: h }} />;
const Empty = ({ msg }: { msg: string }) => <div className="h-32 flex items-center justify-center text-gray-400 text-sm">{msg}</div>;
