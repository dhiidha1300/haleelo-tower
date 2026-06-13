'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leasesAPI, paymentsAPI, accountingAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

const fmtDate = (raw: string | null | undefined) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { hasPermission } = usePermission();

  const contractRef  = useRef<HTMLInputElement>(null);
  const externalRef  = useRef<HTMLInputElement>(null);

  const [lease, setLease]           = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [message, setMessage]       = useState('');
  const [uploading, setUploading]   = useState<string | null>(null);
  const [accounts, setAccounts]     = useState<any[]>([]);
  const [depositModal, setDepositModal] = useState<{ deposit: any; action: 'receive' | 'return' } | null>(null);
  const [depForm, setDepForm]       = useState({ account_id: '', date: new Date().toISOString().split('T')[0] });
  const [depBusy, setDepBusy]       = useState(false);

  const fetchLease = () =>
    leasesAPI.show(parseInt(id))
      .then(r => setLease(r.data))
      .finally(() => setLoading(false));

  useEffect(() => { fetchLease(); }, [id]);
  useEffect(() => { accountingAPI.accounts().then(r => setAccounts(r.data.accounts)).catch(() => {}); }, []);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModal) return;
    setDepBusy(true);
    try {
      const payload = { account_id: parseInt(depForm.account_id), date: depForm.date };
      if (depositModal.action === 'receive') await paymentsAPI.receiveDeposit(depositModal.deposit.id, payload);
      else await paymentsAPI.returnDeposit(depositModal.deposit.id, payload);
      setDepositModal(null); setDepForm({ account_id: '', date: new Date().toISOString().split('T')[0] });
      fetchLease();
      setMessage('✓ Deposit ' + (depositModal.action === 'receive' ? 'receipt recorded' : 'returned'));
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed'));
    } finally { setDepBusy(false); }
  };

  const handleTerminate = async () => {
    const reason = prompt('Termination reason (optional):');
    if (reason === null) return;
    try {
      await leasesAPI.terminate(parseInt(id), reason || undefined);
      fetchLease();
      setMessage('✓ Lease terminated');
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to terminate'));
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this lease? The tenant will be activated.')) return;
    try {
      await leasesAPI.approve(parseInt(id));
      fetchLease();
      setMessage('✓ Lease approved and activated');
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to approve'));
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
      await leasesAPI.reject(parseInt(id), reason);
      fetchLease();
      setMessage('✓ Lease rejected');
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to reject'));
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'contract' | 'external_contract') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(docType);
    try {
      await leasesAPI.uploadDocument(parseInt(id), file, docType);
      fetchLease();
      setMessage('✓ Document uploaded');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('✗ Upload failed');
    } finally {
      setUploading(null);
      if (contractRef.current) contractRef.current.value = '';
      if (externalRef.current) externalRef.current.value = '';
    }
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;
  if (!lease)  return <div className="text-center py-12 text-gray-500">Lease not found.</div>;

  const rent = lease.billing_cycle === 'monthly'
    ? `$${parseFloat(lease.monthly_rent).toFixed(2)}/month`
    : `$${parseFloat(lease.semester_amount).toFixed(2)}/semester`;

  const listPrice   = parseFloat(lease.space?.base_price ?? '0');
  const agreedRent  = lease.billing_cycle === 'monthly'
    ? parseFloat(lease.monthly_rent ?? '0')
    : parseFloat(lease.semester_amount ?? '0');
  const discount    = listPrice > 0 && agreedRent < listPrice ? listPrice - agreedRent : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">{lease.lease_code}</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
          lease.status === 'active'           ? 'bg-green-100 text-green-800' :
          lease.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
          lease.status === 'expired'          ? 'bg-gray-100 text-gray-600'   :
          'bg-red-100 text-red-700'
        }`}>{(lease.status as string).replace('_', ' ')}</span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Pending approval action banner */}
      {lease.status === 'pending_approval' && hasPermission('manage-leases') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-800">This lease is awaiting your approval</p>
            <p className="text-xs text-amber-700">Approving will activate the lease and the tenant.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              ✓ Approve
            </button>
            <button onClick={handleReject}
              className="border border-red-300 text-red-600 hover:bg-red-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
              ✗ Reject
            </button>
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {lease.status === 'rejected' && lease.rejection_reason && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{lease.rejection_reason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tenant */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenant</h2>
          <p className="font-semibold text-[#1B2D4F]">{lease.tenant?.company_name}</p>
          <p className="text-sm text-gray-500">{lease.tenant?.contact_person_name}</p>
          <p className="text-sm text-gray-500">{lease.tenant?.email}</p>
          <button onClick={() => router.push(`/dashboard/tenants/${lease.tenant?.id}`)}
            className="mt-2 text-xs text-[#C9A052] hover:underline">View tenant →</button>
        </div>

        {/* Space */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Space</h2>
          <p className="font-semibold text-[#1B2D4F]">{lease.space?.name}</p>
          <p className="text-sm text-gray-500">{lease.space?.floor?.name}</p>
          {listPrice > 0 && (
            <p className="text-xs text-gray-400 mt-1">List price: ${listPrice.toFixed(2)}/{lease.billing_cycle === 'monthly' ? 'month' : 'semester'}</p>
          )}
        </div>

        {/* Lease Terms */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Lease Terms</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Start Date</span>
              <span className="font-medium">{fmtDate(lease.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">End Date</span>
              <span className="font-medium">{fmtDate(lease.end_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Billing</span>
              <span className="font-medium capitalize">{lease.billing_cycle}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Agreed Rent</span>
              <span className="font-semibold text-[#1B2D4F]">{rent}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 text-xs">Discount from list price</span>
                <span className="text-amber-600 text-xs font-semibold">
                  −${discount.toFixed(2)}/{lease.billing_cycle === 'monthly' ? 'mo' : 'sem'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security Deposit */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Security Deposit</h2>
          {(lease.security_deposits?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 italic">No deposit on this lease.</p>
          ) : (
            <div className="space-y-3">
              {lease.security_deposits.map((d: any) => (
                <div key={d.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[#1B2D4F]">${parseFloat(d.amount).toFixed(2)}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                      d.status === 'held' ? 'bg-amber-100 text-amber-800' :
                      d.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>{d.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {d.received_journal_id ? `Received in books ${fmtDate(d.received_date)}` : 'Not yet recorded in books'}
                    {d.returned_date ? ` · Returned ${fmtDate(d.returned_date)}` : ''}
                  </p>
                  {hasPermission('manage-payments') && (
                    <div className="flex gap-2 mt-2">
                      {!d.received_journal_id && (
                        <button onClick={() => { setDepositModal({ deposit: d, action: 'receive' }); }}
                          className="text-xs bg-[#C9A052] hover:bg-[#b89140] text-white px-3 py-1.5 rounded-lg font-medium">Record Receipt</button>
                      )}
                      {d.received_journal_id && d.status === 'held' && (
                        <button onClick={() => { setDepositModal({ deposit: d, action: 'return' }); }}
                          className="text-xs border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium">Return Deposit</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deposit receive/return modal */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDepositModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1B2D4F] mb-1">
              {depositModal.action === 'receive' ? 'Record Deposit Receipt' : 'Return Deposit'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              ${parseFloat(depositModal.deposit.amount).toFixed(2)} —
              {depositModal.action === 'receive'
                ? ' posts Debit cash, Credit Security Deposits Owed.'
                : ' posts Debit Security Deposits Owed, Credit cash.'}
            </p>
            <form onSubmit={submitDeposit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{depositModal.action === 'receive' ? 'Received into account *' : 'Refund from account *'}</label>
                <select required value={depForm.account_id} onChange={e => setDepForm(p => ({ ...p, account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (${a.balance})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date *</label>
                <input type="date" required value={depForm.date} onChange={e => setDepForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={depBusy} className="flex-1 bg-[#C9A052] hover:bg-[#b89140] text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50">{depBusy ? 'Processing…' : 'Confirm'}</button>
                <button type="button" onClick={() => setDepositModal(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Documents */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Contract Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Signed Contract */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium text-[#1B2D4F] mb-2">Signed Lease Agreement</p>
            {lease.contract_file_url ? (
              <div className="flex items-center justify-between">
                <a href={lease.contract_file_url} target="_blank" rel="noreferrer"
                  className="text-xs text-[#C9A052] hover:underline truncate max-w-xs">
                  ↓ Download contract
                </a>
                {hasPermission('manage-leases') && (
                  <label className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer ml-2">
                    Replace
                    <input ref={contractRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => handleDocUpload(e, 'contract')} />
                  </label>
                )}
              </div>
            ) : hasPermission('manage-leases') ? (
              <label className={`flex items-center gap-2 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-[#C9A052] transition-colors ${uploading === 'contract' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading === 'contract' ? 'Uploading…' : '+ Upload signed contract (PDF)'}
                <input ref={contractRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => handleDocUpload(e, 'contract')} />
              </label>
            ) : (
              <p className="text-xs text-gray-400 italic">No contract uploaded</p>
            )}
          </div>

          {/* External / Notarised Contract */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium text-[#1B2D4F] mb-2">External / Notarised Contract</p>
            {lease.external_contract_url ? (
              <div className="flex items-center justify-between">
                <a href={lease.external_contract_url} target="_blank" rel="noreferrer"
                  className="text-xs text-[#C9A052] hover:underline truncate max-w-xs">
                  ↓ Download document
                </a>
                {hasPermission('manage-leases') && (
                  <label className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer ml-2">
                    Replace
                    <input ref={externalRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => handleDocUpload(e, 'external_contract')} />
                  </label>
                )}
              </div>
            ) : hasPermission('manage-leases') ? (
              <label className={`flex items-center gap-2 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-[#C9A052] transition-colors ${uploading === 'external_contract' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading === 'external_contract' ? 'Uploading…' : '+ Upload notarised/external doc (PDF)'}
                <input ref={externalRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => handleDocUpload(e, 'external_contract')} />
              </label>
            ) : (
              <p className="text-xs text-gray-400 italic">No document uploaded</p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          KYC documents, business registration, and other tenant-level documents are managed on the{' '}
          <button onClick={() => router.push(`/dashboard/tenants/${lease.tenant?.id}`)}
            className="text-[#C9A052] hover:underline">Tenant page →</button>
        </p>
      </div>

      {lease.status === 'active' && hasPermission('manage-leases') && (
        <button onClick={handleTerminate}
          className="px-5 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
          Terminate Lease
        </button>
      )}

      <p className="text-xs text-gray-400">
        Created by {lease.created_by?.name ?? '—'} · Lease ID #{lease.id}
      </p>
    </div>
  );
}
