'use client';

import { useEffect, useState } from 'react';
import { vendorsAPI } from '@/lib/api';

interface Vendor {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  category: string;
  active: boolean;
  purchase_orders_count: number;
  bills_count: number;
}

const CATEGORIES = [
  { value: 'food_supplier', label: 'Food Supplier' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'event_materials', label: 'Event Materials' },
  { value: 'other', label: 'Other' },
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', category: 'other', notes: '' });

  const fetchVendors = () =>
    vendorsAPI.list({ search }).then(r => setVendors(r.data.data ?? [])).finally(() => setLoading(false));

  useEffect(() => { fetchVendors(); }, [search]);

  const openCreate = () => { setEditing(null); setForm({ name: '', contact_person: '', phone: '', email: '', category: 'other', notes: '' }); setShowForm(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({ name: v.name, contact_person: v.contact_person ?? '', phone: v.phone ?? '', email: v.email ?? '', category: v.category, notes: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) await vendorsAPI.update(editing.id, form);
      else await vendorsAPI.create(form);
      setShowForm(false);
      fetchVendors();
      setMessage('✓ Vendor saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('✗ ' + (err.response?.data?.message || 'Failed to save vendor'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Vendors</h1>
          <p className="text-gray-600">Supplier master data</p>
        </div>
        <button onClick={openCreate} className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors">+ Add Vendor</button>
      </div>

      {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5 space-y-4">
          <h2 className="font-semibold text-[#1B2D4F]">{editing ? 'Edit Vendor' : 'New Vendor'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Contact Person</label>
              <input type="text" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#C9A052] text-white px-5 py-2 rounded-lg text-sm font-medium">{editing ? 'Save' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <input type="text" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-6 text-center text-gray-500">Loading…</div>
        : vendors.length === 0 ? <div className="p-6 text-center text-gray-500">No vendors yet</div>
        : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bills</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-[#1B2D4F]">{v.name}</td>
                  <td className="px-5 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{CATEGORIES.find(c => c.value === v.category)?.label ?? v.category}</span></td>
                  <td className="px-5 py-3 text-sm text-gray-600">{v.contact_person ?? '—'} {v.phone && <span className="text-gray-400">· {v.phone}</span>}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{v.bills_count} bills</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(v)} className="text-[#C9A052] hover:text-[#b89140] text-sm font-medium">Edit</button>
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
