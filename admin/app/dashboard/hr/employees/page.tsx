'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { employeesAPI } from '@/lib/api';

interface Employee {
  id: number; employee_code: string; full_name: string; job_title: string | null;
  department: string; employment_type: string; base_salary: string; daily_rate: string; status: string;
}

const DEPTS = [
  { value: 'internal_staff', label: 'Internal Staff' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cafeteria', label: 'Cafeteria / Restaurant' },
];

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [dept, setDept]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [message, setMessage] = useState('');
  const blank = { full_name: '', job_title: '', department: 'internal_staff', employment_type: 'salaried', base_salary: '', daily_rate: '', phone: '', email: '', start_date: '' };
  const [form, setForm] = useState<any>(blank);

  const fetchEmployees = () =>
    employeesAPI.list({ search, department: dept }).then(r => setEmployees(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchEmployees(); }, [search, dept]);

  const openCreate = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ full_name: e.full_name, job_title: e.job_title ?? '', department: e.department, employment_type: e.employment_type, base_salary: e.base_salary, daily_rate: e.daily_rate, phone: '', email: '', start_date: '', status: e.status });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await employeesAPI.update(editing.id, form);
      else await employeesAPI.create(form);
      setShowForm(false); fetchEmployees();
      setMessage('✓ Employee saved'); setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to save'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-[#1B2D4F]">Employees</h1><p className="text-gray-600">Staff records for payroll</p></div>
        <button onClick={openCreate} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ Add Employee</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">{editing ? 'Edit Employee' : 'New Employee'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><label className="block text-xs text-gray-500 mb-1">Full Name *</label>
              <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Job Title</label>
              <input type="text" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Department *</label>
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                {DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Employment Type *</label>
              <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="salaried">Salaried (monthly)</option><option value="daily_rate">Daily Rate</option></select></div>
            {form.employment_type === 'salaried' ? (
              <div><label className="block text-xs text-gray-500 mb-1">Monthly Salary (USD) *</label>
                <input type="number" min="0" step="0.01" required value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            ) : (
              <div><label className="block text-xs text-gray-500 mb-1">Daily Rate (USD) *</label>
                <input type="number" min="0" step="0.01" required value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            )}
            <div><label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium">{editing ? 'Save' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4 flex gap-3 flex-wrap">
        <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-48 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
        <select value={dept} onChange={e => setDept(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
          <option value="">All Departments</option>{DEPTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : employees.length === 0 ? <div className="p-6 text-center text-gray-500">No employees yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pay</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {employees.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-[#1B2D4F]">{e.employee_code}</td>
                  <td className="px-5 py-3"><p className="text-sm font-medium text-[#1B2D4F]">{e.full_name}</p><p className="text-xs text-gray-400">{e.job_title}</p></td>
                  <td className="px-5 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{DEPTS.find(d => d.value === e.department)?.label}</span></td>
                  <td className="px-5 py-3 text-sm text-gray-500 capitalize">{e.employment_type.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium">{e.employment_type === 'salaried' ? `$${parseFloat(e.base_salary).toLocaleString()}/mo` : `$${parseFloat(e.daily_rate).toLocaleString()}/day`}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => router.push(`/dashboard/hr/employees/${e.id}`)} className="text-[#1B2D4F] hover:text-[#0f1d33] text-sm font-medium">View</button>
                    <button onClick={() => openEdit(e)} className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">Edit</button>
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
