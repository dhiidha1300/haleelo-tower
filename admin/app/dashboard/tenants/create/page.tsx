'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tenantsAPI } from '@/lib/api';

export default function CreateTenantPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    company_name: '', contact_person_name: '', email: '',
    phone: '', national_id: '', type: 'office', status: 'pending',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await tenantsAPI.create(form);
      router.push(`/dashboard/tenants/${res.data.id}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, name: keyof typeof form, type = 'text', required = true) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <input type={type} required={required} value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Add Tenant</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">{field('Company / Organisation Name', 'company_name')}</div>
          {field('Contact Person Name', 'contact_person_name')}
          {field('Email Address', 'email', 'email')}
          {field('Phone Number', 'phone', 'tel')}
          {field('National ID', 'national_id', 'text', false)}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Type *</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="office">Office</option>
              <option value="educational">Educational</option>
              <option value="conference_client">Conference Client</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="pending">Pending</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>

        {message && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Tenant'}
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
