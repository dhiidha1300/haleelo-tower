'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { leasesAPI, tenantsAPI, productsAPI } from '@/lib/api';

export default function CreateLeasePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const prefillTenantId = searchParams.get('tenant_id');

  const [tenants, setTenants] = useState<any[]>([]);
  const [spaces, setSpaces]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    tenant_id: prefillTenantId ?? '',
    space_id: '',
    start_date: '',
    end_date: '',
    billing_cycle: 'monthly',
    monthly_rent: '',
    semester_amount: '',
    security_deposit_amount: '0',
    security_deposit_received_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Load active + pending tenants (pending → active when first lease is created)
    Promise.all([
      tenantsAPI.list({ status: 'active' }),
      tenantsAPI.list({ status: 'pending' }),
    ]).then(([activeRes, pendingRes]) => {
      const all = [...(activeRes.data.data ?? []), ...(pendingRes.data.data ?? [])];
      setTenants(all);
    });
    productsAPI.list({ type: 'office_space', status: 'active' }).then(r => setSpaces(r.data.data ?? []));
  }, []);

  // When a space is selected, auto-fill the rent from its base_price
  const handleSpaceChange = (spaceId: string) => {
    const space = spaces.find(s => String(s.id) === spaceId);
    const basePrice = space?.base_price ?? '';
    const priceUnit = space?.price_unit ?? 'per_month';

    setForm(prev => ({
      ...prev,
      space_id: spaceId,
      monthly_rent:    priceUnit === 'per_month'    ? String(parseFloat(basePrice) || '') : prev.monthly_rent,
      semester_amount: priceUnit === 'per_semester' ? String(parseFloat(basePrice) || '') : prev.semester_amount,
      billing_cycle:   priceUnit === 'per_semester' ? 'semester' : 'monthly',
    }));
  };

  const selectedSpace = spaces.find(s => String(s.id) === form.space_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await leasesAPI.create({
        ...form,
        tenant_id:               parseInt(form.tenant_id),
        space_id:                parseInt(form.space_id),
        monthly_rent:            form.billing_cycle === 'monthly'  ? parseFloat(form.monthly_rent)    : undefined,
        semester_amount:         form.billing_cycle === 'semester' ? parseFloat(form.semester_amount) : undefined,
        security_deposit_amount: parseFloat(form.security_deposit_amount) || 0,
      });
      router.push(`/dashboard/leases/${res.data.id}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">New Lease Request</h1>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        ℹ This creates a lease <strong>request</strong>. It must be approved by an Admin before the lease becomes active and the tenant is activated.
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
            <select required value={form.tenant_id} onChange={e => setForm(p => ({ ...p, tenant_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select tenant…</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.company_name}{t.status === 'pending' ? ' (pending)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Space *</label>
            <select required value={form.space_id} onChange={e => handleSpaceChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select space…</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.floor?.name}
                  {s.base_price > '0' ? ` ($${s.base_price}/${s.price_unit?.replace('per_', '')})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" required value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input type="date" required value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              min={form.start_date}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle *</label>
            <select value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="monthly">Monthly</option>
              <option value="semester">Semester</option>
            </select>
          </div>

          {form.billing_cycle === 'monthly' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent (USD) *
                {selectedSpace?.base_price > '0' && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    List price: ${selectedSpace.base_price}
                  </span>
                )}
              </label>
              <input type="number" required min="0" step="0.01" value={form.monthly_rent}
                onChange={e => setForm(p => ({ ...p, monthly_rent: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                placeholder="0.00" />
              {selectedSpace?.base_price > '0' && form.monthly_rent &&
               parseFloat(form.monthly_rent) < parseFloat(selectedSpace.base_price) && (
                <p className="text-xs text-amber-600 mt-1">
                  ↓ ${(parseFloat(selectedSpace.base_price) - parseFloat(form.monthly_rent)).toFixed(2)} discount applied
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester Amount (USD) *
                {selectedSpace?.base_price > '0' && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    List price: ${selectedSpace.base_price}
                  </span>
                )}
              </label>
              <input type="number" required min="0" step="0.01" value={form.semester_amount}
                onChange={e => setForm(p => ({ ...p, semester_amount: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                placeholder="0.00" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (USD)</label>
            <input type="number" min="0" step="0.01" value={form.security_deposit_amount}
              onChange={e => setForm(p => ({ ...p, security_deposit_amount: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Received Date</label>
            <input type="date" value={form.security_deposit_received_date}
              onChange={e => setForm(p => ({ ...p, security_deposit_received_date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>
        </div>

        {message && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit Lease Request'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
