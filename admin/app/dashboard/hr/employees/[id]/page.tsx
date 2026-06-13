'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { employeesAPI, payrollAPI } from '@/lib/api';

const money = (v: any) => '$' + parseFloat(v ?? '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
const fmtDate = (raw: string | null) => raw ? new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const DEPT_LABELS: Record<string, string> = {
  internal_staff: 'Internal Staff', maintenance: 'Maintenance', cafeteria: 'Cafeteria / Restaurant',
};
const LEAVE_STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-700',
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const contractRef = useRef<HTMLInputElement>(null);

  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchEmp = () => employeesAPI.show(parseInt(id)).then(r => setEmp(r.data)).finally(() => setLoading(false));
  useEffect(() => { fetchEmp(); }, [id]);

  const handleContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await employeesAPI.uploadContract(parseInt(id), file);
      fetchEmp(); setMessage('✓ Contract uploaded'); setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('✗ Upload failed'); }
    finally { setUploading(false); if (contractRef.current) contractRef.current.value = ''; }
  };

  const handlePayslipPdf = async (pid: number) => {
    const res = await payrollAPI.payslipPdf(pid);
    window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!emp) return <div className="text-center py-12 text-gray-500">Employee not found.</div>;

  const pay = emp.employment_type === 'salaried' ? `${money(emp.base_salary)} / month` : `${money(emp.daily_rate)} / day`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/dashboard/hr/employees')} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Employees</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{emp.full_name}</h1>
          <p className="text-gray-500 text-sm">{emp.job_title} · {emp.employee_code}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{emp.status}</span>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Department', DEPT_LABELS[emp.department] ?? emp.department],
                ['Employment Type', emp.employment_type?.replace('_', ' ')],
                ['Pay', pay],
                ['Start Date', fmtDate(emp.start_date)],
                ['Phone', emp.phone ?? '—'],
                ['Email', emp.email ?? '—'],
              ].map(([l, v]) => <div key={l}><p className="text-gray-400">{l}</p><p className="font-medium capitalize">{v}</p></div>)}
            </div>
          </div>

          {/* Payslip history */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payslip History</h2>
            {(emp.payslips?.length ?? 0) === 0 ? <p className="text-sm text-gray-400 italic">No payslips yet</p> : (
              <div className="divide-y">
                {emp.payslips.map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono text-xs text-[#1B2D4F]">{p.payslip_code}</span>
                      <span className="ml-2 text-gray-500">{p.payroll_run?.month}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(p.net_pay)}</span>
                      <button onClick={() => handlePayslipPdf(p.id)} className="text-xs text-[#C9A052] hover:underline">PDF</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave history */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leave History</h2>
            {(emp.leave_requests?.length ?? 0) === 0 ? <p className="text-sm text-gray-400 italic">No leave requests</p> : (
              <div className="divide-y">
                {emp.leave_requests.map((l: any) => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                    onClick={() => router.push(`/dashboard/hr/leave/${l.id}`)}>
                    <div>
                      <span className="capitalize font-medium">{l.leave_type}</span>
                      <span className="ml-2 text-xs text-gray-400">{fmtDate(l.start_date)} → {fmtDate(l.end_date)} ({l.days_count}d)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${LEAVE_STATUS[l.status]}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — contract */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contract</h2>
            {emp.contract_file_url ? (
              <a href={emp.contract_file_url} target="_blank" rel="noreferrer" className="text-sm text-[#C9A052] hover:underline">↓ Download contract</a>
            ) : <p className="text-sm text-gray-400 italic mb-2">No contract on file</p>}
            <label className={`mt-3 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#C9A052] text-sm text-gray-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading…' : (emp.contract_file_url ? '+ Replace contract' : '+ Upload contract')}
              <input ref={contractRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleContract} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
