'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productsAPI } from '@/lib/api';
import { usePermission } from '@/lib/permissions';

interface Space {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  floor: { name: string; level: number } | null;
  capacity: number | null;
  base_price: string;
  price_unit: string;
  photos: string[];
  amenities: string[];
  bookings_count: number;
}

const TYPE_LABELS: Record<string, string> = {
  conference_hall:    'Conference Hall',
  office_space:       'Office Space',
  educational_space:  'Educational Space',
};
const TYPE_COLORS: Record<string, string> = {
  conference_hall:    'bg-purple-100 text-purple-800',
  office_space:       'bg-blue-100 text-blue-800',
  educational_space:  'bg-green-100 text-green-800',
};

export default function ProductsPage() {
  const router = useRouter();
  const { hasPermission } = usePermission();
  const [products, setProducts] = useState<Space[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setType]   = useState('');
  const [statusFilter, setStatus] = useState('');

  useEffect(() => { fetchProducts(); }, [search, typeFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productsAPI.list({ search, type: typeFilter, status: statusFilter });
      setProducts(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await productsAPI.toggle(id);
      fetchProducts();
    } catch { alert('Failed to toggle product status'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1B2D4F]">Products</h1>
          <p className="text-gray-600">Manage all building spaces and services</p>
        </div>
        {hasPermission('manage-products') && (
          <button
            onClick={() => router.push('/dashboard/products/create')}
            className="bg-[#C9A052] hover:bg-[#b89140] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]"
          />
          <select value={typeFilter} onChange={e => setType(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
            <option value="">All Types</option>
            <option value="conference_hall">Conference Hall</option>
            <option value="office_space">Office Space</option>
            <option value="educational_space">Educational Space</option>
          </select>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A052]">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {(search || typeFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setType(''); setStatus(''); }}
            className="mt-3 text-xs text-[#C9A052] hover:underline font-medium">Reset filters</button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No products found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.id} className={`bg-white rounded-lg shadow overflow-hidden ${p.status === 'inactive' ? 'opacity-60' : ''}`}>
              {/* Photo or placeholder */}
              <div className="h-36 bg-[#1B2D4F]/5 flex items-center justify-center overflow-hidden">
                {p.photos?.[0] ? (
                  <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-gray-300">🏢</span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#1B2D4F] leading-tight">{p.name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{p.status}</span>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[p.type]}`}>
                    {TYPE_LABELS[p.type]}
                  </span>
                  {p.floor && (
                    <span className="text-xs text-gray-500">{p.floor.name}</span>
                  )}
                  {p.capacity && (
                    <span className="text-xs text-gray-500">· {p.capacity} seats</span>
                  )}
                </div>

                <div className="text-sm text-gray-700 mb-4">
                  {p.base_price > '0' ? (
                    <span className="font-medium text-[#1B2D4F]">
                      ${p.base_price} <span className="text-gray-400 font-normal">/ {p.price_unit.replace('per_', '')}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Price not set</span>
                  )}
                </div>

                {p.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {p.amenities.slice(0, 4).map((a: string) => (
                      <span key={a} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {a.replace('_', ' ')}
                      </span>
                    ))}
                    {p.amenities.length > 4 && (
                      <span className="text-xs text-gray-400">+{p.amenities.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {hasPermission('manage-products') && (
                    <button
                      onClick={() => router.push(`/dashboard/products/${p.id}/edit`)}
                      className="flex-1 text-center text-sm font-medium text-[#C9A052] hover:text-[#b89140] border border-[#C9A052] hover:border-[#b89140] py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {hasPermission('manage-products') && (
                    <button
                      onClick={() => handleToggle(p.id)}
                      className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors ${
                        p.status === 'active'
                          ? 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                          : 'text-green-600 border border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {p.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
