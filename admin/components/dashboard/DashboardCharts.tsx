'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { dashboardAPI } from '@/lib/api';

interface ChartData {
  revenue_trend: { month: string; revenue: number }[];
  revenue_by_source: { source: string; amount: number }[];
  demand: {
    top_spaces: { space: string; bookings: number }[];
    top_sessions: { session: string; bookings: number }[];
  };
  account_balances: { name: string; type: string; balance: string }[];
}

const PIE_COLORS = ['#1B2D4F', '#C9A052', '#4F86C9', '#52A37B', '#A3527B'];
const ICONS: Record<string, string> = { mobile_money: '📱', bank: '🏦', cash: '💵' };

export function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.charts().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalBalance = data?.account_balances.reduce((s, a) => s + parseFloat(a.balance), 0) ?? 0;

  return (
    <div className="space-y-7">
      {/* Account balances */}
      <div>
        <h2 className="text-base font-semibold text-[#1B2D4F] mb-3">Account Balances</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-24 animate-pulse" />)
          ) : (
            data?.account_balances.map(a => (
              <div key={a.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{ICONS[a.type] ?? '💰'}</span>
                </div>
                <p className="text-xs text-gray-500 leading-tight">{a.name}</p>
                <p className={`text-lg font-bold mt-1 ${parseFloat(a.balance) < 0 ? 'text-red-600' : 'text-[#1B2D4F]'}`}>
                  ${parseFloat(a.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))
          )}
        </div>
        {!loading && (
          <p className="text-sm text-gray-500 mt-2">Total across all accounts: <strong className="text-[#1B2D4F]">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">Revenue Trend — Last 12 Months</h3>
          {loading ? <div className="h-56 bg-gray-50 rounded animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={data?.revenue_trend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#C9A052" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by Source */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">Revenue by Source</h3>
          {loading ? <div className="h-56 bg-gray-50 rounded animate-pulse" /> :
            (data?.revenue_by_source.length ?? 0) === 0 ? (
              <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No revenue recorded yet</div>
            ) : (
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie data={data?.revenue_by_source} dataKey="amount" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {data?.revenue_by_source.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Demand analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">🏆 Top Booked Spaces</h3>
          {loading ? <div className="h-32 bg-gray-50 rounded animate-pulse" /> :
            (data?.demand.top_spaces.length ?? 0) === 0 ? <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p> : (
            <div className="space-y-2">
              {data?.demand.top_spaces.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700"><span className="text-gray-400 mr-2">{i + 1}.</span>{s.space}</span>
                  <span className="text-sm font-semibold text-[#C9A052]">{s.bookings} bookings</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-[#1B2D4F] mb-4">⏰ Popular Sessions</h3>
          {loading ? <div className="h-32 bg-gray-50 rounded animate-pulse" /> :
            (data?.demand.top_sessions.length ?? 0) === 0 ? <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p> : (
            <div className="space-y-2">
              {data?.demand.top_sessions.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{s.session}</span>
                  <span className="text-sm font-semibold text-[#C9A052]">{s.bookings} bookings</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
