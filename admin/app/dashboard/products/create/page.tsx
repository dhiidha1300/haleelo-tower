'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsAPI } from '@/lib/api';

interface Floor { id: number; name: string; level: number; }

const AMENITY_OPTIONS = ['projector','AC','WiFi','whiteboard','AV_system','stage','lighting','sound_system','lab_equipment','parking'];

export default function CreateProductPage() {
  const router = useRouter();
  const [floors, setFloors]   = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'conference_hall', floor_id: '',
    capacity: '', description: '', base_price: '',
    price_unit: 'per_session', status: 'active', amenities: [] as string[],
  });

  useEffect(() => {
    productsAPI.floors().then(r => setFloors(r.data));
  }, []);

  // Auto-set price_unit based on type
  const handleTypeChange = (type: string) => {
    const unit = type === 'conference_hall' ? 'per_session' : type === 'educational_space' ? 'per_semester' : 'per_month';
    setForm(prev => ({ ...prev, type, price_unit: unit }));
  };

  const toggleAmenity = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await productsAPI.create({
        ...form,
        floor_id:  parseInt(form.floor_id),
        capacity:  form.capacity ? parseInt(form.capacity) : null,
        base_price: parseFloat(form.base_price) || 0,
      });
      router.push('/dashboard/products');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-[#1B2D4F] mb-2">← Back</button>
        <h1 className="text-3xl font-bold text-[#1B2D4F]">Add Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select required value={form.type} onChange={e => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="conference_hall">Conference Hall</option>
              <option value="office_space">Office Space</option>
              <option value="educational_space">Educational Space</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
            <select required value={form.floor_id} onChange={e => setForm(p => ({ ...p, floor_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="">Select floor…</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats)</label>
            <input type="number" min="1" value={form.capacity}
              onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
              placeholder="e.g. 50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD) *</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.01" required value={form.base_price}
                onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
                placeholder="0.00" />
              <select value={form.price_unit} onChange={e => setForm(p => ({ ...p, price_unit: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
                <option value="per_session">/ session</option>
                <option value="per_month">/ month</option>
                <option value="per_semester">/ semester</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A052] resize-none" />
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button key={a} type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.amenities.includes(a)
                    ? 'bg-[#1B2D4F] text-white border-[#1B2D4F]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#C9A052]'
                }`}>
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create Product'}
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
