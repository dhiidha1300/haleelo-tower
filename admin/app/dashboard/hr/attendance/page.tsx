'use client';

import { useEffect, useState } from 'react';
import { attendanceAPI } from '@/lib/api';

interface Row {
  employee_id: number; employee_code: string; full_name: string; department: string;
  working_days_in_month: number; days_worked: number; days_absent: number; late_arrivals: number; logged: boolean;
}

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows]   = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const fetchAttendance = () => {
    setLoading(true);
    attendanceAPI.list(month).then(r => setRows(r.data.rows ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAttendance(); }, [month]);

  const updateRow = (id: number, field: keyof Row, value: number) =>
    setRows(rows.map(r => r.employee_id === id ? { ...r, [field]: value } : r));

  const saveRow = async (row: Row) => {
    setSavingId(row.employee_id);
    try {
      await attendanceAPI.save({
        employee_id: row.employee_id, month,
        working_days_in_month: row.working_days_in_month,
        days_worked: row.days_worked, days_absent: row.days_absent, late_arrivals: row.late_arrivals,
      });
      setRows(rows.map(r => r.employee_id === row.employee_id ? { ...r, logged: true } : r));
      setMessage('✓ Saved ' + row.full_name); setTimeout(() => setMessage(''), 2000);
    } catch { setMessage('✗ Failed to save'); }
    finally { setSavingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold text-[#1B2D4F]">Attendance</h1><p className="text-gray-600">Monthly attendance per employee — feeds payroll proration</p></div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
        </div>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : rows.length === 0 ? <div className="p-6 text-center text-gray-500">No active employees</div>
        : (
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Working Days</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Days Worked</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Absent</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Late</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
            </tr></thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.employee_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#1B2D4F]">{r.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{r.department.replace('_', ' ')} {r.logged && <span className="text-green-600">· logged</span>}</p>
                  </td>
                  {(['working_days_in_month', 'days_worked', 'days_absent', 'late_arrivals'] as const).map(f => (
                    <td key={f} className="px-4 py-3 text-center">
                      <input type="number" min="0" max="31" value={r[f]} onChange={e => updateRow(r.employee_id, f, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => saveRow(r)} disabled={savingId === r.employee_id}
                      className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium disabled:opacity-50">{savingId === r.employee_id ? 'Saving…' : 'Save'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
